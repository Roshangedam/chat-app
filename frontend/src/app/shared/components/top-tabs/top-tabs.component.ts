import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';

import { Section } from '../../../features/chat/models/section.model';
import { AuthService } from '../../../core/auth/services/auth.service';
import { User } from '../../../core/auth/services/auth.service';

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
export class TopTabsComponent {
  @Input() sections: Section[] = [];
  @Input() activeSection: string = '';
  @Output() sectionChange = new EventEmitter<string>();

  currentUser: User | null = null;

  constructor(private authService: AuthService) {
    // Subscribe to user changes
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
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
}
