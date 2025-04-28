package com.chat.app.backend.feature.user.dto;

import java.time.LocalDateTime;

import com.chat.app.backend.feature.user.model.UserStatus;

/**
 * Data Transfer Object for user status updates.
 */
public class UserStatusDTO {

    private Long userId;
    private String username;
    private UserStatus status;
    private LocalDateTime lastActive;

    // Default constructor
    public UserStatusDTO() {
    }

    // Constructor with required fields
    public UserStatusDTO(Long userId, String username, UserStatus status) {
        this.userId = userId;
        this.username = username;
        this.status = status;
        this.lastActive = LocalDateTime.now(); // Default to current time
    }

    // Constructor with all fields including lastActive
    public UserStatusDTO(Long userId, String username, UserStatus status, LocalDateTime lastActive) {
        this.userId = userId;
        this.username = username;
        this.status = status;
        this.lastActive = lastActive != null ? lastActive : LocalDateTime.now();
    }

    // Getters and Setters
    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public UserStatus getStatus() {
        return status;
    }

    public void setStatus(UserStatus status) {
        this.status = status;
    }

    public LocalDateTime getLastActive() {
        return lastActive;
    }

    public void setLastActive(LocalDateTime lastActive) {
        this.lastActive = lastActive;
    }
}
