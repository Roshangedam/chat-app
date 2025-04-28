package com.chat.app.backend.feature.chat.model;

/**
 * Enum representing the possible status values for a message in the chat application.
 */
public enum MessageStatus {
    PENDING,    // Message is waiting to be sent (e.g., due to network issues)
    SENT,       // Message has been sent by the sender
    DELIVERED,  // Message has been delivered to the recipient's device
    READ,       // Message has been read by the recipient
    FAILED      // Message failed to send after multiple retry attempts
}