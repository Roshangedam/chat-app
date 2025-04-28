import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';
import { ChatMessage, ChatConversation } from '../models';

/**
 * Service for handling API calls related to chat functionality.
 * This service is responsible for communication with the backend REST API.
 */
@Injectable({
  providedIn: 'root'
})
export class ChatApiService {
  private baseUrl = `${environment.apiUrl}/api/v1`;

  constructor(private http: HttpClient) {}

  /**
   * Get all conversations for the current user
   */
  getConversations(): Observable<ChatConversation[]> {
    return this.http.get<ChatConversation[]>(`${this.baseUrl}/conversations`)
      .pipe(
        catchError(error => {
          console.error('Error fetching conversations:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get a specific conversation by ID
   */
  getConversation(conversationId: string | number): Observable<ChatConversation> {
    console.log(`ChatApiService: Getting conversation ${conversationId}`);
    const url = `${this.baseUrl}/conversations/${conversationId}`;
    console.log(`ChatApiService: API URL: ${url}`);

    return this.http.get<ChatConversation>(url)
      .pipe(
        tap(() => {
          console.log(`ChatApiService: Successfully fetched conversation ${conversationId}`);
        }),
        catchError(error => {
          console.error(`ChatApiService: Error fetching conversation ${conversationId}:`, error);
          console.error(`ChatApiService: Error status: ${error.status}, message: ${error.message}`);
          if (error.error) {
            console.error(`ChatApiService: Error details:`, error.error);
          }
          return throwError(() => error);
        })
      );
  }

  /**
   * Create a new one-to-one conversation with another user
   */
  createOneToOneConversation(userId: string | number): Observable<ChatConversation> {
    return this.http.post<ChatConversation>(`${this.baseUrl}/conversations/one-to-one`, { participantId: userId })
      .pipe(
        catchError(error => {
          console.error('Error creating one-to-one conversation:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Create a new group conversation
   */
  createGroupConversation(
    name: string,
    description: string,
    participantIds: (string | number)[]
  ): Observable<ChatConversation> {
    return this.http.post<ChatConversation>(`${this.baseUrl}/conversations/group`, {
      name,
      description,
      participantIds
    }).pipe(
      catchError(error => {
        console.error('Error creating group conversation:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get message history for a conversation
   * Retrieves messages in chronological order (oldest first)
   */
  getMessageHistory(
    conversationId: string | number,
    page: number = 0,
    size: number = 20
  ): Observable<ChatMessage[]> {
    console.log(`ChatApiService: Fetching messages for conversation ${conversationId}, page ${page}, size ${size}`);

    // Add sort parameter to ensure consistent ordering from the API
    // sort=sentAt,asc ensures oldest messages come first
    const url = `${this.baseUrl}/messages/conversation/${conversationId}?page=${page}&size=${size}&sort=sentAt,asc`;
    console.log(`ChatApiService: API URL: ${url}`);

    return this.http.get<ChatMessage[]>(url).pipe(
      tap(messages => {
        console.log(`ChatApiService: Received ${messages?.length || 0} messages for conversation ${conversationId}`);
        if (messages?.length > 0) {
          // Log first and last message content
          console.log(`ChatApiService: First message: ${messages[0].content.substring(0, 20)}...`);
          console.log(`ChatApiService: Last message: ${messages[messages.length-1].content.substring(0, 20)}...`);
        }
      }),
      catchError(error => {
        console.error(`ChatApiService: Error fetching messages for conversation ${conversationId}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Send a message to a conversation via REST API
   */
  sendMessage(conversationId: string | number, content: string): Observable<ChatMessage> {
    return this.http.post<ChatMessage>(`${this.baseUrl}/messages/conversation/${conversationId}`, {
      content
    }).pipe(
      catchError(error => {
        console.error('Error sending message:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Mark all messages in a conversation as read
   */
  markMessagesAsRead(conversationId: string | number): Observable<any> {
    return this.http.put(`${this.baseUrl}/messages/conversation/${conversationId}/read`, {})
      .pipe(
        catchError(error => {
          console.error('Error marking messages as read:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Search for conversations by name
   */
  searchConversations(query: string): Observable<ChatConversation[]> {
    return this.http.get<ChatConversation[]>(`${this.baseUrl}/conversations/search?query=${query}`)
      .pipe(
        catchError(error => {
          console.error('Error searching conversations:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Add participants to a group conversation
   */
  addParticipants(conversationId: string | number, participantIds: (string | number)[]): Observable<ChatConversation> {
    return this.http.post<ChatConversation>(
      `${this.baseUrl}/conversations/${conversationId}/participants`,
      { participantIds }
    ).pipe(
      catchError(error => {
        console.error('Error adding participants:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Remove a participant from a group conversation
   */
  removeParticipant(conversationId: string | number, participantId: string | number): Observable<ChatConversation> {
    return this.http.delete<ChatConversation>(
      `${this.baseUrl}/conversations/${conversationId}/participants/${participantId}`
    ).pipe(
      catchError(error => {
        console.error('Error removing participant:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Update a conversation's details
   */
  updateConversation(
    conversationId: string | number,
    name?: string,
    description?: string,
    avatarUrl?: string
  ): Observable<ChatConversation> {
    return this.http.put<ChatConversation>(
      `${this.baseUrl}/conversations/${conversationId}`,
      { name, description, avatarUrl }
    ).pipe(
      catchError(error => {
        console.error('Error updating conversation:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Retry sending a failed message
   * @param messageId ID of the message to retry
   */
  retryMessage(messageId: string | number): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/messages/${messageId}/retry`,
      {}
    ).pipe(
      catchError(error => {
        console.error('Error retrying message:', error);
        return throwError(() => error);
      })
    );
  }
}
