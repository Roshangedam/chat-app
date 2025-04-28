package com.chat.app.backend.feature.chat.service;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.chat.app.backend.feature.chat.model.Message;
import com.chat.app.backend.feature.chat.model.MessageStatus;
import com.chat.app.backend.feature.chat.repository.MessageRepository;

/**
 * Service for handling message retry logic.
 * This service periodically checks for pending messages and attempts to resend them.
 */
@Service
public class MessageRetryService {

    private static final Logger logger = LoggerFactory.getLogger(MessageRetryService.class);

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private KafkaTemplate<String, Object> objectKafkaTemplate;

    @Value("${app.chat.message.max-retry-count:3}")
    private int maxRetryCount;

    @Value("${app.chat.message.retry-interval-seconds:30}")
    private int retryIntervalSeconds;

    /**
     * Scheduled task to retry pending messages.
     * Runs every 30 seconds by default.
     */
    @Scheduled(fixedDelayString = "${app.chat.message.retry-interval-ms:30000}")
    @Transactional
    public void retryPendingMessages() {
        logger.info("Checking for pending messages to retry...");

        try {
            // Find messages in PENDING status with retry count less than max
            List<Message> pendingMessages = messageRepository.findByStatusAndRetryCountLessThanEqual(
                    MessageStatus.PENDING, maxRetryCount);

            if (pendingMessages.isEmpty()) {
                logger.info("No pending messages found for retry");
                return;
            }

            logger.info("Found {} pending messages to retry", pendingMessages.size());

            for (Message message : pendingMessages) {
                try {
                    // Increment retry count
                    message.setRetryCount(message.getRetryCount() + 1);

                    // If max retries reached, mark as failed
                    if (message.getRetryCount() >= maxRetryCount) {
                        logger.warn("Message {} has reached max retry count ({}), marking as FAILED",
                                message.getId(), maxRetryCount);
                        message.setStatus(MessageStatus.FAILED);
                    }

                    // Save updated message
                    messageRepository.save(message);

                    // Only resend if not failed
                    if (message.getStatus() != MessageStatus.FAILED) {
                        // Send to Kafka for processing
                        logger.info("Retrying message {} (attempt {}/{})",
                                message.getId(), message.getRetryCount(), maxRetryCount);
                        objectKafkaTemplate.send("chat-messages", message.getId());
                    }
                } catch (Exception e) {
                    logger.error("Error retrying message {}: {}", message.getId(), e.getMessage(), e);
                }
            }
        } catch (Exception e) {
            logger.error("Error in retry task: {}", e.getMessage(), e);
        }
    }

    /**
     * Manually retry a specific failed message.
     *
     * @param messageId the ID of the message to retry
     * @return true if the message was successfully queued for retry, false otherwise
     */
    @Transactional
    public boolean retryFailedMessage(Long messageId) {
        try {
            return messageRepository.findById(messageId).map(message -> {
                // Only retry failed messages
                if (message.getStatus() != MessageStatus.FAILED) {
                    logger.warn("Cannot retry message {} because it is not in FAILED status", messageId);
                    return false;
                }

                // Reset retry count and status
                message.setRetryCount(0);
                message.setStatus(MessageStatus.PENDING);
                messageRepository.save(message);

                // Send to Kafka for processing
                logger.info("Manually retrying failed message {}", messageId);
                objectKafkaTemplate.send("chat-messages", message.getId());

                return true;
            }).orElse(false);
        } catch (Exception e) {
            logger.error("Error retrying failed message {}: {}", messageId, e.getMessage(), e);
            return false;
        }
    }
}
