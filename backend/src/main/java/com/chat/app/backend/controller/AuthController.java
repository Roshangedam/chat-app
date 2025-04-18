package com.chat.app.backend.controller;

import com.chat.app.backend.dto.auth.JwtResponse;
import com.chat.app.backend.dto.auth.LoginRequest;
import com.chat.app.backend.dto.auth.SignupRequest;
import com.chat.app.backend.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * Controller for authentication endpoints.
 */
@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/auth")
public class AuthController {

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
        JwtResponse jwtResponse = authService.authenticateUser(loginRequest);
        return ResponseEntity.ok(jwtResponse);
    }

    /**
     * Register a new user.
     *
     * @param signupRequest the signup request containing user details
     * @return success message if registration is successful, error message otherwise
     */
    @PostMapping("/signup")
    public ResponseEntity<?> registerUser(@Valid @RequestBody SignupRequest signupRequest) {
        Map<String, Object> response = new HashMap<>();
        
        // Check if registration is successful
        if (authService.registerUser(signupRequest)) {
            response.put("success", true);
            response.put("message", "User registered successfully!");
            return ResponseEntity.ok(response);
        } else {
            response.put("success", false);
            response.put("message", "Username or email is already taken!");
            return ResponseEntity.badRequest().body(response);
        }
    }
}