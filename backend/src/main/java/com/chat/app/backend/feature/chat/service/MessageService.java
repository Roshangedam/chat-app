package com.chat.app.backend.feature.chat.service;

import com.chat.app.backend.feature.chat.dto.MessageDTO;
import com.chat.app.backend.feature.chat.model.Conversation;
import com.chat.app.backend.feature.chat.model.Message;
import com.chat.app.backend.feature.chat.model.MessageStatus;
import com.chat.app.backend.feature.chat.repository.ConversationRepository;
import com.chat.app.backend.feature.chat.repository.MessageRepository;
import com.chat.app.backend.feature.user.model.User;
import com.chat.app.backend.feature.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Service for message operations.
 */
@Service
public class MessageService {

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ConversationRepository conversationRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private KafkaTemplate<String, MessageDTO> kafkaTemplate;

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

        // Create and save the message
        Message message = new Message(sender, conversation, content);
        Message savedMessage = messageRepository.save(message);

        // Convert to DTO for response
        MessageDTO messageDTO = convertToDTO(savedMessage);

        // Send message to Kafka topic for distribution
        kafkaTemplate.send("chat-messages", messageDTO);

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
        // Use ascending order (oldest to newest) for better display in chat UI
        Pageable pageable = PageRequest.of(page, size, Sort.by("sentAt").ascending());

        // Use the repository method that matches our sort order
        Page<Message> messages = messageRepository.findByConversationOrderBySentAtAsc(conversation, pageable);

        return messages.map(this::convertToDTO);
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
        }

        if (!unreadMessages.isEmpty()) {
            messageRepository.saveAll(unreadMessages);
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
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Convert a Message entity to a MessageDTO.
     *
     * @param message the message entity
     * @return the message DTO
     */
    private MessageDTO convertToDTO(Message message) {
        MessageDTO dto = new MessageDTO();
        dto.setId(message.getId());

        if (message.getSender() != null) {
            dto.setSenderId(message.getSender().getId());
            dto.setSenderUsername(message.getSender().getUsername());
            dto.setSenderAvatarUrl(message.getSender().getAvatarUrl());
        }

        if (message.getConversation() != null) {
            dto.setConversationId(message.getConversation().getId());
        }

        dto.setContent(message.getContent());
        dto.setSentAt(message.getSentAt());
        dto.setDeliveredAt(message.getDeliveredAt());
        dto.setReadAt(message.getReadAt());
        dto.setStatus(message.getStatus());

        return dto;
    }
}