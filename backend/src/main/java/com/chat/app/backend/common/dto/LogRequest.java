package com.chat.app.backend.common.dto;


import java.time.LocalDateTime;

/**
 * Data Transfer Object for Log entity.
 * Used for transferring user data between the client and server without exposing entity relationships.
 */
public class LogRequest {

    private String level;
    private String message;
    private String exception;
    private LocalDateTime timestamp;

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }

    public String getException() {
        return exception;
    }

    public void setException(String exception) {
        this.exception = exception;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getLevel() {
        return level;
    }

    public void setLevel(String level) {
        this.level = level;
    }

    @Override
    public String toString() {
        return "LogRequest{" +
                "level='" + level + '\'' +
                ", message='" + message + '\'' +
                ", exception='" + exception + '\'' +
                ", timestamp=" + timestamp +
                '}';
    }
}
