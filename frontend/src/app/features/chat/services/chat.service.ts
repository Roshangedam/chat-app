import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { map, tap, catchError, filter } from 'rxjs/operators';

import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
// Fix for SockJS import
import SockJS from 'sockjs-client';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/services/auth.service';

export interface Message {
  id?: number;
  senderId: number;
  senderUsername?: string;
  senderAvatarUrl?: string;
  conversationId: number;
  content: string;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  status?: string;
}

export interface Conversation {
  id: number;
  name: string;
  description?: string;
  avatarUrl?: string;
  groupChat: boolean;
  creatorId?: number;
  creatorUsername?: string;
  participants: any[];
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private baseUrl = `${environment.apiUrl}`;
  // Fix for stompClient initialization
  private stompClient!: Client;
  private subscriptions: Map<string, StompSubscription> = new Map();

  // Observable sources
  private messagesSubject = new BehaviorSubject<Message[]>([]);
  private conversationsSubject = new BehaviorSubject<Conversation[]>([]);
  private connectionStatusSubject = new BehaviorSubject<boolean>(false);

  // Observable streams
  public messages$ = this.messagesSubject.asObservable();
  public conversations$ = this.conversationsSubject.asObservable();
  public connectionStatus$ = this.connectionStatusSubject.asObservable();

  constructor(private http: HttpClient, private authService: AuthService) {
    // Don't automatically initialize connection at startup
    // Instead wait for authentication state to be established

    // Handle authentication status changes
    this.authService.isAuthenticated$.pipe(
      filter(isAuthenticated => isAuthenticated === true) // Only react to becoming authenticated
    ).subscribe(() => {
      // When authenticated, initialize connection if not connected
      if (!this.connectionStatusSubject.value) {
        this.initializeWebSocketConnection();
      }
    });

    // Handle logout more explicitly
    this.authService.isAuthenticated$.pipe(
      filter(isAuthenticated => isAuthenticated === false) // React to becoming unauthenticated
    ).subscribe(() => {
      // When logged out, ensure connection is closed
      this.disconnect();
    });

    // Listen for token changes to reinitialize the WebSocket connection with the new token
    this.authService.currentUser$.subscribe(() => {
      // This will be triggered after a token refresh since the auth service updates the current user
      if (this.authService.isAuthenticated()) {
        console.log('User data updated, reinitializing WebSocket connection with new token');
        // First disconnect to ensure clean reconnection with new token
        this.disconnect();
        // Short delay to ensure disconnect completes before reconnecting
        setTimeout(() => {
          this.initializeWebSocketConnection();
        }, 100);
      }
    });
  }

  // Initialize WebSocket connection
  private initializeWebSocketConnection(): void {
    try {
      // Get the token directly from AuthService instead of localStorage
      const token = this.authService.getToken();

      // Don't initialize if no token is available
      if (!token) {
        console.warn('No authentication token available for WebSocket connection');
        return;
      }

      // Close existing connection if any
      this.disconnect();

      // Log that we're initializing with a valid token
      console.log('Initializing WebSocket connection with valid token');

      this.stompClient = new Client({
        webSocketFactory: () => new SockJS(environment.wsUrl),
        debug: (str) => console.debug(str),
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        // Add connect headers with token for authentication
        connectHeaders: {
          Authorization: `Bearer ${token}`
        }
      });

      this.stompClient.onConnect = (frame) => {
        console.log('Connected to WebSocket: ' + frame);
        this.connectionStatusSubject.next(true);

        // Re-subscribe to active conversations after reconnection
        // This ensures subscriptions are restored after token refresh
        this.resubscribeToActiveConversations();
      };

      this.stompClient.onStompError = (frame) => {
        console.error('WebSocket error: ' + frame.headers['message']);
        console.error('Additional details: ' + frame.body);
        this.connectionStatusSubject.next(false);

        // Check if error is related to authentication
        if (frame.headers['message']?.includes('Unauthorized') ||
            frame.body?.includes('Unauthorized') ||
            frame.headers['message']?.includes('401')) {
          // Handle authentication error
          console.error('WebSocket authentication failed. Please log in again.');
          // Don't call logout here to avoid circular dependency
          // Just clear the connection status
        }
      };

      this.stompClient.onWebSocketError = (event) => {
        console.error('WebSocket connection error:', event);
        this.connectionStatusSubject.next(false);
      };

      this.stompClient.onWebSocketClose = () => {
        console.log('WebSocket connection closed');
        this.connectionStatusSubject.next(false);
      };

      this.stompClient.activate();
    } catch (error) {
      console.error('Failed to initialize WebSocket connection:', error);
      this.connectionStatusSubject.next(false);
    }
  }

