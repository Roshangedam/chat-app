import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ChatService } from '../../api/services/chat.service';
import { ChatConversation } from '../../api/models';
import { CommonModule } from '@angular/common';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatButtonModule
  ],
  selector: 'app-conversation-list',
  templateUrl: './conversation-list.component.html',
  styleUrls: ['./conversation-list.component.css']
})
export class ConversationListComponent implements OnInit, OnDestroy {
  conversations: ChatConversation[] = [];
  selectedConversationId: string | number | null = null;
  isLoading = false;
  loadError = false;
  private subscriptions: Subscription = new Subscription();

  constructor(
    private chatService: ChatService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    // Subscribe to conversations
    this.subscriptions.add(
      this.chatService.conversations$.subscribe(conversations => {
        this.conversations = conversations;
      })
    );

    // Load conversations
    this.loadConversations();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadConversations(): void {
    this.isLoading = true;
    this.loadError = false;

    this.chatService.loadConversations().subscribe({
      next: () => {
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        this.loadError = true;
        console.error('Error loading conversations:', error);

        // Show a user-friendly error message
        if (error.status === 401) {
          this.snackBar.open('Your session has expired. Please log in again.', 'Dismiss', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
          // Redirect will be handled by the token interceptor
        } else {
          this.snackBar.open('Failed to load conversations. Please try again later.', 'Dismiss', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      }
    });
  }

  selectConversation(conversation: ChatConversation): void {
    this.selectedConversationId = conversation.id;
    this.router.navigate(['/chat', conversation.id]);
  }

  getConversationName(conversation: ChatConversation): string {
    if (conversation.groupChat) {
      return conversation.name;
    } else {
      // For one-to-one chats, show the other participant's name
      const participant = conversation.participants.find(p => p.id !== conversation.creatorId);
      return participant ? participant.username : 'Unknown User';
    }
  }

  getAvatarUrl(conversation: ChatConversation): string {
    if (conversation.groupChat) {
      return conversation.avatarUrl || 'assets/images/group-avatar.png';
    } else {
      const participant = conversation.participants.find(p => p.id !== conversation.creatorId);
      return participant?.avatarUrl || 'assets/images/user-avatar.png';
    }
  }

  createNewConversation(): void {
    this.router.navigate(['/new-conversation']);
  }

  retry(): void {
    this.loadConversations();
  }
}
