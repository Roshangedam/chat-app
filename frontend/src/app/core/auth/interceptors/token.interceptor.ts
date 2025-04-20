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
      (environment.log?.apiUrl && request.url.includes(environment.log.apiUrl))) {
    return next(request);
  }

  // Skip token handling on server-side
  if (!isBrowser) {
    return next(request);
  }

  // Add token to request
  const token = authService.getToken();
  if (token) {
    request = addToken(request, token);
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
        const newToken = response.accessToken;

        // Update the refreshTokenSubject with the new token
        refreshTokenSubject.next(newToken);

        // Log successful token refresh
        console.log('Token refreshed successfully, updating request with new token');

        // Clone the request with the new token
        return next(addToken(request, newToken));
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