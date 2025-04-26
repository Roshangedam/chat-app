import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-token-debug',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="token-debug">
      <h3>Token Debug Information</h3>
      <div>
        <strong>Token exists:</strong> {{ tokenExists }}
      </div>
      <div>
        <strong>Token value (first 10 chars):</strong> {{ tokenPreview }}
      </div>
      <div>
        <strong>Token expiration:</strong> {{ tokenExpiration }}
      </div>
      <div>
        <strong>Is authenticated:</strong> {{ isAuthenticated }}
      </div>
      <div>
        <strong>Current user:</strong> {{ currentUser }}
      </div>
      <button (click)="refreshInfo()">Refresh Info</button>
      <button (click)="testRequest()">Test API Request</button>
    </div>
  `,
  styles: [`
    .token-debug {
      padding: 15px;
      border: 1px solid #ccc;
      border-radius: 5px;
      margin: 15px;
      background-color: #f8f8f8;
    }
    button {
      margin-top: 10px;
      margin-right: 10px;
      padding: 5px 10px;
    }
  `]
})
export class TokenDebugComponent implements OnInit {
  tokenExists = false;
  tokenPreview = 'N/A';
  tokenExpiration = 'N/A';
  isAuthenticated = false;
  currentUser = 'N/A';

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.refreshInfo();
  }

  refreshInfo() {
    // Check localStorage directly
    const token = localStorage.getItem('token');
    this.tokenExists = !!token;
    this.tokenPreview = token ? `${token.substring(0, 10)}...` : 'N/A';
    
    const expiration = localStorage.getItem('tokenExpiration');
    this.tokenExpiration = expiration || 'N/A';
    
    // Check auth service state
    this.isAuthenticated = this.authService.isAuthenticated();
    const user = this.authService.getCurrentUser();
    this.currentUser = user ? user.username : 'N/A';
    
    console.log('Token Debug Info:', {
      token: token ? `${token.substring(0, 10)}...` : null,
      expiration,
      isAuthenticated: this.isAuthenticated,
      user: this.authService.getCurrentUser()
    });
  }

  testRequest() {
    // Make a test request to the API
    fetch('http://localhost:8080/api/v1/users', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    .then(response => {
      console.log('Test request response:', response);
      if (response.ok) {
        return response.json();
      }
      throw new Error(`Status: ${response.status}`);
    })
    .then(data => {
      console.log('Test request data:', data);
      alert('Request successful! Check console for details.');
    })
    .catch(error => {
      console.error('Test request error:', error);
      alert(`Request failed: ${error.message}`);
    });
  }
}
