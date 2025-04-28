/**
 * Interface for message status updates sent over WebSocket
 */
export interface MessageStatusUpdate {
    messageId: string | number;
    conversationId: string | number;
    status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
    deliveredAt?: Date;
    readAt?: Date;
  }