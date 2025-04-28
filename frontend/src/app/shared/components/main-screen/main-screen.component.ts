import { Component, Input, OnInit, OnDestroy, Output, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { Subscription } from 'rxjs';

import { ChatContainerComponent } from '../../../features/chat/components/chat-container/chat-container.component';
import { ChatHeaderComponent } from '../../../features/chat/components/conversation/chat-header/chat-header.component';
import { ChatMessage, ChatConversation } from '../../../features/chat/api/models';
import { ChatService } from '../../../features/chat/api/services/chat.service';
import { AuthService } from '../../../core/auth/services/auth.service';
import { ResponsiveUtils } from '../../utils/responsive.utils';

@Component({
  selector: 'app-main-screen',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    ChatContainerComponent,
    ChatHeaderComponent
  ],
  templateUrl: './main-screen.component.html',
  styleUrls: ['./main-screen.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MainScreenComponent implements OnInit, OnDestroy {
  @Input() conversation: any = null;
  @Input() showHeader: boolean = true;
  @Input() userId: string | number | undefined;
  @Output() backClicked = new EventEmitter<void>();

  isTyping: boolean = false;
  typingUser: string = '';
  private subscriptions = new Subscription();

  constructor(
    public responsiveUtils: ResponsiveUtils,
    private authService: AuthService,
    private chatService: ChatService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Get the current user ID if not provided via input
    if (!this.userId) {
      const userSub = this.authService.currentUser$.subscribe(user => {
        if (user) {
          console.log('MainScreen: Setting userId from authService', user.id);
          this.userId = user.id;
        }
      });
      this.subscriptions.add(userSub);
    } else {
      console.log('MainScreen: Using provided userId', this.userId);
    }

    // Subscribe to typing indicators
    const typingSub = this.chatService.typingUsers$.subscribe(typingUsers => {
      if (this.conversation) {
        const typingUsername = typingUsers.get(String(this.conversation.id));
        this.isTyping = !!typingUsername;
        this.typingUser = typingUsername || '';
      } else {
        this.isTyping = false;
        this.typingUser = '';
      }
    });

    this.subscriptions.add(typingSub);
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.subscriptions.unsubscribe();
  }

  onMessageSent(message: ChatMessage): void {
    console.log('Message sent:', message);
  }

  onConversationChanged(conversation: ChatConversation): void {
    console.log('MainScreen: Conversation changed:', conversation);

    // Create a new object reference to ensure Angular detects the change
    this.conversation = {...conversation};

    // Reset typing indicators when conversation changes
    this.isTyping = false;
    this.typingUser = '';

    // Force change detection
    this.cdr.markForCheck();
  }

  onBackClicked(): void {
    this.backClicked.emit();
  }

  /**
   * Handle menu actions from the chat header
   * @param action The action to perform
   */
  onMenuAction(action: string): void {
    console.log(`MainScreen: Menu action: ${action}`);

    switch (action) {
      case 'search':
        // Implement search functionality
        console.log('MainScreen: Search action');
        break;
      case 'participants':
        // Show participants for group chats
        console.log('MainScreen: View participants action');
        break;
      case 'mute':
        // Mute notifications for this conversation
        console.log('MainScreen: Mute notifications action');
        break;
      case 'voice-call':
        console.log('MainScreen: Voice call action');
        break;
      case 'video-call':
        console.log('MainScreen: Video call action');
        break;
      default:
        console.log(`MainScreen: Unknown menu action: ${action}`);
    }
  }
}
