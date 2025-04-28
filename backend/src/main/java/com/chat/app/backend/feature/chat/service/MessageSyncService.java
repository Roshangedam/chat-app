package com.chat.app.backend.feature.chat.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.chat.app.backend.feature.chat.dto.MessageDTO;
import com.chat.app.backend.feature.chat.model.Conversation;
import com.chat.app.backend.feature.chat.model.Message;
import com.chat.app.backend.feature.chat.model.MessageStatus;
import com.chat.app.backend.feature.chat.repository.ConversationRepository;
import com.chat.app.backend.feature.chat.repository.MessageRepository;
import com.chat.app.backend.feature.user.model.User;
import com.chat.app.backend.feature.user.model.UserStatus;
import com.chat.app.backend.feature.user.repository.UserRepository;


/**
 * Service for handling message synchronization and delivery status updates.
 */
@Service
public class MessageSyncService {

    private static final Logger logger = LoggerFactory.getLogger(MessageSyncService.class);

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ConversationRepository conversationRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private MessageMapper messageMapper;

    /**
     * Scheduled task to check for messages that should be marked as delivered.
     * This runs every minute to update message status for online users.
     */
    @Scheduled(fixedRate = 30000) // Run every 30 seconds instead of 60
    @Transactional
    public void updateMessageDeliveryStatus() {
        logger.info("Running scheduled message delivery status update");

        try {
            // Find all messages with SENT status, regardless of user status
            List<Message> pendingMessages = messageRepository.findByStatus(MessageStatus.SENT);

            if (pendingMessages.isEmpty()) {
                logger.info("No pending messages found, skipping delivery status update");
                return;
            }

            logger.info("Found {} pending messages to mark as delivered", pendingMessages.size());
            LocalDateTime now = LocalDateTime.now();

            // Mark all messages as delivered
            for (Message message : pendingMessages) {
                // Update message status
                message.setStatus(MessageStatus.DELIVERED);
                message.setDeliveredAt(now);
                messageRepository.save(message);

                // Send status update via WebSocket
                MessageDTO messageDTO = messageMapper.toDTO(message);

                // Send to conversation status topic
                String statusDestination = "/topic/conversation." + message.getConversation().getId() + ".status";
                messagingTemplate.convertAndSend(statusDestination, messageDTO);

                logger.info("Updated message {} to DELIVERED", message.getId());
            }
        } catch (Exception e) {
            logger.error("Error updating message delivery status: {}", e.getMessage(), e);
        }
    }

    /**
     * Process pending messages for a user who just came online.
     *
     * @param userId the ID of the user who came online
     */
    @Transactional
    public void processPendingMessagesForUser(Long userId) {
        logger.info("Processing pending messages for user {}", userId);

        try {
            Optional<User> userOpt = userRepository.findById(userId);
            if (userOpt.isEmpty()) {
                logger.warn("User {} not found", userId);
                return;
            }

            User user = userOpt.get();

            // Find conversations where this user is a participant
            List<Conversation> conversations = conversationRepository.findByParticipant(user);

            if (conversations.isEmpty()) {
                logger.info("No conversations found for user {}", userId);
                return;
            }

            LocalDateTime now = LocalDateTime.now();

            // For each conversation, find messages that should be marked as delivered
            for (Conversation conversation : conversations) {
                // Find messages in this conversation that are in SENT status and not from this user
                List<Message> pendingMessages = messageRepository.findByConversationAndStatusAndSenderNot(
                        conversation, MessageStatus.SENT, user);

                if (pendingMessages.isEmpty()) {
                    continue;
                }

                logger.info("Found {} pending messages in conversation {} for user {}",
                        pendingMessages.size(), conversation.getId(), userId);

                // Mark messages as delivered
                for (Message message : pendingMessages) {
                    // Update message status
                    message.setStatus(MessageStatus.DELIVERED);
                    message.setDeliveredAt(now);
                    messageRepository.save(message);

                    // Send status update via WebSocket
                    MessageDTO messageDTO = messageMapper.toDTO(message);

                    // Send to conversation status topic
                    String statusDestination = "/topic/conversation." + conversation.getId() + ".status";
                    messagingTemplate.convertAndSend(statusDestination, messageDTO);

                    logger.info("Updated message {} to DELIVERED", message.getId());
                }
            }
        } catch (Exception e) {
            logger.error("Error processing pending messages for user {}: {}", userId, e.getMessage(), e);
        }
    }

    /**
     * Synchronize messages for a user since a specific time.
     *
     * @param userId the ID of the user
     * @param since the time to synchronize from
     * @return the number of messages synchronized
     */
    @Transactional(readOnly = true)
    public int synchronizeMessages(Long userId, LocalDateTime since) {
        logger.info("Synchronizing messages for user {} since {}", userId, since);

        try {
            Optional<User> userOpt = userRepository.findById(userId);
            if (userOpt.isEmpty()) {
                logger.warn("User {} not found", userId);
                return 0;
            }

            User user = userOpt.get();

            // Find messages in user's conversations that were sent after the specified time
            List<Message> messages = messageRepository.findByConversationParticipantAndSentAtAfter(user, since);

            if (messages.isEmpty()) {
                logger.info("No messages to synchronize for user {}", userId);
                return 0;
            }

            logger.info("Found {} messages to synchronize for user {}", messages.size(), userId);

            // Send messages to the user's queue
            String destination = "/queue/user." + userId + ".messages";

            for (Message message : messages) {
                MessageDTO messageDTO = messageMapper.toDTO(message);
                messagingTemplate.convertAndSend(destination, messageDTO);
            }

            return messages.size();
        } catch (Exception e) {
            logger.error("Error synchronizing messages for user {}: {}", userId, e.getMessage(), e);
            return 0;
        }
    }
}
