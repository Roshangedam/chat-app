package com.chat.app.backend.model;

/**
 * Enum representing the possible status values for a message in the chat application.
 */
public enum MessageStatus {
    SENT,       // Message has been sent by the sender
    DELIVERED,  // Message has been delivered to the recipient's device
    READ        // Message has been read by the recipient
}