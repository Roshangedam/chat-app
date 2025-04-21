import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { environment } from '../../../../../environments/environment';
import { ChatMessage } from '../models';

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
  private messageReceivedSubject = new Subject<ChatMessage>();
  private typingStatusSubject = new Subject<{conversationId: string | number, username: string, isTyping: boolean}>();

  // Observable streams
  public connectionStatus$ = this.connectionStatusSubject.asObservable();
  public messageReceived$ = this.messageReceivedSubject.asObservable();
  public typingStatus$ = this.typingStatusSubject.asObservable();

  constructor() {}

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
    this.stompClient.onConnect = (frame) => {
      console.log('Connected to WebSocket');
      this.connectionStatusSubject.next(true);
    };

    this.stompClient.onDisconnect = () => {
      console.log('Disconnected from WebSocket');
      this.connectionStatusSubject.next(false);
    };

    this.stompClient.onStompError = (frame) => {
      console.error('STOMP error', frame);
      this.connectionStatusSubject.next(false);
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
        const chatMessage = JSON.parse(message.body) as ChatMessage;
        this.messageReceivedSubject.next(chatMessage);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });

    // Store the subscription
    this.subscriptions.set(destination, subscription);

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
        const typingData = JSON.parse(message.body);
        this.typingStatusSubject.next({
          conversationId: conversationId,
          username: typingData.username,
          isTyping: typingData.isTyping
        });
      } catch (error) {
        console.error('Error parsing typing indicator:', error);
      }
    });

    // Store the subscription
    this.subscriptions.set(destination, subscription);
  }

  /**
   * Unsubscribe from a specific conversation
   * @param conversationId ID of the conversation to unsubscribe from
   */
  public unsubscribeFromConversation(conversationId: string | number): void {
    const messageDestination = `/topic/conversation.${conversationId}`;
    const typingDestination = `/topic/conversation.${conversationId}.typing`;

    // Unsubscribe from message topic
    if (this.subscriptions.has(messageDestination)) {
      this.subscriptions.get(messageDestination)?.unsubscribe();
      this.subscriptions.delete(messageDestination);
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
   */
  public sendMessage(conversationId: string | number, content: string): void {
    if (!this.stompClient || !this.stompClient.connected) {
      console.warn('WebSocket not connected, cannot send message');
      return;
    }

    const message: ChatMessage = {
      senderId: 0, // Will be set by the server based on authentication
      conversationId: conversationId,
      content: content
    };

    this.stompClient.publish({
      destination: '/app/chat.send',
      body: JSON.stringify(message)
    });
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
   * Clean up resources when the service is destroyed
   */
  ngOnDestroy(): void {
    this.disconnect();
  }
}
