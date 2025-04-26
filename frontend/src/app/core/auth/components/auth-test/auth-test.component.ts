import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-auth-test',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatDividerModule],
  template: `
    <div class="auth-test-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Authentication Test</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="test-section">
            <h3>Public Endpoint Test</h3>
            <button mat-raised-button color="primary" (click)="testPublicEndpoint()">Test Public Endpoint</button>
            <div *ngIf="publicResponse" class="response-container">
              <h4>Response:</h4>
              <pre>{{ publicResponse | json }}</pre>
            </div>
          </div>
          
          <mat-divider></mat-divider>
          
          <div class="test-section">
            <h3>Protected Endpoint Test</h3>
            <button mat-raised-button color="accent" (click)="testProtectedEndpoint()">Test Protected Endpoint</button>
            <div *ngIf="protectedResponse" class="response-container">
              <h4>Response:</h4>
              <pre>{{ protectedResponse | json }}</pre>
            </div>
          </div>
          
          <mat-divider></mat-divider>
          
          <div class="test-section">
            <h3>Auth Check Endpoint Test</h3>
            <button mat-raised-button color="warn" (click)="testAuthCheckEndpoint()">Test Auth Check</button>
            <div *ngIf="authCheckResponse" class="response-container">
              <h4>Response:</h4>
              <pre>{{ authCheckResponse | json }}</pre>
            </div>
          </div>
          
          <mat-divider></mat-divider>
          
          <div class="test-section">
            <h3>Users API Test</h3>
            <button mat-raised-button color="primary" (click)="testUsersEndpoint()">Test Users API</button>
            <div *ngIf="usersResponse" class="response-container">
              <h4>Response:</h4>
              <pre>{{ usersResponse | json }}</pre>
            </div>
          </div>
          
          <mat-divider></mat-divider>
          
          <div class="test-section">
            <h3>Direct Fetch Test (with manual token)</h3>
            <button mat-raised-button color="accent" (click)="testDirectFetch()">Test Direct Fetch</button>
            <div *ngIf="directFetchResponse" class="response-container">
              <h4>Response:</h4>
              <pre>{{ directFetchResponse | json }}</pre>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .auth-test-container {
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }
    .test-section {
      margin: 20px 0;
    }
    .response-container {
      margin-top: 10px;
      background-color: #f5f5f5;
      padding: 10px;
      border-radius: 4px;
      overflow: auto;
    }
    pre {
      white-space: pre-wrap;
      word-wrap: break-word;
    }
  `]
})
export class AuthTestComponent implements OnInit {
  publicResponse: any;
  protectedResponse: any;
  authCheckResponse: any;
  usersResponse: any;
  directFetchResponse: any;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    console.log('Auth Test Component initialized');
  }

  testPublicEndpoint(): void {
    this.http.get(`${environment.apiUrl}/api/v1/test/public`).subscribe({
      next: (response) => {
        console.log('Public endpoint response:', response);
        this.publicResponse = response;
      },
      error: (error) => {
        console.error('Public endpoint error:', error);
        this.publicResponse = { error: error.message };
      }
    });
  }

  testProtectedEndpoint(): void {
    this.http.get(`${environment.apiUrl}/api/v1/test/protected`).subscribe({
      next: (response) => {
        console.log('Protected endpoint response:', response);
        this.protectedResponse = response;
      },
      error: (error) => {
        console.error('Protected endpoint error:', error);
        this.protectedResponse = { error: error.message, status: error.status };
      }
    });
  }

  testAuthCheckEndpoint(): void {
    this.http.get(`${environment.apiUrl}/api/v1/test/auth-check`).subscribe({
      next: (response) => {
        console.log('Auth check endpoint response:', response);
        this.authCheckResponse = response;
      },
      error: (error) => {
        console.error('Auth check endpoint error:', error);
        this.authCheckResponse = { error: error.message, status: error.status };
      }
    });
  }

  testUsersEndpoint(): void {
    this.http.get(`${environment.apiUrl}/api/v1/users`).subscribe({
      next: (response) => {
        console.log('Users endpoint response:', response);
        this.usersResponse = response;
      },
      error: (error) => {
        console.error('Users endpoint error:', error);
        this.usersResponse = { error: error.message, status: error.status };
      }
    });
  }

  testDirectFetch(): void {
    const token = localStorage.getItem('token');
    console.log('Using token for direct fetch:', token ? `${token.substring(0, 10)}...` : 'null');
    
    fetch(`${environment.apiUrl}/api/v1/users`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => {
      console.log('Direct fetch response status:', response.status);
      if (response.ok) {
        return response.json();
      }
      throw new Error(`Status: ${response.status}`);
    })
    .then(data => {
      console.log('Direct fetch data:', data);
      this.directFetchResponse = data;
    })
    .catch(error => {
      console.error('Direct fetch error:', error);
      this.directFetchResponse = { error: error.message };
    });
  }
}
