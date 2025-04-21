import { Component, Input, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';

import { ChatMessageComponent } from '../chat-message/chat-message.component';
import { MessageInputComponent } from '../message-input/message-input.component';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ResponsiveUtils } from '../../../../shared/utils/responsive.utils';
import { Conversation } from '../../models/conversation.model';
import { Message } from '../../models/message.model';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-chat-room',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule,
    ChatMessageComponent,
    MessageInputComponent
  ],
  templateUrl: './chat-room.component.html',
  styleUrls: ['./chat-room.component.css']
})
export class ChatRoomComponent implements OnInit, OnDestroy, AfterViewChecked {
  @Input() conversation: Conversation | null = null;
  @ViewChild('messageContainer') messageContainer!: ElementRef;

  messages: Message[] = [];
  currentUser: User | null = null;
  isLoading: boolean = false;
  isTyping: boolean = false;
  typingUser: string = '';
  private subscriptions: Subscription = new Subscription();
  private shouldScrollToBottom: boolean = true;

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    private router: Router,
    public responsiveUtils: ResponsiveUtils
  ) {}

  ngOnInit(): void {
    // Get current user
    this.subscriptions.add(
      this.authService.currentUser$.subscribe(user => {
        this.currentUser = user;
      })
    );

    // Subscribe to messages
    this.subscriptions.add(
      this.chatService.messages$.subscribe(messages => {
        this.messages = messages;
        this.shouldScrollToBottom = true;
      })
    );

    // Subscribe to typing indicators
    this.subscriptions.add(
      this.chatService.typingUsers$.subscribe(typingUsers => {
        if (this.conversation) {
          const typingUser = typingUsers.get(this.conversation.id);
          this.isTyping = !!typingUser;
          this.typingUser = typingUser || '';
        }
      })
    );
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  scrollToBottom(): void {
    try {
      if (this.messageContainer) {
        this.messageContainer.nativeElement.scrollTop = this.messageContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  onSendMessage(content: string): void {
    if (!this.conversation || !content.trim()) return;

    this.chatService.sendMessage(this.conversation.id, content).subscribe();
  }

  onTyping(): void {
    if (!this.conversation) return;

    this.chatService.sendTypingIndicator(this.conversation.id, true);

    // Stop typing indicator after 3 seconds of inactivity
    setTimeout(() => {
      this.chatService.sendTypingIndicator(this.conversation.id, false);
    }, 3000);
  }

  getConversationName(): string {
    if (!this.conversation) return '';

    if (this.conversation.groupChat) {
      return this.conversation.name;
    }

    // For one-to-one chats, show the other participant's name
    if (!this.currentUser) return this.conversation.name;

    const otherParticipant = this.conversation.participants.find(p => p.id !== this.currentUser?.id);
    return otherParticipant ? (otherParticipant.fullName || otherParticipant.username) : this.conversation.name;
  }

  getParticipantStatus(): string {
    if (!this.conversation || this.conversation.groupChat || !this.currentUser) return 'OFFLINE';

    const otherParticipant = this.conversation.participants.find(p => p.id !== this.currentUser?.id);
    return otherParticipant?.status || 'OFFLINE';
  }

  goBack(): void {
    // Clear active conversation
    this.chatService.setActiveConversation(null);

    // For mobile, navigate back to the list view
    if (this.responsiveUtils.isHandset$) {
      this.router.navigate(['/']);
    }
  }
}
