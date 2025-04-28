import { Injectable, OnDestroy, NgZone } from '@angular/core';
import { BehaviorSubject, Observable, Subscription, of, throwError, asyncScheduler, timer } from 'rxjs';
import { catchError, tap, throttleTime, filter, take, finalize } from 'rxjs/operators';
import { ChatApiService } from './chat-api.service';
import { ChatWebsocketService } from '../websocket/chat-websocket.service';
import { ChatMessage, ChatConversation, MessageStatusUpdate } from '../models';

/**
 * Main service for chat functionality.
 * This service combines the API and WebSocket services and provides a unified interface.
 */
@Injectable({
  providedIn: 'root'
})
export class ChatService implements OnDestroy {
  // Message status constants
  private readonly STATUS_SENT = 'SENT';
  private readonly STATUS_DELIVERED = 'DELIVERED';
  private readonly STATUS_READ = 'READ';
  private readonly STATUS_FAILED = 'FAILED';
  private readonly STATUS_PENDING = 'PENDING';
  // BehaviorSubjects to store state
  private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  private conversationsSubject = new BehaviorSubject<ChatConversation[]>([]);
  private activeConversationSubject = new BehaviorSubject<ChatConversation | null>(null);
  private typingUsersSubject = new BehaviorSubject<Map<string, string>>(new Map());
  private loadingSubject = new BehaviorSubject<boolean>(false);

  // Buffered updates to reduce UI flickering
  private messageUpdateBuffer: ChatMessage[] = [];
  private conversationUpdateBuffer: ChatConversation[] = [];
  private updateInterval: any;
  private readonly UPDATE_INTERVAL_MS = 300; // Update UI every 300ms

  // Observable streams
  public messages$ = this.messagesSubject.asObservable();
  public conversations$ = this.conversationsSubject.asObservable();
  public activeConversation$ = this.activeConversationSubject.asObservable();
  public typingUsers$ = this.typingUsersSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();
  public connectionStatus$: Observable<boolean>;
  public messageStatus$: Observable<MessageStatusUpdate>;

  private subscriptions = new Subscription();

  constructor(
    private apiService: ChatApiService,
    private websocketService: ChatWebsocketService,
    private ngZone: NgZone
  ) {
    // Set up connection status observable
    this.connectionStatus$ = this.websocketService.connectionStatus$;
    
    // Set up message status observable
    this.messageStatus$ = this.websocketService.messageStatus$;

    // Subscribe to WebSocket events
    this.subscribeToWebSocketEvents();

    // Initialize buffered updates to reduce UI flickering
    this.initializeBufferedUpdates();

    // Subscribe to sync complete notifications
    this.subscribeToSyncEvents();
  }

  /**
   * Initialize buffered updates to reduce UI flickering
   * This batches updates to the UI to prevent rapid re-renders
   */
  private initializeBufferedUpdates(): void {
    // Set up interval to process buffered updates
    this.updateInterval = setInterval(() => {
      this.processBufferedUpdates();
    }, this.UPDATE_INTERVAL_MS);
  }

