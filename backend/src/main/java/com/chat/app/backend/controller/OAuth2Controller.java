package com.chat.app.backend.controller;

import com.chat.app.backend.dto.auth.JwtResponse;
import com.chat.app.backend.dto.auth.OAuth2CallbackRequest;
import com.chat.app.backend.dto.auth.TokenVerificationRequest;
import com.chat.app.backend.model.User;
import com.chat.app.backend.security.jwt.JwtUtils;
import com.chat.app.backend.service.UserService;
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
@RequestMapping("/api/oauth2")
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
            
            // For now, we'll just return a mock response
            JwtResponse response = new JwtResponse(
                    "mock_access_token",
                    "mock_refresh_token",
                    3600,
                    1L,
                    "user@example.com",
                    "username",
                    "User Name"
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
}