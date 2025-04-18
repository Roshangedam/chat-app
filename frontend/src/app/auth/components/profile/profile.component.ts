import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService, User } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  profileForm: FormGroup;
  currentUser: User | null = null;
  isLoading = false;
  isSaving = false;
  successMessage = '';
  errorMessage = '';
  
  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService
  ) {
    this.profileForm = this.formBuilder.group({
      fullName: ['', Validators.required],
      username: [{ value: '', disabled: true }],
      email: [{ value: '', disabled: true }],
      bio: ['', Validators.maxLength(200)],
      avatarUrl: [''],
      status: ['ONLINE']
    });
  }
  
  ngOnInit(): void {
    this.loadUserProfile();
    
    // Subscribe to user changes
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.currentUser = user;
        this.updateFormValues(user);
      }
    });
  }
  
  loadUserProfile(): void {
    this.isLoading = true;
    this.authService.getUserProfile().subscribe({
      next: (user) => {
        this.currentUser = user;
        this.updateFormValues(user);
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error.message || 'Failed to load profile';
        this.isLoading = false;
      }
    });
  }
  
  updateFormValues(user: User): void {
    this.profileForm.patchValue({
      fullName: user.fullName || '',
      username: user.username,
      email: user.email,
      bio: user.bio || '',
      avatarUrl: user.avatarUrl || '',
      status: user.status || 'ONLINE'
    });
  }
  
  onSubmit(): void {
    if (this.profileForm.invalid) {
      return;
    }
    
    this.successMessage = '';
    this.errorMessage = '';
    this.isSaving = true;
    
    const profileData = {
      fullName: this.profileForm.value.fullName,
      bio: this.profileForm.value.bio,
      avatarUrl: this.profileForm.value.avatarUrl,
      status: this.profileForm.value.status
    };
    
    this.authService.updateProfile(profileData).subscribe({
      next: () => {
        this.successMessage = 'Profile updated successfully';
        this.isSaving = false;
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        this.errorMessage = error.message || 'Failed to update profile';
        this.isSaving = false;
      }
    });
  }
  
  onStatusChange(event: any): void {
    const status = event.value;
    if (this.currentUser && this.currentUser.status !== status) {
      this.authService.updateProfile({ status }).subscribe({
        error: (error) => {
          this.errorMessage = error.message || 'Failed to update status';
          // Revert to previous status in form
          if (this.currentUser) {
            this.profileForm.patchValue({ status: this.currentUser.status });
          }
        }
      });
    }
  }
}