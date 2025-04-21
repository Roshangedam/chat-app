import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subscription, of, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ChatApiService } from './chat-api.service';
import { ChatWebsocketService } from '../websocket/chat-websocket.service';
import { ChatMessage, ChatConversation } from '../models';

/**
 * Main service for chat functionality.
 * This service combines the API and WebSocket services and provides a unified interface.
 */
@Injectable({
  providedIn: 'root'
})
export class ChatService implements OnDestroy {
  // BehaviorSubjects to store state
  private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  private conversationsSubject = new BehaviorSubject<ChatConversation[]>([]);
  private activeConversationSubject = new BehaviorSubject<ChatConversation | null>(null);
  private typingUsersSubject = new BehaviorSubject<Map<string, string>>(new Map());
  private loadingSubject = new BehaviorSubject<boolean>(false);

  // Observable streams
  public messages$ = this.messagesSubject.asObservable();
  public conversations$ = this.conversationsSubject.asObservable();
  public activeConversation$ = this.activeConversationSubject.asObservable();
  public typingUsers$ = this.typingUsersSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();
  public connectionStatus$: Observable<boolean>;

  private subscriptions = new Subscription();

  constructor(
    private apiService: ChatApiService,
    private websocketService: ChatWebsocketService
  ) {
    // Set up connection status observable
    this.connectionStatus$ = this.websocketService.connectionStatus$;

    // Subscribe to WebSocket events
    this.subscribeToWebSocketEvents();
  }

  /**
   * Initialize the chat service with an authentication token
   * @param token Authentication token
   */
  public initialize(token: string): void {
    this.websocketService.initialize(token);
  }

  /**
   * Subscribe to WebSocket events
   */
  private subscribeToWebSocketEvents(): void {
    // Subscribe to new messages
    const messageSub = this.websocketService.messageReceived$.subscribe(message => {
      // Add the new message to the messages array if it's for the active conversation
      const activeConversation = this.activeConversationSubject.value;
      if (activeConversation && message.conversationId === activeConversation.id) {
        const currentMessages = this.messagesSubject.value;
        this.messagesSubject.next([...currentMessages, message]);
      }

      // Update the conversations list with the new message preview
      this.updateConversationWithMessage(message);
    });

    // Subscribe to typing indicators
    const typingSub = this.websocketService.typingStatus$.subscribe(status => {
      const typingUsers = new Map(this.typingUsersSubject.value);

      if (status.isTyping) {
        typingUsers.set(String(status.conversationId), status.username);
      } else {
        typingUsers.delete(String(status.conversationId));
      }

      this.typingUsersSubject.next(typingUsers);
    });

    // Add subscriptions to the subscription collection
    this.subscriptions.add(messageSub);
    this.subscriptions.add(typingSub);
  }

  /**
   * Update a conversation with a new message
   * @param message The new message
   */
  private updateConversationWithMessage(message: ChatMessage): void {
    const conversations = this.conversationsSubject.value;
    const updatedConversations = conversations.map(conversation => {
      if (conversation.id === message.conversationId) {
        return {
          ...conversation,
          lastMessage: message.content,
          updatedAt: message.sentAt || new Date(),
          // Increment unread count if the message is not from the current user
          unreadCount: conversation.unreadCount ? conversation.unreadCount + 1 : 1
        };
      }
      return conversation;
    });

    // Sort conversations by most recent message
    updatedConversations.sort((a, b) => {
      const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return dateB - dateA;
    });

    this.conversationsSubject.next(updatedConversations);
  }