  /**
   * Process buffered updates to reduce UI flickering
   */
  private processBufferedUpdates(): void {
    // Process message updates
    if (this.messageUpdateBuffer.length > 0) {
      const currentMessages = this.messagesSubject.value;
      const newMessages = [...currentMessages];
      let hasChanges = false;

      // Process each buffered message
      this.messageUpdateBuffer.forEach(message => {
        // Check if message already exists
        const existingIndex = newMessages.findIndex(m =>
          m.id === message.id ||
          (m.content === message.content &&
           m.senderId === message.senderId &&
           Math.abs(new Date(m.sentAt || 0).getTime() - new Date(message.sentAt || 0).getTime()) < 5000)
        );

        if (existingIndex === -1) {
          // Add new message
          newMessages.push(message);
          hasChanges = true;
        }
      });

      // Clear buffer
      this.messageUpdateBuffer = [];

      // Only update if there are changes
      if (hasChanges) {
        // Sort messages by date (oldest first)
        newMessages.sort((a, b) => {
          const dateA = a.sentAt ? new Date(a.sentAt).getTime() : 0;
          const dateB = b.sentAt ? new Date(b.sentAt).getTime() : 0;
          return dateA - dateB;
        });

        // Update messages
        this.messagesSubject.next(newMessages);
      }
    }

    // Process conversation updates
    if (this.conversationUpdateBuffer.length > 0) {
      const currentConversations = this.conversationsSubject.value;
      const newConversations = [...currentConversations];
      let hasChanges = false;

      // Process each buffered conversation
      this.conversationUpdateBuffer.forEach(conversation => {
        // Check if conversation already exists
        const existingIndex = newConversations.findIndex(c => c.id === conversation.id);

        if (existingIndex === -1) {
          // Add new conversation
          newConversations.push(conversation);
          hasChanges = true;
        } else {
          // Update existing conversation
          newConversations[existingIndex] = {
            ...newConversations[existingIndex],
            ...conversation,
            updatedAt: conversation.updatedAt || newConversations[existingIndex].updatedAt
          };
          hasChanges = true;
        }
      });

      // Clear buffer
      this.conversationUpdateBuffer = [];

      // Only update if there are changes
      if (hasChanges) {
        // Sort conversations by most recent message
        newConversations.sort((a, b) => {
          const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          return dateB - dateA;
        });

        // Update conversations
        this.conversationsSubject.next(newConversations);
      }
    }
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
    // Subscribe to message received events
    this.subscriptions.add(
      this.websocketService.messageReceived$.pipe(
        // Throttle message processing to prevent UI flickering
        throttleTime(100, asyncScheduler, { leading: true, trailing: true })
      ).subscribe(message => {
        this.ngZone.run(() => {
          console.log(`ChatService: Received new message via WebSocket: ${message.content.substring(0, 20)}...`);
          this.handleNewMessage(message);
        });
      })
    );

    // Subscribe to message status updates
    this.subscriptions.add(
      this.websocketService.messageStatus$.subscribe(statusUpdate => {
        this.ngZone.run(() => {
          console.log(`ChatService: Received status update for message ${statusUpdate.messageId}: ${statusUpdate.status}`);
          this.handleMessageStatusUpdate(statusUpdate);
        });
      })
    );

    // Subscribe to typing status updates
    this.subscriptions.add(
      this.websocketService.typingStatus$.subscribe(typingUpdate => {
        this.ngZone.run(() => {
          const typingUsers = new Map(this.typingUsersSubject.value);

          if (typingUpdate.isTyping) {
            typingUsers.set(String(typingUpdate.conversationId), typingUpdate.username);
          } else {
            typingUsers.delete(String(typingUpdate.conversationId));
          }

          this.typingUsersSubject.next(typingUsers);
        });
      })
    );

    // Subscribe to user status updates
    this.subscriptions.add(
      this.websocketService.userStatus$.subscribe(statusUpdate => {
        this.ngZone.run(() => {
          console.log(`ChatService: User ${statusUpdate.username} is now ${statusUpdate.status}`);
          // Update user status in conversations if needed
          this.updateUserStatusInConversations(statusUpdate.userId, statusUpdate.status);
        });
      })
    );
  }

  /**
   * Update user status in all conversations
   * @param userId User ID
   * @param status New status
   */
  private updateUserStatusInConversations(userId: string | number, status: string): void {
    const conversations = this.conversationsSubject.value;
    let hasChanges = false;

    const updatedConversations = conversations.map(conversation => {
      // Skip group conversations
      if (conversation.groupChat) return conversation;

      // Check if this user is a participant
      const participant = conversation.participants?.find(p => p.id === userId);
      if (!participant) return conversation;

      // Update participant status with a valid status value
      let validStatus: 'ONLINE' | 'AWAY' | 'OFFLINE';
      switch(status.toUpperCase()) {
        case 'ONLINE':
          validStatus = 'ONLINE';
          break;
        case 'AWAY':
          validStatus = 'AWAY';
          break;
        default:
          validStatus = 'OFFLINE';
      }

      // Update participant status
      const updatedParticipants = conversation.participants.map(p => {
        if (p.id === userId) {
          return { ...p, status: validStatus };
        }
        return p;
      });

      hasChanges = true;
      return { ...conversation, participants: updatedParticipants };
    });

    if (hasChanges) {
      this.conversationsSubject.next(updatedConversations);
    }
  }

  /**
   * Subscribe to sync events
   */
  private subscribeToSyncEvents(): void {
    this.subscriptions.add(
      this.websocketService.getSyncCompleteNotifications().subscribe(syncData => {
        this.ngZone.run(() => {
          console.log(`Sync complete: ${syncData.syncedCount} messages synchronized`);
          // Refresh conversations if any messages were synchronized
          if (syncData.syncedCount > 0) {
            this.loadConversations().subscribe();
          }
        });
      })
    );
  }

