import { Component, ElementRef, Input, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { ChatMessage } from '../../../api/models';
import { ChatMessageItemComponent } from '../chat-message-item/chat-message-item.component';

/**
 * Component for displaying a list of chat messages.
 * Handles message grouping, date separators, and auto-scrolling.
 */
@Component({
  selector: 'chat-message-list',
  standalone: true,
  imports: [
    CommonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    ChatMessageItemComponent
  ],
  templateUrl: './chat-message-list.component.html',
  styleUrls: ['./chat-message-list.component.css']
})
export class ChatMessageListComponent implements OnInit, OnChanges {
  @Input() messages: ChatMessage[] = [];
  @Input() loading = false;
  @Input() isTyping = false;
  @Input() typingUser = '';
  @Input() userId?: string | number;

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  constructor() {}

  ngOnInit(): void {}

  ngOnChanges(changes: SimpleChanges): void {
    // Scroll to bottom when messages change
    if (changes['messages']) {
      setTimeout(() => this.scrollToBottom(), 100);
    }
  }

  /**
   * Scroll to the bottom of the message list
   */
  scrollToBottom(): void {
    try {
      const element = this.scrollContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  /**
   * Check if a message is from the current user
   * @param message The message to check
   */
  isOwnMessage(message: ChatMessage): boolean {
    return this.userId !== undefined && message.senderId === this.userId;
  }

  /**
   * Get the date of a message
   * @param message The message to get the date for
   */
  getMessageDate(message: ChatMessage): Date {
    return message.sentAt ? new Date(message.sentAt) : new Date();
  }

  /**
   * Check if two messages are from different days
   * @param prev The previous message
   * @param current The current message
   */
  isDifferentDay(prev: ChatMessage, current: ChatMessage): boolean {
    const prevDate = this.getMessageDate(prev);
    const currDate = this.getMessageDate(current);
    
    return prevDate.toDateString() !== currDate.toDateString();
  }

  /**
   * Check if a message should show the sender's avatar
   * @param index Index of the message in the array
   * @param message The current message
   */
  shouldShowAvatar(index: number, message: ChatMessage): boolean {
    // Always show avatar for the first message
    if (index === 0) {
      return true;
    }
    
    // Show avatar if the sender changed
    const prevMessage = this.messages[index - 1];
    return prevMessage.senderId !== message.senderId;
  }

  /**
   * Group messages by date
   */
  getMessageGroups(): { date: Date, messages: ChatMessage[] }[] {
    const groups: { date: Date, messages: ChatMessage[] }[] = [];
    
    this.messages.forEach(message => {
      const messageDate = this.getMessageDate(message);
      const dateString = messageDate.toDateString();
      
      // Find existing group or create new one
      let group = groups.find(g => g.date.toDateString() === dateString);
      
      if (!group) {
        group = { date: messageDate, messages: [] };
        groups.push(group);
      }
      
      group.messages.push(message);
    });
    
    return groups;
  }
}
