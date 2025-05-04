import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject, Subscription, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, shareReplay, tap } from 'rxjs/operators';
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
 * Service for optimized status handling with caching and debouncing
 * This service acts as a facade over the UserStatusService to provide
 * more robust status handling with caching and debouncing
 */
@Injectable({
  providedIn: 'root'
})
export class StatusService implements OnDestroy {
  // Cache for status values to prevent unnecessary API calls
  private statusCache = new Map<string, UserStatus>();
  // Cache for lastSeen timestamps to prevent unnecessary API calls
  private lastSeenCache = new Map<string, Date>();
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

  private subscriptions = new Subscription();

  constructor(private userStatusService: UserStatusService) {
    // Subscribe to status updates from the original service
    this.subscriptions.add(
      this.userStatusService.userStatus$.subscribe(statusMap => {
        // Process all status updates
        statusMap.forEach((status, userId) => {
          this.updateStatus(userId, status as UserStatus);
        });
      })
    );

    // Subscribe to lastSeen updates from the original service
    this.subscriptions.add(
      this.userStatusService.userLastSeen$.subscribe(lastSeenMap => {
        // Update the lastSeen cache
        lastSeenMap.forEach((lastSeen, userId) => {
          this.lastSeenCache.set(String(userId), lastSeen);
        });
      })
    );

    // Subscribe to force refresh events
    this.subscriptions.add(
      this.userStatusService.forceRefresh$.subscribe(() => {
        console.log('StatusService: Received force refresh event');
        // Create a new map to force change detection
        this.userStatusMapSubject.next(new Map(this.userStatusMapSubject.value));
      })
    );

    // Subscribe to our debounced status updates
    this.subscriptions.add(
      this.statusUpdates$.subscribe(update => {
        // Update the status cache
        this.statusCache.set(String(update.userId), update.status);

        // Update the status map for components
        const statusMap = this.userStatusMapSubject.value;
        statusMap.set(String(update.userId), update.status);
        this.userStatusMapSubject.next(new Map(statusMap));
      })
    );
  }

  /**
   * Get status for a specific user with caching
   * @param userId User ID
   * @returns User status or 'OFFLINE' if not found
   */
  getUserStatus(userId: string | number): UserStatus {
    if (!userId) return 'OFFLINE';

    const userIdStr = String(userId);

    // Check cache first for better performance
    if (this.statusCache.has(userIdStr)) {
      return this.statusCache.get(userIdStr)!;
    }

    // If not in cache, get from original service and cache it
    try {
      const status = this.userStatusService.getUserStatus(userId) as UserStatus;

      // Only cache valid status values
      if (status && ['ONLINE', 'AWAY', 'OFFLINE'].includes(status)) {
        this.statusCache.set(userIdStr, status);
        return status;
      }
    } catch (error) {
      console.error(`StatusService: Error getting status for user ${userId}`, error);
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

    // Return a filtered and mapped observable from the status map
    return this.userStatusMap$.pipe(
      map(statusMap => {
        const status = statusMap.get(userIdStr);

        // Validate the status value
        if (status && ['ONLINE', 'AWAY', 'OFFLINE'].includes(status)) {
          // Update the cache with the latest value
          this.statusCache.set(userIdStr, status as UserStatus);
          return status as UserStatus;
        }

        // Default to OFFLINE if status is invalid
        return 'OFFLINE' as UserStatus;
      })
    );
  }

  /**
   * Update a user's status
   * @param userId User ID
   * @param status New status
   */
  updateStatus(userId: string | number, status: UserStatus): void {
    if (!userId) return;

    this.statusUpdatesSubject.next({ userId, status });
  }

  /**
   * Update the current user's status
   * @param status New status
   */
  updateCurrentUserStatus(status: UserStatus): Observable<any> {
    return this.userStatusService.updateStatus(status);
  }

  /**
   * Get last seen timestamp for a specific user
   * @param userId User ID
   * @returns Last seen timestamp or undefined if not found
   */
  getUserLastSeen(userId: string | number): Date | undefined {
    if (!userId) return undefined;

    const userIdStr = String(userId);

    // Check cache first for better performance
    if (this.lastSeenCache.has(userIdStr)) {
      return this.lastSeenCache.get(userIdStr);
    }

    try {
      // If not in cache, get from original service
      const lastSeen = this.userStatusService.getUserLastSeen(userId);

      // Validate the lastSeen date before caching
      if (lastSeen && lastSeen instanceof Date && !isNaN(lastSeen.getTime())) {
        this.lastSeenCache.set(userIdStr, lastSeen);
        return lastSeen;
      } else if (lastSeen) {
        // Try to parse the lastSeen if it's not a valid Date object
        try {
          const parsedDate = new Date(lastSeen);
          if (!isNaN(parsedDate.getTime())) {
            this.lastSeenCache.set(userIdStr, parsedDate);
            return parsedDate;
          }
        } catch (parseError) {
          console.error(`StatusService: Error parsing lastSeen date for user ${userId}`, parseError);
        }
      }
    } catch (error) {
      console.error(`StatusService: Error getting lastSeen for user ${userId}`, error);
    }

    return undefined;
  }

  /**
   * Clear the status cache for a specific user or all users
   * @param userId Optional user ID to clear cache for
   */
  clearCache(userId?: string | number): void {
    if (userId) {
      this.statusCache.delete(String(userId));
      this.lastSeenCache.delete(String(userId));
    } else {
      this.statusCache.clear();
      this.lastSeenCache.clear();
    }
  }

  /**
   * Refresh user status data for a specific user
   * This method will clear the cache and fetch fresh data
   * @param userId User ID to refresh
   */
  refreshUserStatus(userId: string | number): void {
    if (!userId) return;

    const userIdStr = String(userId);

    // Clear cache for this user
    this.statusCache.delete(userIdStr);
    this.lastSeenCache.delete(userIdStr);

    // Get fresh status
    try {
      const status = this.userStatusService.getUserStatus(userId) as UserStatus;
      if (status) {
        // Update the status map
        const statusMap = this.userStatusMapSubject.value;
        statusMap.set(userIdStr, status);
        this.userStatusMapSubject.next(new Map(statusMap));

        // Update the cache
        this.statusCache.set(userIdStr, status);
      }
    } catch (error) {
      console.error(`StatusService: Error refreshing status for user ${userId}`, error);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}

