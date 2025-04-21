import { ChatUser } from './chat-user.model';

/**
 * Represents a conversation between users in the chat system.
 * A conversation can be either a one-to-one chat or a group chat.
 */
export interface ChatConversation {
  /**
   * Unique identifier for the conversation
   */
  id: string | number;
  
  /**
   * Name of the conversation (required for group chats)
   */
  name: string;
  
  /**
   * Optional description of the conversation
   */
  description?: string;
  
  /**
   * URL to the conversation's avatar image
   */
  avatarUrl?: string;
  
  /**
   * Whether this is a group chat or a one-to-one conversation
   */
  groupChat: boolean;
  
  /**
   * ID of the user who created the conversation
   */
  creatorId?: string | number;
  
  /**
   * Username of the creator (for display purposes)
   */
  creatorUsername?: string;
  
  /**
   * List of users participating in the conversation
   */
  participants: ChatUser[];
  
  /**
   * Preview of the last message in the conversation
   */
  lastMessage?: string;
  
  /**
   * Number of unread messages in the conversation
   */
  unreadCount?: number;
  
  /**
   * When the conversation was created
   */
  createdAt?: Date;
  
  /**
   * When the conversation was last updated
   */
  updatedAt?: Date;
}
