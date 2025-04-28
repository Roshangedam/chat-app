import { Injectable, OnDestroy, NgZone } from '@angular/core';
import { BehaviorSubject, Subject, Observable, timer, Subscription, of } from 'rxjs';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { switchMap, filter, take, retryWhen, delayWhen, tap, catchError } from 'rxjs/operators';
import SockJS from 'sockjs-client';
import { environment } from '../../../../../environments/environment';
import { ChatMessage, MessageStatusUpdate } from '../models';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service for handling WebSocket connections for real-time chat functionality.
 * This service manages the WebSocket connection and subscriptions.
 */
@Injectable({
  providedIn: 'root'
})
export class ChatWebsocketService implements OnDestroy {
  private stompClient!: Client;
  private subscriptions: Map<string, StompSubscription> = new Map();
  private connectionStatusSubject = new BehaviorSubject<boolean>(false);
  public connectionStatus$: Observable<boolean> = this.connectionStatusSubject.asObservable();
  private messageReceivedSubject = new Subject<ChatMessage>();
  private messageStatusSubject = new Subject<MessageStatusUpdate>();
  private typingStatusSubject = new Subject<{conversationId: string | number, username: string, isTyping: boolean}>();
  private userStatusSubject = new Subject<{userId: string | number, username: string, status: string}>();
  private syncCompleteSubject = new Subject<{syncedCount: number, timestamp: number}>();

  // Reconnection properties
  private reconnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectSubscription?: Subscription;
  private clientId = uuidv4(); // Unique client ID for this session
  private lastSyncTimestamp = 0; // Last successful sync timestamp
  private pendingMessages: Map<string, {message: ChatMessage, attempts: number}> = new Map(); // Messages waiting to be sent

  // Observable streams
  public messageReceived$ = this.messageReceivedSubject.asObservable();
  public messageStatus$ = this.messageStatusSubject.asObservable();
  public typingStatus$ = this.typingStatusSubject.asObservable();
  public userStatus$ = this.userStatusSubject.asObservable();

  constructor(private ngZone: NgZone) {}

