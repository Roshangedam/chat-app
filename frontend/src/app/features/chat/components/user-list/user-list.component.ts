import { Component, OnInit, OnDestroy, Output, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { UserService } from '../../api/services/user.service';
import { ChatService } from '../../api/services/chat.service';
import { ChatUser } from '../../api/models';
import { Subscription } from 'rxjs';
// StatusIndicatorComponent is now used indirectly through UserAvatarComponent
import { UserAvatarComponent } from '../../../../shared/components/user-avatar/user-avatar.component';
import { AvatarService } from '../../../../shared/services/avatar.service';
import { StatusService } from '../../../../shared/services/status.service';

/**
 * Component for displaying a list of users.
 * Allows searching for users and starting conversations.
 */
@Component({
  selector: 'chat-user-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatListModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatDividerModule,
    UserAvatarComponent
  ],
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserListComponent implements OnInit, OnDestroy {
  @Output() startChat = new EventEmitter<ChatUser>();

  users: ChatUser[] = [];
  filteredUsers: ChatUser[] = [];
  searchQuery: string = '';
  isLoading = false;
  error: string | null = null;

  private subscriptions = new Subscription();

  constructor(
    private userService: UserService,
    private chatService: ChatService,
    private statusService: StatusService,
    private avatarService: AvatarService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadUsers();

    // Subscribe to loading state
    this.subscriptions.add(
      this.userService.loading$.subscribe(loading => {
        this.isLoading = loading;
        this.cdr.markForCheck();
      })
    );

    // Subscribe to users
    this.subscriptions.add(
      this.userService.users$.subscribe(users => {
        this.users = users;
        this.applyFilter();

        // Preload avatars for all users
        this.avatarService.preloadAvatars(users);
        this.cdr.markForCheck();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /**
   * Load all users
   */
  loadUsers(): void {
    this.error = null;
    this.userService.loadUsers().subscribe({
      error: (err) => {
        this.error = 'Failed to load users. Please try again.';
        console.error('Error loading users:', err);
      }
    });
  }

  /**
   * Search for users
   */
  searchUsers(): void {
    if (!this.searchQuery.trim()) {
      this.applyFilter();
      return;
    }

    this.error = null;
    this.userService.searchUsers(this.searchQuery).subscribe({
      next: (users) => {
        this.filteredUsers = users;
      },
      error: (err) => {
        this.error = 'Failed to search users. Please try again.';
        console.error('Error searching users:', err);
      }
    });
  }


  /**
   * Apply filter to users based on search query with debounce
   * This improves performance by not filtering on every keystroke
   */
  private debounceTimer: any;
  onSearchInput(): void {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.applyFilter();
    }, 300); // 300ms debounce
  }

  /**
   * Apply filter to users based on search query
   */
  private applyFilter(): void {
    const query = this.searchQuery.toLowerCase().trim();
    this.filteredUsers = !query
      ? [...this.users]
      : this.users.filter(user =>
          user.username.toLowerCase().includes(query) ||
          (user.fullName && user.fullName.toLowerCase().includes(query))
        );
    this.cdr.markForCheck();
  }

  /**
   * Start a chat with a user
   * @param user The user to chat with
   */
  onStartChat(user: ChatUser): void {
    this.startChat.emit(user);

    // Create a one-to-one conversation
    this.chatService.createOneToOneConversation(user.id).subscribe({
      next: (conversation) => {
        // Set as active conversation
        this.chatService.setActiveConversation(conversation);
      },
      error: (err) => {
        console.error('Error creating conversation:', err);
      }
    });
  }

  /**
   * Clear search
   */
  clearSearch(): void {
    this.searchQuery = '';
    this.applyFilter();
  }

  /**
   * Get the status class for a user
   * @param user The user or user status
   */
  getStatusClass(userOrStatus?: ChatUser | string): string {
    // If input is a user object
    if (userOrStatus && typeof userOrStatus !== 'string') {
      const user = userOrStatus as ChatUser;
      // First check if we have a real-time status from the StatusService
      const realTimeStatus = this.statusService.getUserStatus(user.id);
      if (realTimeStatus) {
        return realTimeStatus.toLowerCase();
      }
      // Fall back to the status stored in the user object
      return user.status?.toLowerCase() || 'offline';
    }

    // If input is a status string
    const status = userOrStatus as string;
    if (!status) return 'offline';
    return status.toLowerCase();
  }

  /**
   * Track users by ID for ngFor optimization
   * @param _ Index of the item (not used)
   * @param user User object
   */
  trackByUserId(_: number, user: ChatUser): string | number {
    return user.id;
  }
}
