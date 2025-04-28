package com.chat.app.backend.feature.chat.service;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.chat.app.backend.feature.chat.dto.MessageDTO;
import com.chat.app.backend.feature.chat.model.Conversation;
import com.chat.app.backend.feature.chat.model.MessageStatus;
import com.chat.app.backend.feature.chat.repository.MessageRepository;
import com.chat.app.backend.feature.user.model.User;
import com.chat.app.backend.feature.user.model.UserStatus;

/**
 * Service for consuming messages from Kafka and distributing them via WebSocket.
 */
@Service
public class KafkaMessageConsumer {

    // Track message processing to prevent duplicate processing
    private final ConcurrentHashMap<Long, AtomicInteger> processingMessages = new ConcurrentHashMap<>();

    private static final Logger logger = LoggerFactory.getLogger(KafkaMessageConsumer.class);

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private MessageRepository messageRepository;

    /**
     * Listen for messages on the chat-messages Kafka topic and distribute them via WebSocket.
     *
     * @param message the message data (can be MessageDTO or Long message ID)
     */
    @KafkaListener(topics = "chat-messages", groupId = "${spring.kafka.consumer.group-id}")
    @Transactional
    public void listen(Object message) {
        final Long[] messageIdHolder = new Long[1];
        final MessageDTO[] messageDTOHolder = new MessageDTO[1];

        // Handle different message types
        if (message instanceof MessageDTO) {
            messageDTOHolder[0] = (MessageDTO) message;
            messageIdHolder[0] = messageDTOHolder[0].getId();
            logger.info("Received MessageDTO from Kafka: {}", messageIdHolder[0]);
        } else if (message instanceof Long) {
            messageIdHolder[0] = (Long) message;
            logger.info("Received message ID from Kafka: {}", messageIdHolder[0]);
        } else {
            logger.error("Received unknown message type from Kafka: {}", message.getClass().getName());
            return;
        }

        final Long messageId = messageIdHolder[0];

        // Prevent duplicate processing of the same message
        AtomicInteger processingCount = processingMessages.computeIfAbsent(messageId, k -> new AtomicInteger(0));
        if (processingCount.incrementAndGet() > 1) {
            logger.warn("Message {} is already being processed, skipping duplicate", messageId);
            processingCount.decrementAndGet();
            return;
        }

        try {
            // Find the message in the database
            messageRepository.findById(messageId).ifPresent(dbMessage -> {
                // If we only received a message ID, create a DTO from the database message
                if (messageDTOHolder[0] == null) {
                    MessageDTO newDto = new MessageDTO();
                    newDto.setId(dbMessage.getId());
                    newDto.setConversationId(dbMessage.getConversation().getId());
                    newDto.setSenderId(dbMessage.getSender().getId());
                    newDto.setContent(dbMessage.getContent());
                    newDto.setSentAt(dbMessage.getSentAt());
                    newDto.setStatus(dbMessage.getStatus());
                    messageDTOHolder[0] = newDto;
                }
                try {
                    // Find the conversation and check if recipients are online
                    Conversation conversation = dbMessage.getConversation();

                    // Get all participants except the sender
                    Set<User> recipients = conversation.getParticipants().stream()
                            .filter(user -> !user.getId().equals(dbMessage.getSender().getId()))
                            .collect(Collectors.toSet());

                    // Check if any recipient is online
                    boolean anyRecipientOnline = recipients.stream()
                            .anyMatch(user -> user.getStatus() == UserStatus.ONLINE);

                    LocalDateTime now = LocalDateTime.now();

                    if (anyRecipientOnline) {
                        // At least one recipient is online, mark as DELIVERED
                        dbMessage.setDeliveredAt(now);
                        dbMessage.setStatus(MessageStatus.DELIVERED);
                        messageRepository.save(dbMessage);

                        // Update the DTO with delivered status
                        messageDTOHolder[0].setDeliveredAt(now);
                        messageDTOHolder[0].setStatus(MessageStatus.DELIVERED);

                        // Send status update to the status topic
                        String statusDestination = "/topic/conversation." + messageDTOHolder[0].getConversationId() + ".status";
                        messagingTemplate.convertAndSend(statusDestination, messageDTOHolder[0]);

                        logger.info("Message {} marked as DELIVERED", messageId);
                    } else {
                        // No recipients online, keep as SENT
                        // The message will be marked as DELIVERED when a recipient comes online
                        messageDTOHolder[0].setStatus(MessageStatus.SENT);
                        logger.info("No recipients online for message {}, keeping as SENT", messageId);
                    }

                    // Send to conversation topic for all subscribers
                    String destination = "/topic/conversation." + messageDTOHolder[0].getConversationId();
                    messagingTemplate.convertAndSend(destination, messageDTOHolder[0]);

                    logger.info("Message {} processed and sent to WebSocket destination: {}",
                            messageId, destination);

                    // If message was in PENDING state, update it to SENT
                    if (dbMessage.getStatus() == MessageStatus.PENDING) {
                        dbMessage.setStatus(MessageStatus.SENT);
                        messageRepository.save(dbMessage);
                        logger.info("Updated message {} from PENDING to SENT", messageId);
                    }
                } catch (Exception e) {
                    logger.error("Error processing message {}: {}", messageId, e.getMessage(), e);
                    // Mark message for retry if it's not already failed
                    if (dbMessage.getStatus() != MessageStatus.FAILED) {
                        dbMessage.setStatus(MessageStatus.PENDING);
                        messageRepository.save(dbMessage);
                        logger.info("Marked message {} as PENDING for retry", messageId);
                    }
                }
            });
        } catch (Exception e) {
            logger.error("Error processing message from Kafka: {}", e.getMessage(), e);
        } finally {
            // Decrement processing count and remove if zero
            if (processingCount.decrementAndGet() <= 0) {
                processingMessages.remove(messageId);
            }
        }
    }
}