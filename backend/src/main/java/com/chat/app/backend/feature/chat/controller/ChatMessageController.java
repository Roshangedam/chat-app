package com.chat.app.backend.feature.chat.controller;

import com.chat.app.backend.feature.chat.dto.MessageDTO;
import com.chat.app.backend.feature.chat.model.MessageStatus;
import com.chat.app.backend.feature.auth.security.UserDetailsImpl;
import com.chat.app.backend.feature.chat.service.MessageService;
import com.chat.app.backend.feature.chat.service.MessageSyncService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

import java.time.LocalDateTime;

/**
 * Controller for handling WebSocket chat messages.
 */
@Controller
public class ChatMessageController {

    private static final Logger logger = LoggerFactory.getLogger(ChatMessageController.class);

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private MessageService messageService;

    @Autowired
    private MessageSyncService messageSyncService;

    /**
     * Handle messages sent to a conversation.
     *
     * @param messageDTO the message data transfer object
     * @param authentication the authentication object containing sender details
     */
    @MessageMapping("/chat.send")
    public void sendMessage(@Payload MessageDTO messageDTO, Authentication authentication) {
        if (authentication == null) {
            logger.error("Authentication is null in sendMessage");
            return;
        }

        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            Long senderId = userDetails.getId();

            // Use the message service to send the message
            messageService.sendMessage(senderId, messageDTO.getConversationId(), messageDTO.getContent());

            // The message service already handles WebSocket and Kafka distribution
        } catch (Exception e) {
            logger.error("Error in sendMessage: {}", e.getMessage(), e);
        }
    }

    /**
     * Handle message read status updates.
     *
     * @param messageDTO the message data transfer object containing conversation ID
     * @param authentication the authentication object containing user details
     */
    @MessageMapping("/chat.read")
    public void markMessagesAsRead(@Payload MessageDTO messageDTO, Authentication authentication) {
        if (authentication == null) {
            logger.error("Authentication is null in markMessagesAsRead");
            return;
        }

        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            Long userId = userDetails.getId();

            // Mark messages as read in the conversation
            int messagesRead = messageService.markMessagesAsRead(userId, messageDTO.getConversationId());

            // Notify about read status if any messages were marked as read
            if (messagesRead > 0) {
                // Create a status update DTO
                MessageDTO statusUpdate = new MessageDTO();
                statusUpdate.setConversationId(messageDTO.getConversationId());
                statusUpdate.setStatus(MessageStatus.READ);
                statusUpdate.setReadAt(LocalDateTime.now());

                // Send to the conversation topic
                messagingTemplate.convertAndSend(
                        "/topic/conversation." + messageDTO.getConversationId() + ".status",
                        statusUpdate
                );
            }
        } catch (Exception e) {
            logger.error("Error in markMessagesAsRead: {}", e.getMessage(), e);
        }
    }

    /**
     * Refresh message status for a conversation.
     * This is called when a client subscribes to a conversation to ensure statuses are up-to-date.
     *
     * @param messageDTO the message data transfer object containing conversation ID
     * @param authentication the authentication object containing user details
     */
    @MessageMapping("/chat.status.refresh")
    public void refreshMessageStatus(@Payload MessageDTO messageDTO, Authentication authentication) {
        if (authentication == null) {
            logger.error("Authentication is null in refreshMessageStatus");
            return;
        }

        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            Long userId = userDetails.getId();

            logger.info("Refreshing message status for user {} in conversation {}",
                    userId, messageDTO.getConversationId());

            // Process any pending messages for this user to update statuses
            messageSyncService.processPendingMessagesForUser(userId);

            // This will update all SENT messages to DELIVERED for this user in the conversation
            // and send status updates via WebSocket

            logger.info("Message status refresh complete for user {} in conversation {}",
                    userId, messageDTO.getConversationId());

        } catch (Exception e) {
            logger.error("Error in refreshMessageStatus: {}", e.getMessage(), e);
        }
    }
}