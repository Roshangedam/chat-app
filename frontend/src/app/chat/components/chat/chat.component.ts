import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ChatService, Conversation, Message } from '../../../services/chat.service';
import { AuthService, User } from '../../../auth/services/auth.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MessageListComponent } from '../message-list/message-list.component';
import { MessageInputComponent } from '../message-input/message-input.component';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatBadgeModule,
    MessageListComponent,
    MessageInputComponent,
  ],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, OnDestroy {
  conversationId: number | null = null;
  conversation: Conversation | null = null;
  messages: Message[] = [];
  currentUser: User | null = null;
  isLoading = true;
  isSending = false;
  isTyping = false;
  typingUser = '';
  private typingTimeout: any;
  private subscriptions: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private chatService: ChatService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Get current user
    this.currentUser = this.authService.getCurrentUser();
    this.subscriptions.add(
      this.authService.currentUser$.subscribe(user => {
        this.currentUser = user;
      })
    );

    // Subscribe to route params to get conversation ID
    this.subscriptions.add(
      this.route.paramMap.subscribe(params => {
        const id = params.get('id');
        if (id) {
          this.conversationId = +id;
          this.loadConversation();
          this.loadMessages();
          this.subscribeToMessages();
        }
      })
    );

    // Subscribe to messages from service
    this.subscriptions.add(
      this.chatService.messages$.subscribe(messages => {
        // Filter messages for current conversation
        if (this.conversationId) {
          this.messages = messages
            .filter(m => m.conversationId === this.conversationId)
            .sort((a, b) => {
              const dateA = a.sentAt ? new Date(a.sentAt).getTime() : 0;
              const dateB = b.sentAt ? new Date(b.sentAt).getTime() : 0;
              return dateA - dateB;
            });
        }
      })
    );
  }

  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions
    this.subscriptions.unsubscribe();

    // Unsubscribe from conversation
    if (this.conversationId) {
      this.chatService.unsubscribeFromConversation(this.conversationId);
    }

    // Clear typing timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
  }

  loadConversation(): void {
    if (!this.conversationId) return;

    this.chatService.getConversation(this.conversationId).subscribe({
      next: (conversation) => {
        this.conversation = conversation;
      },
      error: (error) => {
        console.error('Error loading conversation:', error);
      }
    });
  }

  loadMessages(): void {
    if (!this.conversationId) return;

    this.isLoading = true;
    this.chatService.getMessageHistory(this.conversationId).subscribe({
      next: () => {
        this.isLoading = false;
        // Mark messages as read
        this.markMessagesAsRead();
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error loading messages:', error);
      }
    });
  }

  subscribeToMessages(): void {
    if (!this.conversationId) return;

    this.chatService.subscribeToConversation(this.conversationId);
  }

  sendMessage(content: string): void {
    if (!this.conversationId || !content.trim()) return;

    this.isSending = true;
    this.chatService.sendMessage(this.conversationId, content).subscribe({
      next: () => {
        this.isSending = false;
      },
      error: (error) => {
        this.isSending = false;
        console.error('Error sending message:', error);
      }
    });
  }

  markMessagesAsRead(): void {
    if (!this.conversationId) return;

    this.chatService.markMessagesAsRead(this.conversationId).subscribe({
      error: (error) => {
        console.error('Error marking messages as read:', error);
      }
    });
  }

  onTyping(): void {
    // Implement typing indicator logic
    // This would typically involve sending a typing event to the server
    // For now, we'll just log it
    console.log('User is typing...');
  }

  getConversationName(): string {
    if (!this.conversation) return 'Chat';

    if (this.conversation.groupChat) {
      return this.conversation.name;
    } else {
      // For one-to-one chats, show the other participant's name
      const participant = this.conversation.participants.find(
        p => this.currentUser && p.id !== this.currentUser.id
      );
      return participant ? participant.username : 'Chat';
    }
  }

  getParticipantStatus(): string {
    if (!this.conversation || this.conversation.groupChat) return '';

    const participant = this.conversation.participants.find(
      p => this.currentUser && p.id !== this.currentUser.id
    );

    return participant?.status || 'OFFLINE';
  }
}
