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
import { UserListComponent } from '../../../features/chat/components/user/user-list/user-list.component';
import { UserService } from '../../../features/chat/api/services/user.service';
import { ChatUser } from '../../../features/chat/api/models';
import { Subscription } from 'rxjs';

import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopTabsComponent } from '../top-tabs/top-tabs.component';
import { ListViewComponent } from '../list-view/list-view.component';
import { MainScreenComponent } from '../main-screen/main-screen.component';

import { ResponsiveUtils } from '../../utils/responsive.utils';
import { Section } from '../../../features/chat/models/section.model';
import { AuthService } from '../../../core/auth/services/auth.service';
// Import the new chat service and models
import { ChatService as NewChatService } from '../../../features/chat/api/services/chat.service';
import { ChatConversation } from '../../../features/chat/api/models';
// Keep the old service for backward compatibility during transition
import { ChatService, Conversation } from '../../../features/chat/services/chat.service';
// Import the model conversation for type compatibility
import { Conversation as ModelConversation } from '../../../features/chat/models/conversation.model';

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
    UserListComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {

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
    private newChatService: NewChatService,
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
      this.authService.getCurrentUser().subscribe(user => {
        this.currentUser = user;
      });

      // Initialize the new chat service with the auth token
      const token = localStorage.getItem('token');
      if (token) {
        this.newChatService.initialize(token);

        // Load users for the chat feature
        this.userService.loadUsers().subscribe();
      }

      // Load conversations using the new chat service
      this.newChatService.loadConversations().subscribe();

      // Also load conversations using the old service for backward compatibility
      this.chatService.getConversations().subscribe();

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
    // Convert to the expected Conversation type
    const typedConversation = this.convertToServiceConversation(conversation);
    this.activeConversation = typedConversation;

    // Set the active conversation in the new chat service
    this.newChatService.getConversation(typedConversation.id).subscribe(chatConversation => {
      this.newChatService.setActiveConversation(chatConversation);
    });

    // Navigate to the conversation route
    this.router.navigate(['/dashboard'], { queryParams: { conversationId: typedConversation.id } });

    // Load messages using both services for backward compatibility
    if (typeof typedConversation.id === 'string') {
      this.chatService.loadMessages(parseInt(typedConversation.id)).subscribe();
    } else {
      this.chatService.loadMessages(typedConversation.id as number).subscribe();
    }
    this.newChatService.loadMessages().subscribe();
  }

  /**
   * Handle back button click from the chat container
   */
  onBackClicked(): void {
    this.activeConversation = null;
    this.newChatService.setActiveConversation(null);
    this.router.navigate(['/dashboard']);
  }

  /**
   * Load a conversation by ID and set it as active
   * @param conversationId The ID of the conversation to load
   */
  private loadConversationById(conversationId: string): void {
    // Load the conversation using the new chat service
    this.newChatService.getConversation(conversationId).subscribe(conversation => {
      // Set as active in the new chat service
      this.newChatService.setActiveConversation(conversation);

      // Convert the conversation type for the old components
      this.activeConversation = {
        ...conversation,
        id: String(conversation.id),
        participants: conversation.participants || [],
        createdAt: conversation.createdAt ? new Date(conversation.createdAt) : undefined,
        updatedAt: conversation.updatedAt ? new Date(conversation.updatedAt) : undefined
      } as unknown as Conversation;

      // Load messages
      this.newChatService.loadMessages().subscribe();
    });
  }

  /**
   * Handle starting a chat with a user
   * @param user The user to chat with
   */
  onStartChat(user: ChatUser): void {
    // Create a one-to-one conversation
    this.newChatService.createOneToOneConversation(user.id).subscribe({
      next: (conversation) => {
        // Set as active conversation
        this.newChatService.setActiveConversation(conversation);

        // Convert to old format for backward compatibility
        this.activeConversation = {
          id: String(conversation.id),
          name: conversation.name,
          description: conversation.description,
          avatarUrl: conversation.avatarUrl,
          groupChat: conversation.groupChat,
          creatorId: Number(conversation.creatorId),
          creatorUsername: conversation.creatorUsername,
          participants: conversation.participants || [],
          createdAt: conversation.createdAt ? new Date(conversation.createdAt) : undefined,
          updatedAt: conversation.updatedAt ? new Date(conversation.updatedAt) : undefined
        } as unknown as Conversation;
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
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/auth/login']);
    });
  }

  /**
   * Convert any conversation model to the service Conversation type
   * This ensures type compatibility between different conversation models
   */
  private convertToServiceConversation(conversation: any): Conversation {
    // If it's already the right type, return it
    if (conversation && typeof conversation === 'object') {
      // Create a new object with the expected properties
      const result: Conversation = {
        id: conversation.id,
        name: conversation.name || '',
        description: conversation.description,
        avatarUrl: conversation.avatarUrl,
        groupChat: !!conversation.groupChat,
        creatorId: conversation.creatorId ? Number(conversation.creatorId) : undefined,
        creatorUsername: conversation.creatorUsername,
        participants: conversation.participants || [],
        // Convert string dates to Date objects
        createdAt: conversation.createdAt ?
          (typeof conversation.createdAt === 'string' ? new Date(conversation.createdAt) : conversation.createdAt) :
          undefined,
        updatedAt: conversation.updatedAt ?
          (typeof conversation.updatedAt === 'string' ? new Date(conversation.updatedAt) : conversation.updatedAt) :
          undefined
      };
      return result;
    }
    // If it's not an object, return a default conversation
    return {
      id: '0',
      name: 'Unknown Conversation',
      groupChat: false,
      participants: []
    };
  }
}
