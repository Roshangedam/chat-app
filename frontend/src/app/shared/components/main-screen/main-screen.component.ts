import { Component, Input, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { Subscription } from 'rxjs';

import { ChatContainerComponent } from '../../../features/chat/components/chat-container/chat-container.component';
import { ChatMessage, ChatConversation } from '../../../features/chat/api/models';
import { ChatService } from '../../../features/chat/api/services/chat.service';
import { AuthService } from '../../../core/auth/services/auth.service';
import { ResponsiveUtils } from '../../utils/responsive.utils';

@Component({
  selector: 'app-main-screen',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    ChatContainerComponent
  ],
  templateUrl: './main-screen.component.html',
  styleUrls: ['./main-screen.component.css']
})
export class MainScreenComponent implements OnInit, OnDestroy {
  @Input() conversation: any = null;
  @Input() showHeader: boolean = true;
  @Output() backClicked = new EventEmitter<void>();

  userId: string | number | undefined;
  private subscriptions = new Subscription();

  constructor(
    public responsiveUtils: ResponsiveUtils,
    private authService: AuthService,
    private chatService: ChatService
  ) {}

  ngOnInit(): void {
    // Get the current user ID
    const userSub = this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.userId = user.id;
      }
    });

    this.subscriptions.add(userSub);
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.subscriptions.unsubscribe();
  }

  onMessageSent(message: ChatMessage): void {
    console.log('Message sent:', message);
  }

  onConversationChanged(conversation: ChatConversation): void {
    console.log('Conversation changed:', conversation);
  }

  onBackClicked(): void {
    this.backClicked.emit();
  }
}
