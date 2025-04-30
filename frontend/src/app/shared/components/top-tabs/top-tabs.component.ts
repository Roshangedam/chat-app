import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';

import { Section } from '../../models/section.model';
import { AuthService } from '../../../core/auth/services/auth.service';
import { User } from '../../../core/auth/services/auth.service';
import { UserStatusService } from '../../../features/chat/api/services/user-status.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-top-tabs',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatIconModule,
    MatBadgeModule,
    MatButtonModule,
    MatMenuModule
  ],
  templateUrl: './top-tabs.component.html',
  styleUrls: ['./top-tabs.component.css']
})
export class TopTabsComponent implements OnInit, OnDestroy {
  @Input() sections: Section[] = [];
  @Input() activeSection: string = '';
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

  onTabChange(event: any): void {
    const sectionId = this.sections[event.index].id;
    this.sectionChange.emit(sectionId);
  }

  getTabIndex(): number {
    return this.sections.findIndex(section => section.id === this.activeSection);
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