  // Re-subscribe to active conversations after reconnection
  private resubscribeToActiveConversations(): void {
    // Get list of conversation IDs that we were subscribed to
    const activeTopics = Array.from(this.subscriptions.keys());

    // Clear the subscriptions map since the old subscriptions are invalid
    this.subscriptions.clear();

    // Re-subscribe to each topic
    activeTopics.forEach(topic => {
      const conversationId = parseInt(topic.split('.')[1]);
      if (!isNaN(conversationId)) {
        this.subscribeToConversation(conversationId);
      }
    });
  }

  // Disconnect WebSocket connection
  private disconnect(): void {
    if (this.stompClient && this.stompClient.connected) {
      try {
        // Unsubscribe from all topics
        this.subscriptions.forEach(subscription => subscription.unsubscribe());
        this.subscriptions.clear();

        // Disconnect the client
        this.stompClient.deactivate();
        console.log('WebSocket connection closed');
      } catch (error) {
        console.error('Error disconnecting WebSocket:', error);
      }
    }
    this.connectionStatusSubject.next(false);
  }


  // Subscribe to a conversation's messages
  subscribeToConversation(conversationId: number): void {
    if (!this.stompClient || !this.stompClient.connected) {
      console.warn('WebSocket not connected. Will retry when connected.');
      // Store conversation ID to subscribe when connection is established
      return;
    }

    const destination = `/topic/conversation.${conversationId}`;
    if (!this.subscriptions.has(destination)) {
      const subscription = this.stompClient.subscribe(destination, (message: IMessage) => {
        try {
          const receivedMessage: Message = JSON.parse(message.body);
          const currentMessages = this.messagesSubject.value;

          // Add message if it doesn't exist already
          if (!currentMessages.some(m => m.id === receivedMessage.id)) {
            this.messagesSubject.next([...currentMessages, receivedMessage]);
          }
        } catch (error) {
          console.error('Error processing received message:', error);
        }
      });

      this.subscriptions.set(destination, subscription);
    }
  }

