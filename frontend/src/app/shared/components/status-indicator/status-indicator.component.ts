import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { UserStatusService } from '../../../features/chat/api/services/user-status.service';

/**
 * A reusable component for displaying user status indicators
 */
@Component({
  selector: 'app-status-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="status-indicator" [ngClass]="getStatusClass()"></span>
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
  `]
})
export class StatusIndicatorComponent implements OnInit, OnDestroy {
  @Input() userId: string | number | null = null;
  @Input() status: string | null = null;
  @Input() size: 'small' | 'normal' | 'large' = 'normal';
  
  private subscriptions = new Subscription();
  
  constructor(private userStatusService: UserStatusService) {}
  
  ngOnInit(): void {
    // Subscribe to status updates if we have a userId
    if (this.userId) {
      this.subscriptions.add(
        this.userStatusService.userStatus$.subscribe(() => {
          // Component will re-render when status updates
        })
      );
    }
  }
  
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
  
  /**
   * Get the CSS class for the current status
   */
  getStatusClass(): string {
    let statusClass = '';
    
    // First priority: Use the status from the UserStatusService if we have a userId
    if (this.userId) {
      statusClass = this.userStatusService.getUserStatus(this.userId).toLowerCase();
    } 
    // Second priority: Use the status input if provided
    else if (this.status) {
      statusClass = this.status.toLowerCase();
    } 
    // Default to offline
    else {
      statusClass = 'offline';
    }
    
    // Add size class
    return `${statusClass} ${this.size}`;
  }
}
