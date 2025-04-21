import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Section } from '../../../features/chat/models/section.model';
import { AuthService } from '../../../core/auth/services/auth.service';
import { User } from '../../../core/auth/services/auth.service';

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
    MatTooltipModule
  ],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  @Input() sections: Section[] = [];
  @Input() activeSection: string = '';
  @Input() compactMode: boolean = false;
  @Output() sectionChange = new EventEmitter<string>();

  currentUser: User | null = null;

  constructor(private authService: AuthService) {
    // Subscribe to user changes
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  onSectionClick(sectionId: string): void {
    this.sectionChange.emit(sectionId);
  }

  logout(): void {
    this.authService.logout();
  }
}
