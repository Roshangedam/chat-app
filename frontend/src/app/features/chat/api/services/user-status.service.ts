import { Injectable, OnDestroy, NgZone } from '@angular/core';
import { BehaviorSubject, Observable, Subscription, of, timer, throwError, EMPTY } from 'rxjs';
import { catchError, tap, filter, retry, switchMap, finalize, timeout, take } from 'rxjs/operators';
import { ChatWebsocketService } from '../websocket/chat-websocket.service';
import { ChatUser } from '../models';
import { UserApiService } from './user-api.service';

/**
 * Interface for logging status updates
 */
interface StatusLog {
  timestamp: Date;
  message: string;
  level: 'info' | 'warn' | 'error';
}

/**
 * Service for handling user status updates.
 * This service manages WebSocket subscriptions for real-time status updates
 * and provides methods for getting and updating user statuses.
 */
@Injectable({
  providedIn: 'root'
})
export class UserStatusService implements OnDestroy {
  // Constants for status update handling
  private readonly RECONNECT_INTERVAL = 5000; // 5 seconds
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly STATUS_REQUEST_TIMEOUT = 10000; // 10 seconds

  // BehaviorSubjects to store state
  private userStatusMap = new BehaviorSubject<Map<string, string>>(new Map());
  private userLastSeenMap = new BehaviorSubject<Map<string, Date>>(new Map());
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private logsSubject = new BehaviorSubject<StatusLog[]>([]);
  private reconnectAttemptsSubject = new BehaviorSubject<number>(0);

  // Subscription management
  private subscriptions = new Subscription();
  private initialized = false;
  private reconnecting = false;

  // Observable streams for components to subscribe to
  public userStatus$ = this.userStatusMap.asObservable();
  public userLastSeen$ = this.userLastSeenMap.asObservable();
  public loading$ = this.loadingSubject.asObservable();
  public logs$ = this.logsSubject.asObservable();
  public reconnectAttempts$ = this.reconnectAttemptsSubject.asObservable();

  constructor(
    private websocketService: ChatWebsocketService,
    private userApiService: UserApiService,
    private ngZone: NgZone
  ) {
    this.logInfo('UserStatusService initialized');

    // Subscribe to WebSocket connection status
    this.subscriptions.add(
      this.websocketService.connectionStatus$.pipe(
        filter(connected => connected) // Only proceed when connected
      ).subscribe(() => {
        this.logInfo('WebSocket connected');

        // Reset reconnect attempts on successful connection
        this.reconnectAttemptsSubject.next(0);
        this.reconnecting = false;

        if (!this.initialized) {
          this.initialized = true;
          this.subscribeToStatusUpdates();
          this.logInfo('Subscribed to status updates');
        }
      })
    );

    // Subscribe to WebSocket disconnection events
    this.subscriptions.add(
      this.websocketService.connectionStatus$.pipe(
        filter(connected => !connected) // Only proceed when disconnected
      ).subscribe(() => {
        this.logWarn('WebSocket disconnected');

        // Attempt to reconnect if not already reconnecting
        if (!this.reconnecting) {
          this.attemptReconnect();
        }
      })
    );
  }

  /**
   * Log an informational message
   * @param message The message to log
   */
  private logInfo(message: string): void {
    console.log(`UserStatusService: ${message}`);
    this.addLogEntry(message, 'info');
  }

  /**
   * Log a warning message
   * @param message The message to log
   */
  private logWarn(message: string): void {
    console.warn(`UserStatusService: ${message}`);
    this.addLogEntry(message, 'warn');
  }

  /**
   * Log an error message
   * @param message The message to log
   * @param error Optional error object
   */
  private logError(message: string, error?: any): void {
    console.error(`UserStatusService: ${message}`, error);
    this.addLogEntry(`${message}${error ? ': ' + error.message : ''}`, 'error');
  }

  /**
   * Add a log entry to the logs subject
   * @param message The message to log
   * @param level The log level
   */
  private addLogEntry(message: string, level: 'info' | 'warn' | 'error'): void {
    const logs = [...this.logsSubject.value];
    logs.push({
      timestamp: new Date(),
      message,
      level
    });

    // Keep only the last 100 log entries
    if (logs.length > 100) {
      logs.shift();
    }

    this.logsSubject.next(logs);
  }