  // Unsubscribe from a conversation
  unsubscribeFromConversation(conversationId: number): void {
    const destination = `/topic/conversation.${conversationId}`;
    const subscription = this.subscriptions.get(destination);

    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(destination);
    }
  }

  // Send a message to a conversation
  sendMessage(conversationId: number, content: string): Observable<Message> {
    if (this.stompClient && this.stompClient.connected) {
      // Send via WebSocket for real-time delivery
      const message: Message = {
        senderId: 0, // Will be set by the server based on authentication
        conversationId: conversationId,
        content: content
      };

      this.stompClient.publish({
        destination: '/app/chat.send',
        body: JSON.stringify(message)
      });
    }

    // Also send via REST API for persistence
    return this.http.post<Message>(`${this.baseUrl}/api/v1/messages/conversation/${conversationId}`, {
      content: content
    }).pipe(
      catchError(error => {
        console.error('Error sending message:', error);
        return throwError(() => error);
      })
    );
  }

  // Mark messages as read in a conversation
  markMessagesAsRead(conversationId: number): Observable<number> {
    if (this.stompClient && this.stompClient.connected) {
      // Send read status via WebSocket
      const message: Message = {
        senderId: 0, // Will be set by the server
        conversationId: conversationId,
        content: ''
      };

      this.stompClient.publish({
        destination: '/app/chat.read',
        body: JSON.stringify(message)
      });
    }

    // Also update via REST API
    return this.http.put<number>(`${this.baseUrl}/api/v1/messages/conversation/${conversationId}/read`, {})
      .pipe(
        catchError(error => {
          console.error('Error marking messages as read:', error);
          return throwError(() => error);
        })
      );
  }

  // Get message history for a conversation
  getMessageHistory(conversationId: number, page: number = 0, size: number = 20): Observable<Message[]> {
    return this.http.get<any>(`${this.baseUrl}/api/v1/messages/conversation/${conversationId}?page=${page}&size=${size}`)
      .pipe(
        map(response => response.content),
        tap(messages => {
          const currentMessages = this.messagesSubject.value;
          const uniqueMessages = [...currentMessages];

          // Add only messages that don't exist in the current list
          messages.forEach((message: Message) => {
            if (!uniqueMessages.some(m => m.id === message.id)) {
              uniqueMessages.push(message);
            }
          });

          this.messagesSubject.next(uniqueMessages);
        }),
        catchError(error => {
          console.error(`Error loading message history for conversation ${conversationId}:`, error);
          return throwError(() => error);
        })
      );
  }

  // Get all conversations for the current user
  getConversations(): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(`${this.baseUrl}/api/v1/conversations`)
      .pipe(
        tap(conversations => this.conversationsSubject.next(conversations)),
        catchError(error => {
          console.error('Error loading conversations:', error);

          // Handle unauthorized error specifically
          if (error.status === 401) {
            // Don't call logout here to avoid circular dependency
            // Instead, check if we need to reconnect the WebSocket
            if (this.authService.isAuthenticated()) {
              console.log('Received 401 while authenticated, attempting to reconnect WebSocket');
              // Delay the reconnection to allow any token refresh to complete
              setTimeout(() => this.ensureConnection(), 500);
            }
          }

          return throwError(() => error);
        })
      );
  }

  // Get a specific conversation by ID
  getConversation(conversationId: number): Observable<Conversation> {
    return this.http.get<Conversation>(`${this.baseUrl}/api/v1/conversations/${conversationId}`)
      .pipe(
        catchError(error => {
          console.error(`Error loading conversation ${conversationId}:`, error);
          return throwError(() => error);
        })
      );
  }

  // Create a new one-to-one conversation
  createOneToOneConversation(participantId: number): Observable<Conversation> {
    return this.http.post<Conversation>(`${this.baseUrl}/api/v1/conversations/one-to-one`, { participantId })
      .pipe(
        tap(conversation => {
          const currentConversations = this.conversationsSubject.value;
          this.conversationsSubject.next([...currentConversations, conversation]);
        }),
        catchError(error => {
          console.error('Error creating one-to-one conversation:', error);
          return throwError(() => error);
        })
      );
  }

  // Create a new group conversation
  createGroupConversation(name: string, description: string, participantIds: number[]): Observable<Conversation> {
    return this.http.post<Conversation>(`${this.baseUrl}/api/v1/conversations/group`, {
      name,
      description,
      participantIds
    }).pipe(
      tap(conversation => {
        const currentConversations = this.conversationsSubject.value;
        this.conversationsSubject.next([...currentConversations, conversation]);
      }),
      catchError(error => {
        console.error('Error creating group conversation:', error);
        return throwError(() => error);
      })
    );
  }

  // Get unread message count for a conversation
  getUnreadMessageCount(conversationId: number): Observable<number> {
    return this.http.get<number>(`${this.baseUrl}/api/v1/messages/conversation/${conversationId}/unread/count`)
      .pipe(
        catchError(error => {
          console.error(`Error getting unread count for conversation ${conversationId}:`, error);
          return throwError(() => error);
        })
      );
  }

  // Public method to disconnect WebSocket when service is destroyed
  // This can also be called from components when needed
  public disconnectWebSocket(): void {
    this.disconnect();
  }

  // Check connection status and reconnect if needed
  public ensureConnection(): void {
    if (!this.connectionStatusSubject.value && this.authService.isAuthenticated()) {
      this.initializeWebSocketConnection();
    }
  }
}