package com.chat.app.backend.feature.auth.dto;

/**
 * Data Transfer Object for token verification request.
 */
public class TokenVerificationRequest {
    private String token;

    public TokenVerificationRequest() {
    }

    public TokenVerificationRequest(String token) {
        this.token = token;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }
}