  /**
   * Handle a new message received from the WebSocket
   * @param message The new message
   */
  private handleNewMessage(message: ChatMessage): void {
    // Check if this is a message for the active conversation
    const activeConversation = this.activeConversationSubject.value;

    // Check if this is a temporary message being confirmed
    const isConfirmation = this.checkAndUpdateTempMessage(message);

    if (!isConfirmation) {
      if (activeConversation && message.conversationId === activeConversation.id) {
        // Add to buffered updates for the active conversation
        this.messageUpdateBuffer.push(message);

        // Trigger immediate scroll to bottom for better UX
        // This doesn't update the message list, just ensures we scroll when new messages arrive
        if (message.senderId !== this.getCurrentUserId()) {
          // Use requestAnimationFrame to ensure smooth scrolling
          requestAnimationFrame(() => {
            const messageContainer = document.querySelector('.message-list-container');
            if (messageContainer) {
              messageContainer.scrollTop = messageContainer.scrollHeight;
            }
          });

          // Mark messages as read if we're in the conversation
          this.markMessagesAsRead(activeConversation.id).subscribe();
        }
      }

      // Update the conversation list with the new message
      this.updateConversationWithMessageBuffered(message);
    }
  }

  /**
   * Check if a received message is a confirmation of a temporary message
   * @param message The received message
   * @returns True if the message was a confirmation of a temporary message
   */
  private checkAndUpdateTempMessage(message: ChatMessage): boolean {
    // Get current messages
    const currentMessages = this.messagesSubject.value;

    // Look for temporary messages with matching content and conversation
    const tempMessageIndex = currentMessages.findIndex(m =>
      m.id?.toString().startsWith('temp-') &&
      m.conversationId === message.conversationId &&
      m.content === message.content &&
      Math.abs(new Date(m.sentAt!).getTime() - new Date(message.sentAt!).getTime()) < 60000 // Within 1 minute
    );

    if (tempMessageIndex >= 0) {
      // Found a matching temporary message, replace it with the confirmed one
      const updatedMessages = [...currentMessages];
      updatedMessages[tempMessageIndex] = {
        ...message,
        status: message.status || this.STATUS_SENT
      };

      // Update messages
      this.messagesSubject.next(updatedMessages);
      return true;
    }

    return false;
  }

  /**
   * Handle a message status update from the WebSocket
   * @param statusUpdate The status update
   */
  private handleMessageStatusUpdate(statusUpdate: MessageStatusUpdate): void {
    console.log(`ChatService: Processing status update for message ${statusUpdate.messageId}: ${statusUpdate.status}`);
    
    // Get the current messages
    const currentMessages = this.messagesSubject.value;
    
    // Skip processing if there are no messages
    if (currentMessages.length === 0) {
      return;
    }
    
    let hasStatusChanged = false;
    let updatedMessages = [...currentMessages];

    // Determine if this is a broadcast update without a specific message ID
    const isBroadcastUpdate = 
      statusUpdate.messageId === 0 || 
      statusUpdate.messageId === null || 
      statusUpdate.messageId === undefined;

    // Case 1: If it's a broadcast update, update all messages in the conversation
    if (isBroadcastUpdate) {
      updatedMessages = currentMessages.map(message => {
        // Only update messages in the same conversation with lower status
        if (message.conversationId === statusUpdate.conversationId && 
            !this.hasHigherStatus(message.status, statusUpdate.status)) {
          
          hasStatusChanged = true;
          return {
            ...message,
            status: statusUpdate.status,
            deliveredAt: statusUpdate.deliveredAt || message.deliveredAt,
            readAt: statusUpdate.readAt || message.readAt
          };
        }
        return message;
      });
    } 
    // Case 2: Specific message update
    else {
      // Try to find the exact message by ID
      const messageIndex = currentMessages.findIndex(m => m.id === statusUpdate.messageId);
      
      // If found by ID, update it
      if (messageIndex >= 0) {
        const message = currentMessages[messageIndex];
        
        // Only update if the status would actually change and isn't a downgrade
        if (message.status !== statusUpdate.status && 
            !this.hasHigherStatus(message.status, statusUpdate.status)) {
          
          console.log(`ChatService: Updating message ${message.id} status from ${message.status} to ${statusUpdate.status}`);
          
          // Create a new message with updated status
          const updatedMessage = {
            ...message,
            status: statusUpdate.status,
            deliveredAt: statusUpdate.deliveredAt || message.deliveredAt,
            readAt: statusUpdate.readAt || message.readAt
          };
          
          // Update the message in our array
          updatedMessages[messageIndex] = updatedMessage;
          hasStatusChanged = true;
        }
      } 
      // If not found by ID, check for temporary messages in the same conversation
      else {
        const tempMessageIndex = currentMessages.findIndex(m => 
          typeof m.id === 'string' && 
          m.id.toString().startsWith('temp-') && 
          m.conversationId === statusUpdate.conversationId
        );
        
        if (tempMessageIndex >= 0) {
          const tempMessage = currentMessages[tempMessageIndex];
          
          // Only update if this isn't a status downgrade
          if (!this.hasHigherStatus(tempMessage.status, statusUpdate.status)) {
            console.log(`ChatService: Updating temp message ${tempMessage.id} status from ${tempMessage.status} to ${statusUpdate.status}`);
            
            // Create updated message
            const updatedMessage = {
              ...tempMessage,
              status: statusUpdate.status,
              deliveredAt: statusUpdate.deliveredAt || tempMessage.deliveredAt,
              readAt: statusUpdate.readAt || tempMessage.readAt
            };
            
            // Update array
            updatedMessages[tempMessageIndex] = updatedMessage;
            hasStatusChanged = true;
          }
        }
      }
    }

    // Only update the subject if changes were made
    if (hasStatusChanged) {
      console.log('ChatService: Emitting updated messages with new status values');
      this.messagesSubject.next(updatedMessages);
    }
  }

