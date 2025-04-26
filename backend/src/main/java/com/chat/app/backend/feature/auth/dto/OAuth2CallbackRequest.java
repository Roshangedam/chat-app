package com.chat.app.backend.feature.auth.dto;

/**
 * Data Transfer Object for OAuth2 callback request.
 */
public class OAuth2CallbackRequest {
    private String code;
    private String state;

    public OAuth2CallbackRequest() {
    }

    public OAuth2CallbackRequest(String code, String state) {
        this.code = code;
        this.state = state;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getState() {
        return state;
    }

    public void setState(String state) {
        this.state = state;
    }
}