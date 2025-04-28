-- Add retry_count column to messages table
ALTER TABLE messages ADD COLUMN retry_count INT DEFAULT 0 NOT NULL;
