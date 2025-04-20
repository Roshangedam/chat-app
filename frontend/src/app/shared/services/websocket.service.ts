import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private stompClient!: Client;
  private subscriptions: Map<string, StompSubscription> = new Map();
  private connectionStatusSubject = new BehaviorSubject<boolean>(false);
  
  // Observable stream
  public connectionStatus$ = this.connectionStatusSubject.asObservable();

  constructor(private authService: AuthService) {}

  // Initialize WebSocket connection
  connect(): void {
    if (this.stompClient && this.stompClient.connected) {
      console.log('WebSocket already connected');
      return;
    }

    console.log('Initializing WebSocket connection...');
    
    this.stompClient = new Client({
      webSocketFactory: () => new SockJS(`${environment.apiUrl}/ws`),
      connectHeaders: {
        Authorization: `Bearer ${this.authService.getToken()}`
      },
      debug: function(str) {
        console.log('STOMP: ' + str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000
    });

    this.stompClient.onConnect = (frame) => {
      console.log('WebSocket connected: ' + frame);
      this.connectionStatusSubject.next(true);
    };

    this.stompClient.onStompError = (frame) => {
      console.error('WebSocket error: ' + frame.headers['message']);
      console.error('Additional details: ' + frame.body);
    };

    this.stompClient.onDisconnect = () => {
      console.log('WebSocket disconnected');
      this.connectionStatusSubject.next(false);
    };

    this.stompClient.activate();
  }

  // Disconnect WebSocket
  disconnect(): void {
    if (this.stompClient && this.stompClient.connected) {
      console.log('Disconnecting WebSocket...');
      
      // Unsubscribe from all topics
      this.subscriptions.forEach((subscription, topic) => {
        this.unsubscribe(topic);
      });
      
      this.stompClient.deactivate();
      this.connectionStatusSubject.next(false);
    }
  }

  // Subscribe to a topic
  subscribe(topic: string, callback: (message: any) => void): void {
    if (!this.stompClient || !this.stompClient.connected) {
      console.warn('Cannot subscribe, WebSocket not connected');
      return;
    }

    if (this.subscriptions.has(topic)) {
      console.log(`Already subscribed to ${topic}`);
      return;
    }

    console.log(`Subscribing to ${topic}`);
    const subscription = this.stompClient.subscribe(topic, (message: IMessage) => {
      try {
        const parsedMessage = JSON.parse(message.body);
        callback(parsedMessage);
      } catch (error) {
        console.error('Error parsing message:', error);
        callback(message.body);
      }
    });

    this.subscriptions.set(topic, subscription);
  }

  // Unsubscribe from a topic
  unsubscribe(topic: string): void {
    const subscription = this.subscriptions.get(topic);
    if (subscription) {
      console.log(`Unsubscribing from ${topic}`);
      subscription.unsubscribe();
      this.subscriptions.delete(topic);
    }
  }

  // Send a message to a destination
  send(destination: string, body: any): void {
    if (!this.stompClient || !this.stompClient.connected) {
      console.warn('Cannot send message, WebSocket not connected');
      return;
    }

    console.log(`Sending message to ${destination}`);
    this.stompClient.publish({
      destination: destination,
      body: JSON.stringify(body)
    });
  }

  // Check if WebSocket is connected
  isConnected(): boolean {
    return this.stompClient && this.stompClient.connected;
  }
}
