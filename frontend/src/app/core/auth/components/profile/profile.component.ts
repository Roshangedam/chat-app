import { Component, OnInit, OnDestroy } from '@angular/core';
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
import { UserStatusService } from '../../../../features/chat/api/services/user-status.service';
import { Subscription } from 'rxjs';
import { StatusIndicatorComponent } from '../../../../shared/components/status-indicator/status-indicator.component';

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
    MatSelectModule,
    StatusIndicatorComponent
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit, OnDestroy {
  profileForm: FormGroup;
  currentUser: User | null = null;
  isLoading = false;
  isSaving = false;
  successMessage = '';
  errorMessage = '';

  private subscriptions = new Subscription();

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private userStatusService: UserStatusService
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
    this.subscriptions.add(
      this.authService.currentUser$.subscribe(user => {
        if (user) {
          this.currentUser = user;
          this.updateFormValues(user);
        }
      })
    );

    // Subscribe to user status updates
    this.userStatusService.subscribeToUserStatus();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
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
      // Update status in both AuthService and UserStatusService
      this.authService.updateProfile({ status }).subscribe({
        next: () => {
          // Also update the status in the UserStatusService
          this.userStatusService.updateStatus(status).subscribe({
            error: (err) => {
              console.error('Error updating status in UserStatusService:', err);
            }
          });
        },
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

  /**
   * Get the current user's status, prioritizing real-time status
   */
  getUserStatus(): string {
    if (!this.currentUser) return 'OFFLINE';

    // First check if we have a real-time status from the UserStatusService
    const realTimeStatus = this.userStatusService.getUserStatus(this.currentUser.id);
    if (realTimeStatus) {
      return realTimeStatus;
    }

    // Fall back to the status stored in the user object
    return this.currentUser.status || 'OFFLINE';
  }
}