package com.chat.app.backend.service;

import com.chat.app.backend.dto.MessageDTO;
import com.chat.app.backend.model.Message;
import com.chat.app.backend.model.MessageStatus;
import com.chat.app.backend.repository.MessageRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

/**
 * Service for consuming messages from Kafka and distributing them via WebSocket.
 */
@Service
public class KafkaMessageConsumer {

    private static final Logger logger = LoggerFactory.getLogger(KafkaMessageConsumer.class);

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private MessageRepository messageRepository;

    /**
     * Listen for messages on the chat-messages Kafka topic and distribute them via WebSocket.
     *
     * @param messageDTO the message data transfer object
     */
    @KafkaListener(topics = "chat-messages", groupId = "${spring.kafka.consumer.group-id}")
    public void listen(MessageDTO messageDTO) {
        logger.info("Received message from Kafka: {}", messageDTO.getId());

        try {
            // Update message status to DELIVERED
            messageRepository.findById(messageDTO.getId()).ifPresent(message -> {
                message.setDeliveredAt(LocalDateTime.now());
                message.setStatus(MessageStatus.DELIVERED);
                messageRepository.save(message);
            });

            // Update the DTO with delivered status
            messageDTO.setDeliveredAt(LocalDateTime.now());
            messageDTO.setStatus(MessageStatus.DELIVERED);

            // Send to conversation topic for all subscribers
            String destination = "/topic/conversation." + messageDTO.getConversationId();
            messagingTemplate.convertAndSend(destination, messageDTO);

            logger.info("Message {} delivered to WebSocket destination: {}", messageDTO.getId(), destination);
        } catch (Exception e) {
            logger.error("Error processing message from Kafka: {}", e.getMessage(), e);
        }
    }
}