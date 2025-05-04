import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, OnChanges, SimpleChanges, NgZone, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, Subject, timer } from 'rxjs';
import { StatusService, UserStatus } from '../../services/status.service';
import { takeUntil, debounceTime, distinctUntilChanged, filter, take } from 'rxjs/operators';

/**
 * A reusable component for displaying user status indicators
 * This component shows a colored dot indicating a user's online status
 * Uses OnPush change detection for better performance
 */
@Component({
  selector: 'app-status-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span
      class="status-indicator"
      [ngClass]="statusClass"
      [class.pulse]="isRefreshing"
      (click)="onStatusClick($event)">
    </span>
  `,
  styles: [`
    .status-indicator {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      border: 2px solid #ffffff;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
      transition: all 0.3s ease;
      cursor: pointer;
    }

    .status-indicator:hover {
      transform: scale(1.1);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }

    .status-indicator.online {
      background-color: #4caf50;
    }

    .status-indicator.away {
      background-color: #ff9800;
    }

    .status-indicator.offline {
      background-color: #9e9e9e;
    }

    /* Sizes */
    .status-indicator.small {
      width: 8px;
      height: 8px;
      border-width: 1px;
    }

    .status-indicator.large {
      width: 12px;
      height: 12px;
      border-width: 2px;
    }

    /* Pulse animation for refreshing state */
    @keyframes pulse {
      0% {
        transform: scale(1);
        opacity: 1;
      }
      50% {
        transform: scale(1.1);
        opacity: 0.7;
      }
      100% {
        transform: scale(1);
        opacity: 1;
      }
    }

    .status-indicator.pulse {
      animation: pulse 1.5s infinite ease-in-out;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatusIndicatorComponent implements OnInit, OnChanges, OnDestroy {
  @Input() userId: string | number | null = null;
  @Input() status: string | null = null;
  @Input() size: 'small' | 'normal' | 'large' = 'normal';
  @Input() refreshInterval: number = 0; // Set to positive number to enable auto-refresh (in ms)

  @Output() statusChange = new EventEmitter<UserStatus>();
  @Output() statusClick = new EventEmitter<{userId: string | number | null, status: UserStatus}>();

  // Memoized status class
  statusClass = 'offline';
  isRefreshing = false;

  private subscriptions = new Subscription();
  private destroy$ = new Subject<void>();
  private currentStatus: UserStatus = 'OFFLINE';
  private lastCheckedUserId: string | null = null;
  private autoRefreshSubscription: Subscription | null = null;
  private statusUpdateSubject = new Subject<UserStatus>();

  constructor(
    private statusService: StatusService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {
    // Set up debounced status change emitter
    this.statusUpdateSubject.pipe(
      takeUntil(this.destroy$),
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(status => {
      this.statusChange.emit(status);
    });
  }

  ngOnInit(): void {
    // Initialize status class
    this.updateStatusClass();

    // Subscribe to status updates only for this specific user
    this.subscribeToStatusUpdates();

    // Set up auto-refresh if enabled
    this.setupAutoRefresh();
  }

  /**
   * Handle input changes
   */
  ngOnChanges(changes: SimpleChanges): void {
    let needsResubscribe = false;
    let needsStatusUpdate = false;

    // If userId changes, we need to resubscribe to status updates
    if (changes['userId'] && this.userId !== this.lastCheckedUserId) {
      needsResubscribe = true;
      needsStatusUpdate = true;
    }

    // If status input changes directly, update the status class
    if (changes['status']) {
      needsStatusUpdate = true;
    }

    // If size changes, update the status class
    if (changes['size']) {
      needsStatusUpdate = true;
    }

    // If refresh interval changes, update auto-refresh
    if (changes['refreshInterval']) {
      this.setupAutoRefresh();
    }

    // Handle resubscription if needed
    if (needsResubscribe) {
      // Unsubscribe from previous subscriptions
      this.subscriptions.unsubscribe();
      this.subscriptions = new Subscription();

      // Update last checked userId
      this.lastCheckedUserId = this.userId ? String(this.userId) : null;

      // Resubscribe with new userId
      this.subscribeToStatusUpdates();
    }

    // Update status class if needed
    if (needsStatusUpdate) {
      this.updateStatusClass();
    }
  }

  ngOnDestroy(): void {
    // Clean up all subscriptions
    this.subscriptions.unsubscribe();
    if (this.autoRefreshSubscription) {
      this.autoRefreshSubscription.unsubscribe();
    }

    // Complete and clean up subjects
    this.destroy$.next();
    this.destroy$.complete();
    this.statusUpdateSubject.complete();

    // If this user was marked as active, mark as inactive
    if (this.userId) {
      this.statusService.markUserAsInactive(this.userId);
    }
  }

  /**
   * Handle status indicator click
   * @param event Click event
   */
  onStatusClick(event: MouseEvent): void {
    event.stopPropagation();

    // Emit the click event with current status
    this.statusClick.emit({
      userId: this.userId,
      status: this.currentStatus
    });

    // Force refresh the status
    this.refreshStatus();
  }

  /**
   * Manually refresh the status
   */
  refreshStatus(): void {
    if (!this.userId) return;

    // Show refreshing animation
    this.isRefreshing = true;
    this.cdr.markForCheck();

    // Force refresh the status
    this.statusService.forceRefreshUserStatus(this.userId);

    // Hide refreshing animation after a delay
    timer(1500).pipe(take(1)).subscribe(() => {
      this.isRefreshing = false;
      this.cdr.markForCheck();
    });
  }

  /**
   * Set up auto-refresh if enabled
   */
  private setupAutoRefresh(): void {
    // Clean up existing auto-refresh
    if (this.autoRefreshSubscription) {
      this.autoRefreshSubscription.unsubscribe();
      this.autoRefreshSubscription = null;
    }

    // Set up new auto-refresh if interval is positive
    if (this.refreshInterval > 0 && this.userId) {
      // Run outside Angular zone to avoid triggering change detection
      this.ngZone.runOutsideAngular(() => {
        this.autoRefreshSubscription = timer(this.refreshInterval, this.refreshInterval)
          .pipe(takeUntil(this.destroy$))
          .subscribe(() => {
            // Run back inside Angular zone when refreshing
            this.ngZone.run(() => {
              if (this.userId) {
                this.statusService.refreshUserStatus(this.userId);
              }
            });
          });
      });
    }
  }

  /**
   * Subscribe to status updates for the current userId
   */
  private subscribeToStatusUpdates(): void {
    if (!this.userId) return;

    // Mark this user as active for periodic refresh
    this.statusService.markUserAsActive(this.userId);

    // Try to refresh the status first to ensure we have the latest data
    this.statusService.refreshUserStatus(this.userId);

    // Subscribe to status updates
    this.subscriptions.add(
      this.statusService.getUserStatusUpdates(this.userId)
        .pipe(
          takeUntil(this.destroy$),
          filter(status => status !== this.currentStatus) // Only process changes
        )
        .subscribe(status => {
          this.currentStatus = status;
          this.updateStatusClass();

          // Emit the status change
          this.statusUpdateSubject.next(status);

          // Trigger change detection
          this.cdr.markForCheck();
        })
    );
  }

  /**
   * Update the status class based on current status
   */
  private updateStatusClass(): void {
    let statusValue = '';

    // First priority: Use the status from the StatusService if we have a userId
    if (this.userId) {
      try {
        this.currentStatus = this.statusService.getUserStatus(this.userId);
        statusValue = this.currentStatus.toLowerCase();
      } catch (error) {
        console.error(`StatusIndicator: Error getting status for user ${this.userId}`, error);
        statusValue = 'offline'; // Default to offline on error
      }
    }
    // Second priority: Use the status input if provided
    else if (this.status) {
      // Normalize status value
      const normalizedStatus = this.status.toUpperCase();
      if (['ONLINE', 'AWAY', 'OFFLINE'].includes(normalizedStatus)) {
        statusValue = normalizedStatus.toLowerCase();
        this.currentStatus = normalizedStatus as UserStatus;
      } else {
        statusValue = 'offline'; // Default for invalid status
        this.currentStatus = 'OFFLINE';
      }
    }
    // Default to offline
    else {
      statusValue = 'offline';
      this.currentStatus = 'OFFLINE';
    }

    // Add size class
    this.statusClass = `${statusValue} ${this.size}`;
  }
}
