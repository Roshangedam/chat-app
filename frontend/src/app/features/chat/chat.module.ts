import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';

// Angular Material Imports
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';

// Component Imports
import { ChatContainerComponent } from './components/conversation/chat-container/chat-container.component';
import { ChatHeaderComponent } from './components/conversation/chat-header/chat-header.component';
import { ChatMessageListComponent } from './components/conversation/chat-message-list/chat-message-list.component';
import { ChatMessageItemComponent } from './components/conversation/chat-message-item/chat-message-item.component';
import { ChatMessageInputComponent } from './components/conversation/chat-message-input/chat-message-input.component';
import { ConversationListComponent } from './components/conversation-list/conversation-list.component';

// Service Imports
import { ChatService } from './api/services/chat.service';
import { ChatApiService } from './api/services/chat-api.service';
import { ChatWebsocketService } from './api/websocket/chat-websocket.service';

// Configuration Interface
export interface ChatModuleConfig {
  apiUrl?: string;
  wsUrl?: string;
}

@NgModule({
  imports: [
    // Angular Modules
    CommonModule,
    ReactiveFormsModule,
    RouterModule,

    // Material Modules
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatBadgeModule,

    // Feature Components (standalone)
    ChatContainerComponent,
    ChatHeaderComponent,
    ChatMessageListComponent,
    ChatMessageItemComponent,
    ChatMessageInputComponent,
    ConversationListComponent,
  ],
  exports: [
    // All components
    ChatContainerComponent,
    ChatHeaderComponent,
    ChatMessageListComponent,
    ChatMessageItemComponent,
    ChatMessageInputComponent,
    ConversationListComponent
  ],
  providers: [
    // Services
    ChatService,
    ChatApiService,
    ChatWebsocketService
  ]
})
export class ChatModule {
  /**
   * Use this method to configure the chat module with custom settings
   * @param config Configuration options for the chat module
   */
  static forRoot(config: ChatModuleConfig = {}): ModuleWithProviders<ChatModule> {
    return {
      ngModule: ChatModule,
      providers: [
        { provide: 'CHAT_CONFIG', useValue: config },
        HttpClient
      ]
    };
  }
}
