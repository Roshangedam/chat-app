/**
 * Represents a chat message in the system.
 * This model is used for both sending and receiving messages.
 */
export interface ChatMessage {
  /**
   * Unique identifier for the message
   */
  id?: string | number;
  
  /**
   * ID of the user who sent the message
   */
  senderId: string | number;
  
  /**
   * Username of the sender (for display purposes)
   */
  senderUsername?: string;
  
  /**
   * URL to the sender's avatar image
   */
  senderAvatarUrl?: string;
  
  /**
   * ID of the conversation this message belongs to
   */
  conversationId: string | number;
  
  /**
   * The actual message content
   */
  content: string;
  
  /**
   * When the message was sent
   */
  sentAt?: Date;
  
  /**
   * When the message was delivered to recipients
   */
  deliveredAt?: Date;
  
  /**
   * When the message was read by recipients
   */
  readAt?: Date;
  
  /**
   * Current status of the message
   */
  status?: 'SENT' | 'DELIVERED' | 'READ';
}
