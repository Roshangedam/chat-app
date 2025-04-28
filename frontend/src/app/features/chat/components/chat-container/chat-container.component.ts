import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ChatService } from '../../api/services/chat.service';
import { ChatMessage, ChatConversation, MessageStatusUpdate } from '../../api/models';
import { ChatHeaderComponent } from '../conversation/chat-header/chat-header.component';
import { ChatMessageListComponent } from '../message/chat-message-list/chat-message-list.component';
import { ChatMessageInputComponent } from '../message/chat-message-input/chat-message-input.component';

/**
 * Main container component for the chat feature.
 * This component orchestrates the chat UI and connects to the chat service.
 */
@Component({
  selector: 'chat-container',
  standalone: true,
  imports: [
    CommonModule,
    MatSnackBarModule,
    ChatHeaderComponent,
    ChatMessageListComponent,
    ChatMessageInputComponent
  ],
  templateUrl: './chat-container.component.html',
  styleUrls: ['./chat-container.component.css']
})
export class ChatContainerComponent implements OnInit, OnDestroy {
  @Input() conversationId?: string | number;
  @Input() userId?: string | number;
  @Input() showHeader: boolean = true;

  @Output() messageSent = new EventEmitter<ChatMessage>();
  @Output() conversationChanged = new EventEmitter<ChatConversation>();
  @Output() backClicked = new EventEmitter<void>();

  conversation: ChatConversation | null = null;
  messages: ChatMessage[] = [];
  isLoading = true;
  isSending = false;
  isTyping = false;
  typingUser = '';
  typingTimeout: ReturnType<typeof setTimeout> | null = null;

  // Pagination properties
  currentPage = 0;
  pageSize = 20;
  hasMoreMessages = true; // Assume there are more messages initially

  private subscriptions = new Subscription();

  constructor(private chatService: ChatService, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    // Subscribe to messages
    const messagesSub = this.chatService.messages$.pipe(
      // Debounce to prevent rapid UI updates
      debounceTime(50)
    ).subscribe(messages => {
      this.messages = messages;
    });

    // Subscribe to loading state
    const loadingSub = this.chatService.loading$.subscribe(loading => {
      this.isLoading = loading;
    });

    // Subscribe to typing indicators
    const typingSub = this.chatService.typingUsers$.subscribe(typingUsers => {
      if (this.conversation) {
        const conversationId = String(this.conversation.id);
        const typingUsername = typingUsers.get(conversationId);

        // Update typing status
        const wasTyping = this.isTyping;
        this.isTyping = !!typingUsername;
        this.typingUser = typingUsername || '';

        console.log(`Chat container: Typing status for conversation ${conversationId}: ${this.isTyping ? this.typingUser + ' is typing' : 'no one is typing'}`);

        // If typing status changed, force change detection
        if (wasTyping !== this.isTyping) {
          console.log(`Chat container: Typing status changed from ${wasTyping} to ${this.isTyping}`);
        }
      } else {
        this.isTyping = false;
        this.typingUser = '';
      }
    });

    // Subscribe to message status updates
    const statusSub = this.chatService.messageStatus$.subscribe((statusUpdate: MessageStatusUpdate) => {
      // Just subscribing ensures the updates are processed, even if we don't do anything with them here
      // The UI will be updated automatically through the messages$ observable
      console.log(`Container received status update: ${statusUpdate.messageId} → ${statusUpdate.status}`);
    });

    // Add subscriptions to the collection
    this.subscriptions.add(messagesSub);
    this.subscriptions.add(loadingSub);
    this.subscriptions.add(typingSub);
    this.subscriptions.add(statusSub);

    // Load the conversation if an ID was provided
    if (this.conversationId) {
      this.loadConversation(this.conversationId);
    }
  }

  /**
   * Load a conversation by ID
   * @param conversationId ID of the conversation to load
   */
  loadConversation(conversationId: string | number): void {
    // Reset pagination when loading a new conversation
    this.currentPage = 0;
    this.hasMoreMessages = true;

    this.chatService.getConversation(conversationId).subscribe({
      next: (conversation) => {
        this.conversation = conversation;
        this.chatService.setActiveConversation(conversation);
        this.loadMessages(this.currentPage);
        this.conversationChanged.emit(conversation);
      },
      error: (error) => {
        console.error('Error loading conversation:', error);
      }
    });
  }

  /**
   * Send a message
   * @param content Content of the message
   */
  onSendMessage(content: string): void {
    if (!content.trim()) return;

    this.isSending = true;
    this.chatService.sendMessage(content).subscribe({
      next: (message) => {
        this.isSending = false;
        this.messageSent.emit(message);
      },
      error: (error) => {
        this.isSending = false;
        console.error('Error sending message:', error);
      }
    });
  }

  /**
   * Handle typing indicator
   */
  onTyping(): void {
    console.log('Chat container: User is typing');

    // Send typing indicator to server
    this.chatService.sendTypingIndicator(true);

    // Clear previous timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    // Set timeout to stop typing indicator after 2 seconds of inactivity
    this.typingTimeout = setTimeout(() => {
      console.log('Chat container: User stopped typing (timeout)');
      this.chatService.sendTypingIndicator(false);
    }, 2000);
  }

  /**
   * Handle stopped typing event
   */
  onStoppedTyping(): void {
    console.log('Chat container: User stopped typing (explicit)');

    // Clear any existing timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }

    // Send stopped typing indicator
    this.chatService.sendTypingIndicator(false);
  }

  /**
   * Handle back button click
   */
  onBackClick(): void {
    this.backClicked.emit();
  }

  /**
   * Load messages for the current conversation with pagination
   * @param page Page number to load (0-based)
   */
  loadMessages(page: number): void {
    if (!this.conversation) return;

    this.chatService.loadMessages(page, this.pageSize).subscribe({
      next: (messages) => {
        console.log(`Loaded ${messages.length} messages for page ${page}`);

        // If we received fewer messages than the page size, we've reached the end
        if (messages.length < this.pageSize) {
          this.hasMoreMessages = false;
        }

        // Automatically mark messages as read when conversation is loaded
        if (page === 0 && messages.length > 0 && this.conversation != null) {
          this.chatService.markMessagesAsRead(this.conversation.id).subscribe();
        }
      },
      error: (error) => {
        console.error('Error loading messages:', error);
      }
    });
  }

  /**
   * Load older messages when the user scrolls to the top
   */
  onLoadOlderMessages(): void {
    if (this.isLoading || !this.hasMoreMessages) return;

    // Increment page number and load the next page of messages
    this.currentPage++;
    console.log(`Loading older messages, page ${this.currentPage}`);
    this.loadMessages(this.currentPage);
  }

  /**
   * Retry sending a failed message
   * @param messageId ID of the message to retry
   */
  onRetryMessage(messageId: string | number): void {
    this.chatService.retryMessage(messageId).subscribe({
      next: () => {
        this.snackBar.open('Message queued for retry', 'Dismiss', {
          duration: 3000
        });
      },
      error: (error) => {
        console.error('Error retrying message:', error);
        this.snackBar.open('Failed to retry message', 'Dismiss', {
          duration: 3000
        });
      }
    });
  }

  /**
   * Clean up resources when the component is destroyed
   */
  ngOnDestroy(): void {
    // Clear the active conversation
    this.chatService.setActiveConversation(null);

    // Unsubscribe from all subscriptions
    this.subscriptions.unsubscribe();

    // Clear typing timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
  }
}
