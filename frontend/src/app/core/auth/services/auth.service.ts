import { Injectable, Inject, PLATFORM_ID, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, tap, finalize } from 'rxjs/operators';
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
    private loggingService: LoggingService,
    private injector: Injector
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
          this.clearAuthData(); // Use clearAuthData instead of logout to avoid redirection
        }
      } catch (error) {
        this.loggingService.logError('Error parsing stored authentication data', error);
        this.clearAuthData(); // Use clearAuthData instead of logout to avoid redirection
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
          // Verify token was stored properly
          const storedToken = localStorage.getItem('token');
          this.loggingService.logDebug(`Token stored after login: ${!!storedToken}`);
          // Log success after handling authentication to ensure we have the user object
          const username = this.currentUserSubject.value?.username || 'Unknown';
          this.loggingService.logInfo(`User logged in successfully: ${username}`);

          // Initialize chat service after successful login
          if (storedToken) {
            this.initializeChatServices(storedToken);
          }
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
          // this.loggingService.logInfo(`OAuth2 authentication successful for user: ${response.user.username}`);
          this.handleAuthentication(response);

          // Initialize chat service after successful OAuth login
          const token = localStorage.getItem('token');
          if (token) {
            this.initializeChatServices(token);
          }
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
          // this.loggingService.logInfo(`OAuth2 token verification successful for user: ${response.user.username}`);
          this.handleAuthentication(response);

          // Initialize chat service after successful OAuth token verification
          const token = localStorage.getItem('token');
          if (token) {
            this.initializeChatServices(token);
          }
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

          // Initialize chat service after successful registration
          const token = localStorage.getItem('token');
          if (token) {
            this.initializeChatServices(token);
          }
        }),
        catchError(error => {
          this.loggingService.logError(`Registration failed for user: ${userData.username}`, error);
          return throwError(() => new Error(error.error?.message || 'Registration failed'));
        })
      );
  }

  // Clear auth data without navigation redirection
  private clearAuthData(): void {
    const currentUser = this.currentUserSubject.value;
    const username = currentUser?.username || 'Unknown user';

    this.loggingService.logInfo(`Clearing auth data for user: ${username}`);

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
  }

  // Logout user
  logout(): void {
    const currentUser = this.currentUserSubject.value;
    const username = currentUser?.username || 'Unknown user';

    this.loggingService.logInfo(`Logging out user: ${username}`);

    // First update user status to OFFLINE via UserStatusService
    try {
      // Dynamically import to avoid circular dependencies
      import('../../../features/chat/api/services/user-status.service').then(module => {
        const UserStatusService = module.UserStatusService;
        try {
          const userStatusService = this.injector.get(UserStatusService);
          if (userStatusService && typeof userStatusService.updateStatus === 'function') {
            // Update status to OFFLINE
            userStatusService.updateStatus('OFFLINE').subscribe({
              next: () => {
                this.loggingService.logInfo('User status set to OFFLINE');
                this.completeLogout(username);
              },
              error: (err) => {
                this.loggingService.logError('Failed to set user status to OFFLINE', err);
                this.completeLogout(username);
              }
            });
          } else {
            this.completeLogout(username);
          }
        } catch (error) {
          this.loggingService.logWarning('User status service not available', error);
          this.completeLogout(username);
        }
      }).catch(error => {
        this.loggingService.logError('Error importing UserStatusService', error);
        this.completeLogout(username);
      });
    } catch (error) {
      this.loggingService.logWarning('Error during status update', error);
      this.completeLogout(username);
    }
  }

  /**
   * Complete the logout process by calling the server and clearing local data
   */
  private completeLogout(username: string): void {
    // Call the backend logout endpoint with responseType: 'text' to handle plain text response
    this.http.post(`${environment.apiUrl}/api/v1/users/logout`, {}, { responseType: 'text' }).subscribe({
      next: (response) => {
        this.loggingService.logInfo(`User logged out on server: ${response}`);
        // Clear auth data
        this.clearAuthData();

        // Redirect to login
        this.router.navigate(['/auth/login']);
        this.loggingService.logInfo(`User logged out successfully: ${username}`);
      },
      error: (err) => {
        this.loggingService.logError('Failed to logout on server', err);
        // Still clear auth data and redirect even if server logout fails
        this.clearAuthData();
        this.router.navigate(['/auth/login']);
      }
    });
  }

  // Refresh token
  refreshToken(): Observable<AuthResponse> {
    if (!this.isBrowser) {
      this.loggingService.logWarning('Cannot refresh token on server');
      return throwError(() => new Error('Cannot refresh token on server'));
    }

    const refreshToken = localStorage.getItem('refreshToken');
    const isOAuth2User = localStorage.getItem('isOAuth2User') === 'true';
    const username = this.currentUserSubject.value?.username || 'Unknown user';

    this.loggingService.logInfo(`Attempting to refresh token for user: ${username}`);

    // If no refresh token is available or it's empty, we can't refresh
    if (!refreshToken || refreshToken.trim() === '') {
      this.loggingService.logError('No refresh token available, authentication session cannot be renewed');
      // Clear any existing auth data to force a clean login
      this.clearAuthData(); // Use clearAuthData instead of logout to avoid redirection during refresh
      return throwError(() => new Error('Your session has expired. Please log in again.'));
    }

    // Use the appropriate endpoint based on authentication type
    const refreshEndpoint = isOAuth2User
      ? `${environment.apiUrl}/api/v1/oauth2/refresh-token`
      : `${this.baseUrl}/refresh-token`;

    // Ensure we're sending the refresh token in the correct format expected by the backend
    this.loggingService.logDebug('Sending refresh token request', { endpoint: refreshEndpoint });
    return this.http.post<AuthResponse>(refreshEndpoint, { refreshToken })
      .pipe(
        tap(response => {
          this.loggingService.logInfo(`Token refreshed successfully for user: ${username}`);
          this.handleAuthentication(response);
        }),
        catchError(error => {
          this.loggingService.logError('Token refresh failed', error);
          this.clearAuthData(); // Use clearAuthData instead of logout to avoid redirection during refresh
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

    try {
      const token = localStorage.getItem('token');
      const tokenExpiration = localStorage.getItem('tokenExpiration');

      // Validate token exists and is not empty
      if (!token || token.trim() === '') {
        this.loggingService.logDebug('No valid token found in storage');
        return null;
      }

      // Check if token is expired based on stored expiration
      if (tokenExpiration && new Date(tokenExpiration) <= new Date()) {
        this.loggingService.logDebug('Token has expired, returning null');
        return null;
      }

      return token;
    } catch (error) {
      this.loggingService.logError('Error retrieving token', error);
      return null;
    }
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
    // Prioritize token fields and handle different response formats
    let accessToken = response.accessToken || response.token || '';
    const refreshToken = response.refreshToken || '';

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

    // Validate token before proceeding
    if (!accessToken) {
      this.loggingService.logError('Authentication failed: No access token received');
      return;
    }

    // Validate token format (JWT tokens should have 2 periods)
    if (!accessToken.includes('.')) {
      this.loggingService.logWarning('Token format validation failed - token does not contain periods');
      // If token doesn't have the expected format, try to decode it (it might be encoded)
      try {
        // It might be URL encoded or otherwise transformed
        const decodedToken = decodeURIComponent(accessToken);
        if (decodedToken.includes('.')) {
          this.loggingService.logInfo('Successfully decoded token to proper JWT format');
          accessToken = decodedToken;
        }
      } catch (e) {
        this.loggingService.logError('Failed to decode potentially encoded token', e);
      }
    }

    // Final validation - token should have 2 periods for JWT format
    if (accessToken.split('.').length !== 3) {
      this.loggingService.logWarning(`Token format may be invalid: contains ${accessToken.split('.').length - 1} periods instead of 2`);
    }

    // Calculate token expiration - add a small buffer to ensure we refresh before actual expiry
    const expirationDate = new Date(new Date().getTime() + (expiresIn * 1000) - 10000);

    // Determine OAuth2 login
    const isOAuth2User = this.isBrowser &&
      (window.location.href.includes('oauth2') || (response.provider && response.provider !== 'local'));

    // Store auth data in local storage (browser only)
    if (this.isBrowser) {
      try {
        localStorage.setItem('userData', JSON.stringify(user));
        localStorage.setItem('token', accessToken);
        localStorage.setItem('tokenExpiration', expirationDate.toISOString());
        localStorage.setItem('isOAuth2User', String(isOAuth2User));

        // Only store a refresh token if it exists and is not empty
        if (refreshToken && refreshToken.trim() !== '') {
          localStorage.setItem('refreshToken', refreshToken);
        }

        this.loggingService.logDebug('Authentication data stored successfully');
      } catch (error) {
        this.loggingService.logError('Error storing authentication data', error);
      }
    }

    // Update subjects
    this.currentUserSubject.next(user);
    this.isAuthenticatedSubject.next(true);

    // Set auto-logout timer
    this.autoLogout(expirationDate.getTime() - new Date().getTime());
  }

  // Auto logout when token expires
  private autoLogout(expirationDuration: number): void {
    if (this.isBrowser) {
      this.loggingService.logDebug(`Setting auto-logout timer for ${Math.round(expirationDuration/1000)} seconds`);
      if (this.tokenExpirationTimer) {
        clearTimeout(this.tokenExpirationTimer);
      }
      this.tokenExpirationTimer = setTimeout(() => {
        this.loggingService.logInfo('Auto-logout timer expired, logging out user');
        this.logout();
      }, expirationDuration);
    }
  }

  /**
   * Initialize chat services using lazy loading to avoid circular dependencies
   */
  private initializeChatServices(token: string): void {
    // Use setTimeout to break the circular dependency chain
    setTimeout(() => {
      try {
        // First initialize the WebSocket service to ensure connection is established
        import('../../../features/chat/api/websocket/chat-websocket.service').then(module => {
          const ChatWebsocketService = module.ChatWebsocketService;
          const websocketService = this.injector.get(ChatWebsocketService);
          if (websocketService && typeof websocketService.initialize === 'function') {
            this.loggingService.logInfo('Initializing WebSocket connection');
            websocketService.initialize(token);

            // Wait for WebSocket connection before initializing other services
            const connectionSub = websocketService.connectionStatus$.subscribe(connected => {
              if (connected) {
                this.loggingService.logInfo('WebSocket connected, initializing other services');
                connectionSub.unsubscribe();
                this.initializeOtherServices(token);
              }
            });

            // Set a timeout to initialize other services even if WebSocket connection fails
            setTimeout(() => {
              if (!websocketService.isConnected()) {
                this.loggingService.logWarning('WebSocket connection timeout, initializing other services anyway');
                connectionSub.unsubscribe();
                this.initializeOtherServices(token);
              }
            }, 5000); // 5 second timeout
          } else {
            this.loggingService.logWarning('WebSocket service not available, initializing other services directly');
            this.initializeOtherServices(token);
          }
        }).catch(error => {
          this.loggingService.logError('Error importing WebSocket service', error);
          this.initializeOtherServices(token);
        });
      } catch (error) {
        this.loggingService.logError('Error initializing chat services', error);
        this.initializeOtherServices(token);
      }
    }, 0);
  }

  /**
   * Initialize other services after WebSocket connection is established
   */
  private initializeOtherServices(token: string): void {
    try {
      // Dynamically import the services to avoid circular dependencies
      import('../../../features/chat/api/services/chat.service').then(module => {
        const ChatService = module.ChatService;
        const chatService = this.injector.get(ChatService);
        if (chatService && typeof chatService.initialize === 'function') {
          chatService.initialize(token);
          chatService.loadConversations().subscribe();
        }
      });

      import('../../../features/chat/api/services/user.service').then(module => {
        const UserService = module.UserService;
        const userService = this.injector.get(UserService);
        if (userService && typeof userService.loadUsers === 'function') {
          userService.loadUsers().subscribe();
        }
      });

      // Initialize user status service and set status to ONLINE
      import('../../../features/chat/api/services/user-status.service').then(module => {
        const UserStatusService = module.UserStatusService;
        try {
          const userStatusService = this.injector.get(UserStatusService);
          if (userStatusService) {
            // First load all user statuses
            userStatusService.loadAllUserStatuses().subscribe({
              next: () => {
                this.loggingService.logInfo('Loaded initial user statuses');

                // Then update current user status to ONLINE
                userStatusService.updateStatus('ONLINE').subscribe({
                  next: () => this.loggingService.logInfo('User status set to ONLINE'),
                  error: (err) => this.loggingService.logError('Failed to set user status to ONLINE', err)
                });
              },
              error: (err) => this.loggingService.logError('Failed to load initial user statuses', err)
            });
          }
        } catch (error) {
          this.loggingService.logWarning('User status service not available', error);
        }
      });
    } catch (error) {
      this.loggingService.logError('Error initializing other services', error);
    }
  }
}
