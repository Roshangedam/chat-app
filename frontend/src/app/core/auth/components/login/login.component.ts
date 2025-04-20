import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  hidePassword = true;
  returnUrl: string = '/';

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    // Get return URL from route parameters or default to '/'
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';

    // Check for error message in query params (from token interceptor)
    const errorParam = this.route.snapshot.queryParams['error'];
    if (errorParam) {
      this.errorMessage = errorParam;
      // Make the error message more visible by adding a CSS class
      setTimeout(() => {
        const errorElement = document.querySelector('.error-message');
        if (errorElement) {
          errorElement.classList.add('session-expired');
        }
      }, 0);
    }

    // Check if we have an OAuth2 callback
    this.route.queryParams.subscribe(params => {
      const code = params['code'];
      const state = params['state'];
      const token = params['token'];

      if (code && state) {
        this.handleOAuth2Callback(code, state);
      } else if (token) {
        // Handle redirect from backend with token
        this.handleOAuth2Redirect(token);
      }
    });
  }
  

  onSubmit(): void {
    if (this.loginForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: (response) => {
        console.log('Login successful:', response);
        this.isLoading = false;
        this.router.navigateByUrl(this.returnUrl);
      },
      error: (error) => {
        console.error('Login error details:', error);
        this.isLoading = false;
        
        // Handle different error formats
        if (error.error && typeof error.error === 'object') {
          // If error contains a structured error object
          this.errorMessage = error.error.message || error.error.error || error.message || 'Login failed. Please try again.';
        } else if (typeof error.error === 'string') {
          // If error is a string
          try {
            const parsedError = JSON.parse(error.error);
            this.errorMessage = parsedError.message || parsedError.error || 'Login failed. Please try again.';
          } catch {
            this.errorMessage = error.error || error.message || 'Login failed. Please try again.';
          }
        } else {
          this.errorMessage = error.message || 'Login failed. Please try again.';
        }
      }
    });
  }

    loginWithGoogle(): void {
      this.authService.loginWithGoogle();
    }
  
    private handleOAuth2Callback(code: string, state: string): void {
      this.isLoading = true;
      this.errorMessage = '';
  
      this.authService.handleOAuth2Callback(code, state).subscribe({
        next: () => {
          this.isLoading = false;
          this.router.navigateByUrl(this.returnUrl);
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error.message || 'OAuth authentication failed. Please try again.';
        }
      });
    }
  
    private handleOAuth2Redirect(token: string): void {
      this.isLoading = true;
      this.errorMessage = '';
  
      this.authService.handleOAuth2Redirect(token).subscribe({
        next: () => {
          this.isLoading = false;
          this.router.navigateByUrl(this.returnUrl);
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error.message || 'Token verification failed. Please try again.';
        }
      });
    }
  }

  

