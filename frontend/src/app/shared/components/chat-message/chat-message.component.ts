import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Message } from '../../models/message.model';
import { DateFormatterUtils } from '../../utils/date-formatter.utils';

@Component({
  selector: 'app-chat-message',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './chat-message.component.html',
  styleUrls: ['./chat-message.component.css']
})
export class ChatMessageComponent {
  @Input() message!: Message;
  @Input() isOwnMessage: boolean = false;

  constructor(public dateFormatter: DateFormatterUtils) {}

  getMessageStatusIcon(): string {
    if (!this.message.status || !this.isOwnMessage) return '';
    
    switch (this.message.status) {
      case 'SENT':
        return 'check';
      case 'DELIVERED':
        return 'done_all';
      case 'READ':
        return 'done_all';
      default:
        return 'schedule';
    }
  }

  getMessageStatusClass(): string {
    return this.message.status === 'READ' ? 'read' : '';
  }
}
