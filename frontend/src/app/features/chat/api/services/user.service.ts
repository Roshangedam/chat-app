import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { UserApiService } from './user-api.service';
import { ChatUser } from '../models';

/**
 * Service for managing users in the chat system.
 * This service provides a unified interface for user-related operations.
 */
@Injectable({
  providedIn: 'root'
})
export class UserService {
  // BehaviorSubjects to store state
  private usersSubject = new BehaviorSubject<ChatUser[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  
  // Observable streams
  public users$ = this.usersSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();

  constructor(private userApiService: UserApiService) {}

  /**
   * Load all users except the current user
   */
  public loadUsers(): Observable<ChatUser[]> {
    this.loadingSubject.next(true);
    
    return this.userApiService.getAllUsers().pipe(
      tap(users => {
        this.usersSubject.next(users);
        this.loadingSubject.next(false);
      }),
      catchError(error => {
        this.loadingSubject.next(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get a specific user by ID
   * @param userId ID of the user to get
   */
  public getUser(userId: string | number): Observable<ChatUser> {
    return this.userApiService.getUser(userId);
  }

  /**
   * Search for users by username
   * @param query Search query
   */
  public searchUsers(query: string): Observable<ChatUser[]> {
    this.loadingSubject.next(true);
    
    return this.userApiService.searchUsers(query).pipe(
      tap(users => {
        this.loadingSubject.next(false);
      }),
      catchError(error => {
        this.loadingSubject.next(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Update the current user's status
   * @param status New status
   */
  public updateStatus(status: 'ONLINE' | 'AWAY' | 'OFFLINE'): Observable<ChatUser> {
    return this.userApiService.updateStatus(status);
  }
}
