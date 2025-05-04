import { Injectable, OnDestroy, NgZone } from '@angular/core';
import { BehaviorSubject, Observable, Subject, Subscription, of, timer, EMPTY } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, shareReplay, catchError, switchMap, tap, filter } from 'rxjs/operators';
import { UserStatusService } from '../../features/chat/api/services/user-status.service';

export type UserStatus = 'ONLINE' | 'AWAY' | 'OFFLINE';

/**
 * Interface for status updates
 */
export interface StatusUpdate {
  userId: string | number;
  status: UserStatus;
}

/**
 * Interface for cached status entry with TTL
 */
interface CachedStatusEntry {
  value: UserStatus;
  timestamp: number;
}

/**
 * Interface for cached lastSeen entry with TTL
 */
interface CachedLastSeenEntry {
  value: Date;
  timestamp: number;
}

/**
 * Service for optimized status handling with caching and debouncing
 * This service acts as a facade over the UserStatusService to provide
 * more robust status handling with caching and debouncing
 */
@Injectable({
  providedIn: 'root'
})
export class StatusService implements OnDestroy {
  // Cache TTL in milliseconds (5 minutes for status, 10 minutes for lastSeen)
  private readonly STATUS_CACHE_TTL = 5 * 60 * 1000;
  private readonly LAST_SEEN_CACHE_TTL = 10 * 60 * 1000;
  // Refresh interval for active users (30 seconds)
  private readonly ACTIVE_USERS_REFRESH_INTERVAL = 30 * 1000;
  // Maximum number of refresh attempts
  private readonly MAX_REFRESH_ATTEMPTS = 3;

  // Cache for status values with TTL
  private statusCache = new Map<string, CachedStatusEntry>();
  // Cache for lastSeen timestamps with TTL
  private lastSeenCache = new Map<string, CachedLastSeenEntry>();
  // Set of active user IDs for periodic refresh
  private activeUserIds = new Set<string>();
  // Counter for refresh attempts
  private refreshAttempts = new Map<string, number>();
  // Flag to track if periodic refresh is active
  private periodicRefreshActive = false;

  // Subject for status updates to allow debouncing
  private statusUpdatesSubject = new Subject<StatusUpdate>();
  // Observable for status updates with debouncing and distinctUntilChanged
  private statusUpdates$ = this.statusUpdatesSubject.asObservable().pipe(
    debounceTime(300), // Debounce status updates to prevent flickering
    distinctUntilChanged((prev, curr) =>
      String(prev.userId) === String(curr.userId) && prev.status === curr.status
    ),
    shareReplay(1) // Share the latest value with new subscribers
  );

  // Public observable for components to subscribe to specific user status updates
  private userStatusMapSubject = new BehaviorSubject<Map<string, UserStatus>>(new Map());
  public userStatusMap$ = this.userStatusMapSubject.asObservable();

  // Subject for logging status updates
  private logSubject = new BehaviorSubject<string[]>([]);
  public logs$ = this.logSubject.asObservable();

  private subscriptions = new Subscription();

  constructor(
    private userStatusService: UserStatusService,
    private ngZone: NgZone
  ) {
    // Subscribe to status updates from the original service
    this.subscriptions.add(
      this.userStatusService.userStatus$.subscribe(statusMap => {
        this.logStatus(`Received status update for ${statusMap.size} users from UserStatusService`);

        // Process all status updates
        statusMap.forEach((status, userId) => {
          this.updateStatus(userId, status as UserStatus);
        });
      })
    );

    // Subscribe to lastSeen updates from the original service
    this.subscriptions.add(
      this.userStatusService.userLastSeen$.subscribe(lastSeenMap => {
        this.logStatus(`Received lastSeen update for ${lastSeenMap.size} users from UserStatusService`);

        // Update the lastSeen cache
        lastSeenMap.forEach((lastSeen, userId) => {
          this.setLastSeenWithTTL(String(userId), lastSeen);
        });
      })
    );

    // Subscribe to our debounced status updates
    this.subscriptions.add(
      this.statusUpdates$.subscribe(update => {
        const userIdStr = String(update.userId);
        this.logStatus(`Processing debounced status update for user ${userIdStr}: ${update.status}`);

        // Update the status cache with TTL
        this.setStatusWithTTL(userIdStr, update.status);

        // Update the status map for components
        const statusMap = new Map(this.userStatusMapSubject.value);
        statusMap.set(userIdStr, update.status);
        this.userStatusMapSubject.next(statusMap);
      })
    );

    // Start periodic refresh for active users
    this.startPeriodicRefresh();
  }

  /**
   * Add a log entry
   * @param message Log message
   */
  private logStatus(message: string): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;

    const logs = [...this.logSubject.value];
    logs.push(logEntry);

    // Keep only the last 100 log entries
    if (logs.length > 100) {
      logs.shift();
    }

    this.logSubject.next(logs);

