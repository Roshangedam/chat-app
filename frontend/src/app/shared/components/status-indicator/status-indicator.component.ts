import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { StatusService, UserStatus } from '../../services/status.service';

/**
 * A reusable component for displaying user status indicators
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
export class StatusIndicatorComponent implements OnInit, OnDestroy {
  @Input() userId: string | number | null = null;
  @Input() status: string | null = null;
  @Input() size: 'small' | 'normal' | 'large' = 'normal';

  // Memoized status class
  statusClass = 'offline';

  private subscriptions = new Subscription();
  private currentStatus: UserStatus = 'OFFLINE';

  constructor(
    private statusService: StatusService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.updateStatusClass();

    // Subscribe to status updates only for this specific user
    if (this.userId) {
      this.subscriptions.add(
        this.statusService.getUserStatusUpdates(this.userId).subscribe(status => {
          if (status !== this.currentStatus) {
            this.currentStatus = status;
            this.updateStatusClass();
            this.cdr.markForCheck();
          }
        })
      );
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /**
   * Update the status class based on current status
   */
  private updateStatusClass(): void {
    let statusValue = '';

    // First priority: Use the status from the StatusService if we have a userId
    if (this.userId) {
      this.currentStatus = this.statusService.getUserStatus(this.userId);
      statusValue = this.currentStatus.toLowerCase();
    }
    // Second priority: Use the status input if provided
    else if (this.status) {
      statusValue = this.status.toLowerCase();
    }
    // Default to offline
    else {
      statusValue = 'offline';
    }

    // Add size class
    this.statusClass = `${statusValue} ${this.size}`;
  }
}
