import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { isPlatformBrowser } from '@angular/common';
import { LoggingService } from '../../logger/services/logging.service';

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
  private baseUrl = `${environment.apiUrl}/api/v1/auth`;
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
    @Inject(PLATFORM_ID) private platformId: Object,
    private loggingService: LoggingService
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.initAuthFromStorage();
  }

  // Initialize authentication state from local storage
  private initAuthFromStorage(): void {
    if (!this.isBrowser) {
      // Skip localStorage operations on the server
      this.loggingService.logDebug('Skipping auth initialization on server');
      return;
    }

    this.loggingService.logDebug('Initializing authentication from storage');
    const userData = localStorage.getItem('userData');
    const token = localStorage.getItem('token');

    if (userData && token) {
      try {
        const user: User = JSON.parse(userData);
        const tokenExpiration = localStorage.getItem('tokenExpiration');

        if (tokenExpiration && new Date(tokenExpiration) > new Date()) {
          this.loggingService.logInfo(`User session restored: ${user.username}`);
          this.currentUserSubject.next(user);
          this.isAuthenticatedSubject.next(true);

          // Set auto-logout timer
          const expirationDuration = new Date(tokenExpiration).getTime() - new Date().getTime();
          this.loggingService.logDebug(`Auto-logout scheduled in ${Math.round(expirationDuration/1000/60)} minutes`);
          this.autoLogout(expirationDuration);
        } else {
          this.loggingService.logInfo('Token expired, logging out user');
          this.logout();
        }
      } catch (error) {
        this.loggingService.logError('Error parsing stored authentication data', error);
        this.logout();
      }
    } else {
      this.loggingService.logDebug('No stored authentication data found');
    }
  }

  // Login with username/password
  login(email: string, password: string): Observable<AuthResponse> {
    this.loggingService.logInfo(`Login attempt for user: ${email}`);
    return this.http.post<AuthResponse>(`${this.baseUrl}/signin`, { usernameOrEmail: email, password })
      .pipe(
        tap(response => {
          // Handle authentication first to properly process the response structure
          this.handleAuthentication(response);
          // Log success after handling authentication to ensure we have the user object
          const username = this.currentUserSubject.value?.username || 'Unknown';
          this.loggingService.logInfo(`User logged in successfully: ${username}`);
        }),
        catchError(error => {
          this.loggingService.logError('Login failed', error);
          return throwError(() => new Error(error.error?.message || 'Login failed'));
        })
      );
  }

  // OAuth2 login (redirect to provider)
  loginWithGoogle(): void {
    if (this.isBrowser) {
      window.location.href = `${environment.apiUrl}/api/v1/oauth2/authorization/google`;
    }
  }

  // Handle OAuth2 callback
  handleOAuth2Callback(code: string, state: string): Observable<AuthResponse> {
    this.loggingService.logInfo('Processing OAuth2 callback');
    return this.http.post<AuthResponse>(`${environment.apiUrl}/api/v1/oauth2/callback`, { code, state })
      .pipe(
        tap(response => {
          this.loggingService.logInfo(`OAuth2 authentication successful for user: ${response.user.username}`);
          this.handleAuthentication(response);
        }),
        catchError(error => {
          this.loggingService.logError('OAuth callback error', error);
          return throwError(() => new Error(error.error?.message || 'OAuth authentication failed'));
        })
      );
  }

  // Handle OAuth2 redirect with token
  handleOAuth2Redirect(token: string): Observable<AuthResponse> {
    this.loggingService.logInfo('Processing OAuth2 redirect with token');
    // Verify and process the token
    return this.http.post<AuthResponse>(`${environment.apiUrl}/api/v1/oauth2/verify-token`, { token })
      .pipe(
        tap(response => {
          this.loggingService.logInfo(`OAuth2 token verification successful for user: ${response.user.username}`);
          this.handleAuthentication(response);
        }),
        catchError(error => {
          this.loggingService.logError('Token verification error', error);
          return throwError(() => new Error(error.error?.message || 'Token verification failed'));
        })
      );
  }

  // Register new user
  register(userData: { username: string, email: string, password: string, fullName?: string }): Observable<AuthResponse> {
    this.loggingService.logInfo(`Registration attempt for user: ${userData.username}`);
    return this.http.post<AuthResponse>(`${this.baseUrl}/signup`, userData)
      .pipe(
        tap(response => {
          this.loggingService.logInfo(`User registered successfully: ${userData.username}`);
          this.handleAuthentication(response);
        }),
        catchError(error => {
          this.loggingService.logError(`Registration failed for user: ${userData.username}`, error);
          return throwError(() => new Error(error.error?.message || 'Registration failed'));
        })
      );
  }

  // Logout user
  logout(): void {
    const currentUser = this.currentUserSubject.value;
    const username = currentUser?.username || 'Unknown user';

    this.loggingService.logInfo(`Logging out user: ${username}`);

    if (this.isBrowser) {
      // Clear local storage only in browser
      localStorage.removeItem('userData');
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('tokenExpiration');
      localStorage.removeItem('isOAuth2User');
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
    this.loggingService.logInfo(`User logged out successfully: ${username}`);
  }

  // Refresh token
  refreshToken(): Observable<AuthResponse> {
    if (!this.isBrowser) {
      this.loggingService.logWarning('Cannot refresh token on server');
      return throwError(() => new Error('Cannot refresh token on server'));
    }

    const refreshToken = localStorage.getItem('refreshToken');
    const accessToken = localStorage.getItem('token');
    const isOAuth2User = localStorage.getItem('isOAuth2User') === 'true';
    const username = this.currentUserSubject.value?.username || 'Unknown user';

    this.loggingService.logInfo(`Attempting to refresh token for user: ${username}`);

    // If no refresh token is available or it's empty, we can't refresh
    if (!refreshToken || refreshToken === '') {
      this.loggingService.logError('No refresh token available, authentication session cannot be renewed');
      // Clear any existing auth data to force a clean login
      this.logout();
      return throwError(() => new Error('Your session has expired. Please log in again.'));
    }

    // Use the appropriate endpoint based on authentication type
    const refreshEndpoint = isOAuth2User
      ? `${environment.apiUrl}/api/v1/oauth2/refresh-token`
      : `${this.baseUrl}/refresh-token`;

    // Ensure we're sending the refresh token in the correct format expected by the backend
    // The backend expects a RefreshTokenRequest object with a refreshToken property
    this.loggingService.logDebug('Sending refresh token request', { endpoint: refreshEndpoint });
    return this.http.post<AuthResponse>(refreshEndpoint, { refreshToken: refreshToken })
      .pipe(
        tap(response => {
          this.loggingService.logInfo(`Token refreshed successfully for user: ${username}`);
          this.handleAuthentication(response);
        }),
        catchError(error => {
          this.loggingService.logError('Token refresh error', error);
          this.logout();
          return throwError(() => new Error(error.error?.message || 'Your session has expired. Please log in again.'));
        })
      );
  }

  // Get user profile
  getUserProfile(): Observable<User> {
    this.loggingService.logInfo('Fetching user profile');
    return this.http.get<User>(`${this.baseUrl}/profile`)
      .pipe(
        tap(user => {
          this.loggingService.logInfo(`User profile fetched successfully: ${user.username}`);
          this.currentUserSubject.next(user);
        }),
        catchError(error => {
          this.loggingService.logError('Failed to get user profile', error);
          return throwError(() => new Error(error.error?.message || 'Failed to get user profile'));
        })
      );
  }

  // Update user profile
  updateProfile(profileData: Partial<User>): Observable<User> {
    this.loggingService.logInfo('Updating user profile');
    return this.http.put<User>(`${this.baseUrl}/profile`, profileData)
      .pipe(
        tap(updatedUser => {
          // Update current user with new data
          const currentUser = this.currentUserSubject.value;
          if (currentUser) {
            this.loggingService.logInfo(`Profile updated successfully for user: ${currentUser.username}`);
            this.currentUserSubject.next({ ...currentUser, ...updatedUser });

            // Update local storage
            if (this.isBrowser) {
              localStorage.setItem('userData', JSON.stringify({ ...currentUser, ...updatedUser }));
            }
          }
        }),
        catchError(error => {
          this.loggingService.logError('Failed to update profile', error);
          return throwError(() => new Error(error.error?.message || 'Failed to update profile'));
        })
      );
  }

  // Get JWT token
  getToken(): string | null {
    if (!this.isBrowser) {
      return null;
    }

    const token = localStorage.getItem('token');

    // Validate token exists and is not empty
    if (!token || token === '') {
      console.warn('No valid token found in storage');
      return null;
    }

    // Check if token is expired based on stored expiration
    const tokenExpiration = localStorage.getItem('tokenExpiration');
    if (tokenExpiration && new Date(tokenExpiration) <= new Date()) {
      console.warn('Token has expired, returning null');
      return null;
    }

    return token;
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
  private handleAuthentication(response: any): void {
    // Map backend response fields to frontend interface
    // Prioritize token field as that's what the backend is returning
    const accessToken = response.token || response.accessToken || '';
    const refreshToken = response.refreshToken || null;

    // Handle different user object structures
    let user: User;
    if (response.user) {
      // If response contains a user object
      user = response.user;
    } else {
      // If user data is at the root level
      user = {
        id: response.id || 0,
        username: response.username || '',
        email: response.email || '',
        fullName: response.fullName || ''
      };
    }

    const expiresIn = response.expiresIn || 3600; // Default to 1 hour if not provided

    // Create a properly structured AuthResponse
    const authResponse: AuthResponse = {
      accessToken,
      refreshToken,
      user,
      expiresIn
    };

    // Log the structured response for debugging
    this.loggingService.logDebug('Structured auth response', { username: user.username, expiresIn });

    // Validate token before proceeding
    if (!accessToken) {
      this.loggingService.logError('Authentication failed: No access token received');
      return;
    }

    // Calculate token expiration
    const expirationDate = new Date(new Date().getTime() + expiresIn * 1000);

    // Determine if this is an OAuth2 login
    // We can detect this based on the request URL or a flag in the response
    // For now, we'll use the URL path to determine if it's an OAuth2 login
    const isOAuth2User = this.isBrowser && window.location.href.includes('oauth2') ||
                         (user.username && user.username.includes('oauth2'));

    // Store auth data in local storage (browser only)
    if (this.isBrowser) {
      try {
        localStorage.setItem('userData', JSON.stringify(user));
        localStorage.setItem('token', accessToken);
        localStorage.setItem('isOAuth2User', String(isOAuth2User));

        // Only store a refresh token if it exists
        // This prevents storing empty strings that would fail token refresh checks
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken);
        } else {
          // If no refresh token is provided, remove any existing one
          localStorage.removeItem('refreshToken');
        }

        localStorage.setItem('tokenExpiration', expirationDate.toISOString());
        this.loggingService.logDebug('Authentication data stored successfully');
      } catch (error) {
        this.loggingService.logError('Error storing authentication data', error);
      }
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
      this.loggingService.logDebug(`Setting auto-logout timer for ${Math.round(expirationDuration/1000)} seconds`);
      this.tokenExpirationTimer = setTimeout(() => {
        this.loggingService.logInfo('Auto-logout timer expired, logging out user');
        this.logout();
      }, expirationDuration);
    }
  }
}
