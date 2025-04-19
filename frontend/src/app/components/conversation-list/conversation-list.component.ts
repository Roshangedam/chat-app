import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ChatService, Conversation } from '../../services/chat.service';
import { CommonModule } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  imports: [CommonModule],
  selector: 'app-conversation-list',
  templateUrl: './conversation-list.component.html',
  styleUrls: ['./conversation-list.component.css']
})
export class ConversationListComponent implements OnInit, OnDestroy {
  conversations: Conversation[] = [];
  selectedConversationId: number | null = null;
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
    
    this.chatService.getConversations().subscribe({
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

  selectConversation(conversation: Conversation): void {
    this.selectedConversationId = conversation.id;
    this.router.navigate(['/chat', conversation.id]);
  }

  getConversationName(conversation: Conversation): string {
    if (conversation.groupChat) {
      return conversation.name;
    } else {
      // For one-to-one chats, show the other participant's name
      const participant = conversation.participants.find(p => p.id !== conversation.creatorId);
      return participant ? participant.username : 'Unknown User';
    }
  }

  getAvatarUrl(conversation: Conversation): string {
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
