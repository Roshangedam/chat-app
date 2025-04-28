package com.chat.app.backend.feature.chat.controller;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

import com.chat.app.backend.feature.auth.security.UserDetailsImpl;
import com.chat.app.backend.feature.chat.dto.SyncRequestDTO;
import com.chat.app.backend.feature.chat.service.MessageSyncService;

/**
 * Controller for handling message synchronization when clients reconnect.
 */
@Controller
public class ChatSyncController {

    private static final Logger logger = LoggerFactory.getLogger(ChatSyncController.class);

    @Autowired
    private MessageSyncService messageSyncService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    /**
     * Handle client reconnection and synchronize messages.
     *
     * @param syncRequest the synchronization request containing the last sync timestamp
     * @param authentication the authentication object containing user details
     */
    @MessageMapping("/chat.sync")
    public void synchronizeMessages(@Payload SyncRequestDTO syncRequest, Authentication authentication) {
        if (authentication == null) {
            logger.error("Authentication is null in synchronizeMessages");
            return;
        }

        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            Long userId = userDetails.getId();

            logger.info("Received sync request from user {}: lastSyncTimestamp={}",
                    userId, syncRequest.getLastSyncTimestamp());

            // Convert timestamp to LocalDateTime
            LocalDateTime lastSyncTime = null;
            if (syncRequest.getLastSyncTimestamp() != null && syncRequest.getLastSyncTimestamp() > 0) {
                lastSyncTime = LocalDateTime.ofEpochSecond(
                        syncRequest.getLastSyncTimestamp() / 1000,
                        (int) ((syncRequest.getLastSyncTimestamp() % 1000) * 1000000),
                        ZoneOffset.UTC);
            } else {
                // If no timestamp provided, use a recent time (e.g., 1 hour ago)
                lastSyncTime = LocalDateTime.now().minusHours(1);
            }

            // Process pending messages for the user who just came online
            messageSyncService.processPendingMessagesForUser(userId);

            // Synchronize messages since the last sync time
            int syncedCount = messageSyncService.synchronizeMessages(userId, lastSyncTime);

            // Send sync complete notification
            Map<String, Object> syncResponse = new HashMap<>();
            syncResponse.put("status", "complete");
            syncResponse.put("syncedCount", syncedCount);
            syncResponse.put("timestamp", System.currentTimeMillis());

            String destination = "/queue/user." + userId + ".sync";
            messagingTemplate.convertAndSend(destination, syncResponse);

            logger.info("Sync completed for user {}: {} messages synchronized", userId, syncedCount);
        } catch (Exception e) {
            logger.error("Error in synchronizeMessages: {}", e.getMessage(), e);
        }
    }
}
