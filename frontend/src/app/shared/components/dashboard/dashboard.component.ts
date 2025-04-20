import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';

import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopTabsComponent } from '../top-tabs/top-tabs.component';
import { ListViewComponent } from '../list-view/list-view.component';
import { MainScreenComponent } from '../main-screen/main-screen.component';


import { ResponsiveUtils } from '../../utils/responsive.utils';
import { Section } from '../../models/section.model';
import { Conversation } from '../../../features/chat/models/conversation.model';
import { AuthService } from '../../../core/auth/services/auth.service';
import { ChatService } from '../../../features/chat/services/chat.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatTabsModule,
    SidebarComponent,
    TopTabsComponent,
    ListViewComponent,
    MainScreenComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {

  activeSection: string = 'chats';
  activeConversation: Conversation | null = null;
  sections: Section[] = [
    { id: 'chats', icon: 'chat', label: 'Chats' },
    { id: 'contacts', icon: 'contacts', label: 'Contacts' },
    { id: 'people', icon: 'people', label: 'People' },
    { id: 'groups', icon: 'group', label: 'Groups' },
    { id: 'organizations', icon: 'business', label: 'Organizations' },
    { id: 'settings', icon: 'settings', label: 'Settings' }
  ];

  constructor(
    public responsiveUtils: ResponsiveUtils,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private chatService: ChatService
  ) {}

  ngOnInit(): void {
    // Initialize with no active conversation
    this.activeConversation = null;

    // Check if the user is authenticated
    this.authService.isAuthenticated$.subscribe(isAuthenticated => {
      if (!isAuthenticated) {
        this.router.navigate(['/auth/login']);
        return;
      }

      // Load conversations
      this.chatService.getConversations().subscribe();

      // Check if we have a conversation ID in the route
      this.route.paramMap.subscribe(params => {
        const conversationId = params.get('id');
        if (conversationId) {
          // Load the conversation
          this.chatService.getConversation(parseInt(conversationId)).subscribe(conversation => {
            // Convert the conversation type if needed
            this.activeConversation = {
              ...conversation,
              id: String(conversation.id) // Convert number to string
            } as Conversation;
          });
        }
      });
    });
  }

  onSectionChange(sectionId: string): void {
    this.activeSection = sectionId;
    // Clear active conversation when changing sections
    this.activeConversation = null;
  }

  onConversationSelected(conversation: Conversation): void {
    this.activeConversation = conversation;
    // Navigate to the conversation route
    this.router.navigate(['/chat', conversation.id]);
    // Load messages
    this.chatService.loadMessages(parseInt(conversation.id)).subscribe();
  }
}
