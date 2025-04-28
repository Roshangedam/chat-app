package com.chat.app.backend.feature.auth.service;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.chat.app.backend.feature.auth.dto.JwtResponse;
import com.chat.app.backend.feature.auth.dto.LoginRequest;
import com.chat.app.backend.feature.auth.dto.SignupRequest;
import com.chat.app.backend.feature.auth.security.JwtUtils;
import com.chat.app.backend.feature.auth.security.UserDetailsImpl;
import com.chat.app.backend.feature.chat.service.MessageSyncService;
import com.chat.app.backend.feature.user.model.Role;
import com.chat.app.backend.feature.user.model.User;
import com.chat.app.backend.feature.user.model.UserStatus;
import com.chat.app.backend.feature.user.repository.RoleRepository;
import com.chat.app.backend.feature.user.repository.UserRepository;

/**
 * Service for authentication operations.
 */
@Service
public class AuthService {

    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder encoder;

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private MessageSyncService messageSyncService;

    /**
     * Authenticate a user and generate a JWT token.
     *
     * @param loginRequest the login request containing credentials
     * @return JWT response with token and user details
     */
    public JwtResponse authenticateUser(LoginRequest loginRequest) {
        logger.debug("Attempting to authenticate user: {}", loginRequest.getUsernameOrEmail());

        try {
            // Authenticate the user
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(loginRequest.getUsernameOrEmail(), loginRequest.getPassword()));

            // Set the authentication in the security context
            SecurityContextHolder.getContext().setAuthentication(authentication);

            // Generate JWT token
            String jwt = jwtUtils.generateJwtToken(authentication);

            // Get user details from the authentication object
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

            // Get user from repository to generate refresh token
            User user = userRepository.findByUsername(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Update user status to ONLINE
            user.setStatus(UserStatus.ONLINE);
            user.setLastActive(LocalDateTime.now());
            user = userRepository.save(user);

            // Broadcast status update to all connected clients
            messagingTemplate.convertAndSend("/topic/user.status",
                new com.chat.app.backend.feature.user.dto.UserStatusDTO(
                    user.getId(),
                    user.getUsername(),
                    UserStatus.ONLINE
                )
            );

            // Process any pending messages for this user
            messageSyncService.processPendingMessagesForUser(user.getId());

            // Generate refresh token
            String refreshToken = jwtUtils.generateRefreshToken(user);

            logger.info("User authenticated successfully: {}", userDetails.getUsername());

            // Return JWT response with token and user details
            return new JwtResponse(
                    jwt,
                    refreshToken,
                    jwtUtils.getJwtExpirationMs() / 1000,
                    userDetails.getId(),
                    userDetails.getEmail(),
                    userDetails.getUsername(),
                    userDetails.getFullName());
        } catch (Exception e) {
            logger.error("Authentication failed for user: {}", loginRequest.getUsernameOrEmail(), e);
            throw e;
        }
    }

    /**
     * Register a new user.
     *
     * @param signupRequest the signup request containing user details
     * @return true if registration is successful, false otherwise
     */
    public boolean registerUser(SignupRequest signupRequest) {
        logger.debug("Attempting to register new user with username: {} and email: {}",
                signupRequest.getUsername(), signupRequest.getEmail());

        try {
            // Check if username already exists
            if (userRepository.existsByUsername(signupRequest.getUsername())) {
                logger.warn("Registration failed: Username {} already exists", signupRequest.getUsername());
                return false;
            }

            // Check if email already exists
            if (userRepository.existsByEmail(signupRequest.getEmail())) {
                logger.warn("Registration failed: Email {} already exists", signupRequest.getEmail());
                return false;
            }

            // Create new user
            User user = new User(
                    signupRequest.getUsername(),
                    signupRequest.getEmail(),
                    encoder.encode(signupRequest.getPassword()));

            // Set full name if provided
            user.setFullName(signupRequest.getFullName());

            // Set creation and update timestamps
            LocalDateTime now = LocalDateTime.now();
            user.setCreatedAt(now);
            user.setUpdatedAt(now);

            // Assign default role (USER)
            Set<Role> roles = new HashSet<>();
            Role userRole = roleRepository.findByName("ROLE_USER")
                    .orElseThrow(() -> {
                        logger.error("Role ROLE_USER not found in database");
                        return new RuntimeException("Error: Role is not found.");
                    });
            roles.add(userRole);
            user.setRoles(roles);

            // Save user to database
            userRepository.save(user);

            logger.info("User registered successfully: {}", user.getUsername());
            return true;
        } catch (Exception e) {
            logger.error("Error during user registration: {}", e.getMessage(), e);
            throw e;
        }
    }

    /**
     * Refresh access token using refresh token.
     *
     * @param refreshToken the refresh token
     * @return JWT response with new token and user details
     */
    public JwtResponse refreshToken(String refreshToken) {
        logger.debug("Attempting to refresh token");

        try {
            // Validate refresh token and extract username
            String username = jwtUtils.getUserNameFromJwtToken(refreshToken);

            if (username == null) {
                logger.error("Invalid refresh token");
                throw new RuntimeException("Invalid refresh token");
            }

            // Get user details
            User user = userRepository.findByUsername(username)
                    .orElseThrow(() -> {
                        logger.error("User not found for refresh token");
                        return new RuntimeException("User not found for refresh token");
                    });

            // Generate new access token
            String accessToken = jwtUtils.generateJwtToken(user);

            // Generate new refresh token
            String newRefreshToken = jwtUtils.generateRefreshToken(user);

            logger.info("Token refreshed successfully for user: {}", username);

            // Return JWT response with new tokens and user details
            return new JwtResponse(
                    accessToken,
                    newRefreshToken,
                    jwtUtils.getJwtExpirationMs() / 1000,
                    user.getId(),
                    user.getEmail(),
                    user.getUsername(),
                    user.getFullName());
        } catch (Exception e) {
            logger.error("Token refresh failed: {}", e.getMessage(), e);
            throw e;
        }
    }
}