  /**
   * Load all conversations for the current user
   */
  public loadConversations(): Observable<ChatConversation[]> {
    this.loadingSubject.next(true);

    return this.apiService.getConversations().pipe(
      tap(conversations => {
        this.conversationsSubject.next(conversations);
        this.loadingSubject.next(false);
      }),
      catchError(error => {
        this.loadingSubject.next(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get a specific conversation by ID
   * @param conversationId ID of the conversation to get
   */
  public getConversation(conversationId: string | number): Observable<ChatConversation> {
    // Check if we already have this conversation in our state
    const existingConversation = this.conversationsSubject.value.find(
      c => c.id === conversationId
    );

    if (existingConversation) {
      return of(existingConversation);
    }

    // Otherwise, fetch it from the API
    return this.apiService.getConversation(conversationId);
  }

  /**
   * Set the active conversation
   * @param conversation The conversation to set as active
   */
  public setActiveConversation(conversation: ChatConversation | null): void {
    const currentActive = this.activeConversationSubject.value;

    // Unsubscribe from the current conversation if there is one
    if (currentActive) {
      this.websocketService.unsubscribeFromConversation(currentActive.id);
    }

    // Set the new active conversation
    this.activeConversationSubject.next(conversation);

    // Clear messages when no active conversation
    if (!conversation) {
      this.messagesSubject.next([]);
      return;
    }

    // Subscribe to the new conversation
    this.websocketService.subscribeToConversation(conversation.id);

    // Reset unread count for this conversation
    this.resetUnreadCount(conversation.id);
  }

  /**
   * Reset the unread count for a conversation
   * @param conversationId ID of the conversation
   */
  private resetUnreadCount(conversationId: string | number): void {
    const conversations = this.conversationsSubject.value;
    const updatedConversations = conversations.map(conversation => {
      if (conversation.id === conversationId) {
        return {
          ...conversation,
          unreadCount: 0
        };
      }
      return conversation;
    });

    this.conversationsSubject.next(updatedConversations);
  }

  /**
   * Load messages for the active conversation
   * @param page Page number (for pagination)
   * @param size Number of messages per page
   */
  public loadMessages(page: number = 0, size: number = 20): Observable<ChatMessage[]> {
    const activeConversation = this.activeConversationSubject.value;

    if (!activeConversation) {
      return throwError(() => new Error('No active conversation'));
    }

    this.loadingSubject.next(true);

    return this.apiService.getMessageHistory(activeConversation.id, page, size).pipe(
      tap(messages => {
        // If it's the first page, replace all messages
        // Otherwise, prepend the new messages to the existing ones
        if (page === 0) {
          this.messagesSubject.next(messages);
        } else {
          const currentMessages = this.messagesSubject.value;
          this.messagesSubject.next([...messages, ...currentMessages]);
        }

        this.loadingSubject.next(false);

        // Mark messages as read
        this.markMessagesAsRead(activeConversation.id);
      }),
      catchError(error => {
        this.loadingSubject.next(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Send a message to the active conversation
   * @param content Content of the message
   */
  public sendMessage(content: string): Observable<ChatMessage> {
    const activeConversation = this.activeConversationSubject.value;

    if (!activeConversation) {
      return throwError(() => new Error('No active conversation'));
    }

    // Send via WebSocket for real-time delivery
    this.websocketService.sendMessage(activeConversation.id, content);

    // Also send via REST API for persistence
    return this.apiService.sendMessage(activeConversation.id, content);
  }

  /**
   * Mark all messages in a conversation as read
   * @param conversationId ID of the conversation
   */
  public markMessagesAsRead(conversationId: string | number): Observable<any> {
    // Send via WebSocket for real-time updates
    this.websocketService.markMessagesAsRead(conversationId);

    // Also send via REST API for persistence
    return this.apiService.markMessagesAsRead(conversationId);
  }

  /**
   * Send a typing indicator
   * @param isTyping Whether the user is currently typing
   */
  public sendTypingIndicator(isTyping: boolean): void {
    const activeConversation = this.activeConversationSubject.value;

    if (!activeConversation) {
      return;
    }

    this.websocketService.sendTypingIndicator(activeConversation.id, isTyping);
  }

  /**
   * Create a new one-to-one conversation
   * @param userId ID of the user to chat with
   */
  public createOneToOneConversation(userId: string | number): Observable<ChatConversation> {
    return this.apiService.createOneToOneConversation(userId).pipe(
      tap(conversation => {
        const currentConversations = this.conversationsSubject.value;
        this.conversationsSubject.next([conversation, ...currentConversations]);
      })
    );
  }

  /**
   * Create a new group conversation
   * @param name Name of the group
   * @param description Description of the group
   * @param participantIds IDs of the participants
   */
  public createGroupConversation(
    name: string,
    description: string,
    participantIds: (string | number)[]
  ): Observable<ChatConversation> {
    return this.apiService.createGroupConversation(name, description, participantIds).pipe(
      tap(conversation => {
        const currentConversations = this.conversationsSubject.value;
        this.conversationsSubject.next([conversation, ...currentConversations]);
      })
    );
  }

  /**
   * Search for conversations by name
   * @param query Search query
   */
  public searchConversations(query: string): Observable<ChatConversation[]> {
    return this.apiService.searchConversations(query);
  }

  /**
   * Update a conversation's details
   * @param conversationId ID of the conversation to update
   * @param name New name for the conversation (optional)
   * @param description New description for the conversation (optional)
   * @param avatarUrl New avatar URL for the conversation (optional)
   */
  public updateConversation(
    conversationId: string | number,
    name?: string,
    description?: string,
    avatarUrl?: string
  ): Observable<ChatConversation> {
    return this.apiService.updateConversation(conversationId, name, description, avatarUrl).pipe(
      tap(updatedConversation => {
        // Update the conversation in the conversations list
        const currentConversations = this.conversationsSubject.value;
        const updatedConversations = currentConversations.map(conversation => {
          if (conversation.id === updatedConversation.id) {
            return updatedConversation;
          }
          return conversation;
        });
        this.conversationsSubject.next(updatedConversations);

        // Update the active conversation if it's the one that was updated
        const activeConversation = this.activeConversationSubject.value;
        if (activeConversation && activeConversation.id === updatedConversation.id) {
          this.activeConversationSubject.next(updatedConversation);
        }
      })
    );
  }

  /**
   * Add participants to a group conversation
   * @param conversationId ID of the conversation
   * @param participantIds IDs of the participants to add
   */
  public addParticipants(
    conversationId: string | number,
    participantIds: (string | number)[]
  ): Observable<ChatConversation> {
    return this.apiService.addParticipants(conversationId, participantIds).pipe(
      tap(updatedConversation => {
        // Update the conversation in the conversations list
        const currentConversations = this.conversationsSubject.value;
        const updatedConversations = currentConversations.map(conversation => {
          if (conversation.id === updatedConversation.id) {
            return updatedConversation;
          }
          return conversation;
        });
        this.conversationsSubject.next(updatedConversations);

        // Update the active conversation if it's the one that was updated
        const activeConversation = this.activeConversationSubject.value;
        if (activeConversation && activeConversation.id === updatedConversation.id) {
          this.activeConversationSubject.next(updatedConversation);
        }
      })
    );
  }

  /**
   * Remove a participant from a group conversation
   * @param conversationId ID of the conversation
   * @param participantId ID of the participant to remove
   */
  public removeParticipant(
    conversationId: string | number,
    participantId: string | number
  ): Observable<ChatConversation> {
    return this.apiService.removeParticipant(conversationId, participantId).pipe(
      tap(updatedConversation => {
        if (updatedConversation) {
          // Update the conversation in the conversations list
          const currentConversations = this.conversationsSubject.value;
          const updatedConversations = currentConversations.map(conversation => {
            if (conversation.id === updatedConversation.id) {
              return updatedConversation;
            }
            return conversation;
          });
          this.conversationsSubject.next(updatedConversations);

          // Update the active conversation if it's the one that was updated
          const activeConversation = this.activeConversationSubject.value;
          if (activeConversation && activeConversation.id === updatedConversation.id) {
            this.activeConversationSubject.next(updatedConversation);
          }
        }
      })
    );
  }

  /**
   * Clean up resources when the service is destroyed
   */
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.websocketService.disconnect();
  }
}
