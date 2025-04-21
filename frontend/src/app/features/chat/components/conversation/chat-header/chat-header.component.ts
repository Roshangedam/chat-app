import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { ChatConversation } from '../../../api/models';

/**
 * Component for displaying the header of a chat conversation.
 * Shows conversation name, status, and actions.
 */
@Component({
  selector: 'chat-header',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule
  ],
  templateUrl: './chat-header.component.html',
  styleUrls: ['./chat-header.component.css']
})
export class ChatHeaderComponent {
  @Input() conversation: ChatConversation | null = null;
  @Input() isTyping = false;
  @Input() typingUser = '';
  
  @Output() backClick = new EventEmitter<void>();
  @Output() menuAction = new EventEmitter<string>();

  /**
   * Get the name to display for the conversation
   */
  getConversationName(): string {
    if (!this.conversation) {
      return 'Chat';
    }
    
    if (this.conversation.name) {
      return this.conversation.name;
    }
    
    // For one-to-one chats, use the other participant's name
    if (!this.conversation.groupChat && this.conversation.participants.length > 0) {
      const otherParticipant = this.conversation.participants[0];
      return otherParticipant.displayName || otherParticipant.username;
    }
    
    return 'Chat';
  }

  /**
   * Get the status text to display
   */
  getStatusText(): string {
    if (this.isTyping) {
      return `${this.typingUser} is typing...`;
    }
    
    if (!this.conversation || this.conversation.groupChat) {
      return '';
    }
    
    // For one-to-one chats, show the other participant's status
    if (this.conversation.participants.length > 0) {
      const otherParticipant = this.conversation.participants[0];
      return otherParticipant.status || 'Offline';
    }
    
    return '';
  }

  /**
   * Get the status class for styling
   */
  getStatusClass(): string {
    if (this.isTyping) {
      return 'typing';
    }
    
    if (!this.conversation || this.conversation.groupChat) {
      return '';
    }
    
    if (this.conversation.participants.length > 0) {
      const otherParticipant = this.conversation.participants[0];
      return otherParticipant.status?.toLowerCase() || 'offline';
    }
    
    return 'offline';
  }

  /**
   * Handle back button click
   */
  onBackClick(): void {
    this.backClick.emit();
  }

  /**
   * Handle menu action click
   * @param action The action that was clicked
   */
  onMenuAction(action: string): void {
    this.menuAction.emit(action);
  }
}
