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

import { ChatService } from '../../../features/chat/services/chat.service';
import { AuthService } from '../../../core/auth/services/auth.service';
import { DateFormatterUtils } from '../../utils/date-formatter.utils';
import { User } from '../../../core/auth/services/auth.service';
// Import the new chat service for future migration
import { ChatService as NewChatService } from '../../../features/chat/api/services/chat.service';
import { UserStatusService } from '../../../features/chat/api/services/user-status.service';
import { StatusIndicatorComponent } from '../status-indicator/status-indicator.component';

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
    StatusIndicatorComponent
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
        // The conversion will happen in the dashboard component
        this.conversations = conversations;
      })
    );

    // Load conversations
    this.chatService.getConversations().subscribe();

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
    this.conversationSelected.emit(conversation);
  }

  onContactClick(contact: User): void {
    // Create a one-to-one conversation with this contact
    this.chatService.createOneToOneConversation(contact.id).subscribe(conversation => {
      // Just emit the conversation as is
      // The conversion will happen in the dashboard component
      this.conversationSelected.emit(conversation);
    });
  }

  getFilteredItems(): any[] {
    let items: any[] = [];

    switch (this.activeSection) {
      case 'chats':
        items = this.conversations;
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

    const otherParticipant = conversation.participants.find((p: any) => p.id !== currentUser.id);
    return otherParticipant ? (otherParticipant.fullName || otherParticipant.username) : conversation.name;
  }

  getAvatarUrl(item: any): string {
    if ('avatarUrl' in item) {
      return item.avatarUrl || 'assets/images/default-avatar.png';
    } else {
      return item.avatarUrl || 'assets/images/default-avatar.png';
    }
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
   * Get the other participant in a one-to-one conversation
   * @param conversation The conversation
   * @returns The other participant or null if not found
   */
  getOtherParticipant(conversation: any): User | null {
    if (!conversation || conversation.groupChat || !conversation.participants) {
      return null;
    }

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return null;

    return conversation.participants.find((p: any) => p.id !== currentUser.id) || null;
  }

  createNewGroup(): void {
    // This would typically open a dialog to create a new group
    console.log('Create new group');
  }
}
