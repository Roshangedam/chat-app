package com.chat.app.backend.feature.user.controller;



import java.time.LocalDateTime;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

import com.chat.app.backend.feature.auth.security.UserDetailsImpl;
import com.chat.app.backend.feature.chat.service.MessageSyncService;
import com.chat.app.backend.feature.user.dto.UserStatusDTO;
import com.chat.app.backend.feature.user.model.User;
import com.chat.app.backend.feature.user.repository.UserRepository;

/**
 * Controller for handling user status WebSocket messages.
 */
@Controller
public class UserStatusController {

    private static final Logger logger = LoggerFactory.getLogger(UserStatusController.class);

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private MessageSyncService messageSyncService;

    /**
     * Handle user status update messages.
     *
     * @param statusDTO the status data
     * @param authentication the authentication object containing user details
     */
    @MessageMapping("/user.status")
    public void handleStatusUpdate(@Payload UserStatusDTO statusDTO, Authentication authentication) {
        if (authentication == null) {
            logger.error("Authentication is null in handleStatusUpdate");
            return;
        }

        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            Long userId = userDetails.getId();

            // Update user status in database
            Optional<User> userOpt = userRepository.findById(userId);
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                user.setStatus(statusDTO.getStatus());
                user.setLastActive(LocalDateTime.now());
                userRepository.save(user);

                // Create status update DTO for broadcasting
                UserStatusDTO broadcastStatus = new UserStatusDTO();
                broadcastStatus.setUserId(userId);
                broadcastStatus.setUsername(user.getUsername());
                broadcastStatus.setStatus(statusDTO.getStatus());
                broadcastStatus.setLastActive(LocalDateTime.now());

                // Broadcast to all users
                messagingTemplate.convertAndSend("/topic/user.status", broadcastStatus);

                // If user is coming online, process pending messages
                if ("ONLINE".equals(statusDTO.getStatus().toString())) {
                    logger.info("User {} is now online, processing pending messages", user.getUsername());
                    messageSyncService.processPendingMessagesForUser(userId);
                }

                logger.info("User status updated: {} -> {}", user.getUsername(), statusDTO.getStatus());
            } else {
                logger.warn("User not found for ID: {}", userId);
            }
        } catch (Exception e) {
            logger.error("Error in handleStatusUpdate: {}", e.getMessage(), e);
        }
    }
}
