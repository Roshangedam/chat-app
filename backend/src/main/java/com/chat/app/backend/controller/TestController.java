package com.chat.app.backend.controller;

import com.chat.app.backend.security.jwt.UserDetailsImpl;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/**
 * Test controller for debugging authentication issues.
 */
@RestController
@RequestMapping("/api/v1/test")
public class TestController {

    private static final Logger logger = LoggerFactory.getLogger(TestController.class);

    /**
     * Public endpoint that doesn't require authentication.
     *
     * @return a simple message
     */
    @GetMapping("/public")
    public ResponseEntity<Map<String, Object>> publicEndpoint() {
        logger.debug("Public endpoint accessed");
        
        Map<String, Object> response = new HashMap<>();
        response.put("message", "This is a public endpoint");
        response.put("timestamp", System.currentTimeMillis());
        
        return ResponseEntity.ok(response);
    }

    /**
     * Protected endpoint that requires authentication.
     *
     * @param userDetails the authenticated user details
     * @return user information if authenticated
     */
    @GetMapping("/protected")
    public ResponseEntity<Map<String, Object>> protectedEndpoint(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        logger.debug("Protected endpoint accessed by user: {}", userDetails != null ? userDetails.getUsername() : "unknown");
        
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        logger.debug("Authentication object: {}", auth);
        
        Map<String, Object> response = new HashMap<>();
        response.put("message", "This is a protected endpoint");
        response.put("authenticated", true);
        response.put("timestamp", System.currentTimeMillis());
        
        if (userDetails != null) {
            response.put("username", userDetails.getUsername());
            response.put("userId", userDetails.getId());
            response.put("email", userDetails.getEmail());
        } else {
            response.put("error", "User details not available");
        }
        
        return ResponseEntity.ok(response);
    }

    /**
     * Endpoint to check authentication details.
     *
     * @return authentication information
     */
    @GetMapping("/auth-check")
    public ResponseEntity<Map<String, Object>> authCheck() {
        logger.debug("Auth check endpoint accessed");
        
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        
        Map<String, Object> response = new HashMap<>();
        response.put("timestamp", System.currentTimeMillis());
        
        if (auth != null) {
            response.put("authenticated", auth.isAuthenticated());
            response.put("principal", auth.getPrincipal().toString());
            response.put("authorities", auth.getAuthorities().toString());
            response.put("details", auth.getDetails() != null ? auth.getDetails().toString() : null);
            response.put("name", auth.getName());
        } else {
            response.put("authenticated", false);
            response.put("error", "No authentication object found");
        }
        
        return ResponseEntity.ok(response);
    }
}
