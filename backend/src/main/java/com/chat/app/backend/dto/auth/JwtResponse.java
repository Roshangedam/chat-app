package com.chat.app.backend.dto.auth;

import java.util.List;

/**
 * Data Transfer Object for JWT authentication response.
 */
public class JwtResponse {
    private String token;
    private String refreshToken;
    private String type = "Bearer";
    private int expiresIn;
    private Long id;
    private String username;
    private String email;
    private String fullName;
    private List<String> roles;

    /**
     * Constructor with all fields.
     *
     * @param token the JWT token
     * @param id the user ID
     * @param username the username
     * @param email the user email
     * @param fullName the user's full name
     * @param roles the user's roles
     */
    public JwtResponse(String token, Long id, String username, String email, String fullName, List<String> roles) {
        this.token = token;
        this.id = id;
        this.username = username;
        this.email = email;
        this.fullName = fullName;
        this.roles = roles;
    }

    /**
     * Constructor with refresh token and expiration.
     *
     * @param token the JWT token
     * @param refreshToken the refresh token
     * @param expiresIn the token expiration time in seconds
     * @param id the user ID
     * @param email the user email
     * @param username the username
     * @param fullName the user's full name
     */
    public JwtResponse(String token, String refreshToken, int expiresIn, Long id, String email, String username, String fullName) {
        this.token = token;
        this.refreshToken = refreshToken;
        this.expiresIn = expiresIn;
        this.id = id;
        this.email = email;
        this.username = username;
        this.fullName = fullName;
    }

    // Getters and Setters
    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public List<String> getRoles() {
        return roles;
    }

    public void setRoles(List<String> roles) {
        this.roles = roles;
    }

    public String getRefreshToken() {
        return refreshToken;
    }

    public void setRefreshToken(String refreshToken) {
        this.refreshToken = refreshToken;
    }

    public int getExpiresIn() {
        return expiresIn;
    }

    public void setExpiresIn(int expiresIn) {
        this.expiresIn = expiresIn;
    }
}