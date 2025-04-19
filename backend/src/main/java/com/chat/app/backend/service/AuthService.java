package com.chat.app.backend.service;

import com.chat.app.backend.dto.auth.JwtResponse;
import com.chat.app.backend.dto.auth.LoginRequest;
import com.chat.app.backend.dto.auth.SignupRequest;
import com.chat.app.backend.model.Role;
import com.chat.app.backend.model.User;
import com.chat.app.backend.repository.RoleRepository;
import com.chat.app.backend.repository.UserRepository;
import com.chat.app.backend.security.jwt.JwtUtils;
import com.chat.app.backend.security.jwt.UserDetailsImpl;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

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
            
            // Get user roles
            List<String> roles = userDetails.getAuthorities().stream()
                    .map(item -> item.getAuthority())
                    .collect(Collectors.toList());

            logger.info("User authenticated successfully: {}", userDetails.getUsername());
            
            // Return JWT response with token and user details
            return new JwtResponse(
                    jwt,
                    userDetails.getId(),
                    userDetails.getUsername(),
                    userDetails.getEmail(),
                    userDetails.getFullName(),
                    roles);
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
}