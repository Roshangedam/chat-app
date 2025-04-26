package com.chat.app.backend.feature.chat.dto;

/**
 * Data Transfer Object for typing indicator messages.
 * Used for transferring typing status between clients.
 */
public class TypingIndicatorDTO {

    private Long conversationId;
    private String username;
    private boolean isTyping;

    // Default constructor
    public TypingIndicatorDTO() {
    }

    // Constructor with required fields
    public TypingIndicatorDTO(Long conversationId, String username, boolean isTyping) {
        this.conversationId = conversationId;
        this.username = username;
        this.isTyping = isTyping;
    }

    // Getters and Setters
    public Long getConversationId() {
        return conversationId;
    }

    public void setConversationId(Long conversationId) {
        this.conversationId = conversationId;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public boolean isTyping() {
        return isTyping;
    }

    public void setTyping(boolean typing) {
        isTyping = typing;
    }
}
