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
import { Conversation } from '../../../features/chat/models/conversation.model';
import { User } from '../../../core/auth/services/auth.service';

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
    MatTooltipModule
  ],
  templateUrl: './list-view.component.html',
  styleUrls: ['./list-view.component.css']
})
export class ListViewComponent implements OnInit, OnDestroy {
  @Input() activeSection: string = 'chats';
  @Output() conversationSelected = new EventEmitter<Conversation>();

  conversations: Conversation[] = [];
  contacts: User[] = [];
  searchQuery: string = '';
  private subscriptions: Subscription = new Subscription();

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    public dateFormatter: DateFormatterUtils
  ) {}

  ngOnInit(): void {
    // Subscribe to conversations
    this.subscriptions.add(
      this.chatService.conversations$.subscribe(conversations => {
        // Convert the conversation type if needed
        this.conversations = conversations.map(conv => {
          return {
            ...conv,
            id: String(conv.id) // Convert number to string
          } as Conversation;
        });
      })
    );

    // Load conversations
    this.chatService.getConversations().subscribe();

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

  onConversationClick(conversation: Conversation): void {
    this.conversationSelected.emit(conversation);
  }

  onContactClick(contact: User): void {
    // Create a one-to-one conversation with this contact
    this.chatService.createOneToOneConversation(contact.id).subscribe(conversation => {
      // Convert the conversation type if needed
      const convertedConversation = {
        ...conversation,
        id: String(conversation.id) // Convert number to string
      } as Conversation;

      this.conversationSelected.emit(convertedConversation);
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

  getConversationName(conversation: Conversation): string {
    if (conversation.groupChat) {
      return conversation.name;
    }

    // For one-to-one chats, show the other participant's name
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return conversation.name;

    const otherParticipant = conversation.participants.find(p => p.id !== currentUser.id);
    return otherParticipant ? (otherParticipant.fullName || otherParticipant.username) : conversation.name;
  }

  getAvatarUrl(item: Conversation | User): string {
    if ('avatarUrl' in item) {
      return item.avatarUrl || 'assets/images/default-avatar.png';
    } else {
      return item.avatarUrl || 'assets/images/default-avatar.png';
    }
  }

  getUserStatus(user: User): string {
    return user.status || 'OFFLINE';
  }

  createNewGroup(): void {
    // This would typically open a dialog to create a new group
    console.log('Create new group');
  }
}
