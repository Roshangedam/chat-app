/**
 * Interface for user status updates sent over WebSocket
 */
export interface UserStatusUpdate {
  userId: string | number;
  username: string;
  status: string;
  lastActive?: Date | null;
}
