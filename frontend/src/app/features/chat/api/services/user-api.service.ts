import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
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
    return this.http.get<ChatUser[]>(`${this.baseUrl}/users`)
      .pipe(
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
    return this.http.get<ChatUser>(`${this.baseUrl}/users/${userId}`)
      .pipe(
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
    return this.http.get<ChatUser[]>(`${this.baseUrl}/users/search?query=${query}`)
      .pipe(
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
    return this.http.put<ChatUser>(`${this.baseUrl}/users/status`, { status })
      .pipe(
        catchError(error => {
          console.error('Error updating status:', error);
          return throwError(() => error);
        })
      );
  }
}
