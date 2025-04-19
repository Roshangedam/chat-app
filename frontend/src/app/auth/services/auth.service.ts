import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { isPlatformBrowser } from '@angular/common';

export interface User {
  id: number;
  username: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  status?: 'ONLINE' | 'OFFLINE' | 'AWAY';
  bio?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  expiresIn: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl = `${environment.apiUrl}/api/auth`;
  private tokenExpirationTimer: any;
  private isBrowser: boolean;

  // Observable sources
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);

  // Observable streams
  public currentUser$ = this.currentUserSubject.asObservable();
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.initAuthFromStorage();
  }

  // Initialize authentication state from local storage
  private initAuthFromStorage(): void {
    if (!this.isBrowser) {
      // Skip localStorage operations on the server
      return;
    }

    const userData = localStorage.getItem('userData');
    const token = localStorage.getItem('token');

    if (userData && token) {
      const user: User = JSON.parse(userData);
      const tokenExpiration = localStorage.getItem('tokenExpiration');

      if (tokenExpiration && new Date(tokenExpiration) > new Date()) {
        this.currentUserSubject.next(user);
        this.isAuthenticatedSubject.next(true);

        // Set auto-logout timer
        const expirationDuration = new Date(tokenExpiration).getTime() - new Date().getTime();
        this.autoLogout(expirationDuration);
      } else {
        this.logout();
      }
    }
  }

  // Login with username/password
  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/signin`, { usernameOrEmail: email, password })
      .pipe(
        tap(response => this.handleAuthentication(response)),
        catchError(error => {
          console.error('Login error:', error);
          return throwError(() => new Error(error.error?.message || 'Login failed'));
        })
      );
  }

  // OAuth2 login (redirect to provider)
  loginWithGoogle(): void {
    if (this.isBrowser) {
      window.location.href = `${environment.apiUrl}/oauth2/authorization/google`;
    }
  }

  // Handle OAuth2 callback
  handleOAuth2Callback(code: string, state: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/oauth2/callback`, { code, state })
      .pipe(
        tap(response => this.handleAuthentication(response)),
        catchError(error => {
          console.error('OAuth callback error:', error);
          return throwError(() => new Error(error.error?.message || 'OAuth authentication failed'));
        })
      );
  }

  // Handle OAuth2 redirect with token
  handleOAuth2Redirect(token: string): Observable<AuthResponse> {
    // Verify and process the token
    return this.http.post<AuthResponse>(`${environment.apiUrl}/oauth2/verify-token`, { token })
      .pipe(
        tap(response => this.handleAuthentication(response)),
        catchError(error => {
          console.error('Token verification error:', error);
          return throwError(() => new Error(error.error?.message || 'Token verification failed'));
        })
      );
  }

  // Register new user
  register(userData: { username: string, email: string, password: string, fullName?: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/signup`, userData)
      .pipe(
        tap(response => this.handleAuthentication(response)),
        catchError(error => {
          console.error('Registration error:', error);
          return throwError(() => new Error(error.error?.message || 'Registration failed'));
        })
      );
  }

  // Logout user
  logout(): void {
    if (this.isBrowser) {
      // Clear local storage only in browser
      localStorage.removeItem('userData');
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('tokenExpiration');
    }

    // Reset subjects
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);

    // Clear timeout
    if (this.tokenExpirationTimer) {
      clearTimeout(this.tokenExpirationTimer);
      this.tokenExpirationTimer = null;
    }

    // Redirect to login
    this.router.navigate(['/auth/login']);
  }

  // Refresh token
  refreshToken(): Observable<AuthResponse> {
    if (!this.isBrowser) {
      return throwError(() => new Error('Cannot refresh token on server'));
    }
    
    const refreshToken = localStorage.getItem('refreshToken');

    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http.post<AuthResponse>(`${this.baseUrl}/refresh-token`, { refreshToken })
      .pipe(
        tap(response => this.handleAuthentication(response)),
        catchError(error => {
          console.error('Token refresh error:', error);
          this.logout();
          return throwError(() => new Error(error.error?.message || 'Token refresh failed'));
        })
      );
  }

  // Get user profile
  getUserProfile(): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/profile`)
      .pipe(
        tap(user => {
          this.currentUserSubject.next(user);
        }),
        catchError(error => {
          console.error('Get profile error:', error);
          return throwError(() => new Error(error.error?.message || 'Failed to get user profile'));
        })
      );
  }

  // Update user profile
  updateProfile(profileData: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.baseUrl}/profile`, profileData)
      .pipe(
        tap(updatedUser => {
          // Update current user with new data
          const currentUser = this.currentUserSubject.value;
          if (currentUser) {
            this.currentUserSubject.next({ ...currentUser, ...updatedUser });

            // Update local storage
            if (this.isBrowser) {
              localStorage.setItem('userData', JSON.stringify({ ...currentUser, ...updatedUser }));
            }
          }
        }),
        catchError(error => {
          console.error('Update profile error:', error);
          return throwError(() => new Error(error.error?.message || 'Failed to update profile'));
        })
      );
  }

  // Get JWT token
  getToken(): string | null {
    if (!this.isBrowser) {
      return null;
    }
    return localStorage.getItem('token');
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  // Handle authentication response
  private handleAuthentication(response: AuthResponse): void {
    const { accessToken, refreshToken, user, expiresIn } = response;
    // Calculate token expiration
    const expirationDate = new Date(new Date().getTime() + expiresIn * 1000);

    // Store auth data in local storage (browser only)
    if (this.isBrowser) {
      localStorage.setItem('userData', JSON.stringify(user));
      localStorage.setItem('token', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('tokenExpiration', expirationDate.toISOString());
    }

    // Update subjects
    this.currentUserSubject.next(user);
    this.isAuthenticatedSubject.next(true);

    // Set auto-logout timer
    this.autoLogout(expiresIn * 1000);
  }

  // Auto logout when token expires
  private autoLogout(expirationDuration: number): void {
    if (this.isBrowser) {
      this.tokenExpirationTimer = setTimeout(() => {
        this.logout();
      }, expirationDuration);
    }
  }
}