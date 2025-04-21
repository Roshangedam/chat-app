import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
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
    MatIconModule
  ],
  templateUrl: './chat-message-item.component.html',
  styleUrls: ['./chat-message-item.component.css']
})
export class ChatMessageItemComponent {
  @Input() message!: ChatMessage;
  @Input() isOwnMessage = false;
  @Input() showAvatar = true;

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
}
