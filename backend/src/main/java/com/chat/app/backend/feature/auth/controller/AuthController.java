package com.chat.app.backend.feature.auth.controller;

import com.chat.app.backend.feature.auth.dto.JwtResponse;
import com.chat.app.backend.feature.auth.dto.LoginRequest;
import com.chat.app.backend.feature.auth.dto.RefreshTokenRequest;
import com.chat.app.backend.feature.auth.dto.SignupRequest;
import com.chat.app.backend.feature.auth.service.AuthService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * Controller for authentication endpoints.
 */
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    @Autowired
    private AuthService authService;

    /**
     * Authenticate user and generate JWT token.
     *
     * @param loginRequest the login request containing credentials
     * @return JWT response with token and user details
     */
    @PostMapping("/signin")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        logger.debug("Received login request for user: {}", loginRequest.getUsernameOrEmail());
        try {
            JwtResponse jwtResponse = authService.authenticateUser(loginRequest);
            logger.info("User successfully authenticated: {}", loginRequest.getUsernameOrEmail());
            return ResponseEntity.ok(jwtResponse);
        } catch (Exception e) {
            logger.error("Authentication failed: {}", e.getMessage(), e);
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Authentication failed: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    /**
     * Register a new user.
     *
     * @param signupRequest the signup request containing user details
     * @return success message if registration is successful, error message otherwise
     */
    @PostMapping("/signup")
    public ResponseEntity<?> registerUser(@Valid @RequestBody SignupRequest signupRequest) {
        logger.debug("Received registration request for username: {} and email: {}",
                signupRequest.getUsername(), signupRequest.getEmail());

        Map<String, Object> response = new HashMap<>();

        try {
            // Check if registration is successful
            if (authService.registerUser(signupRequest)) {
                logger.info("User registered successfully: {}", signupRequest.getUsername());
                response.put("success", true);
                response.put("message", "User registered successfully!");
                return ResponseEntity.ok(response);
            } else {
                logger.warn("Registration failed: Username or email already exists: {}, {}",
                        signupRequest.getUsername(), signupRequest.getEmail());
                response.put("success", false);
                response.put("message", "Username or email is already taken!");
                return ResponseEntity.badRequest().body(response);
            }
        } catch (Exception e) {
            logger.error("Registration failed with exception: {}", e.getMessage(), e);
            response.put("success", false);
            response.put("message", "Registration failed: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    /**
     * Refresh access token using refresh token.
     *
     * @param refreshTokenRequest the refresh token request
     * @return JWT response with new token and user details
     */
    @PostMapping("/refresh-token")
    public ResponseEntity<?> refreshToken(@Valid @RequestBody RefreshTokenRequest refreshTokenRequest) {
        logger.debug("Received refresh token request");

        try {
            JwtResponse jwtResponse = authService.refreshToken(refreshTokenRequest.getRefreshToken());
            logger.info("Token refreshed successfully");
            return ResponseEntity.ok(jwtResponse);
        } catch (Exception e) {
            logger.error("Token refresh failed: {}", e.getMessage(), e);
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Token refresh failed: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
}