package com.chat.app.backend.feature.user.controller;

import com.chat.app.backend.feature.user.dto.UserDTO;
import com.chat.app.backend.feature.user.model.User;
import com.chat.app.backend.feature.user.model.UserStatus;
import com.chat.app.backend.feature.user.repository.UserRepository;
import com.chat.app.backend.feature.auth.security.UserDetailsImpl;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * REST Controller for user operations.
 * Provides endpoints for managing users.
 */
@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    /**
     * Get all users except the current user.
     *
     * @param userDetails the authenticated user details
     * @return a list of user DTOs
     */
    @GetMapping
    public ResponseEntity<List<UserDTO>> getAllUsers(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        Long currentUserId = userDetails.getId();

        List<User> users = userRepository.findAll().stream()
                .filter(user -> !user.getId().equals(currentUserId))
                .collect(Collectors.toList());

        List<UserDTO> userDTOs = users.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());

        return ResponseEntity.ok(userDTOs);
    }

    /**
     * Get a specific user by ID.
     *
     * @param userId the user ID
     * @return the user DTO
     */
    @GetMapping("/{userId}")
    public ResponseEntity<UserDTO> getUserById(@PathVariable Long userId) {
        Optional<User> userOpt = userRepository.findById(userId);

        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        UserDTO userDTO = convertToDTO(userOpt.get());
        return ResponseEntity.ok(userDTO);
    }

    /**
     * Search for users by username.
     *
     * @param query the search query
     * @param userDetails the authenticated user details
     * @return a list of matching user DTOs
     */
    @GetMapping("/search")
    public ResponseEntity<List<UserDTO>> searchUsers(
            @RequestParam String query,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        Long currentUserId = userDetails.getId();

        List<User> users = userRepository.findByUsernameContainingIgnoreCase(query).stream()
                .filter(user -> !user.getId().equals(currentUserId))
                .collect(Collectors.toList());

        List<UserDTO> userDTOs = users.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());

        return ResponseEntity.ok(userDTOs);
    }

    /**
     * Update the current user's status.
     *
     * @param status the new status
     * @param userDetails the authenticated user details
     * @return the updated user DTO
     */
    @PutMapping("/status")
    public ResponseEntity<UserDTO> updateStatus(
            @RequestBody StatusUpdateRequest status,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        Long userId = userDetails.getId();
        Optional<User> userOpt = userRepository.findById(userId);

        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        User user = userOpt.get();
        user.setStatus(status.getStatus());
        user.setLastActive(LocalDateTime.now());

        User savedUser = userRepository.save(user);
        UserDTO userDTO = convertToDTO(savedUser);

        // Broadcast status update to all connected clients
        messagingTemplate.convertAndSend("/topic/user.status",
            new com.chat.app.backend.feature.user.dto.UserStatusDTO(
                savedUser.getId(),
                savedUser.getUsername(),
                savedUser.getStatus()
            )
        );

        return ResponseEntity.ok(userDTO);
    }

    /**
     * Convert a User entity to a UserDTO.
     *
     * @param user the user entity
     * @return the user DTO
     */
    private UserDTO convertToDTO(User user) {
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setFullName(user.getFullName());
        dto.setAvatarUrl(user.getAvatarUrl());
        dto.setBio(user.getBio());
        dto.setStatus(user.getStatus());
        dto.setLastActive(user.getLastActive());
        dto.setCreatedAt(user.getCreatedAt());
        dto.setUpdatedAt(user.getUpdatedAt());

        return dto;
    }

    /**
     * Request class for updating user status.
     */
    public static class StatusUpdateRequest {
        private UserStatus status;

        public UserStatus getStatus() {
            return status;
        }

        public void setStatus(UserStatus status) {
            this.status = status;
        }
    }

    /**
     * Set the current user's status to OFFLINE when logging out.
     *
     * @param userDetails the authenticated user details
     * @return success message
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.badRequest().body("User not authenticated");
        }

        Long userId = userDetails.getId();
        Optional<User> userOpt = userRepository.findById(userId);

        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        User user = userOpt.get();
        user.setStatus(UserStatus.OFFLINE);
        user.setLastActive(LocalDateTime.now());

        User savedUser = userRepository.save(user);

        // Broadcast status update to all connected clients
        messagingTemplate.convertAndSend("/topic/user.status",
            new com.chat.app.backend.feature.user.dto.UserStatusDTO(
                savedUser.getId(),
                savedUser.getUsername(),
                UserStatus.OFFLINE
            )
        );

        return ResponseEntity.ok().body("Logged out successfully");
    }
}
