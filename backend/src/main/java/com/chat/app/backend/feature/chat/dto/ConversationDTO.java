package com.chat.app.backend.feature.chat.dto;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

import com.chat.app.backend.feature.user.dto.UserDTO;

/**
 * Data Transfer Object for Conversation entity.
 * Used for transferring conversation data between the client and server without exposing entity relationships.
 */
public class ConversationDTO {

    private Long id;
    private String name;
    private String description;
    private String avatarUrl;
    private boolean isGroupChat;
    private Set<UserDTO> participants = new HashSet<>();
    private Long creatorId;
    private String creatorUsername;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private MessageDTO lastMessage;
    private int unreadCount;

    // Default constructor
    public ConversationDTO() {
    }

    // Constructor with required fields
    public ConversationDTO(Long id, String name, boolean isGroupChat) {
        this.id = id;
        this.name = name;
        this.isGroupChat = isGroupChat;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public boolean isGroupChat() {
        return isGroupChat;
    }

    public void setGroupChat(boolean groupChat) {
        isGroupChat = groupChat;
    }

    public Set<UserDTO> getParticipants() {
        return participants;
    }

    public void setParticipants(Set<UserDTO> participants) {
        this.participants = participants;
    }

    public Long getCreatorId() {
        return creatorId;
    }

    public void setCreatorId(Long creatorId) {
        this.creatorId = creatorId;
    }

    public String getCreatorUsername() {
        return creatorUsername;
    }

    public void setCreatorUsername(String creatorUsername) {
        this.creatorUsername = creatorUsername;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public MessageDTO getLastMessage() {
        return lastMessage;
    }

    public void setLastMessage(MessageDTO lastMessage) {
        this.lastMessage = lastMessage;
    }

    public int getUnreadCount() {
        return unreadCount;
    }

    public void setUnreadCount(int unreadCount) {
        this.unreadCount = unreadCount;
    }

    // Helper methods
    public void addParticipant(UserDTO participant) {
        this.participants.add(participant);
    }

    public void removeParticipant(UserDTO participant) {
        this.participants.remove(participant);
    }
}