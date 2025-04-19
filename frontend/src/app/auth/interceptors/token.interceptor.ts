import { HttpRequest, HttpHandlerFn, HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';

// Global variables for the interceptor function
let isRefreshing = false;
const refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

// Functional interceptor
export const TokenInterceptor: HttpInterceptorFn = (request: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);
  const isBrowser = isPlatformBrowser(platformId);
  
  // Skip token for auth endpoints
  if (request.url.includes('/auth/login') || 
      request.url.includes('/auth/register') || 
      request.url.includes('/auth/refresh-token')) {
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
        console.error('HTTP Error:', error);
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
    console.error('No refresh token available, cannot refresh');
    authService.logout();
    router.navigate(['/auth/login'], {
      queryParams: { 
        error: 'Your session has expired. Please log in again.',
        returnUrl: router.url
      }
    });
    return throwError(() => new Error('No refresh token available'));
  }

  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return authService.refreshToken().pipe(
      switchMap((response) => {
        isRefreshing = false;
        refreshTokenSubject.next(response.accessToken);
        return next(addToken(request, response.accessToken));
      }),
      catchError((error) => {
        isRefreshing = false;
        console.error('Token refresh failed:', error);
        authService.logout();
        
        // Redirect to login page with error message
        router.navigate(['/auth/login'], {
          queryParams: { 
            error: 'Your session has expired. Please log in again.',
            returnUrl: router.url
          }
        });
        
        return throwError(() => error);
      })
    );
  } else {
    return refreshTokenSubject.pipe(
      filter(token => token !== null),
      take(1),
      switchMap(token => next(addToken(request, token)))
    );
  }
}