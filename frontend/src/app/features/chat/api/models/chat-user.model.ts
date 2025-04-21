/**
 * Represents a user in the chat system.
 * This model contains only the information needed for chat functionality.
 */
export interface ChatUser {
  /**
   * Unique identifier for the user
   */
  id: string | number;
  
  /**
   * Username for display purposes
   */
  username: string;
  
  /**
   * User's email address
   */
  email: string;
  
  /**
   * User's full name
   */
  fullName?: string;
  
  /**
   * User's first name
   */
  firstName?: string;
  
  /**
   * User's last name
   */
  lastName?: string;
  
  /**
   * Display name (can be different from username)
   */
  displayName?: string;
  
  /**
   * URL to the user's avatar image
   */
  avatarUrl?: string;
  
  /**
   * User's bio or status message
   */
  bio?: string;
  
  /**
   * Current online status
   */
  status?: 'ONLINE' | 'AWAY' | 'OFFLINE';
  
  /**
   * When the user was last seen online
   */
  lastSeen?: Date;
  
  /**
   * When the user account was created
   */
  createdAt?: Date;
  
  /**
   * When the user profile was last updated
   */
  updatedAt?: Date;
}