  /**
   * Check if status1 is higher priority than status2
   * @param status1 First status
   * @param status2 Second status
   * @returns True if status1 is higher priority than status2
   */
  private hasHigherStatus(status1?: string, status2?: string): boolean {
    if (!status1 || !status2) return false;

    const statusPriority: {[key: string]: number} = {
      [this.STATUS_FAILED]: 0,
      [this.STATUS_PENDING]: 1,
      [this.STATUS_SENT]: 2,
      [this.STATUS_DELIVERED]: 3,
      [this.STATUS_READ]: 4
    };

    return (statusPriority[status1] || 0) > (statusPriority[status2] || 0);
  }

  /**
   * Update a conversation with a new message (buffered version)
   * @param message The new message
   */
  private updateConversationWithMessageBuffered(message: ChatMessage): void {
    // Find the conversation in the current list
    const conversations = this.conversationsSubject.value;
    const existingConversation = conversations.find(c => c.id === message.conversationId);

    if (existingConversation) {
      // Create updated conversation object
      const updatedConversation = {
        ...existingConversation,
        lastMessage: message.content,
        updatedAt: message.sentAt || new Date(),
        // Increment unread count if the message is not from the current user
        unreadCount: message.senderId !== this.getCurrentUserId() ?
          (existingConversation.unreadCount || 0) + 1 :
          existingConversation.unreadCount || 0
      };

      // Add to buffer for batched updates
      this.conversationUpdateBuffer.push(updatedConversation);
    }
  }

