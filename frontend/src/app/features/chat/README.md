# Chat Feature Module

This module provides a reusable, pluggable chat functionality that can be integrated into any Angular application.

## Features

- Real-time messaging using WebSockets
- Message history and persistence
- Typing indicators
- Read receipts
- Group conversations
- One-to-one conversations
- File attachments (coming soon)

## Architecture

The chat module follows a clean architecture pattern with clear separation of concerns:

```
/chat
├── /api                  # API interfaces and services
│   ├── /models           # Data models/interfaces
│   ├── /services         # API services for backend communication
│   └── /websocket        # WebSocket connection and handlers
├── /components           # UI components
│   ├── /chat-container   # Main container component
│   ├── /conversation     # Conversation components
│   ├── /message          # Message components
│   └── /shared           # Shared UI components
├── /core                 # Core functionality
│   ├── /adapters         # Adapters for external services
│   ├── /config           # Configuration
│   └── /utils            # Utility functions
├── /store                # State management
│   ├── /actions          # State actions
│   ├── /effects          # Side effects
│   ├── /reducers         # State reducers
│   └── /selectors        # State selectors
└── chat.module.ts        # Module definition
```

## Usage

To use this module in your application:

1. Import the ChatModule in your app module:
```typescript
import { ChatModule } from './features/chat/chat.module';

@NgModule({
  imports: [
    ChatModule.forRoot({
      apiUrl: 'https://your-api-url.com',
      wsUrl: 'wss://your-websocket-url.com'
    })
  ]
})
export class AppModule { }
```

2. Add the chat container component to your template:
```html
<chat-container
  [userId]="currentUserId"
  [conversationId]="selectedConversationId"
  (messageSent)="onMessageSent($event)">
</chat-container>
```

## Backend Requirements

This module requires a backend that supports:

1. RESTful API endpoints for:
   - Fetching conversations
   - Fetching messages
   - Creating conversations
   - Sending messages
   - Managing users

2. WebSocket endpoints for:
   - Real-time message delivery
   - Typing indicators
   - Read receipts
   - User presence

See the API documentation for more details.