    // Also log to console in development
    console.log(`StatusService: ${message}`);
  }

  /**
   * Set status in cache with TTL
   * @param userId User ID
   * @param status Status value
   */
  private setStatusWithTTL(userId: string, status: UserStatus): void {
    this.statusCache.set(userId, {
      value: status,
      timestamp: Date.now()
    });
  }

  /**
   * Set lastSeen in cache with TTL
   * @param userId User ID
   * @param lastSeen Last seen date
   */
  private setLastSeenWithTTL(userId: string, lastSeen: Date): void {
    this.lastSeenCache.set(userId, {
      value: lastSeen,
      timestamp: Date.now()
    });
  }

  /**
   * Start periodic refresh for active users
   */
  private startPeriodicRefresh(): void {
    if (this.periodicRefreshActive) {
      return;
    }

    this.periodicRefreshActive = true;
    this.logStatus('Starting periodic refresh for active users');

    // Run outside Angular zone to avoid triggering change detection
    this.ngZone.runOutsideAngular(() => {
      this.subscriptions.add(
        timer(this.ACTIVE_USERS_REFRESH_INTERVAL, this.ACTIVE_USERS_REFRESH_INTERVAL)
          .subscribe(() => {
            // Run back inside Angular zone when processing updates
            this.ngZone.run(() => {
              this.refreshActiveUsers();
            });
          })
      );
    });
  }

  /**
   * Refresh status for all active users
   */
  private refreshActiveUsers(): void {
    if (this.activeUserIds.size === 0) {
      return;
    }

    this.logStatus(`Refreshing status for ${this.activeUserIds.size} active users`);

    // Create a copy to avoid modification during iteration
    const activeUserIds = [...this.activeUserIds];

    for (const userId of activeUserIds) {
      // Check if status cache is expired
      const statusEntry = this.statusCache.get(userId);
      if (!statusEntry || (Date.now() - statusEntry.timestamp) > this.STATUS_CACHE_TTL) {
        this.refreshUserStatus(userId);
      }
    }
  }

  /**
   * Mark a user as active for periodic refresh
   * @param userId User ID
   */
  public markUserAsActive(userId: string | number): void {
    if (!userId) return;

    const userIdStr = String(userId);
    this.activeUserIds.add(userIdStr);

    // Ensure periodic refresh is running
    if (!this.periodicRefreshActive) {
      this.startPeriodicRefresh();
    }
  }

  /**
   * Mark a user as inactive to stop periodic refresh
   * @param userId User ID
   */
  public markUserAsInactive(userId: string | number): void {
    if (!userId) return;

    const userIdStr = String(userId);
    this.activeUserIds.delete(userIdStr);
  }

  /**
   * Get status for a specific user with caching and TTL
   * @param userId User ID
   * @returns User status or 'OFFLINE' if not found
   */
  getUserStatus(userId: string | number): UserStatus {
    if (!userId) return 'OFFLINE';

    const userIdStr = String(userId);

    // Mark this user as active for periodic refresh
    this.markUserAsActive(userIdStr);

    // Check cache first for better performance
    const cachedEntry = this.statusCache.get(userIdStr);
    if (cachedEntry && (Date.now() - cachedEntry.timestamp) <= this.STATUS_CACHE_TTL) {
      return cachedEntry.value;
    }

    // If cache is expired or not found, get from original service and cache it
    try {
      const status = this.userStatusService.getUserStatus(userId) as UserStatus;

      // Only cache valid status values
      if (status && ['ONLINE', 'AWAY', 'OFFLINE'].includes(status)) {
        this.setStatusWithTTL(userIdStr, status);
        return status;
      }
    } catch (error) {
      this.logStatus(`Error getting status for user ${userId}: ${error}`);
    }

    // If we have an expired cache entry, use it as fallback
    if (cachedEntry) {
      return cachedEntry.value;
    }

    // Default to OFFLINE if anything goes wrong
    return 'OFFLINE';
  }

  /**
   * Get an observable of status updates for a specific user
   * @param userId User ID
   * @returns Observable of user status
   */
  getUserStatusUpdates(userId: string | number): Observable<UserStatus> {
    if (!userId) return of('OFFLINE' as UserStatus);

    const userIdStr = String(userId);

    // Mark this user as active for periodic refresh
    this.markUserAsActive(userIdStr);

    // Return a filtered and mapped observable from the status map
    return this.userStatusMap$.pipe(
      map(statusMap => {
        const status = statusMap.get(userIdStr);

        // Validate the status value
        if (status && ['ONLINE', 'AWAY', 'OFFLINE'].includes(status)) {
          // Update the cache with the latest value
          this.setStatusWithTTL(userIdStr, status as UserStatus);
          return status as UserStatus;
        }

        // If no status in map, check cache
        const cachedEntry = this.statusCache.get(userIdStr);
        if (cachedEntry) {
          return cachedEntry.value;
        }

        // Default to OFFLINE if status is invalid or not found
        return 'OFFLINE' as UserStatus;
      }),
      distinctUntilChanged() // Only emit when status changes
    );
  }

  /**
   * Update a user's status
   * @param userId User ID
   * @param status New status
   */
  updateStatus(userId: string | number, status: UserStatus): void {
    if (!userId) return;

    this.logStatus(`Updating status for user ${userId} to ${status}`);
    this.statusUpdatesSubject.next({ userId, status });
  }

  /**
   * Update the current user's status
   * @param status New status
   */
  updateCurrentUserStatus(status: UserStatus): Observable<any> {
    this.logStatus(`Updating current user status to ${status}`);
    return this.userStatusService.updateStatus(status).pipe(
      tap(() => {
        this.logStatus(`Successfully updated current user status to ${status}`);
      }),
      catchError(error => {
        this.logStatus(`Error updating current user status: ${error}`);
        return EMPTY;
      })
    );
  }

  /**
   * Get last seen timestamp for a specific user with TTL
   * @param userId User ID
   * @returns Last seen timestamp or undefined if not found
   */
  getUserLastSeen(userId: string | number): Date | undefined {
    if (!userId) return undefined;

    const userIdStr = String(userId);

    // Check cache first for better performance
    const cachedEntry = this.lastSeenCache.get(userIdStr);
    if (cachedEntry && (Date.now() - cachedEntry.timestamp) <= this.LAST_SEEN_CACHE_TTL) {
      return cachedEntry.value;
    }

    try {
      // If cache is expired or not found, get from original service
      const lastSeen = this.userStatusService.getUserLastSeen(userId);

      // Validate the lastSeen date before caching
      if (lastSeen && lastSeen instanceof Date && !isNaN(lastSeen.getTime())) {
        this.setLastSeenWithTTL(userIdStr, lastSeen);
        return lastSeen;
      } else if (lastSeen) {
        // Try to parse the lastSeen if it's not a valid Date object
        try {
          const parsedDate = new Date(lastSeen);
          if (!isNaN(parsedDate.getTime())) {
            this.setLastSeenWithTTL(userIdStr, parsedDate);
            return parsedDate;
          }
        } catch (parseError) {
          this.logStatus(`Error parsing lastSeen date for user ${userId}: ${parseError}`);
        }
      }
    } catch (error) {
      this.logStatus(`Error getting lastSeen for user ${userId}: ${error}`);
    }

    // If we have an expired cache entry, use it as fallback
    if (cachedEntry) {
      return cachedEntry.value;
    }

    return undefined;
  }

  /**
   * Clear the status cache for a specific user or all users
   * @param userId Optional user ID to clear cache for
   */
  clearCache(userId?: string | number): void {
    if (userId) {
      const userIdStr = String(userId);
      this.statusCache.delete(userIdStr);
      this.lastSeenCache.delete(userIdStr);
      this.logStatus(`Cleared cache for user ${userIdStr}`);
    } else {
      this.statusCache.clear();
      this.lastSeenCache.clear();
      this.logStatus('Cleared all status caches');
    }
  }

  /**
   * Refresh user status data for a specific user
   * This method will clear the cache and fetch fresh data
   * @param userId User ID to refresh
   * @param force Whether to force refresh even if cache is valid
   */
  refreshUserStatus(userId: string | number, force: boolean = false): void {
    if (!userId) return;

    const userIdStr = String(userId);

    // Check if we've exceeded max refresh attempts
    const attempts = this.refreshAttempts.get(userIdStr) || 0;
    if (attempts >= this.MAX_REFRESH_ATTEMPTS && !force) {
      this.logStatus(`Skipping refresh for user ${userIdStr} - exceeded max attempts`);
      return;
    }

    // Increment refresh attempts
    this.refreshAttempts.set(userIdStr, attempts + 1);

    // Clear cache for this user
    this.statusCache.delete(userIdStr);
    this.lastSeenCache.delete(userIdStr);

    this.logStatus(`Refreshing status for user ${userIdStr} (attempt ${attempts + 1})`);

    // Get fresh status
    try {
      const status = this.userStatusService.getUserStatus(userId) as UserStatus;
      if (status) {
        // Update the status map
        const statusMap = new Map(this.userStatusMapSubject.value);
        statusMap.set(userIdStr, status);
        this.userStatusMapSubject.next(statusMap);

        // Update the cache with TTL
        this.setStatusWithTTL(userIdStr, status);

        // Reset refresh attempts on success
        this.refreshAttempts.set(userIdStr, 0);

        this.logStatus(`Successfully refreshed status for user ${userIdStr}: ${status}`);
      }
    } catch (error) {
      this.logStatus(`Error refreshing status for user ${userIdStr}: ${error}`);
    }
  }

  /**
   * Force refresh status for a specific user
   * This bypasses the max attempts limit
   * @param userId User ID to refresh
   */
  forceRefreshUserStatus(userId: string | number): void {
    if (!userId) return;

    this.refreshUserStatus(userId, true);
  }

  /**
   * Get status logs
   * @returns Array of log entries
   */
  getLogs(): string[] {
    return this.logSubject.value;
  }

  ngOnDestroy(): void {
    this.logStatus('StatusService destroyed, cleaning up subscriptions');
    this.subscriptions.unsubscribe();
    this.periodicRefreshActive = false;
    this.activeUserIds.clear();
  }
}

