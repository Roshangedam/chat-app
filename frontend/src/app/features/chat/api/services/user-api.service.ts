import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';
import { ChatUser } from '../models';

/**
 * Service for handling API calls related to user functionality.
 * This service is responsible for communication with the backend REST API.
 */
@Injectable({
  providedIn: 'root'
})
export class UserApiService {
  private baseUrl = `${environment.apiUrl}/api/v1`;

  constructor(private http: HttpClient) {}

  /**
   * Get all users except the current user
   */
  getAllUsers(): Observable<ChatUser[]> {
    return this.http.get<any[]>(`${this.baseUrl}/users`)
      .pipe(
        map(userDtos => {
          // Map backend UserDTO array to frontend ChatUser array
          return userDtos.map(userDto => {
            const chatUser: ChatUser = {
              id: userDto.id,
              username: userDto.username,
              email: userDto.email,
              fullName: userDto.fullName,
              avatarUrl: userDto.avatarUrl,
              bio: userDto.bio,
              status: userDto.status,
              // Map lastActive from backend to lastSeen in frontend
              lastSeen: userDto.lastActive ? new Date(userDto.lastActive) : undefined,
              createdAt: userDto.createdAt ? new Date(userDto.createdAt) : undefined,
              updatedAt: userDto.updatedAt ? new Date(userDto.updatedAt) : undefined
            };
            return chatUser;
          });
        }),
        catchError(error => {
          console.error('Error fetching users:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get a specific user by ID
   */
  getUser(userId: string | number): Observable<ChatUser> {
    return this.http.get<any>(`${this.baseUrl}/users/${userId}`)
      .pipe(
        map(userDto => {
          // Map backend UserDTO to frontend ChatUser
          const chatUser: ChatUser = {
            id: userDto.id,
            username: userDto.username,
            email: userDto.email,
            fullName: userDto.fullName,
            avatarUrl: userDto.avatarUrl,
            bio: userDto.bio,
            status: userDto.status,
            // Map lastActive from backend to lastSeen in frontend
            lastSeen: userDto.lastActive ? new Date(userDto.lastActive) : undefined,
            createdAt: userDto.createdAt ? new Date(userDto.createdAt) : undefined,
            updatedAt: userDto.updatedAt ? new Date(userDto.updatedAt) : undefined
          };

          console.log(`UserApiService: Mapped user ${userId} with lastActive:`, userDto.lastActive, 'to lastSeen:', chatUser.lastSeen);
          return chatUser;
        }),
        catchError(error => {
          console.error(`Error fetching user ${userId}:`, error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Search for users by username
   */
  searchUsers(query: string): Observable<ChatUser[]> {
    return this.http.get<any[]>(`${this.baseUrl}/users/search?query=${query}`)
      .pipe(
        map(userDtos => {
          // Map backend UserDTO array to frontend ChatUser array
          return userDtos.map(userDto => {
            const chatUser: ChatUser = {
              id: userDto.id,
              username: userDto.username,
              email: userDto.email,
              fullName: userDto.fullName,
              avatarUrl: userDto.avatarUrl,
              bio: userDto.bio,
              status: userDto.status,
              // Map lastActive from backend to lastSeen in frontend
              lastSeen: userDto.lastActive ? new Date(userDto.lastActive) : undefined,
              createdAt: userDto.createdAt ? new Date(userDto.createdAt) : undefined,
              updatedAt: userDto.updatedAt ? new Date(userDto.updatedAt) : undefined
            };
            return chatUser;
          });
        }),
        catchError(error => {
          console.error('Error searching users:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Update the current user's status
   */
  updateStatus(status: 'ONLINE' | 'AWAY' | 'OFFLINE'): Observable<ChatUser> {
    return this.http.put<any>(`${this.baseUrl}/users/status`, { status })
      .pipe(
        map(userDto => {
          // Map backend UserDTO to frontend ChatUser
          const chatUser: ChatUser = {
            id: userDto.id,
            username: userDto.username,
            email: userDto.email,
            fullName: userDto.fullName,
            avatarUrl: userDto.avatarUrl,
            bio: userDto.bio,
            status: userDto.status,
            // Map lastActive from backend to lastSeen in frontend
            lastSeen: userDto.lastActive ? new Date(userDto.lastActive) : undefined,
            createdAt: userDto.createdAt ? new Date(userDto.createdAt) : undefined,
            updatedAt: userDto.updatedAt ? new Date(userDto.updatedAt) : undefined
          };
          return chatUser;
        }),
        catchError(error => {
          console.error('Error updating status:', error);
          return throwError(() => error);
        })
      );
  }
}
