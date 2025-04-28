package com.chat.app.backend.feature.chat.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.chat.app.backend.feature.chat.dto.MessageDTO;
import com.chat.app.backend.feature.chat.model.Conversation;
import com.chat.app.backend.feature.chat.model.Message;
import com.chat.app.backend.feature.chat.model.MessageStatus;
import com.chat.app.backend.feature.chat.repository.ConversationRepository;
import com.chat.app.backend.feature.chat.repository.MessageRepository;
import com.chat.app.backend.feature.user.model.User;
import com.chat.app.backend.feature.user.repository.UserRepository;

/**
 * Service for message operations.
 */
@Service
public class MessageService {

    private static final Logger logger = LoggerFactory.getLogger(MessageService.class);
    private static final int MAX_RETRY_ATTEMPTS = 3;

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ConversationRepository conversationRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private KafkaTemplate<String, Object> objectKafkaTemplate;

    @Autowired
    private MessageMapper messageMapper;

    /**
     * Send a new message in a conversation.
     *
     * @param senderId the ID of the user sending the message
     * @param conversationId the ID of the conversation
     * @param content the message content
     * @return the sent message DTO
     */
    @Transactional
    public MessageDTO sendMessage(Long senderId, Long conversationId, String content) {
        Optional<User> senderOpt = userRepository.findById(senderId);
        Optional<Conversation> conversationOpt = conversationRepository.findById(conversationId);

        if (senderOpt.isEmpty()) {
            throw new RuntimeException("Sender not found");
        }

        if (conversationOpt.isEmpty()) {
            throw new RuntimeException("Conversation not found");
        }

        User sender = senderOpt.get();
        Conversation conversation = conversationOpt.get();

        // Check if sender is a participant in the conversation
        if (!conversation.getParticipants().contains(sender)) {
            throw new RuntimeException("User is not a participant in this conversation");
        }

        // Create the message with initial SENT status
        Message message = new Message(sender, conversation, content);
        message.setStatus(MessageStatus.SENT);
        Message savedMessage = messageRepository.save(message);

        // Convert to DTO for response
        MessageDTO messageDTO = messageMapper.toDTO(savedMessage);

        // Send message to Kafka topic for distribution
        objectKafkaTemplate.send("chat-messages", messageDTO);

        // Send message to WebSocket subscribers
        String destination = "/topic/conversation." + conversationId;
        messagingTemplate.convertAndSend(destination, messageDTO);

        // Update conversation's last activity time
        conversation.setUpdatedAt(LocalDateTime.now());
        conversationRepository.save(conversation);

        return messageDTO;
    }

    /**
     * Get messages for a conversation with pagination.
     *
     * @param conversationId the conversation ID
     * @param page the page number (0-based)
     * @param size the page size
     * @return a page of message DTOs
     */
    public Page<MessageDTO> getMessagesForConversation(Long conversationId, int page, int size) {
        Optional<Conversation> conversationOpt = conversationRepository.findById(conversationId);

        if (conversationOpt.isEmpty()) {
            throw new RuntimeException("Conversation not found");
        }

        Conversation conversation = conversationOpt.get();

        // Log the request parameters
        System.out.println("Loading messages for conversation " + conversationId + ", page " + page + ", size " + size);

        // Always use descending order (newest first) for initial load
        // This matches WhatsApp behavior where newest messages are shown first
        // and older messages are loaded when scrolling up
        Pageable pageable = PageRequest.of(page, size, Sort.by("sentAt").descending());

        // Use the repository method that matches our sort order
        Page<Message> messages = messageRepository.findByConversationOrderBySentAtDesc(conversation, pageable);

        // Log the result
        System.out.println("Found " + messages.getContent().size() + " messages, total elements: " +
                          messages.getTotalElements() + ", total pages: " + messages.getTotalPages());

        return messages.map(messageMapper::toDTO);
    }

