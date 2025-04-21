import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/services/auth.service';

// Import the new chat service and models
import { ChatService as NewChatService } from '../api/services/chat.service';
import { ChatMessage, ChatConversation, ChatUser } from '../api/models';

/**
 * Legacy interface for Message
 * @deprecated Use ChatMessage from api/models instead
 */
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

/**
 * Legacy interface for Conversation
 * @deprecated Use ChatConversation from api/models instead
 */
export interface Conversation {
  id: string | number;
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

/**
 * Legacy Chat Service
 * This is a compatibility layer to support the old chat service API
 * while transitioning to the new standardized chat service.
 * 
 * @deprecated Use the new ChatService from api/services instead
 */
@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private baseUrl = `${environment.apiUrl}`;
  
  // Observable sources
  private messagesSubject = new BehaviorSubject<Message[]>([]);
  private conversationsSubject = new BehaviorSubject<Conversation[]>([]);
  private activeConversationSubject = new BehaviorSubject<Conversation | null>(null);
  
  // Observable streams
  public messages$ = this.messagesSubject.asObservable();
  public conversations$ = this.conversationsSubject.asObservable();
  public activeConversation$ = this.activeConversationSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private newChatService: NewChatService
  ) {
    // Subscribe to the new chat service to keep our data in sync
    this.newChatService.conversations$.subscribe(newConversations => {
      // Convert new model to old model
      const oldConversations = newConversations.map(this.convertToOldConversation);
      this.conversationsSubject.next(oldConversations);
    });
    
    this.newChatService.messages$.subscribe(newMessages => {
      // Convert new model to old model
      const oldMessages = newMessages.map(this.convertToOldMessage);
      this.messagesSubject.next(oldMessages);
    });
    
    this.newChatService.activeConversation$.subscribe(newConversation => {
      if (newConversation) {
        // Convert new model to old model
        const oldConversation = this.convertToOldConversation(newConversation);
        this.activeConversationSubject.next(oldConversation);
      } else {
        this.activeConversationSubject.next(null);
      }
    });
  }

  /**
   * Convert new ChatConversation model to old Conversation model
   */
  private convertToOldConversation(newConversation: ChatConversation): Conversation {
    return {
      id: newConversation.id,
      name: newConversation.name,
      description: newConversation.description,
      avatarUrl: newConversation.avatarUrl,
      groupChat: newConversation.groupChat,
      creatorId: Number(newConversation.creatorId),
      creatorUsername: newConversation.creatorUsername,
      participants: newConversation.participants || [],
      createdAt: newConversation.createdAt,
      updatedAt: newConversation.updatedAt
    };
  }

  /**
   * Convert new ChatMessage model to old Message model
   */
  private convertToOldMessage(newMessage: ChatMessage): Message {
    return {
      id: Number(newMessage.id),
      senderId: Number(newMessage.senderId),
      senderUsername: newMessage.senderUsername,
      senderAvatarUrl: newMessage.senderAvatarUrl,
      conversationId: Number(newMessage.conversationId),
      content: newMessage.content,
      sentAt: newMessage.sentAt,
      deliveredAt: newMessage.deliveredAt,
      readAt: newMessage.readAt,
      status: newMessage.status
    };
  }

  /**
   * Get all conversations
   * @deprecated Use loadConversations from the new ChatService instead
   */
  getConversations(): Observable<Conversation[]> {
    // Use the new chat service but return the old model format
    return this.newChatService.loadConversations().pipe(
      map(conversations => conversations.map(this.convertToOldConversation))
    );
  }

  /**
   * Get a specific conversation
   * @deprecated Use getConversation from the new ChatService instead
   */
  getConversation(conversationId: number): Observable<Conversation> {
    // Use the new chat service but return the old model format
    return this.newChatService.getConversation(conversationId).pipe(
      map(conversation => this.convertToOldConversation(conversation))
    );
  }

  /**
   * Set active conversation
   * @deprecated Use setActiveConversation from the new ChatService instead
   */
  setActiveConversation(conversation: Conversation | null): void {
    this.activeConversationSubject.next(conversation);
    
    // Also update the new chat service
    if (conversation) {
      this.newChatService.getConversation(conversation.id).subscribe(newConversation => {
        this.newChatService.setActiveConversation(newConversation);
      });
    } else {
      this.newChatService.setActiveConversation(null);
    }
  }

  /**
   * Get active conversation
   * @deprecated Use activeConversation$ from the new ChatService instead
   */
  getActiveConversation(): Conversation | null {
    return this.activeConversationSubject.value;
  }

  /**
   * Load messages for a conversation
   * @deprecated Use loadMessages from the new ChatService instead
   */
  loadMessages(conversationId: number): Observable<Message[]> {
    // Set the active conversation in the new chat service
    this.newChatService.getConversation(conversationId).subscribe(conversation => {
      this.newChatService.setActiveConversation(conversation);
    });
    
    // Load messages using the new chat service
    return this.newChatService.loadMessages().pipe(
      map(messages => messages.map(this.convertToOldMessage))
    );
  }

  /**
   * Send a message
   * @deprecated Use sendMessage from the new ChatService instead
   */
  sendMessage(conversationId: number, content: string): Observable<Message> {
    // Use the new chat service but return the old model format
    return this.newChatService.sendMessage(content).pipe(
      map(message => this.convertToOldMessage(message))
    );
  }

  /**
   * Mark messages as read
   * @deprecated Use markMessagesAsRead from the new ChatService instead
   */
  markMessagesAsRead(conversationId: number): Observable<any> {
    // Use the new chat service
    return this.newChatService.markMessagesAsRead(conversationId);
  }

  /**
   * Create a one-to-one conversation
   * @deprecated Use createOneToOneConversation from the new ChatService instead
   */
  createOneToOneConversation(userId: number): Observable<Conversation> {
    // Use the new chat service but return the old model format
    return this.newChatService.createOneToOneConversation(userId).pipe(
      map(conversation => this.convertToOldConversation(conversation))
    );
  }

  /**
   * Create a group conversation
   * @deprecated Use createGroupConversation from the new ChatService instead
   */
  createGroupConversation(name: string, description: string, participantIds: number[]): Observable<Conversation> {
    // Use the new chat service but return the old model format
    return this.newChatService.createGroupConversation(name, description, participantIds).pipe(
      map(conversation => this.convertToOldConversation(conversation))
    );
  }
}
