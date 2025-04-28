import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject, Subscription, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, map, shareReplay, tap } from 'rxjs/operators';
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
 */
@Injectable({
  providedIn: 'root'
})
export class StatusService implements OnDestroy {
  private statusCache = new Map<string, UserStatus>();
  private statusUpdatesSubject = new Subject<StatusUpdate>();
  private statusUpdates$ = this.statusUpdatesSubject.asObservable().pipe(
    debounceTime(300), // Debounce status updates
    distinctUntilChanged((prev, curr) =>
      String(prev.userId) === String(curr.userId) && prev.status === curr.status
    ),
    shareReplay(1)
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

    // Check cache first
    if (this.statusCache.has(userIdStr)) {
      return this.statusCache.get(userIdStr)!;
    }

    // If not in cache, get from original service and cache it
    const status = this.userStatusService.getUserStatus(userId) as UserStatus;
    this.statusCache.set(userIdStr, status);

    return status;
  }

  /**
   * Get an observable of status updates for a specific user
   * @param userId User ID
   * @returns Observable of user status
   */
  getUserStatusUpdates(userId: string | number): Observable<UserStatus> {
    if (!userId) return of('OFFLINE' as UserStatus);

    const userIdStr = String(userId);

    return this.userStatusMap$.pipe(
      map(statusMap => statusMap.get(userIdStr) || 'OFFLINE' as UserStatus)
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
   * Clear the status cache for a specific user or all users
   * @param userId Optional user ID to clear cache for
   */
  clearCache(userId?: string | number): void {
    if (userId) {
      this.statusCache.delete(String(userId));
    } else {
      this.statusCache.clear();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}

