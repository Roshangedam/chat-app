import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, tap } from 'rxjs/operators';

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
    this.initializeWebSocketConnection();

    // Reinitialize WebSocket connection when authentication status changes
    this.authService.isAuthenticated$.subscribe(isAuthenticated => {
      if (isAuthenticated) {
        // If we're authenticated and the connection is not established, initialize it
        if (!this.connectionStatusSubject.value) {
          this.initializeWebSocketConnection();
        }
      } else {
        // If we're not authenticated, disconnect WebSocket
        this.disconnect();
      }
    });
  }

  // Initialize WebSocket connection
  private initializeWebSocketConnection(): void {
    try {
      // Get the latest token
      const token = localStorage.getItem('token');

      // Don't initialize if no token is available
      if (!token) {
        console.warn('No authentication token available for WebSocket connection');
        return;
      }

      // Close existing connection if any
      this.disconnect();

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
        }
      };

      this.stompClient.onWebSocketError = (event) => {
        console.error('WebSocket connection error:', event);
        this.connectionStatusSubject.next(false);
      };

      this.stompClient.activate();
    } catch (error) {
      console.error('Failed to initialize WebSocket connection:', error);
      this.connectionStatusSubject.next(false);
    }
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
    if (!this.stompClient.connected) {
      console.warn('WebSocket not connected. Will retry when connected.');
      return;
    }

    const destination = `/topic/conversation.${conversationId}`;
    if (!this.subscriptions.has(destination)) {
      const subscription = this.stompClient.subscribe(destination, (message: IMessage) => {
        const receivedMessage: Message = JSON.parse(message.body);
        const currentMessages = this.messagesSubject.value;

        // Add message if it doesn't exist already
        if (!currentMessages.some(m => m.id === receivedMessage.id)) {
          this.messagesSubject.next([...currentMessages, receivedMessage]);
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
    if (this.stompClient.connected) {
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
    });
  }

  // Mark messages as read in a conversation
  markMessagesAsRead(conversationId: number): Observable<number> {
    if (this.stompClient.connected) {
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
    return this.http.put<number>(`${this.baseUrl}/api/v1/messages/conversation/${conversationId}/read`, {});
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
        })
      );
  }

  // Get all conversations for the current user
  getConversations(): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(`${this.baseUrl}/api/v1/conversations`)
      .pipe(
        tap(conversations => this.conversationsSubject.next(conversations))
      );
  }

  // Get a specific conversation by ID
  getConversation(conversationId: number): Observable<Conversation> {
    return this.http.get<Conversation>(`${this.baseUrl}/api/v1/conversations/${conversationId}`);
  }

  // Create a new one-to-one conversation
  createOneToOneConversation(participantId: number): Observable<Conversation> {
    return this.http.post<Conversation>(`${this.baseUrl}/api/v1/conversations/one-to-one`, { participantId })
      .pipe(
        tap(conversation => {
          const currentConversations = this.conversationsSubject.value;
          this.conversationsSubject.next([...currentConversations, conversation]);
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
      })
    );
  }

  // Get unread message count for a conversation
  getUnreadMessageCount(conversationId: number): Observable<number> {
    return this.http.get<number>(`${this.baseUrl}/api/v1/messages/conversation/${conversationId}/unread/count`);
  }

  // Disconnect WebSocket when service is destroyed
  // disconnect(): void {
  //   if (this.stompClient) {
  //     this.stompClient.deactivate();
  //   }

  //   // Clear all subscriptions
  //   this.subscriptions.forEach(subscription => subscription.unsubscribe());
  //   this.subscriptions.clear();

  //   this.connectionStatusSubject.next(false);
  // }
}