  /**
   * Attempt to reconnect to the WebSocket server
   */
  private attemptReconnect(): void {
    if (this.reconnecting) {
      return;
    }

    this.reconnecting = true;
    const currentAttempts = this.reconnectAttemptsSubject.value;

    if (currentAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      this.logError(`Failed to reconnect after ${currentAttempts} attempts`);
      this.reconnecting = false;
      return;
    }

    this.reconnectAttemptsSubject.next(currentAttempts + 1);
    this.logInfo(`Attempting to reconnect (attempt ${currentAttempts + 1}/${this.MAX_RECONNECT_ATTEMPTS})`);

    // Run outside Angular zone to avoid triggering change detection
    this.ngZone.runOutsideAngular(() => {
      this.subscriptions.add(
        timer(this.RECONNECT_INTERVAL).pipe(
          take(1)
        ).subscribe(() => {
          // Run back inside Angular zone when processing reconnection
          this.ngZone.run(() => {
            // Try to reconnect WebSocket
            if (this.websocketService.isConnected()) {
              this.logInfo('WebSocket already connected');
              this.reconnecting = false;
            } else {
              this.logInfo('Attempting to reconnect WebSocket');
              // The WebSocket service should handle reconnection internally
              // We just need to check if it's connected after a delay
              timer(1000).subscribe(() => {
                if (!this.websocketService.isConnected()) {
                  this.attemptReconnect();
                } else {
                  this.reconnecting = false;
                }
              });
            }
          });
        })
      );
    });
  }

  /**
   * Subscribe to user status updates from WebSocket
   */
  private subscribeToStatusUpdates(): void {
    if (!this.websocketService.isConnected()) {
      this.logWarn('WebSocket not connected, cannot subscribe to status updates');
      return;
    }

    // Subscribe to the global user status topic
    this.websocketService.subscribeToUserStatus();
    this.logInfo('Subscribed to global user status topic');

    // Listen for status updates
    const statusSub = this.websocketService.userStatus$.subscribe(statusUpdate => {
      if (!statusUpdate || !statusUpdate.userId) {
        this.logWarn('Received invalid status update');
        return;
      }

      const userId = String(statusUpdate.userId);
      this.logInfo(`Received status update for user ${userId}: ${statusUpdate.status}`);

      // Update status map with a new Map instance to trigger change detection
      const statusMap = new Map(this.userStatusMap.value);
      statusMap.set(userId, statusUpdate.status);
      this.userStatusMap.next(statusMap);

      // Update lastSeen map if available
      if (statusUpdate.lastActive) {
        this.logInfo(`User ${userId} lastActive: ${statusUpdate.lastActive}`);
        const lastSeenMap = new Map(this.userLastSeenMap.value);
        lastSeenMap.set(userId, statusUpdate.lastActive);
        this.userLastSeenMap.next(lastSeenMap);
      }
    });

    this.subscriptions.add(statusSub);
  }

  /**
   * Subscribe to user status updates from WebSocket (public method for external components)
   * @returns Observable that completes when subscription is successful
   */
  public subscribeToUserStatus(): Observable<boolean> {
    if (this.websocketService.isConnected()) {
      this.websocketService.subscribeToUserStatus();
      this.logInfo('Manually subscribed to user status updates');
      return of(true);
    } else {
      this.logWarn('WebSocket not connected, cannot subscribe to status updates');
      return throwError(() => new Error('WebSocket not connected'));
    }
  }

  /**
   * Update the current user's status
   * @param status New status
   * @returns Observable of the updated user
   */
  public updateStatus(status: 'ONLINE' | 'AWAY' | 'OFFLINE'): Observable<ChatUser> {
    this.logInfo(`Updating status to ${status}`);
    this.loadingSubject.next(true);

    // First update via HTTP API
    return this.userApiService.updateStatus(status).pipe(
      timeout(this.STATUS_REQUEST_TIMEOUT), // Add timeout to prevent hanging requests
      tap(user => {
        this.logInfo(`Status updated via API to ${status} for user ${user.id}`);

        // Update the local status map immediately with a new Map instance
        const statusMap = new Map(this.userStatusMap.value);
        statusMap.set(String(user.id), status);
        this.userStatusMap.next(statusMap);

        // If WebSocket is connected, also send the status update via WebSocket
        if (this.websocketService.isConnected()) {
          this.websocketService.sendUserStatus(status);
          this.logInfo(`Sent status update via WebSocket: ${status}`);
        } else {
          this.logWarn('WebSocket not connected, status update only sent via API');
        }
      }),
      retry(2), // Retry failed requests up to 2 times
      catchError(error => {
        this.logError('Failed to update status via API', error);
        return throwError(() => error);
      }),
      finalize(() => {
        this.loadingSubject.next(false);
      })
    );
  }

