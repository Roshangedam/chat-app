import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { UserService } from '../../../api/services/user.service';
import { ChatService } from '../../../api/services/chat.service';
import { ChatUser } from '../../../api/models';

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
    MatDividerModule
  ],
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.css']
})
export class UserListComponent implements OnInit {
  @Output() startChat = new EventEmitter<ChatUser>();
  
  users: ChatUser[] = [];
  filteredUsers: ChatUser[] = [];
  searchQuery: string = '';
  isLoading = false;
  error: string | null = null;

  constructor(
    private userService: UserService,
    private chatService: ChatService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
    
    // Subscribe to loading state
    this.userService.loading$.subscribe(loading => {
      this.isLoading = loading;
    });
    
    // Subscribe to users
    this.userService.users$.subscribe(users => {
      this.users = users;
      this.applyFilter();
    });
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
   * Apply filter to users
   */
  applyFilter(): void {
    if (!this.searchQuery.trim()) {
      this.filteredUsers = [...this.users];
      return;
    }
    
    const query = this.searchQuery.toLowerCase();
    this.filteredUsers = this.users.filter(user => 
      user.username.toLowerCase().includes(query) || 
      (user.fullName && user.fullName.toLowerCase().includes(query))
    );
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
   * @param status User status
   */
  getStatusClass(status?: string): string {
    if (!status) return 'offline';
    return status.toLowerCase();
  }
}
