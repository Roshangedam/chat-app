package com.chat.app.backend.feature.auth.controller;

import com.chat.app.backend.feature.auth.dto.JwtResponse;
import com.chat.app.backend.feature.auth.dto.OAuth2CallbackRequest;
import com.chat.app.backend.feature.auth.dto.RefreshTokenRequest;
import com.chat.app.backend.feature.auth.dto.TokenVerificationRequest;
import com.chat.app.backend.feature.auth.security.JwtUtils;
import com.chat.app.backend.feature.user.model.User;
import com.chat.app.backend.feature.user.service.UserService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * Controller for OAuth2 related endpoints.
 */
@RestController
@RequestMapping("/api/v1/oauth2")
public class OAuth2Controller {

    private static final Logger logger = LoggerFactory.getLogger(OAuth2Controller.class);

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private UserService userService;

    /**
     * Handle OAuth2 callback from frontend.
     *
     * @param request the OAuth2 callback request containing code and state
     * @return JWT response with token and user details
     */
    @PostMapping("/callback/google")
    public ResponseEntity<?> handleOAuth2Callback(@RequestBody OAuth2CallbackRequest request) {
        logger.debug("Received OAuth2 callback with code: {} and state: {}", request.getCode(), request.getState());

        try {
            // This endpoint is called by the frontend when it receives the code and state
            // from the OAuth2 provider.

            // In a real implementation, we would use the OAuth2 client to exchange the code
            // for an access token and then get the user info. For now, we'll use the state
            // parameter to identify the provider.

            String provider = "google"; // Default to Google as the provider
            String providerId = request.getCode(); // Use code as provider ID for now

            // Try to find user by email from state (if available)
            // In a real implementation, we would decode the state parameter or use a session
            String email = null;
            String name = null;

            // For demonstration, extract email from state if it's in email format
            if (request.getState() != null && request.getState().contains("@")) {
                email = request.getState();
                name = email.substring(0, email.indexOf('@'));
            } else {
                // Generate a random email and name if not available
                email = "user" + System.currentTimeMillis() + "@example.com";
                name = "OAuth User";
            }

            // Find or create user
            User user = null;

            // Try to find by email first
            if (email != null) {
                user = userService.findByEmail(email);
            }

            if (user == null) {
                // Create a new user
                user = new User();
                user.setUsername(name.replaceAll("\\s+", "").toLowerCase());
                user.setEmail(email);
                user.setFullName(name);
                user.setProvider(provider);
                user.setProviderId(providerId);
                user.setPassword(""); // No password for OAuth2 users

                // Save the user
                user = userService.saveUser(user);
            } else {
                // Update existing user with OAuth2 info if needed
                if (user.getProvider() == null) {
                    user.setProvider(provider);
                    user.setProviderId(providerId);
                    user = userService.saveUser(user);
                }
            }

            // Generate JWT tokens
            String accessToken = jwtUtils.generateJwtToken(user);
            String refreshToken = jwtUtils.generateRefreshToken(user);

            JwtResponse response = new JwtResponse(
                    accessToken,
                    refreshToken,
                    jwtUtils.getJwtExpirationMs() / 1000,
                    user.getId(),
                    user.getEmail(),
                    user.getUsername(),
                    user.getFullName()
            );

            logger.info("Successfully processed OAuth2 callback for user: {}", user.getUsername());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error processing OAuth2 callback: {}", e.getMessage(), e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Failed to process OAuth2 callback: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    /**
     * Verify and process a JWT token.
     *
     * @param request the token verification request
     * @return JWT response with token and user details
     */
    @PostMapping("/verify-token")
    public ResponseEntity<?> verifyToken(@RequestBody TokenVerificationRequest request) {
        logger.debug("Verifying token: {}", request.getToken().substring(0, Math.min(10, request.getToken().length())) + "...");

        try {
            // First, validate the token format and signature
            if (!jwtUtils.validateJwtToken(request.getToken())) {
                logger.warn("Invalid token format or signature");
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "Invalid token format or signature");
                return ResponseEntity.badRequest().body(errorResponse);
            }

            // Extract username from token
            String username = jwtUtils.getUserNameFromJwtToken(request.getToken());

            if (username != null) {
                // Get user details
                User user = userService.findByUsername(username);

                if (user != null) {
                    // Generate a new token pair
                    String accessToken = jwtUtils.generateJwtToken(user);
                    String refreshToken = jwtUtils.generateRefreshToken(user);

                    logger.info("Successfully verified token for user: {}", username);
                    return ResponseEntity.ok(new JwtResponse(
                            accessToken,
                            refreshToken,
                            jwtUtils.getJwtExpirationMs() / 1000,
                            user.getId(),
                            user.getEmail(),
                            user.getUsername(),
                            user.getFullName()
                    ));
                } else {
                    logger.warn("User not found for username: {}", username);
                    Map<String, Object> errorResponse = new HashMap<>();
                    errorResponse.put("success", false);
                    errorResponse.put("message", "User not found");
                    return ResponseEntity.badRequest().body(errorResponse);
                }
            } else {
                logger.warn("Could not extract username from token");
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "Invalid token content");
                return ResponseEntity.badRequest().body(errorResponse);
            }
        } catch (Exception e) {
            logger.error("Error verifying token: {}", e.getMessage(), e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Failed to verify token: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    /**
     * Refresh access token using refresh token for OAuth2 users.
     *
     * @param refreshTokenRequest the refresh token request
     * @return JWT response with new token and user details
     */
    @PostMapping("/refresh-token")
    public ResponseEntity<?> refreshToken(@Valid @RequestBody RefreshTokenRequest refreshTokenRequest) {
        logger.debug("Received OAuth2 refresh token request");

        try {
            // Validate refresh token and extract username
            String username = jwtUtils.getUserNameFromJwtToken(refreshTokenRequest.getRefreshToken());

            if (username != null) {
                // Get user details
                User user = userService.findByUsername(username);

                if (user != null) {
                    // Generate a new token pair
                    String accessToken = jwtUtils.generateJwtToken(user);
                    String refreshToken = jwtUtils.generateRefreshToken(user);

                    logger.info("Successfully refreshed token for OAuth2 user: {}", username);
                    return ResponseEntity.ok(new JwtResponse(
                            accessToken,
                            refreshToken,
                            jwtUtils.getJwtExpirationMs() / 1000,
                            user.getId(),
                            user.getEmail(),
                            user.getUsername(),
                            user.getFullName()
                    ));
                } else {
                    logger.warn("User not found for username: {}", username);
                }
            } else {
                logger.warn("Invalid refresh token provided");
            }

            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Invalid refresh token");
            return ResponseEntity.badRequest().body(errorResponse);
        } catch (Exception e) {
            logger.error("Error refreshing token: {}", e.getMessage(), e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Failed to refresh token: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }
}