# Chat Module Examples

This directory contains example components that demonstrate how to use the chat module in different scenarios.

## ChatExampleComponent

A simple example showing how to integrate the chat container into a page. This component:

1. Gets the conversation ID from route parameters
2. Gets the current user ID from the auth service
3. Initializes the chat service with the auth token
4. Loads conversations
5. Handles events from the chat container

### Usage

```typescript
// In your routing module
const routes: Routes = [
  {
    path: 'chat/:id',
    component: ChatExampleComponent
  }
];
```

```html
<!-- In your template -->
<app-chat-example></app-chat-example>
```

## Advanced Usage

For more advanced usage, see the following examples:

- `ChatWithSidebarExample` - Shows how to implement a chat with a sidebar for conversation list
- `ChatInDialogExample` - Shows how to use the chat container in a dialog
- `ChatWithCustomizationExample` - Shows how to customize the appearance of the chat

## Backend Requirements

The chat module requires a backend that supports:

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
