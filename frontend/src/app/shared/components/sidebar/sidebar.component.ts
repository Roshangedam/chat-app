import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Section } from '../../models/section.model';
import { AuthService } from '../../../core/auth/services/auth.service';
import { User } from '../../../core/auth/services/auth.service';
import { UserStatusService } from '../../../features/chat/api/services/user-status.service';
import { Subscription } from 'rxjs';
import { StatusIndicatorComponent } from '../status-indicator/status-indicator.component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    MatListModule,
    MatIconModule,
    MatDividerModule,
    MatButtonModule,
    MatMenuModule,
    MatBadgeModule,
    MatTooltipModule,
    StatusIndicatorComponent
  ],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Input() sections: Section[] = [];
  @Input() activeSection: string = '';
  @Input() compactMode: boolean = false;
  @Output() sectionChange = new EventEmitter<string>();

  currentUser: User | null = null;

  private subscriptions = new Subscription();

  constructor(
    private authService: AuthService,
    private userStatusService: UserStatusService
  ) {
    // Subscribe to user changes
    this.subscriptions.add(
      this.authService.currentUser$.subscribe(user => {
        this.currentUser = user;
      })
    );
  }

  ngOnInit(): void {
    // Subscribe to user status updates
    this.userStatusService.subscribeToUserStatus();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  onSectionClick(sectionId: string): void {
    this.sectionChange.emit(sectionId);
  }

  logout(): void {
    this.authService.logout();
  }

  /**
   * Get the current user's status, prioritizing real-time status
   */
  getUserStatus(): string {
    if (!this.currentUser) return 'OFFLINE';

    // First check if we have a real-time status from the UserStatusService
    const realTimeStatus = this.userStatusService.getUserStatus(this.currentUser.id);
    if (realTimeStatus) {
      return realTimeStatus;
    }

    // Fall back to the status stored in the user object
    return this.currentUser.status || 'OFFLINE';
  }
}