  /**
   * Initialize the WebSocket connection
   * @param token Authentication token for the WebSocket connection
   */
  public initialize(token: string): void {
    // Create and configure STOMP client
    this.stompClient = new Client({
      webSocketFactory: () => {
        // Create SockJS instance
        const sockjs = new SockJS(`${environment.apiUrl}/ws?token=${token}`);
        // Note: SockJS handles credentials internally, we don't need to set it manually
        return sockjs;
      },
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      debug: function(str) {
        if (environment.production === false) {
          console.log('STOMP: ' + str);
        }
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000
    });

    // Set up connection event handlers
    this.stompClient.onConnect = () => {
      this.ngZone.run(() => {
        console.log('Connected to WebSocket');
        this.connectionStatusSubject.next(true);
        this.reconnectAttempts = 0;
        this.reconnecting = false;

        // Subscribe to user-specific sync topic
        this.subscribeToSyncTopic();

        // Synchronize messages after connection
        this.synchronizeMessages();

        // Resend any pending messages
        this.resendPendingMessages();
      });
    };

    this.stompClient.onDisconnect = () => {
      this.ngZone.run(() => {
        console.log('Disconnected from WebSocket');
        this.connectionStatusSubject.next(false);

        // Attempt to reconnect if not already reconnecting
        if (!this.reconnecting) {
          this.attemptReconnect(token);
        }
      });
    };

    this.stompClient.onStompError = (frame) => {
      this.ngZone.run(() => {
        console.error('STOMP error', frame);
        this.connectionStatusSubject.next(false);

        // Attempt to reconnect if not already reconnecting
        if (!this.reconnecting) {
          this.attemptReconnect(token);
        }
      });
    };

    // Activate the connection
    this.stompClient.activate();
  }

  /**
   * Disconnect from the WebSocket server
   */
  public disconnect(): void {
    if (this.stompClient && this.stompClient.connected) {
      // Unsubscribe from all topics
      this.subscriptions.forEach((subscription) => {
        subscription.unsubscribe();
      });
      this.subscriptions.clear();

      // Disconnect the client
      this.stompClient.deactivate();
      this.connectionStatusSubject.next(false);
    }
  }

  /**
   * Subscribe to messages for a specific conversation
   * @param conversationId ID of the conversation to subscribe to
   */
  public subscribeToConversation(conversationId: string | number): void {
    if (!this.stompClient || !this.stompClient.connected) {
      console.warn('WebSocket not connected, cannot subscribe');
      return;
    }

    const destination = `/topic/conversation.${conversationId}`;

    // Check if already subscribed
    if (this.subscriptions.has(destination)) {
      return;
    }

    // Subscribe to the conversation topic
    const subscription = this.stompClient.subscribe(destination, (message: IMessage) => {
      try {
        if (message && message.body) {
          const chatMessage = JSON.parse(message.body) as ChatMessage;
          if (chatMessage) {
            this.messageReceivedSubject.next(chatMessage);
          } else {
            console.warn('Received empty or invalid chat message');
          }
        } else {
          console.warn('Received empty message from WebSocket');
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });

    // Store the subscription
    this.subscriptions.set(destination, subscription);

    // Subscribe to message status updates
    this.subscribeToMessageStatus(conversationId);

    // Also subscribe to typing indicators
    this.subscribeToTypingIndicators(conversationId);
  }

  /**
   * Subscribe to typing indicators for a specific conversation
   * @param conversationId ID of the conversation to subscribe to
   */
  private subscribeToTypingIndicators(conversationId: string | number): void {
    if (!this.stompClient || !this.stompClient.connected) {
      return;
    }

    const destination = `/topic/conversation.${conversationId}.typing`;

    // Check if already subscribed
    if (this.subscriptions.has(destination)) {
      return;
    }

    // Subscribe to the typing topic
    const subscription = this.stompClient.subscribe(destination, (message: IMessage) => {
      try {
        if (message && message.body) {
          const typingData = JSON.parse(message.body);
          if (typingData && typingData.username !== undefined && typingData.isTyping !== undefined) {
            this.typingStatusSubject.next({
              conversationId: conversationId,
              username: typingData.username,
              isTyping: typingData.isTyping
            });
          } else {
            console.warn('Received invalid typing indicator data');
          }
        } else {
          console.warn('Received empty typing indicator message');
        }
      } catch (error) {
        console.error('Error parsing typing indicator:', error);
      }
    });

    // Store the subscription
    this.subscriptions.set(destination, subscription);
  }

  /**
   * Subscribe to message status updates for a specific conversation
   * @param conversationId ID of the conversation to subscribe to
   */
  private subscribeToMessageStatus(conversationId: string | number): void {
    if (!this.stompClient || !this.stompClient.connected) {
      return;
    }

    const destination = `/topic/conversation.${conversationId}.status`;

    // Check if already subscribed
    if (this.subscriptions.has(destination)) {
      return;
    }

    // Subscribe to the message status topic
    const subscription = this.stompClient.subscribe(destination, (message: IMessage) => {
      try {
        if (message && message.body) {
          const statusData = JSON.parse(message.body);
          if (statusData && statusData.status) {
            // Validate the status value
            let status = statusData.status;
            if (status !== 'PENDING' && status !== 'SENT' && status !== 'DELIVERED' && status !== 'READ' && status !== 'FAILED') {
              console.warn(`Invalid message status: ${status}, defaulting to SENT`);
              status = 'SENT';
            }

            // Push status update to subscribers
            const statusUpdate: MessageStatusUpdate = {
              messageId: statusData.id || 0,
              conversationId: conversationId,
              status: status as 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED',
              deliveredAt: statusData.deliveredAt ? new Date(statusData.deliveredAt) : undefined,
              readAt: statusData.readAt ? new Date(statusData.readAt) : undefined
            };
            this.messageStatusSubject.next(statusUpdate);
            
            console.log(`Received status update for message ${statusData.id}: ${status}`);
          } else {
            console.warn('Received invalid message status data');
          }
        } else {
          console.warn('Received empty message status update');
        }
      } catch (error) {
        console.error('Error parsing message status update:', error);
      }
    });

    // Store the subscription
    this.subscriptions.set(destination, subscription);
    
    // Request immediate status updates when subscribing to a conversation
    // This helps refresh message statuses when a user opens a conversation
    if (this.stompClient && this.stompClient.connected) {
      this.stompClient.publish({
        destination: '/app/chat.status.refresh',
        body: JSON.stringify({
          conversationId: conversationId
        })
      });
    }
  }

  /**
   * Unsubscribe from a specific conversation
   * @param conversationId ID of the conversation to unsubscribe from
   */
  public unsubscribeFromConversation(conversationId: string | number): void {
    const messageDestination = `/topic/conversation.${conversationId}`;
    const statusDestination = `/topic/conversation.${conversationId}.status`;
    const typingDestination = `/topic/conversation.${conversationId}.typing`;

    // Unsubscribe from message topic
    if (this.subscriptions.has(messageDestination)) {
      this.subscriptions.get(messageDestination)?.unsubscribe();
      this.subscriptions.delete(messageDestination);
    }

    // Unsubscribe from status topic
    if (this.subscriptions.has(statusDestination)) {
      this.subscriptions.get(statusDestination)?.unsubscribe();
      this.subscriptions.delete(statusDestination);
    }

    // Unsubscribe from typing topic
    if (this.subscriptions.has(typingDestination)) {
      this.subscriptions.get(typingDestination)?.unsubscribe();
      this.subscriptions.delete(typingDestination);
    }
  }

  /**
   * Send a message via WebSocket
   * @param conversationId ID of the conversation to send the message to
   * @param content Content of the message
   * @returns A temporary message ID for tracking
   */
  public sendMessage(conversationId: string | number, content: string): string {
    const tempId = `temp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Create a message object for local tracking
    const localMessage: ChatMessage = {
      id: tempId,
      senderId: 0, // Will be set by the server based on authentication
      conversationId: conversationId,
      content: content,
      sentAt: new Date(),
      status: 'SENT'
    };

    // Create a separate message object for sending to the server
    // with null id to let the server generate a proper ID
    const serverMessage: ChatMessage = {
      id: null, // Let the server generate the ID
      senderId: 0, // Will be set by the server based on authentication
      conversationId: conversationId,
      content: content,
      sentAt: new Date(),
      status: 'SENT'
    };

    if (!this.stompClient || !this.stompClient.connected) {
      console.warn('WebSocket not connected, queuing message for later');
      // Store message for later sending
      this.pendingMessages.set(tempId, {message: localMessage, attempts: 0});
      return tempId;
    }

    try {
      this.stompClient.publish({
        destination: '/app/chat.send',
        body: JSON.stringify(serverMessage)
      });
    } catch (error) {
      console.error('Error sending message:', error);
      // Store message for retry
      this.pendingMessages.set(tempId, {message: localMessage, attempts: 0});
    }

    return tempId;
  }

  /**
   * Send a typing indicator
   * @param conversationId ID of the conversation
   * @param isTyping Whether the user is currently typing
   */
  public sendTypingIndicator(conversationId: string | number, isTyping: boolean): void {
    if (!this.stompClient || !this.stompClient.connected) {
      return;
    }

    this.stompClient.publish({
      destination: '/app/chat.typing',
      body: JSON.stringify({
        conversationId: conversationId,
        isTyping: isTyping
      })
    });
  }

  /**
   * Mark messages as read
   * @param conversationId ID of the conversation
   */
  public markMessagesAsRead(conversationId: string | number): void {
    if (!this.stompClient || !this.stompClient.connected) {
      return;
    }

    this.stompClient.publish({
      destination: '/app/chat.read',
      body: JSON.stringify({
        conversationId: conversationId
      })
    });
  }

  /**
   * Subscribe to global user status updates
   */
  public subscribeToUserStatus(): void {
    if (!this.stompClient || !this.stompClient.connected) {
      return;
    }

    const destination = `/topic/user.status`;

    // Check if already subscribed
    if (this.subscriptions.has(destination)) {
      return;
    }

    // Subscribe to the user status topic
    const subscription = this.stompClient.subscribe(destination, (message: IMessage) => {
      try {
        if (message && message.body) {
          const statusData = JSON.parse(message.body);
          if (statusData && statusData.userId && statusData.status) {
            this.userStatusSubject.next({
              userId: statusData.userId,
              username: statusData.username || '',
              status: statusData.status
            });
          } else {
            console.warn('Received invalid user status data');
          }
        } else {
          console.warn('Received empty user status update');
        }
      } catch (error) {
        console.error('Error parsing user status update:', error);
      }
    });

    // Store the subscription
    this.subscriptions.set(destination, subscription);
  }

  /**
   * Send a user status update
   * @param status New status (ONLINE, AWAY, OFFLINE)
   */
  public sendUserStatus(status: string): void {
    if (!this.stompClient || !this.stompClient.connected) {
      return;
    }

    this.stompClient.publish({
      destination: '/app/user.status',
      body: JSON.stringify({
        status: status
      })
    });
  }

  /**
   * Check if the WebSocket is connected
   * @returns True if connected, false otherwise
   */
  public isConnected(): boolean {
    return this.stompClient && this.stompClient.connected;
  }

  /**
   * Attempt to reconnect to the WebSocket server
   * @param token Authentication token
   */
  private attemptReconnect(token: string): void {
    if (this.reconnecting || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.reconnecting = true;
    this.reconnectAttempts++;

    // Calculate backoff delay (exponential with jitter)
    const baseDelay = Math.min(30000, Math.pow(2, this.reconnectAttempts) * 1000);
    const jitter = Math.random() * 1000;
    const delay = baseDelay + jitter;

    console.log(`Attempting to reconnect in ${Math.round(delay / 1000)} seconds (attempt ${this.reconnectAttempts})`);

    // Clear any existing reconnect subscription
    if (this.reconnectSubscription) {
      this.reconnectSubscription.unsubscribe();
    }

    // Schedule reconnection
    this.reconnectSubscription = timer(delay).subscribe(() => {
      if (this.stompClient) {
        try {
          // Recreate the client with the same configuration
          this.stompClient.deactivate();
          this.initialize(token);
        } catch (error) {
          console.error('Error during reconnection:', error);
          // Try again if we haven't exceeded max attempts
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnecting = false;
            this.attemptReconnect(token);
          } else {
            console.error(`Failed to reconnect after ${this.maxReconnectAttempts} attempts`);
          }
        }
      }
    });
  }

  /**
   * Resend any pending messages that failed to send
   */
  private resendPendingMessages(): void {
    if (this.pendingMessages.size === 0) {
      return;
    }

    console.log(`Attempting to resend ${this.pendingMessages.size} pending messages`);

    // Create a copy of the keys to avoid modification during iteration
    const pendingIds = Array.from(this.pendingMessages.keys());

    for (const id of pendingIds) {
      const pendingMessage = this.pendingMessages.get(id);
      if (!pendingMessage) continue;

      const { message, attempts } = pendingMessage;

      // Skip messages that have exceeded retry attempts
      if (attempts >= 3) {
        console.warn(`Message ${id} exceeded retry attempts, marking as failed`);
        // Update message status to failed
        const statusUpdate: MessageStatusUpdate = {
          messageId: id,
          conversationId: message.conversationId,
          status: 'FAILED'
        };
        this.messageStatusSubject.next(statusUpdate);
        this.pendingMessages.delete(id);
        continue;
      }

      try {
        if (this.stompClient && this.stompClient.connected) {
          console.log(`Resending message ${id}, attempt ${attempts + 1}`);

          // Create a server message with null ID
          const serverMessage: ChatMessage = {
            id: null, // Let the server generate the ID
            senderId: message.senderId,
            conversationId: message.conversationId,
            content: message.content,
            sentAt: message.sentAt,
            status: message.status
          };

          this.stompClient.publish({
            destination: '/app/chat.send',
            body: JSON.stringify(serverMessage)
          });

          // Update attempts count
          this.pendingMessages.set(id, {
            message,
            attempts: attempts + 1
          });
        }
      } catch (error) {
        console.error(`Error resending message ${id}:`, error);
      }
    }
  }

  /**
   * Subscribe to the sync topic for this user
   */
  private subscribeToSyncTopic(): void {
    if (!this.stompClient || !this.stompClient.connected) {
      console.warn('WebSocket not connected, cannot subscribe to sync topic');
      return;
    }

    // Subscribe to the user's sync topic
    const destination = '/queue/user.sync';

    if (this.subscriptions.has(destination)) {
      console.log('Already subscribed to sync topic');
      return;
    }

    const subscription = this.stompClient.subscribe(destination, (message: IMessage) => {
      try {
        if (message && message.body) {
          const syncData = JSON.parse(message.body);
          if (syncData && syncData.status === 'complete') {
            console.log(`Sync complete: ${syncData.syncedCount} messages synchronized`);

            // Update last sync timestamp
            if (syncData.timestamp) {
              this.lastSyncTimestamp = syncData.timestamp;
            }

            // Notify subscribers
            this.syncCompleteSubject.next({
              syncedCount: syncData.syncedCount || 0,
              timestamp: syncData.timestamp || Date.now()
            });
          }
        }
      } catch (error) {
        console.error('Error processing sync response:', error);
      }
    });

    this.subscriptions.set(destination, subscription);
  }

  /**
   * Synchronize messages with the server
   */
  private synchronizeMessages(): void {
    if (!this.stompClient || !this.stompClient.connected) {
      console.warn('WebSocket not connected, cannot synchronize messages');
      return;
    }

    console.log('Requesting message synchronization');

    // Send sync request
    this.stompClient.publish({
      destination: '/app/chat.sync',
      body: JSON.stringify({
        lastSyncTimestamp: this.lastSyncTimestamp,
        clientId: this.clientId
      })
    });
  }

  /**
   * Get sync complete notifications
   * @returns An observable of sync complete events
   */
  public getSyncCompleteNotifications(): Observable<{syncedCount: number, timestamp: number}> {
    return this.syncCompleteSubject.asObservable();
  }

  /**
   * Clean up resources when the service is destroyed
   */
  ngOnDestroy(): void {
    if (this.reconnectSubscription) {
      this.reconnectSubscription.unsubscribe();
    }
    this.disconnect();
  }
}
