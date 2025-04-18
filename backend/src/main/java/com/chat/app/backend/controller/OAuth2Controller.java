package com.chat.app.backend.controller;

import com.chat.app.backend.dto.auth.JwtResponse;
import com.chat.app.backend.dto.auth.OAuth2CallbackRequest;
import com.chat.app.backend.dto.auth.TokenVerificationRequest;
import com.chat.app.backend.model.User;
import com.chat.app.backend.security.jwt.JwtUtils;
import com.chat.app.backend.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Controller for OAuth2 related endpoints.
 */
@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/auth")
public class OAuth2Controller {

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
    @PostMapping("/oauth2/callback")
    public ResponseEntity<?> handleOAuth2Callback(@RequestBody OAuth2CallbackRequest request) {
        // This endpoint would be called by the frontend when it receives the code and state
        // from the OAuth2 provider. In a real implementation, you would exchange the code
        // for an access token and then get the user info.
        
        // For now, we'll just return a mock response
        return ResponseEntity.ok(new JwtResponse(
                "mock_access_token",
                "mock_refresh_token",
                3600,
                1L,
                "user@example.com",
                "username",
                "User Name"
        ));
    }

    /**
     * Verify and process a JWT token.
     *
     * @param request the token verification request
     * @return JWT response with token and user details
     */
    @PostMapping("/verify-token")
    public ResponseEntity<?> verifyToken(@RequestBody TokenVerificationRequest request) {
        // Validate the token
        String username = jwtUtils.getUserNameFromJwtToken(request.getToken());
        
        if (username != null) {
            // Get user details
            User user = userService.findByUsername(username);
            
            if (user != null) {
                // Generate a new token pair
                String accessToken = jwtUtils.generateJwtToken(user);
                String refreshToken = jwtUtils.generateRefreshToken(user);
                
                return ResponseEntity.ok(new JwtResponse(
                        accessToken,
                        refreshToken,
                        jwtUtils.getJwtExpirationMs() / 1000,
                        user.getId(),
                        user.getEmail(),
                        user.getUsername(),
                        user.getFullName()
                ));
            }
        }
        
        return ResponseEntity.badRequest().body("Invalid token");
    }
}