  /**
   * Get a user's status
   * @param userId ID of the user
   * @returns The user's status or 'OFFLINE' if not found
   */
  public getUserStatus(userId: string | number): string {
    if (!userId) return 'OFFLINE';

    const userIdStr = String(userId);
    const statusMap = this.userStatusMap.value;
    const status = statusMap.get(userIdStr);

    if (!status) {
      this.logInfo(`Status not found for user ${userIdStr}, returning OFFLINE`);
      return 'OFFLINE';
    }

    return status;
  }

  /**
   * Get a user's last seen timestamp
   * @param userId ID of the user
   * @returns The user's last seen timestamp or undefined if not found
   */
  public getUserLastSeen(userId: string | number): Date | undefined {
    if (!userId) return undefined;

    const userIdStr = String(userId);
    const lastSeenMap = this.userLastSeenMap.value;
    const lastSeen = lastSeenMap.get(userIdStr);

    if (!lastSeen) {
      this.logInfo(`Last seen not found for user ${userIdStr}`);
    }

    return lastSeen;
  }

  /**
   * Load initial status for all users
   * @returns Observable that completes when all statuses are loaded
   */
  public loadAllUserStatuses(): Observable<any> {
    this.logInfo('Loading status for all users');
    this.loadingSubject.next(true);

    return this.userApiService.getAllUsers().pipe(
      timeout(this.STATUS_REQUEST_TIMEOUT), // Add timeout to prevent hanging requests
      tap(users => {
        // Create new Map instances to ensure change detection
        const statusMap = new Map<string, string>();
        const lastSeenMap = new Map<string, Date>();

        // Update maps with all users
        users.forEach(user => {
          if (user && user.id) {
            const userId = String(user.id);

            // Update status
            statusMap.set(userId, user.status || 'OFFLINE');

            // Update lastSeen if available
            if (user.lastSeen) {
              lastSeenMap.set(userId, user.lastSeen);
            }
          }
        });

        // Update the BehaviorSubjects with new Map instances
        this.userStatusMap.next(statusMap);
        this.userLastSeenMap.next(lastSeenMap);

        this.logInfo(`Loaded status for ${users.length} users`);
      }),
      retry(2), // Retry failed requests up to 2 times
      catchError(error => {
        this.logError('Failed to load user statuses', error);
        return throwError(() => error);
      }),
      finalize(() => {
        this.loadingSubject.next(false);
      })
    );
  }

  /**
   * Refresh status for a specific user
   * @param userId ID of the user to refresh
   * @returns Observable that completes when the status is refreshed
   */
  public refreshUserStatus(userId: string | number): Observable<ChatUser> {
    if (!userId) return EMPTY;

    const userIdStr = String(userId);
    this.logInfo(`Refreshing status for user ${userIdStr}`);

    return this.userApiService.getUser(userId).pipe(
      timeout(this.STATUS_REQUEST_TIMEOUT), // Add timeout to prevent hanging requests
      tap(user => {
        if (user) {
          // Update status map with a new Map instance
          const statusMap = new Map(this.userStatusMap.value);
          statusMap.set(userIdStr, user.status || 'OFFLINE');
          this.userStatusMap.next(statusMap);

          // Update lastSeen map if available
          if (user.lastSeen) {
            const lastSeenMap = new Map(this.userLastSeenMap.value);
            lastSeenMap.set(userIdStr, user.lastSeen);
            this.userLastSeenMap.next(lastSeenMap);
          }

          this.logInfo(`Refreshed status for user ${userIdStr}: ${user.status}`);
        } else {
          this.logWarn(`User not found: ${userIdStr}`);
        }
      }),
      retry(1), // Retry once on failure
      catchError(error => {
        this.logError(`Failed to refresh status for user ${userIdStr}`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get all status logs
   * @returns Array of status logs
   */
  public getLogs(): StatusLog[] {
    return this.logsSubject.value;
  }

  /**
   * Clear all status logs
   */
  public clearLogs(): void {
    this.logsSubject.next([]);
    this.logInfo('Logs cleared');
  }

  /**
   * Check if the service is currently loading data
   * @returns True if loading, false otherwise
   */
  public isLoading(): boolean {
    return this.loadingSubject.value;
  }

  /**
   * Clean up resources when the service is destroyed
   */
  ngOnDestroy(): void {
    this.logInfo('UserStatusService destroyed, cleaning up subscriptions');
    this.subscriptions.unsubscribe();
  }
}
