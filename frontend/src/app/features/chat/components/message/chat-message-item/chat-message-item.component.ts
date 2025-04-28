import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ChatMessage } from '../../../api/models';

/**
 * Component for displaying a single chat message.
 * Handles different message styles based on sender.
 */
@Component({
  selector: 'chat-message-item',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule
  ],
  templateUrl: './chat-message-item.component.html',
  styleUrls: ['./chat-message-item.component.css']
})
export class ChatMessageItemComponent {
  @Input() message!: ChatMessage;
  @Input() isOwnMessage = false;
  @Input() showAvatar = true;
  @Output() retry = new EventEmitter<string | number>();

  /**
   * Get the message date
   */
  getMessageDate(): Date {
    return this.message.sentAt ? new Date(this.message.sentAt) : new Date();
  }

  /**
   * Get the avatar URL or a default avatar
   */
  getAvatarUrl(): string {
    return this.message.senderAvatarUrl || 'assets/images/user-avatar.png';
  }

  /**
   * Get the sender's display name
   */
  getSenderName(): string {
    return this.message.senderUsername || 'User';
  }

  /**
   * Retry sending a failed message
   * @param event The click event
   */
  retryMessage(event: Event): void {
    // Stop event propagation to prevent parent elements from handling the click
    event.stopPropagation();

    if (this.message.id) {
      this.retry.emit(this.message.id);
    }
  }
}
