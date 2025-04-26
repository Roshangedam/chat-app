package com.chat.app.backend.feature.chat.dto;

import com.chat.app.backend.feature.chat.model.MessageStatus;
import java.time.LocalDateTime;

/**
 * Data Transfer Object for Message entity.
 * Used for transferring message data between the client and server without exposing entity relationships.
 */
public class MessageDTO {

    private Long id;
    private Long senderId;
    private String senderUsername;
    private String senderAvatarUrl;
    private Long conversationId;
    private String content;
    private LocalDateTime sentAt;
    private LocalDateTime deliveredAt;
    private LocalDateTime readAt;
    private MessageStatus status;

    // Default constructor
    public MessageDTO() {
    }

    // Constructor with required fields
    public MessageDTO(Long id, Long senderId, String senderUsername, Long conversationId, String content, LocalDateTime sentAt, MessageStatus status) {
        this.id = id;
        this.senderId = senderId;
        this.senderUsername = senderUsername;
        this.conversationId = conversationId;
        this.content = content;
        this.sentAt = sentAt;
        this.status = status;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getSenderId() {
        return senderId;
    }

    public void setSenderId(Long senderId) {
        this.senderId = senderId;
    }

    public String getSenderUsername() {
        return senderUsername;
    }

    public void setSenderUsername(String senderUsername) {
        this.senderUsername = senderUsername;
    }

    public String getSenderAvatarUrl() {
        return senderAvatarUrl;
    }

    public void setSenderAvatarUrl(String senderAvatarUrl) {
        this.senderAvatarUrl = senderAvatarUrl;
    }

    public Long getConversationId() {
        return conversationId;
    }

    public void setConversationId(Long conversationId) {
        this.conversationId = conversationId;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public LocalDateTime getSentAt() {
        return sentAt;
    }

    public void setSentAt(LocalDateTime sentAt) {
        this.sentAt = sentAt;
    }

    public LocalDateTime getDeliveredAt() {
        return deliveredAt;
    }

    public void setDeliveredAt(LocalDateTime deliveredAt) {
        this.deliveredAt = deliveredAt;
    }

    public LocalDateTime getReadAt() {
        return readAt;
    }

    public void setReadAt(LocalDateTime readAt) {
        this.readAt = readAt;
    }

    public MessageStatus getStatus() {
        return status;
    }

    public void setStatus(MessageStatus status) {
        this.status = status;
    }
}