  /**
   * Update a conversation with a new message (immediate update - used for direct API calls)
   * @param message The new message
   * @deprecated Use updateConversationWithMessageBuffered instead
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
    
    // Automatically mark messages as delivered/read when conversation is selected
    if (this.websocketService.isConnected()) {
      // This will trigger the markMessagesAsRead endpoint which will update SENT → DELIVERED → READ
      this.markMessagesAsRead(conversation.id).subscribe({
        error: (error) => console.error('Error marking messages as read when opening conversation:', error)
      });
    }
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
    console.log(`ChatService: Loading messages for conversation ${activeConversation.id}, page ${page}, size ${size}`);

    return this.apiService.getMessageHistory(activeConversation.id, page, size).pipe(
      tap(messages => {
        // Ensure messages is an array
        const messageArray = Array.isArray(messages) ? messages : [];
        console.log(`ChatService: Received ${messageArray.length} messages`);

        // Sort messages by date (oldest first)
        const sortedMessages = [...messageArray].sort((a, b) => {
          const dateA = a.sentAt ? new Date(a.sentAt).getTime() : 0;
          const dateB = b.sentAt ? new Date(b.sentAt).getTime() : 0;
          return dateA - dateB; // Ascending order (oldest first)
        });

        // If it's the first page, replace all messages
        // Otherwise, prepend the new messages to the existing ones
        if (page === 0) {
          console.log(`ChatService: Setting ${sortedMessages.length} messages as the current message list`);
          // Use direct update for initial load to avoid delay
          this.messagesSubject.next(sortedMessages);
        } else {
          const currentMessages = this.messagesSubject.value;
          console.log(`ChatService: Adding ${sortedMessages.length} older messages to the existing ${currentMessages.length} messages`);

          // For pagination, use direct update to avoid delay
          // Combine messages, ensuring older messages come first
          this.messagesSubject.next([...sortedMessages, ...currentMessages]);
        }

        this.loadingSubject.next(false);

        // Mark messages as read
        this.markMessagesAsRead(activeConversation.id);
      }),
      catchError(error => {
        console.error(`ChatService: Error loading messages:`, error);
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

    // Send via WebSocket for real-time delivery and get temporary ID
    const tempId = this.websocketService.sendMessage(activeConversation.id, content);

    // Create a temporary message to show immediately in the UI
    const tempMessage: ChatMessage = {
      id: tempId,
      conversationId: activeConversation.id,
      senderId: this.getCurrentUserId(),
      content: content,
      sentAt: new Date(),
      status: this.websocketService.isConnected() ? this.STATUS_SENT : this.STATUS_PENDING
    };

    // IMMEDIATELY add the message to the list instead of using the buffer
    // This ensures the message appears instantly without waiting for the buffer interval
    const currentMessages = this.messagesSubject.value;
    const updatedMessages = [...currentMessages, tempMessage];
    
    // Sort messages by date (oldest first)
    updatedMessages.sort((a, b) => {
      const dateA = a.sentAt ? new Date(a.sentAt).getTime() : 0;
      const dateB = b.sentAt ? new Date(b.sentAt).getTime() : 0;
      return dateA - dateB;
    });
    
    // Update the message list immediately
    this.messagesSubject.next(updatedMessages);
    
    // Still update the conversation list via buffer (less critical for immediate visibility)
    this.updateConversationWithMessageBuffered(tempMessage);

    // Set up a timeout to check message status and retry if needed
    this.setupMessageStatusCheck(tempId);

    // Return the temporary message as an observable
    return of(tempMessage);
  }

  /**
   * Set up a check for message status after a delay
   * @param messageId The message ID to check
   */
  private setupMessageStatusCheck(messageId: string | number): void {
    // Check message status after 10 seconds
    timer(10000).pipe(
      take(1),
      filter((_: number) => {
        // Only proceed if the message is still in PENDING or SENT status
        const currentMessages = this.messagesSubject.value;
        const message = currentMessages.find(m => m.id === messageId);
        return !!message && (message.status === 'PENDING' || message.status === 'SENT');
      }),
      finalize(() => {
        // If the message is still in PENDING status after the timeout, mark it as FAILED
        const currentMessages = this.messagesSubject.value;
        const messageIndex = currentMessages.findIndex(m => m.id === messageId);

        if (messageIndex >= 0 && currentMessages[messageIndex].status === 'PENDING') {
          const updatedMessages = [...currentMessages];
          updatedMessages[messageIndex] = {
            ...updatedMessages[messageIndex],
            status: 'FAILED'
          } as ChatMessage;

          this.messagesSubject.next(updatedMessages);
        }
      })
    ).subscribe();
  }

  /**
   * Get the current user ID
   * @returns The current user ID or 0 if not available
   */
  private getCurrentUserId(): number {
    try {
      const userData = localStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        return user.id || 0;
      }
    } catch (error) {
      console.error('Error getting current user ID:', error);
    }
    return 0;
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
   * Retry sending a failed message
   * @param messageId ID of the message to retry
   */
  public retryMessage(messageId: string | number): Observable<any> {
    return this.apiService.retryMessage(messageId).pipe(
      tap(() => {
        // Update the message status in the UI
        const currentMessages = this.messagesSubject.value;
        const messageIndex = currentMessages.findIndex(m => m.id === messageId);

        if (messageIndex >= 0) {
          const updatedMessages = [...currentMessages];
          updatedMessages[messageIndex] = {
            ...updatedMessages[messageIndex],
            status: 'PENDING'
          };

          this.messagesSubject.next(updatedMessages);
        }
      })
    );
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

    // Clear the update interval
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
}
