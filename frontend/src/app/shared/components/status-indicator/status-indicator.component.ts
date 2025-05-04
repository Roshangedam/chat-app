import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { StatusService, UserStatus } from '../../services/status.service';

/**
 * A reusable component for displaying user status indicators
 * This component shows a colored dot indicating a user's online status
 */
@Component({
  selector: 'app-status-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="status-indicator" [ngClass]="statusClass"></span>
  `,
  styles: [`
    .status-indicator {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      border: 2px solid #ffffff;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
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
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatusIndicatorComponent implements OnInit, OnChanges, OnDestroy {
  @Input() userId: string | number | null = null;
  @Input() status: string | null = null;
  @Input() size: 'small' | 'normal' | 'large' = 'normal';

  // Memoized status class
  statusClass = 'offline';

  private subscriptions = new Subscription();
  private currentStatus: UserStatus = 'OFFLINE';
  private lastCheckedUserId: string | null = null;

  constructor(
    private statusService: StatusService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Initialize status class
    this.updateStatusClass();

    // Subscribe to status updates only for this specific user
    this.subscribeToStatusUpdates();
  }

  /**
   * Handle input changes
   */
  ngOnChanges(changes: SimpleChanges): void {
    // If userId changes, we need to resubscribe to status updates
    if (changes['userId'] && this.userId !== this.lastCheckedUserId) {
      // Unsubscribe from previous subscriptions
      this.subscriptions.unsubscribe();
      this.subscriptions = new Subscription();

      // Update last checked userId
      this.lastCheckedUserId = this.userId ? String(this.userId) : null;

      // Resubscribe with new userId
      this.subscribeToStatusUpdates();

      // Update status class immediately
      this.updateStatusClass();
    }

    // If status input changes directly, update the status class
    if (changes['status']) {
      this.updateStatusClass();
    }

    // If size changes, update the status class
    if (changes['size']) {
      this.updateStatusClass();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /**
   * Subscribe to status updates for the current userId
   */
  private subscribeToStatusUpdates(): void {
    if (!this.userId) return;

    // Try to refresh the status first to ensure we have the latest data
    this.statusService.refreshUserStatus(this.userId);

    // Subscribe to status updates
    this.subscriptions.add(
      this.statusService.getUserStatusUpdates(this.userId).subscribe(status => {
        console.log(`StatusIndicator: Received status update for user ${this.userId}: ${status}`);
        this.currentStatus = status;
        this.updateStatusClass();
        // Always mark for check to ensure the component is updated
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
        // Use the current status that we're tracking from the subscription
        statusValue = this.currentStatus.toLowerCase();
        console.log(`StatusIndicator: Using status ${statusValue} for user ${this.userId}`);
      } catch (error) {
        console.error(`StatusIndicator: Error using status for user ${this.userId}`, error);
        statusValue = 'offline'; // Default to offline on error
      }
    }
    // Second priority: Use the status input if provided
    else if (this.status) {
      // Normalize status value
      const normalizedStatus = this.status.toUpperCase();
      if (['ONLINE', 'AWAY', 'OFFLINE'].includes(normalizedStatus)) {
        statusValue = normalizedStatus.toLowerCase();
      } else {
        statusValue = 'offline'; // Default for invalid status
      }
    }
    // Default to offline
    else {
      statusValue = 'offline';
    }

    // Add size class
    const newStatusClass = `${statusValue} ${this.size}`;

    // Only update if the class has changed to avoid unnecessary renders
    if (this.statusClass !== newStatusClass) {
      console.log(`StatusIndicator: Updating status class from ${this.statusClass} to ${newStatusClass}`);
      this.statusClass = newStatusClass;
      this.cdr.markForCheck();
    }
  }
}
