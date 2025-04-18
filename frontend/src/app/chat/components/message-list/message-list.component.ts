import { Component, ElementRef, Input, NgModule, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { Message } from '../../../services/chat.service';
import { AuthService, User } from '../../../auth/services/auth.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  imports: [CommonModule,NgIf, MatProgressSpinnerModule,MatIconModule],
  selector: 'app-message-list',
  templateUrl: './message-list.component.html',
  styleUrls: ['./message-list.component.css']
})
export class MessageListComponent implements OnInit, OnChanges {
  @Input() messages: Message[] = [];
  @Input() loading = false;
  @Input() isTyping = false;
  @Input() typingUser = '';

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  private currentUser: User | null = null;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Scroll to bottom when messages change
    if (changes['messages']) {
      setTimeout(() => this.scrollToBottom(), 100);
    }
  }

  scrollToBottom(): void {
    try {
      const element = this.scrollContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  isOwnMessage(message: Message): boolean {
    return this.currentUser !== null && message.senderId === this.currentUser.id;
  }

  getMessageDate(message: Message): Date {
    return message.sentAt ? new Date(message.sentAt) : new Date();
  }

  isDifferentDay(prevMessage: Message, currentMessage: Message): boolean {
    const prevDate = this.getMessageDate(prevMessage);
    const currentDate = this.getMessageDate(currentMessage);

    return (
      prevDate.getFullYear() !== currentDate.getFullYear() ||
      prevDate.getMonth() !== currentDate.getMonth() ||
      prevDate.getDate() !== currentDate.getDate()
    );
  }
}
