import { HttpRequest, HttpHandlerFn, HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { catchError, filter, switchMap, take, finalize } from 'rxjs/operators';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { environment } from '../../../../environments/environment';

// Global variables for the interceptor function
let isRefreshing = false;
const refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

// Functional interceptor
export const TokenInterceptor: HttpInterceptorFn = (request: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);
  const isBrowser = isPlatformBrowser(platformId);

  console.log(`TokenInterceptor: Processing request to ${request.url}`);

  // Skip token for auth endpoints and logging endpoints
  if (request.url.includes('/auth/login') ||
      request.url.includes('/auth/signin') ||
      request.url.includes('/auth/register') ||
      request.url.includes('/auth/signup') ||
      request.url.includes('/auth/refresh-token') ||
      request.url.includes('/oauth2/refresh-token') ||
      request.url.includes('/oauth2/callback') ||
      request.url.includes('/oauth2/verify-token') ||
      // Skip token for logging endpoints to avoid circular dependency with LoggingService
      (environment.log?.apiUrl && request.url.includes('/api/v1/logs/'))) {
    console.log(`TokenInterceptor: Skipping token for auth/log endpoint: ${request.url}`);
    return next(request);
  }

  // Skip token handling on server-side
  if (!isBrowser) {
    console.log(`TokenInterceptor: Skipping token for server-side rendering`);
    return next(request);
  }

  // Add token to request
  // Try getting token directly from localStorage first as a fallback
  let token = authService.getToken();
  if (!token) {
    token = localStorage.getItem('token');
    console.log(`TokenInterceptor: Got token directly from localStorage: ${!!token}`);
  }

  console.log(`TokenInterceptor: Request to ${request.url}, token exists: ${!!token}`);
  if (token) {
    request = addToken(request, token);
    console.log(`TokenInterceptor: Added token to request for ${request.url}`);
  } else {
    console.warn(`TokenInterceptor: No token available for request to ${request.url}`);
  }

  return next(request).pipe(
    catchError(error => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        return handle401Error(request, next, authService, router, isBrowser);
      } else {
        return throwError(() => error);
      }
    })
  );
};

// Helper function to add token to request
function addToken(request: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
}

// Helper function to handle 401 errors
function handle401Error(request: HttpRequest<unknown>, next: HttpHandlerFn, authService: AuthService, router: Router, isBrowser: boolean): Observable<any> {
  // Skip token refresh on server-side
  if (!isBrowser) {
    return throwError(() => new Error('Cannot refresh token on server'));
  }

  // Check if we have a refresh token before attempting to refresh
  const refreshToken = localStorage.getItem('refreshToken');

  if (!refreshToken || refreshToken === '') {
    // If no refresh token is available, redirect to login
    authService.logout();
    router.navigate(['/auth/login'], {
      queryParams: {
        error: 'Your session has expired. Please log in again.',
        returnUrl: router.url
      }
    });
    return throwError(() => new Error('No refresh token available'));
  }

  // If token refresh is already in progress, wait for it to complete
  if (isRefreshing) {
    return refreshTokenSubject.pipe(
      filter(token => token !== null),
      take(1),
      switchMap(token => {
        return next(addToken(request, token));
      })
    );
  } else {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return authService.refreshToken().pipe(
      switchMap((response) => {
        // Extract the new token from the response
        // The response can be either the token string directly or an object with accessToken property
        let newToken = typeof response === 'string' ? response : response.accessToken;

        if(!newToken){
          newToken=""
        }

        // Validate token format (JWT tokens should have 2 periods)
        if (!newToken.includes('.')) {
          console.warn('Token format validation failed - token does not contain periods');
          // If token doesn't have the expected format, try to decode it (it might be encoded)
          try {
            // It might be URL encoded or otherwise transformed
            const decodedToken = decodeURIComponent(newToken);
            if (decodedToken.includes('.')) {
              console.log('Successfully decoded token to proper JWT format');
              newToken = decodedToken;
            }
          } catch (e) {
            console.error('Failed to decode potentially encoded token', e);
          }
        }

        // Final validation check
        if (newToken.split('.').length !== 3) {
          console.warn(`Token format may be invalid: contains ${newToken.split('.').length - 1} periods instead of 2`);
        }

        // Store the new token in localStorage to ensure it's available for subsequent requests
        localStorage.setItem('token', newToken);

        // Update the refreshTokenSubject with the new token
        refreshTokenSubject.next(newToken);

        // Log successful token refresh
        console.log('Token refreshed successfully, updating request with new token');

        // Add a small delay to ensure token is properly stored before continuing
        return new Observable(observer => {
          setTimeout(() => {
            // Clone the request with the new token
            observer.next(next(addToken(request, newToken)));
            observer.complete();
          }, 100); // 100ms delay
        });
      }),
      catchError((error) => {
        // Handle token refresh failure
        authService.logout();
        router.navigate(['/auth/login'], {
          queryParams: {
            error: 'Your session has expired. Please log in again.',
            returnUrl: router.url
          }
        });
        return throwError(() => error);
      }),
      finalize(() => {
        // Reset the refreshing flag when done
        isRefreshing = false;
      })
    );
  }
}
