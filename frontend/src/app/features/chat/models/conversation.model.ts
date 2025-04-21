/**
 * Represents a conversation in the chat system.
 * This model is used for backward compatibility with the old chat service.
 */
export interface Conversation {
  /**
   * Unique identifier for the conversation
   */
  id: string | number;

  /**
   * Name of the conversation (for group chats)
   */
  name: string;

  /**
   * Description of the conversation
   */
  description?: string;

  /**
   * URL to the conversation's avatar image
   */
  avatarUrl?: string;

  /**
   * Whether this is a group chat
   */
  groupChat: boolean;

  /**
   * ID of the user who created the conversation
   */
  creatorId: number;

  /**
   * Username of the creator
   */
  creatorUsername: string;

  /**
   * List of participants in the conversation
   */
  participants: {
    id: number;
    username: string;
    fullName?: string;
    avatarUrl?: string;
  }[];

  /**
   * When the conversation was created
   */
  createdAt?: Date | string;

  /**
   * When the conversation was last updated
   */
  updatedAt?: Date | string;

  /**
   * Last message in the conversation (optional)
   */
  lastMessage?: {
    id: number;
    content: string;
    senderId: number;
    senderUsername: string;
    timestamp: string;
  };

  /**
   * Number of unread messages (optional)
   */
  unreadCount?: number;
}
