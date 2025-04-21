import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ChatContainerComponent } from '../components/chat-container/chat-container.component';
import { ChatService } from '../api/services/chat.service';
import { AuthService } from '../../../core/auth/services/auth.service';
import { ChatMessage, ChatConversation } from '../api/models';

/**
 * Example component showing how to use the chat module.
 * This component demonstrates how to integrate the chat container into a page.
 */
@Component({
  selector: 'app-chat-example',
  standalone: true,
  imports: [
    CommonModule,
    ChatContainerComponent
  ],
  template: `
    <div class="chat-example-container">
      <h1>Chat Example</h1>
      
      <div class="chat-wrapper">
        <chat-container
          [conversationId]="conversationId"
          [userId]="userId"
          (messageSent)="onMessageSent($event)"
          (conversationChanged)="onConversationChanged($event)"
          (backClicked)="onBackClicked()">
        </chat-container>
      </div>
    </div>
  `,
  styles: [`
    .chat-example-container {
      padding: 20px;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    
    h1 {
      margin-bottom: 20px;
    }
    
    .chat-wrapper {
      flex: 1;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      overflow: hidden;
    }
  `]
})
export class ChatExampleComponent implements OnInit {
  conversationId?: string | number;
  userId?: string | number;

  constructor(
    private route: ActivatedRoute,
    private chatService: ChatService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Get the conversation ID from the route params
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.conversationId = id;
      }
    });

    // Get the current user ID
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.userId = user.id;
      }
    });

    // Initialize the chat service with the auth token
    const token = localStorage.getItem('token');
    if (token) {
      this.chatService.initialize(token);
    }

    // Load conversations
    this.chatService.loadConversations().subscribe();
  }

  /**
   * Handle message sent event
   * @param message The sent message
   */
  onMessageSent(message: ChatMessage): void {
    console.log('Message sent:', message);
  }

  /**
   * Handle conversation changed event
   * @param conversation The active conversation
   */
  onConversationChanged(conversation: ChatConversation): void {
    console.log('Conversation changed:', conversation);
  }

  /**
   * Handle back button click
   */
  onBackClicked(): void {
    // Navigate back or handle as needed
    console.log('Back clicked');
  }
}