    /**
     * Mark messages as read for a user in a conversation.
     *
     * @param userId the user ID
     * @param conversationId the conversation ID
     * @return the number of messages marked as read
     */
    @Transactional
    public int markMessagesAsRead(Long userId, Long conversationId) {
        Optional<User> userOpt = userRepository.findById(userId);
        Optional<Conversation> conversationOpt = conversationRepository.findById(conversationId);

        if (userOpt.isEmpty()) {
            throw new RuntimeException("User not found");
        }

        if (conversationOpt.isEmpty()) {
            throw new RuntimeException("Conversation not found");
        }

        User user = userOpt.get();
        Conversation conversation = conversationOpt.get();

        // Get unread messages for the user in the conversation
        List<Message> unreadMessages = messageRepository.findUnreadMessagesForUser(conversation, user);

        // Mark messages as read
        LocalDateTime now = LocalDateTime.now();
        for (Message message : unreadMessages) {
            message.setReadAt(now);
            message.setStatus(MessageStatus.READ);

            // If the message was never marked as delivered, mark it now
            if (message.getDeliveredAt() == null) {
                message.setDeliveredAt(now);
            }
        }

        if (!unreadMessages.isEmpty()) {
            messageRepository.saveAll(unreadMessages);

            // Send individual status updates for each message
            for (Message message : unreadMessages) {
                // Create a status update DTO
                MessageDTO statusUpdate = new MessageDTO();
                statusUpdate.setId(message.getId());
                statusUpdate.setConversationId(message.getConversation().getId());
                statusUpdate.setStatus(MessageStatus.READ);
                statusUpdate.setReadAt(message.getReadAt());
                statusUpdate.setDeliveredAt(message.getDeliveredAt());

                // Send to the conversation status topic
                String destination = "/topic/conversation." + message.getConversation().getId() + ".status";
                messagingTemplate.convertAndSend(destination, statusUpdate);
            }
        }

        return unreadMessages.size();
    }

    /**
     * Get unread message count for a user in a conversation.
     *
     * @param userId the user ID
     * @param conversationId the conversation ID
     * @return the count of unread messages
     */
    public long getUnreadMessageCount(Long userId, Long conversationId) {
        Optional<User> userOpt = userRepository.findById(userId);
        Optional<Conversation> conversationOpt = conversationRepository.findById(conversationId);

        if (userOpt.isEmpty() || conversationOpt.isEmpty()) {
            return 0;
        }

        User user = userOpt.get();
        Conversation conversation = conversationOpt.get();

        return messageRepository.countUnreadMessagesForUser(conversation, user);
    }

    /**
     * Get the latest messages for each conversation a user is part of.
     *
     * @param userId the user ID
     * @return a list of the latest message DTOs
     */
    public List<MessageDTO> getLatestMessagesForUser(Long userId) {
        List<Message> latestMessages = messageRepository.findLatestMessagesForUser(userId);
        return latestMessages.stream()
                .map(messageMapper::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * Process pending messages for a user who has just come online.
     * This updates the status of messages that were sent while the user was offline.
     *
     * @param userId the ID of the user who came online
     */
    @Transactional
    public void processPendingMessagesForUser(Long userId) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return;
        }

        User user = userOpt.get();

        // Find all conversations where the user is a participant
        List<Conversation> userConversations = conversationRepository.findByParticipant(user);

        for (Conversation conversation : userConversations) {
            // Find messages that are still in SENT status (not yet DELIVERED)
            List<Message> pendingMessages = messageRepository.findPendingMessagesForUser(conversation, user);

            if (!pendingMessages.isEmpty()) {
                LocalDateTime now = LocalDateTime.now();

                // Filter out messages sent by this user
                List<Message> messagesToUpdate = pendingMessages.stream()
                        .filter(message -> !message.getSender().getId().equals(userId))
                        .collect(Collectors.toList());

                if (!messagesToUpdate.isEmpty()) {
                    // Update all pending messages to DELIVERED status
                    for (Message message : messagesToUpdate) {
                        message.setDeliveredAt(now);
                        message.setStatus(MessageStatus.DELIVERED);
                    }

                    // Save all updated messages
                    messageRepository.saveAll(messagesToUpdate);

                    // Notify the sender about the delivery status update
                    for (Message message : messagesToUpdate) {
                        // Send status update via WebSocket
                        MessageDTO statusUpdate = new MessageDTO();
                        statusUpdate.setId(message.getId());
                        statusUpdate.setConversationId(message.getConversation().getId());
                        statusUpdate.setStatus(MessageStatus.DELIVERED);
                        statusUpdate.setDeliveredAt(message.getDeliveredAt());

                        // Send to the conversation status topic
                        String destination = "/topic/conversation." + message.getConversation().getId() + ".status";
                        messagingTemplate.convertAndSend(destination, statusUpdate);

                        // Also send to the main conversation topic to ensure all clients get the update
                        String mainDestination = "/topic/conversation." + message.getConversation().getId();
                        messagingTemplate.convertAndSend(mainDestination, messageMapper.toDTO(message));
                    }
                }
            }
        }
    }


}