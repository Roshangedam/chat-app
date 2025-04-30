import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';

import { AuthService } from '../../../core/auth/services/auth.service';
import { DateFormatterUtils } from '../../utils/date-formatter.utils';
import { User } from '../../../core/auth/services/auth.service';
import { ChatService } from '../../../features/chat/api/services/chat.service';
import { UserStatusService } from '../../../features/chat/api/services/user-status.service';
import { StatusIndicatorComponent } from '../status-indicator/status-indicator.component';
import { UserAvatarComponent } from '../user-avatar/user-avatar.component';

@Component({
  selector: 'app-list-view',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatDividerModule,
    MatBadgeModule,
    MatTooltipModule,
    StatusIndicatorComponent,
    UserAvatarComponent
  ],
  templateUrl: './list-view.component.html',
  styleUrls: ['./list-view.component.css']
})
export class ListViewComponent implements OnInit, OnDestroy {
  @Input() activeSection: string = 'chats';
  @Output() conversationSelected = new EventEmitter<any>();

  conversations: any[] = [];
  contacts: User[] = [];
  searchQuery: string = '';
  private subscriptions: Subscription = new Subscription();

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    private userStatusService: UserStatusService,
    public dateFormatter: DateFormatterUtils
  ) {}

  ngOnInit(): void {
    // Subscribe to conversations
    this.subscriptions.add(
      this.chatService.conversations$.subscribe(conversations => {
        // Just store the conversations as they are
        this.conversations = conversations;
      })
    );

    // Load conversations
    this.chatService.loadConversations().subscribe();

    // Subscribe to user status updates
    this.userStatusService.subscribeToUserStatus();

    // For now, we'll use mock data for contacts
    this.loadMockContacts();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadMockContacts(): void {
    // Mock contacts data
    this.contacts = [
      {
        id: 1,
        username: 'john_doe',
        email: 'john@example.com',
        fullName: 'John Doe',
        status: 'ONLINE'
      },
      {
        id: 2,
        username: 'jane_smith',
        email: 'jane@example.com',
        fullName: 'Jane Smith',
        status: 'AWAY'
      },
      {
        id: 3,
        username: 'bob_johnson',
        email: 'bob@example.com',
        fullName: 'Bob Johnson',
        status: 'OFFLINE'
      }
    ];
  }

  onConversationClick(conversation: any): void {
    // If this is a grouped conversation, we need to emit the most recent actual conversation
    if (conversation._isGrouped && conversation._originalConversations) {
      // The first conversation in the array is the most recent one
      this.conversationSelected.emit(conversation._originalConversations[0]);
    } else {
      this.conversationSelected.emit(conversation);
    }
  }

  onContactClick(contact: User): void {
    // Create a one-to-one conversation with this contact
    this.chatService.createOneToOneConversation(contact.id).subscribe(conversation => {
      // Emit the conversation
      this.conversationSelected.emit(conversation);
    });
  }

  getFilteredItems(): any[] {
    let items: any[] = [];

    switch (this.activeSection) {
      case 'chats':
        // Group one-to-one conversations by participant
        items = this.groupConversationsByParticipant(this.conversations.filter(c => !c.groupChat));
        break;
      case 'contacts':
      case 'people':
        items = this.contacts;
        break;
      case 'groups':
        items = this.conversations.filter(c => c.groupChat);
        break;
      default:
        items = [];
    }

    if (!this.searchQuery) {
      return items;
    }

    const query = this.searchQuery.toLowerCase();

    return items.filter(item => {
      if ('name' in item) {
        // Conversation
        return item.name.toLowerCase().includes(query);
      } else {
        // User
        return (
          item.username.toLowerCase().includes(query) ||
          (item.fullName && item.fullName.toLowerCase().includes(query))
        );
      }
    });
  }

  getConversationName(conversation: any): string {
    if (conversation.groupChat) {
      return conversation.name;
    }

    // For one-to-one chats, show the other participant's name
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return conversation.name;

    // If this is a grouped conversation, use the participant info we stored
    if (conversation._isGrouped && conversation._otherParticipant) {
      return conversation._otherParticipant.fullName || conversation._otherParticipant.username;
    }

    const otherParticipant = conversation.participants.find((p: any) => p.id !== currentUser.id);
    return otherParticipant ? (otherParticipant.fullName || otherParticipant.username) : conversation.name;
  }

  getAvatarUrl(item: any): string {
    if ('avatarUrl' in item) {
      return item.avatarUrl || 'assets/images/user-avatar.svg';
    } else {
      return item.avatarUrl || 'assets/images/user-avatar.svg';
    }
  }

  /**
   * Get the last message preview for a conversation
   * @param conversation The conversation
   * @returns A preview of the last message
   */
  getLastMessagePreview(conversation: any): string {
    // If this is a grouped conversation, use the most recent message
    if (conversation._isGrouped && conversation._originalConversations && conversation._originalConversations.length > 0) {
      const mostRecentConversation = conversation._originalConversations[0];
      return this.extractMessageContent(mostRecentConversation.lastMessage);
    }

    return this.extractMessageContent(conversation.lastMessage);
  }

  /**
   * Extract the content from a message object or return a default message
   * @param message The message object or string
   * @returns The message content as a string
   */
  private extractMessageContent(message: any): string {
    if (!message) {
      return 'No messages yet';
    }

    // If message is a string, return it directly
    if (typeof message === 'string') {
      return message;
    }

    // If message is an object with a content property, return that
    if (message && typeof message === 'object' && message.content) {
      return message.content;
    }

    // Fallback for any other case
    return 'No messages yet';
  }

  getUserStatus(user: User): string {
    if (!user) return 'OFFLINE';

    // First check if we have a real-time status from the UserStatusService
    const realTimeStatus = this.userStatusService.getUserStatus(user.id);
    if (realTimeStatus) {
      return realTimeStatus;
    }
    // Fall back to the status stored in the user object
    return user.status || 'OFFLINE';
  }

  /**
   * Track function for ngFor to improve performance
   * @param index Index of the item
   * @param item The item itself
   * @returns A unique identifier for the item
   */
  trackById(index: number, item: any): string | number {
    return item.id || index;
  }

  /**
   * Get the other participant in a one-to-one conversation
   * @param conversation The conversation
   * @returns The other participant or null if not found
   */
  getOtherParticipant(conversation: any): User | null {
    if (!conversation || conversation.groupChat || !conversation.participants) {
      return null;
    }

    // If this is a grouped conversation, use the participant info we stored
    if (conversation._isGrouped && conversation._otherParticipant) {
      return conversation._otherParticipant;
    }

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return null;

    return conversation.participants.find((p: any) => p.id !== currentUser.id) || null;
  }

  createNewGroup(): void {
    // This would typically open a dialog to create a new group
    console.log('Create new group');
  }

  /**
   * Group one-to-one conversations by participant to avoid showing multiple entries
   * for the same contact in the chat list
   * @param conversations List of one-to-one conversations
   * @returns List of grouped conversations
   */
  private groupConversationsByParticipant(conversations: any[]): any[] {
    if (!conversations || conversations.length === 0) {
      return [];
    }

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return conversations;
    }

    // Create a map to group conversations by the other participant's ID
    const conversationsByParticipant = new Map<number | string, any[]>();

    // Group conversations by the other participant's ID
    for (const conversation of conversations) {
      if (conversation.groupChat) {
        continue; // Skip group chats
      }

      const otherParticipant = this.getOtherParticipant(conversation);
      if (!otherParticipant) {
        continue; // Skip if we can't find the other participant
      }

      const participantId = otherParticipant.id;
      if (!conversationsByParticipant.has(participantId)) {
        conversationsByParticipant.set(participantId, []);
      }

      conversationsByParticipant.get(participantId)?.push(conversation);
    }

    // Create a new list of grouped conversations
    const groupedConversations: any[] = [];

    // For each participant, create a single conversation entry with the most recent message
    conversationsByParticipant.forEach((participantConversations, _) => {
      if (participantConversations.length === 0) {
        return;
      }

      // Sort conversations by updatedAt date (most recent first)
      participantConversations.sort((a, b) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return dateB - dateA;
      });

      // Get the most recent conversation
      const mostRecentConversation = participantConversations[0];
      const otherParticipant = this.getOtherParticipant(mostRecentConversation);

      if (!otherParticipant) {
        return;
      }

      // Calculate total unread count across all conversations with this participant
      const totalUnreadCount = participantConversations.reduce(
        (total, conv) => total + (conv.unreadCount || 0),
        0
      );

      // Create a new conversation object that represents all conversations with this participant
      const groupedConversation = {
        ...mostRecentConversation,
        _isGrouped: true,
        _originalConversations: participantConversations,
        _otherParticipant: otherParticipant,
        unreadCount: totalUnreadCount
      };

      groupedConversations.push(groupedConversation);
    });

    // Sort grouped conversations by the most recent message
    groupedConversations.sort((a, b) => {
      const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return dateB - dateA;
    });

    return groupedConversations;
  }
}
