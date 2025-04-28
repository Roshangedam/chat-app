package com.chat.app.backend.feature.chat.dto;

/**
 * Data Transfer Object for message synchronization requests.
 * Used when clients reconnect and need to synchronize missed messages.
 */
public class SyncRequestDTO {

    private Long lastSyncTimestamp;
    private String clientId;

    // Default constructor
    public SyncRequestDTO() {
    }

    // Constructor with required fields
    public SyncRequestDTO(Long lastSyncTimestamp, String clientId) {
        this.lastSyncTimestamp = lastSyncTimestamp;
        this.clientId = clientId;
    }

    // Getters and Setters
    public Long getLastSyncTimestamp() {
        return lastSyncTimestamp;
    }

    public void setLastSyncTimestamp(Long lastSyncTimestamp) {
        this.lastSyncTimestamp = lastSyncTimestamp;
    }

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }
}
