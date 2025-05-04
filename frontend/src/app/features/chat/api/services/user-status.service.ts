import { Injectable, OnDestroy, NgZone } from '@angular/core';
import { BehaviorSubject, Observable, Subscription, of } from 'rxjs';
import { catchError, tap, filter } from 'rxjs/operators';
import { ChatWebsocketService } from '../websocket/chat-websocket.service';
import { ChatUser } from '../models';
import { UserApiService } from './user-api.service';

/**
 * Service for handling user status updates.
 */
@Injectable({
  providedIn: 'root'
})
export class UserStatusService implements OnDestroy {
  private userStatusMap = new BehaviorSubject<Map<string, string>>(new Map());
  private userLastSeenMap = new BehaviorSubject<Map<string, Date>>(new Map());
  private subscriptions = new Subscription();
  private initialized = false;
  private forceRefreshSubject = new BehaviorSubject<number>(0); // For forcing UI refreshes

  // Observable streams
  public userStatus$ = this.userStatusMap.asObservable();
  public userLastSeen$ = this.userLastSeenMap.asObservable();
  public forceRefresh$ = this.forceRefreshSubject.asObservable(); // Observable for forcing UI refreshes

  constructor(
    private websocketService: ChatWebsocketService,
    private userApiService: UserApiService,
    private ngZone: NgZone
  ) {
    // Subscribe to WebSocket connection status
    this.subscriptions.add(
      this.websocketService.connectionStatus$.pipe(
        filter(connected => connected) // Only proceed when connected
      ).subscribe(() => {
        if (!this.initialized) {
          this.initialized = true;
          this.subscribeToStatusUpdates();
          console.log('UserStatusService: WebSocket connected, subscribed to status updates');
        }
      })
    );
  }

  /**
   * Subscribe to user status updates from WebSocket
   */
  private subscribeToStatusUpdates(): void {
    if (!this.websocketService.isConnected()) {
      console.warn('UserStatusService: WebSocket not connected, cannot subscribe to status updates');
      return;
    }

    // Subscribe to the global user status topic
    this.websocketService.subscribeToUserStatus();

    // Listen for status updates
    const statusSub = this.websocketService.userStatus$.subscribe(statusUpdate => {
      if (!statusUpdate || !statusUpdate.userId) {
        console.warn('UserStatusService: Received invalid status update', statusUpdate);
        return;
      }

      console.log(`UserStatusService: Received status update for user ${statusUpdate.userId}: ${statusUpdate.status}`);

      // Run inside NgZone to ensure Angular detects changes
      this.ngZone.run(() => {
        // Update status map
        const statusMap = this.userStatusMap.value;
        statusMap.set(String(statusUpdate.userId), statusUpdate.status);
        this.userStatusMap.next(new Map(statusMap)); // Create a new Map to trigger change detection

        // Update lastSeen map if available
        if (statusUpdate.lastActive) {
          console.log(`UserStatusService: User ${statusUpdate.userId} lastActive: ${statusUpdate.lastActive}`);
          const lastSeenMap = this.userLastSeenMap.value;
          lastSeenMap.set(String(statusUpdate.userId), statusUpdate.lastActive);
          this.userLastSeenMap.next(new Map(lastSeenMap)); // Create a new Map to trigger change detection
        }

        // Force a refresh by incrementing the counter
        this.forceRefreshSubject.next(this.forceRefreshSubject.value + 1);
      });
    });

    this.subscriptions.add(statusSub);
  }

  /**
   * Subscribe to user status updates from WebSocket (public method for external components)
   */
  public subscribeToUserStatus(): void {
    if (this.websocketService.isConnected()) {
      this.websocketService.subscribeToUserStatus();
    } else {
      console.warn('UserStatusService: WebSocket not connected, cannot subscribe to status updates');
    }
  }

  /**
   * Update the current user's status
   * @param status New status
   */
  public updateStatus(status: 'ONLINE' | 'AWAY' | 'OFFLINE'): Observable<ChatUser> {
    // First update via HTTP API
    return this.userApiService.updateStatus(status).pipe(
      tap(user => {
        console.log(`UserStatusService: Status updated via API to ${status} for user ${user.id}`);

        // Run inside NgZone to ensure Angular detects changes
        this.ngZone.run(() => {
          // Also update the local status map immediately
          const statusMap = this.userStatusMap.value;
          statusMap.set(String(user.id), status);
          this.userStatusMap.next(new Map(statusMap)); // Create a new Map to trigger change detection

          // Force a refresh by incrementing the counter
          this.forceRefreshSubject.next(this.forceRefreshSubject.value + 1);

          // If WebSocket is connected, also send the status update via WebSocket
          if (this.websocketService.isConnected()) {
            this.websocketService.sendUserStatus(status);
          }
        });
      }),
      catchError(error => {
        console.error('UserStatusService: Failed to update status via API', error);
        return of(null as unknown as ChatUser);
      })
    );
  }

  /**
   * Force a refresh of all status indicators
   * This is a utility method to force UI components to refresh
   */
  public forceRefresh(): void {
    console.log('UserStatusService: Forcing refresh of status indicators');
    this.forceRefreshSubject.next(this.forceRefreshSubject.value + 1);
  }

  /**
   * Get a user's status
   * @param userId ID of the user
   * @returns The user's status or 'OFFLINE' if not found
   */
  public getUserStatus(userId: string | number): string {
    if (!userId) return 'OFFLINE';

    const statusMap = this.userStatusMap.value;
    const status = statusMap.get(String(userId));

    return status || 'OFFLINE';
  }

  /**
   * Get a user's last seen timestamp
   * @param userId ID of the user
   * @returns The user's last seen timestamp or undefined if not found
   */
  public getUserLastSeen(userId: string | number): Date | undefined {
    if (!userId) return undefined;

    const lastSeenMap = this.userLastSeenMap.value;
    return lastSeenMap.get(String(userId));
  }

  /**
   * Load initial status for all users
   */
  public loadAllUserStatuses(): Observable<any> {
    return this.userApiService.getAllUsers().pipe(
      tap(users => {
        // Run inside NgZone to ensure Angular detects changes
        this.ngZone.run(() => {
          const statusMap = this.userStatusMap.value;
          const lastSeenMap = this.userLastSeenMap.value;

          // Update status map with all users
          users.forEach(user => {
            if (user && user.id) {
              // Update status
              statusMap.set(String(user.id), user.status || 'OFFLINE');

              // Update lastSeen if available
              if (user.lastSeen) {
                lastSeenMap.set(String(user.id), user.lastSeen);
              }
            }
          });

          this.userStatusMap.next(new Map(statusMap)); // Create a new Map to trigger change detection
          this.userLastSeenMap.next(new Map(lastSeenMap)); // Create a new Map to trigger change detection

          // Force a refresh by incrementing the counter
          this.forceRefreshSubject.next(this.forceRefreshSubject.value + 1);

          console.log(`UserStatusService: Loaded status for ${users.length} users`);
        });
      }),
      catchError(error => {
        console.error('UserStatusService: Failed to load user statuses', error);
        return of(null);
      })
    );
  }

  /**
   * Clean up resources when the service is destroyed
   */
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
