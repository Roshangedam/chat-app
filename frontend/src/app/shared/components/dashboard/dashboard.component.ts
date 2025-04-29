import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

// Import the user list component
import { UserListComponent } from '../../../features/chat/components/user-list/user-list.component';
import { UserService } from '../../../features/chat/api/services/user.service';
import { Subscription } from 'rxjs';

import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopTabsComponent } from '../top-tabs/top-tabs.component';
import { ListViewComponent } from '../list-view/list-view.component';
import { MainScreenComponent } from '../main-screen/main-screen.component';
import { ChatHeaderComponent } from '../../../features/chat/components/conversation/chat-header/chat-header.component';

import { ResponsiveUtils } from '../../utils/responsive.utils';
import { AuthService } from '../../../core/auth/services/auth.service';
// Import the chat service and models
import { ChatService } from '../../../features/chat/api/services/chat.service';
import { ChatConversation, ChatUser } from '../../../features/chat/api/models';
import { Section } from '../../models/section.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatTabsModule,
    MatTooltipModule,
    MatMenuModule,
    MatFormFieldModule,
    MatInputModule,
    SidebarComponent,
    TopTabsComponent,
    ListViewComponent,
    MainScreenComponent,
    UserListComponent,
    ChatHeaderComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {

  activeSection: string = 'chats';
  activeConversation: ChatConversation | null = null;
  sections: Section[] = [
    { id: 'chats', icon: 'chat', label: 'Chats' },
    { id: 'contacts', icon: 'contacts', label: 'Contacts' },
    { id: 'people', icon: 'people', label: 'People' },
    { id: 'groups', icon: 'group', label: 'Groups' },
    { id: 'organizations', icon: 'business', label: 'Organizations' },
    { id: 'settings', icon: 'settings', label: 'Settings' }
  ];

  // Add future feature flags
  featureFlags = {
    enableCalls: false,
    enableVideoChat: false,
    enableScreenSharing: false
  };

  // Search query for filtering conversations and contacts
  searchQuery: string = '';

  // Current user information
  currentUser: any = null;

  private subscriptions = new Subscription();

  constructor(
    public responsiveUtils: ResponsiveUtils,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private chatService: ChatService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    // Initialize with no active conversation
    this.activeConversation = null;

    // Check if the user is authenticated
    const authSub = this.authService.isAuthenticated$.subscribe(isAuthenticated => {
      if (!isAuthenticated) {
        this.router.navigate(['/auth/login']);
        return;
      }

      // Get current user information
      this.currentUser = this.authService.getCurrentUser();

      // Initialize the chat service with the auth token
      const token = localStorage.getItem('token');
      console.log('Dashboard: Token from localStorage:', token ? 'Token exists' : 'No token');

      if (token) {
        console.log('Dashboard: Initializing chat service with token');
        this.chatService.initialize(token);

        // Load users for the chat feature
        console.log('Dashboard: Loading users');
        this.userService.loadUsers().subscribe({
          next: (users) => console.log(`Dashboard: Loaded ${users.length} users`),
          error: (err) => console.error('Dashboard: Error loading users:', err)
        });

        // Load conversations
        console.log('Dashboard: Loading conversations');
        this.chatService.loadConversations().subscribe({
          next: (conversations) => console.log(`Dashboard: Loaded ${conversations.length} conversations`),
          error: (err) => console.error('Dashboard: Error loading conversations:', err)
        });
      } else {
        console.error('Dashboard: No token available, cannot initialize chat service');
        // Try to get a new token by refreshing
        this.authService.refreshToken().subscribe({
          next: () => {
            console.log('Dashboard: Token refreshed successfully');
            const newToken = localStorage.getItem('token');
            if (newToken) {
              console.log('Dashboard: Initializing chat service with new token');
              this.chatService.initialize(newToken);

              // Load users and conversations with the new token
              this.userService.loadUsers().subscribe();
              this.chatService.loadConversations().subscribe();
            }
          },
          error: (err) => {
            console.error('Dashboard: Error refreshing token:', err);
            // Redirect to login if token refresh fails
            this.router.navigate(['/auth/login']);
          }
        });
      }

      // Check if we have a conversation ID in the route params or query params
      const routeSub = this.route.paramMap.subscribe(params => {
        const conversationId = params.get('id');
        if (conversationId) {
          this.loadConversationById(conversationId);
        } else {
          // Check query params
          this.route.queryParamMap.subscribe(queryParams => {
            const queryConversationId = queryParams.get('conversationId');
            if (queryConversationId) {
              this.loadConversationById(queryConversationId);
            }
          });
        }
      });

      this.subscriptions.add(routeSub);
    });

    this.subscriptions.add(authSub);
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.subscriptions.unsubscribe();
  }

  onSectionChange(sectionId: string): void {
    this.activeSection = sectionId;
    // Clear active conversation when changing sections
    this.activeConversation = null;
  }

  onConversationSelected(conversation: any): void {
    console.log(`Dashboard: Conversation selected: ${conversation.id}`);

    // Set the conversation as active
    this.activeConversation = conversation;

    // Set the active conversation in the chat service
    console.log(`Dashboard: Getting conversation details for: ${conversation.id}`);
    this.chatService.getConversation(conversation.id).subscribe({
      next: (chatConversation) => {
        console.log(`Dashboard: Got conversation details for: ${chatConversation.id}`);
        this.chatService.setActiveConversation(chatConversation);

        // Navigate to the conversation route
        this.router.navigate(['/dashboard'], { queryParams: { conversationId: conversation.id } });

        // Load messages
        console.log(`Dashboard: Loading messages for conversation: ${chatConversation.id}`);
        this.chatService.loadMessages().subscribe({
          next: (messages) => console.log(`Dashboard: Loaded ${messages.length} messages`),
          error: (err) => console.error(`Dashboard: Error loading messages:`, err)
        });
      },
      error: (err) => {
        console.error(`Dashboard: Error getting conversation details for ${conversation.id}:`, err);

        // Check if it's an authentication error
        if (err.status === 401) {
          console.log('Dashboard: Authentication error, refreshing token');

          // Try to refresh the token
          this.authService.refreshToken().subscribe({
            next: () => {
              console.log('Dashboard: Token refreshed successfully, retrying conversation selection');
              // Retry selecting the conversation with the new token
              this.onConversationSelected(conversation);
            },
            error: (refreshErr) => {
              console.error('Dashboard: Error refreshing token:', refreshErr);
              // Redirect to login if token refresh fails
              this.router.navigate(['/auth/login']);
            }
          });
        }
      }
    });
  }

  /**
   * Handle back button click from the chat container
   */
  onBackClicked(): void {
    this.activeConversation = null;
    this.chatService.setActiveConversation(null);
    this.router.navigate(['/dashboard']);
  }

  /**
   * Load a conversation by ID and set it as active
   * @param conversationId The ID of the conversation to load
   */
  private loadConversationById(conversationId: string): void {
    console.log(`Dashboard: Loading conversation by ID: ${conversationId}`);

    // Load the conversation
    this.chatService.getConversation(conversationId).subscribe({
      next: (conversation) => {
        console.log(`Dashboard: Loaded conversation: ${conversation.id}`);

        // Set as active in the chat service
        this.chatService.setActiveConversation(conversation);

        // Set as active conversation
        this.activeConversation = conversation;

        // Load messages
        console.log(`Dashboard: Loading messages for conversation: ${conversation.id}`);
        this.chatService.loadMessages().subscribe({
          next: (messages) => console.log(`Dashboard: Loaded ${messages.length} messages`),
          error: (err) => console.error(`Dashboard: Error loading messages:`, err)
        });
      },
      error: (err) => {
        console.error(`Dashboard: Error loading conversation ${conversationId}:`, err);

        // Check if it's an authentication error
        if (err.status === 401) {
          console.log('Dashboard: Authentication error, refreshing token');

          // Try to refresh the token
          this.authService.refreshToken().subscribe({
            next: () => {
              console.log('Dashboard: Token refreshed successfully, retrying conversation load');
              // Retry loading the conversation with the new token
              this.loadConversationById(conversationId);
            },
            error: (refreshErr) => {
              console.error('Dashboard: Error refreshing token:', refreshErr);
              // Redirect to login if token refresh fails
              this.router.navigate(['/auth/login']);
            }
          });
        }
      }
    });
  }

  /**
   * Handle starting a chat with a user
   * @param user The user to chat with
   */
  onStartChat(user: ChatUser): void {
    // Create a one-to-one conversation
    this.chatService.createOneToOneConversation(user.id).subscribe({
      next: (conversation) => {
        // Set as active conversation
        this.chatService.setActiveConversation(conversation);
        this.activeConversation = conversation;
      },
      error: (err) => {
        console.error('Error creating conversation:', err);
      }
    });
  }

  /**
   * Methods for future features
   * These are placeholders for future functionality
   */

  /**
   * Start a voice call with the current conversation
   * This is a placeholder for future functionality
   */
  startVoiceCall(): void {
    if (!this.activeConversation) return;

    console.log('Starting voice call with conversation:', this.activeConversation.id);
    // Implementation will be added when the call feature is developed
  }

  /**
   * Start a video call with the current conversation
   * This is a placeholder for future functionality
   */
  startVideoCall(): void {
    if (!this.activeConversation) return;

    console.log('Starting video call with conversation:', this.activeConversation.id);
    // Implementation will be added when the video call feature is developed
  }

  /**
   * Share screen with the current conversation
   * This is a placeholder for future functionality
   */
  shareScreen(): void {
    if (!this.activeConversation) return;

    console.log('Sharing screen with conversation:', this.activeConversation.id);
    // Implementation will be added when the screen sharing feature is developed
  }

  /**
   * Get the avatar URL for a conversation
   * @param conversation The conversation to get the avatar for
   * @returns The avatar URL or a default avatar
   */
  getConversationAvatar(conversation: any): string {
    if (!conversation) return 'assets/images/default-avatar.png';

    // If it's a group chat, use the conversation avatar
    if (conversation.groupChat && conversation.avatarUrl) {
      return conversation.avatarUrl;
    }

    // For one-to-one chats, use the other participant's avatar
    if (conversation.participants && conversation.participants.length > 0) {
      // Find the other participant (not the current user)
      const otherParticipant = conversation.participants.find((p: any) =>
        p.id !== this.currentUser?.id && p.userId !== this.currentUser?.id
      );

      if (otherParticipant && otherParticipant.avatarUrl) {
        return otherParticipant.avatarUrl;
      }
    }

    // Default avatar if no other is found
    return 'assets/images/default-avatar.png';
  }

  /**
   * Get the display name for a conversation
   * @param conversation The conversation to get the name for
   * @returns The conversation name
   */
  getConversationName(conversation: any): string {
    if (!conversation) return 'No Conversation Selected';

    // If it's a group chat, use the conversation name
    if (conversation.groupChat && conversation.name) {
      return conversation.name;
    }

    // For one-to-one chats, use the other participant's name
    if (conversation.participants && conversation.participants.length > 0) {
      // Find the other participant (not the current user)
      const otherParticipant = conversation.participants.find((p: any) =>
        p.id !== this.currentUser?.id && p.userId !== this.currentUser?.id
      );

      if (otherParticipant) {
        return otherParticipant.fullName || otherParticipant.username || 'Unknown User';
      }
    }

    // Default name if no other is found
    return conversation.name || 'Unnamed Conversation';
  }

  /**
   * Get the status for a conversation
   * @param conversation The conversation to get the status for
   * @returns The conversation status
   */
  getConversationStatus(conversation: any): string {
    if (!conversation) return '';

    // If it's a group chat, show the number of participants
    if (conversation.groupChat && conversation.participants) {
      return `${conversation.participants.length} participants`;
    }

    // For one-to-one chats, show the other participant's status
    if (conversation.participants && conversation.participants.length > 0) {
      // Find the other participant (not the current user)
      const otherParticipant = conversation.participants.find((p: any) =>
        p.id !== this.currentUser?.id && p.userId !== this.currentUser?.id
      );

      if (otherParticipant) {
        return otherParticipant.status || 'offline';
      }
    }

    // Default status if no other is found
    return '';
  }

  /**
   * Log out the current user
   */
  logout(): void {
    this.authService.logout();
    // The AuthService.logout() method already handles navigation to login page
  }

  /**
   * Handle menu actions from the chat header
   * @param action The action to perform
   */
  onMenuAction(action: string): void {
    console.log(`Dashboard: Menu action: ${action}`);

    switch (action) {
      case 'search':
        // Implement search functionality
        console.log('Dashboard: Search action');
        break;
      case 'participants':
        // Show participants for group chats
        console.log('Dashboard: View participants action');
        break;
      case 'mute':
        // Mute notifications for this conversation
        console.log('Dashboard: Mute notifications action');
        break;
      case 'voice-call':
        this.startVoiceCall();
        break;
      case 'video-call':
        this.startVideoCall();
        break;
      default:
        console.log(`Dashboard: Unknown menu action: ${action}`);
    }
  }
}
