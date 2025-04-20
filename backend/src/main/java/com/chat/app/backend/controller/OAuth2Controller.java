package com.chat.app.backend.controller;

import com.chat.app.backend.dto.auth.JwtResponse;
import com.chat.app.backend.dto.auth.OAuth2CallbackRequest;
import com.chat.app.backend.dto.auth.RefreshTokenRequest;
import com.chat.app.backend.dto.auth.TokenVerificationRequest;
import com.chat.app.backend.model.User;
import com.chat.app.backend.security.jwt.JwtUtils;
import com.chat.app.backend.service.UserService;
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
@CrossOrigin(origins = "*", maxAge = 3600)
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
    @PostMapping("/callback")
    public ResponseEntity<?> handleOAuth2Callback(@RequestBody OAuth2CallbackRequest request) {
        logger.debug("Received OAuth2 callback with code: {} and state: {}", request.getCode(), request.getState());
        
        try {
            // This endpoint would be called by the frontend when it receives the code and state
            // from the OAuth2 provider. In a real implementation, you would exchange the code
            // for an access token and then get the user info.
            
            // For demonstration purposes, we'll simulate getting a user from the OAuth2 provider
            // In a real implementation, you would use the code to get an access token and then user info
            User user = userService.findByUsername("oauth2user");
            
            if (user == null) {
                // Create a mock OAuth2 user if not found
                // In a real implementation, you would create a user based on the OAuth2 provider's user info
                user = new User();
                user.setId(1L);
                user.setUsername("oauth2user");
                user.setEmail("oauth2user@example.com");
                user.setFullName("OAuth2 User");
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
            
            logger.info("Successfully processed OAuth2 callback for code: {}", request.getCode());
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
            // Validate the token
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
                }
            } else {
                logger.warn("Invalid token provided");
            }
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Invalid token");
            return ResponseEntity.badRequest().body(errorResponse);
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