package com.chat.app.backend.feature.chat.service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.chat.app.backend.feature.chat.dto.ConversationDTO;
import com.chat.app.backend.feature.chat.dto.MessageDTO;
import com.chat.app.backend.feature.user.dto.UserDTO;
import com.chat.app.backend.feature.chat.model.Conversation;
import com.chat.app.backend.feature.chat.model.Message;
import com.chat.app.backend.feature.chat.model.MessageStatus;
import com.chat.app.backend.feature.user.model.User;
import com.chat.app.backend.feature.chat.repository.ConversationRepository;
import com.chat.app.backend.feature.chat.repository.MessageRepository;
import com.chat.app.backend.feature.user.repository.UserRepository;

/**
 * Service for conversation operations.
 */
@Service
public class ConversationService {

    @Autowired
    private ConversationRepository conversationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private MessageRepository messageRepository;

    /**
     * Get all conversations for a user.
     * For one-to-one conversations, only the most recent conversation with each participant is returned.
     *
     * @param userId the user ID
     * @return list of conversation DTOs
     */
    public List<ConversationDTO> getConversationsForUser(Long userId) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            throw new RuntimeException("User not found");
        }
        User currentUser = userOpt.get();

        // Get all conversations the user is part of
        List<Conversation> allConversations = conversationRepository.findByParticipant(currentUser);

        // Separate group chats and one-to-one chats
        List<Conversation> groupChats = allConversations.stream()
                .filter(Conversation::isGroupChat)
                .collect(Collectors.toList());

        List<Conversation> oneToOneChats = allConversations.stream()
                .filter(c -> !c.isGroupChat())
                .collect(Collectors.toList());

        // Group one-to-one conversations by the other participant
        Map<Long, List<Conversation>> conversationsByParticipant = new HashMap<>();

        for (Conversation conversation : oneToOneChats) {
            // Find the other participant
            User otherParticipant = conversation.getParticipants().stream()
                    .filter(p -> !p.getId().equals(userId))
                    .findFirst()
                    .orElse(null);

            if (otherParticipant != null) {
                Long participantId = otherParticipant.getId();
                if (!conversationsByParticipant.containsKey(participantId)) {
                    conversationsByParticipant.put(participantId, new ArrayList<>());
                }
                conversationsByParticipant.get(participantId).add(conversation);
            }
        }

        // For each participant, keep only the most recent conversation
        List<Conversation> consolidatedOneToOneChats = new ArrayList<>();

        for (List<Conversation> participantConversations : conversationsByParticipant.values()) {
            // Sort by updatedAt (most recent first)
            participantConversations.sort((a, b) -> {
                LocalDateTime timeA = a.getUpdatedAt() != null ? a.getUpdatedAt() : a.getCreatedAt();
                LocalDateTime timeB = b.getUpdatedAt() != null ? b.getUpdatedAt() : b.getCreatedAt();
                return timeB.compareTo(timeA);
            });

            // Add only the most recent conversation
            if (!participantConversations.isEmpty()) {
                consolidatedOneToOneChats.add(participantConversations.get(0));
            }
        }

        // Combine group chats and consolidated one-to-one chats
        List<Conversation> consolidatedConversations = new ArrayList<>();
        consolidatedConversations.addAll(groupChats);
        consolidatedConversations.addAll(consolidatedOneToOneChats);

        // Sort all conversations by updatedAt (most recent first)
        consolidatedConversations.sort((a, b) -> {
            LocalDateTime timeA = a.getUpdatedAt() != null ? a.getUpdatedAt() : a.getCreatedAt();
            LocalDateTime timeB = b.getUpdatedAt() != null ? b.getUpdatedAt() : b.getCreatedAt();
            return timeB.compareTo(timeA);
        });

        // Convert to DTOs and populate with latest messages
        List<ConversationDTO> conversationDTOs = consolidatedConversations.stream()
                .map(conversation -> {
                    ConversationDTO dto = convertToDTO(conversation);
                    populateLatestMessage(dto, conversation);
                    return dto;
                })
                .collect(Collectors.toList());

        return conversationDTOs;
    }

    /**
     * Get a conversation by ID.
     *
     * @param conversationId the conversation ID
     * @return the conversation DTO
     */
    public ConversationDTO getConversationById(Long conversationId) {
        Optional<Conversation> conversationOpt = conversationRepository.findById(conversationId);
        if (conversationOpt.isEmpty()) {
            throw new RuntimeException("Conversation not found");
        }

        Conversation conversation = conversationOpt.get();
        ConversationDTO dto = convertToDTO(conversation);
        populateLatestMessage(dto, conversation);
        return dto;
    }

    /**
     * Get a conversation by ID and verify the user has access to it.
     *
     * @param conversationId the conversation ID
     * @param userId the user ID requesting access
     * @return the conversation DTO
     * @throws RuntimeException if the conversation is not found or the user doesn't have access
     */
    public ConversationDTO getConversation(Long conversationId, Long userId) {
        Optional<Conversation> conversationOpt = conversationRepository.findById(conversationId);
        if (conversationOpt.isEmpty()) {
            throw new RuntimeException("Conversation not found");
        }

        Conversation conversation = conversationOpt.get();

        // Check if the user is a participant in this conversation
        boolean isParticipant = conversation.getParticipants().stream()
                .anyMatch(participant -> participant.getId().equals(userId));

        if (!isParticipant) {
            throw new RuntimeException("User does not have access to this conversation");
        }

        ConversationDTO dto = convertToDTO(conversation);
        populateLatestMessage(dto, conversation);
        return dto;
    }

    /**
     * Create a new one-to-one conversation between two users.
     *
     * @param creatorId the creator user ID
     * @param participantId the participant user ID
     * @return the created conversation DTO
     */
    @Transactional
    public ConversationDTO createOneToOneConversation(Long creatorId, Long participantId) {
        if (creatorId.equals(participantId)) {
            throw new RuntimeException("Cannot create conversation with yourself");
        }

        Optional<User> creatorOpt = userRepository.findById(creatorId);
        Optional<User> participantOpt = userRepository.findById(participantId);

        if (creatorOpt.isEmpty() || participantOpt.isEmpty()) {
            throw new RuntimeException("User not found");
        }

        User creator = creatorOpt.get();
        User participant = participantOpt.get();

        // Check if conversation already exists
        Optional<Conversation> existingConversation = conversationRepository.findOneToOneConversation(creator, participant);
        if (existingConversation.isPresent()) {
            ConversationDTO dto = convertToDTO(existingConversation.get());
            populateLatestMessage(dto, existingConversation.get());
            return dto;
        }

        // Create new conversation
        Conversation conversation = new Conversation(creator, participant);
        Conversation savedConversation = conversationRepository.save(conversation);

        ConversationDTO dto = convertToDTO(savedConversation);
        populateLatestMessage(dto, savedConversation);
        return dto;
    }

    /**
     * Create a new group conversation.
     *
     * @param name the group name
     * @param description the group description
     * @param creatorId the creator user ID
     * @param participantIds the participant user IDs
     * @return the created conversation DTO
     */
    @Transactional
    public ConversationDTO createGroupConversation(String name, String description, Long creatorId, Set<Long> participantIds) {
        if (name == null || name.trim().isEmpty()) {
            throw new RuntimeException("Group name is required");
        }

        Optional<User> creatorOpt = userRepository.findById(creatorId);
        if (creatorOpt.isEmpty()) {
            throw new RuntimeException("Creator user not found");
        }

        User creator = creatorOpt.get();

        // Create new group conversation
        Conversation conversation = new Conversation(name, description, creator, true);

        // Add participants
        if (participantIds != null && !participantIds.isEmpty()) {
            List<User> participants = userRepository.findAllById(participantIds);
            conversation.getParticipants().addAll(participants);
        }

        Conversation savedConversation = conversationRepository.save(conversation);

        ConversationDTO dto = convertToDTO(savedConversation);
        populateLatestMessage(dto, savedConversation);
        return dto;
    }

    /**
     * Add a user to a group conversation.
     *
     * @param conversationId the conversation ID
     * @param userId the user ID to add
     * @return the updated conversation DTO
     */
    @Transactional
    public ConversationDTO addUserToConversation(Long conversationId, Long userId) {
        Optional<Conversation> conversationOpt = conversationRepository.findById(conversationId);
        Optional<User> userOpt = userRepository.findById(userId);

        if (conversationOpt.isEmpty()) {
            throw new RuntimeException("Conversation not found");
        }

        if (userOpt.isEmpty()) {
            throw new RuntimeException("User not found");
        }

        Conversation conversation = conversationOpt.get();
        User user = userOpt.get();

        if (!conversation.isGroupChat()) {
            throw new RuntimeException("Cannot add users to a one-to-one conversation");
        }

        conversation.getParticipants().add(user);
        conversation.setUpdatedAt(LocalDateTime.now());

        Conversation savedConversation = conversationRepository.save(conversation);

        ConversationDTO dto = convertToDTO(savedConversation);
        populateLatestMessage(dto, savedConversation);
        return dto;
    }

    /**
     * Remove a user from a group conversation.
     *
     * @param conversationId the conversation ID
     * @param userId the user ID to remove
     * @return the updated conversation DTO
     */
    @Transactional
    public ConversationDTO removeUserFromConversation(Long conversationId, Long userId) {
        Optional<Conversation> conversationOpt = conversationRepository.findById(conversationId);
        Optional<User> userOpt = userRepository.findById(userId);

        if (conversationOpt.isEmpty()) {
            throw new RuntimeException("Conversation not found");
        }

        if (userOpt.isEmpty()) {
            throw new RuntimeException("User not found");
        }

        Conversation conversation = conversationOpt.get();
        User user = userOpt.get();

        if (!conversation.isGroupChat()) {
            throw new RuntimeException("Cannot remove users from a one-to-one conversation");
        }

        if (conversation.getCreator().equals(user)) {
            throw new RuntimeException("Cannot remove the creator from the conversation");
        }

        conversation.getParticipants().remove(user);
        conversation.setUpdatedAt(LocalDateTime.now());

        Conversation savedConversation = conversationRepository.save(conversation);

        ConversationDTO dto = convertToDTO(savedConversation);
        populateLatestMessage(dto, savedConversation);
        return dto;
    }

    /**
     * Update a group conversation details.
     *
     * @param conversationId the conversation ID
     * @param name the new name
     * @param description the new description
     * @return the updated conversation DTO
     */
    @Transactional
    public ConversationDTO updateGroupConversation(Long conversationId, String name, String description) {
        Optional<Conversation> conversationOpt = conversationRepository.findById(conversationId);

        if (conversationOpt.isEmpty()) {
            throw new RuntimeException("Conversation not found");
        }

        Conversation conversation = conversationOpt.get();

        if (!conversation.isGroupChat()) {
            throw new RuntimeException("Cannot update a one-to-one conversation");
        }

        if (name != null && !name.trim().isEmpty()) {
            conversation.setName(name);
        }

        if (description != null) {
            conversation.setDescription(description);
        }

        conversation.setUpdatedAt(LocalDateTime.now());

        Conversation savedConversation = conversationRepository.save(conversation);

        ConversationDTO dto = convertToDTO(savedConversation);
        populateLatestMessage(dto, savedConversation);
        return dto;
    }

    /**
     * Convert a Conversation entity to a ConversationDTO.
     *
     * @param conversation the conversation entity
     * @return the conversation DTO
     */
    private ConversationDTO convertToDTO(Conversation conversation) {
        ConversationDTO dto = new ConversationDTO();
        dto.setId(conversation.getId());
        dto.setName(conversation.getName());
        dto.setDescription(conversation.getDescription());
        dto.setAvatarUrl(conversation.getAvatarUrl());
        dto.setGroupChat(conversation.isGroupChat());
        dto.setCreatedAt(conversation.getCreatedAt());
        dto.setUpdatedAt(conversation.getUpdatedAt());

        if (conversation.getCreator() != null) {
            dto.setCreatorId(conversation.getCreator().getId());
            dto.setCreatorUsername(conversation.getCreator().getUsername());
        }

        // Convert participants to DTOs
        Set<UserDTO> participantDTOs = conversation.getParticipants().stream()
                .map(this::convertUserToDTO)
                .collect(Collectors.toSet());
        dto.setParticipants(participantDTOs);

        return dto;
    }

    /**
     * Populate the latest message for a conversation DTO.
     *
     * @param dto the conversation DTO to populate
     * @param conversation the conversation entity
     */
    private void populateLatestMessage(ConversationDTO dto, Conversation conversation) {
        // Use a pageable to get the most recent message
        Pageable pageable = PageRequest.of(0, 1, Sort.by(Sort.Direction.DESC, "sentAt"));
        Page<Message> latestMessagePage = messageRepository.findByConversationOrderBySentAtDesc(conversation, pageable);

        if (latestMessagePage.hasContent()) {
            Message latestMessage = latestMessagePage.getContent().get(0);
            MessageDTO messageDTO = new MessageDTO();
            messageDTO.setId(latestMessage.getId());
            messageDTO.setContent(latestMessage.getContent());
            messageDTO.setSentAt(latestMessage.getSentAt());
            messageDTO.setStatus(latestMessage.getStatus());

            if (latestMessage.getSender() != null) {
                messageDTO.setSenderId(latestMessage.getSender().getId());
                messageDTO.setSenderUsername(latestMessage.getSender().getUsername());
            }

            dto.setLastMessage(messageDTO);
        }
    }

    /**
     * Convert a User entity to a UserDTO.
     *
     * @param user the user entity
     * @return the user DTO
     */
    private UserDTO convertUserToDTO(User user) {
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setFullName(user.getFullName());
        dto.setAvatarUrl(user.getAvatarUrl());
        dto.setStatus(user.getStatus());
        dto.setLastActive(user.getLastActive());
        return dto;
    }

    /**
     * Add multiple participants to a conversation.
     *
     * @param conversationId the conversation ID
     * @param requesterId the ID of the user making the request
     * @param participantIds the IDs of the participants to add
     * @return the updated conversation DTO
     */
    @Transactional
    public ConversationDTO addParticipantsToConversation(Long conversationId, Long requesterId, Set<Long> participantIds) {
        // Verify the conversation exists and the requester has access
        ConversationDTO conversationDTO = getConversation(conversationId, requesterId);

        if (!conversationDTO.isGroupChat()) {
            throw new RuntimeException("Cannot add participants to a one-to-one conversation");
        }

        // Add each participant
        for (Long participantId : participantIds) {
            try {
                addUserToConversation(conversationId, participantId);
            } catch (Exception e) {
                // Log the error but continue with other participants
                System.err.println("Failed to add participant " + participantId + ": " + e.getMessage());
            }
        }

        // Get the updated conversation
        return getConversationById(conversationId);
    }

    /**
     * Remove a participant from a conversation.
     *
     * @param conversationId the conversation ID
     * @param requesterId the ID of the user making the request
     * @param participantId the ID of the participant to remove
     * @return the updated conversation DTO
     */
    @Transactional
    public ConversationDTO removeParticipantFromConversation(Long conversationId, Long requesterId, Long participantId) {
        // Verify the conversation exists and the requester has access
        ConversationDTO conversationDTO = getConversation(conversationId, requesterId);

        if (!conversationDTO.isGroupChat()) {
            throw new RuntimeException("Cannot remove participants from a one-to-one conversation");
        }

        // Check if the requester is the creator or removing themselves
        boolean isCreator = conversationDTO.getCreatorId().equals(requesterId);
        boolean isSelfRemoval = requesterId.equals(participantId);

        if (!isCreator && !isSelfRemoval) {
            throw new RuntimeException("Only the conversation creator can remove other participants");
        }

        // Remove the participant
        return removeUserFromConversation(conversationId, participantId);
    }

    /**
     * Update a conversation's details.
     *
     * @param conversationId the conversation ID
     * @param requesterId the ID of the user making the request
     * @param name the new name (optional)
     * @param description the new description (optional)
     * @param avatarUrl the new avatar URL (optional)
     * @return the updated conversation DTO
     */
    @Transactional
    public ConversationDTO updateConversation(Long conversationId, Long requesterId,
                                             String name, String description, String avatarUrl) {
        // Verify the conversation exists and the requester has access
        ConversationDTO conversationDTO = getConversation(conversationId, requesterId);

        // Check if the requester is the creator
        if (!conversationDTO.getCreatorId().equals(requesterId)) {
            throw new RuntimeException("Only the conversation creator can update the conversation details");
        }

        Optional<Conversation> conversationOpt = conversationRepository.findById(conversationId);
        Conversation conversation = conversationOpt.get(); // Safe because we already checked in getConversation

        // Update the fields if provided
        if (name != null && !name.trim().isEmpty()) {
            conversation.setName(name);
        }

        if (description != null) {
            conversation.setDescription(description);
        }

        if (avatarUrl != null) {
            conversation.setAvatarUrl(avatarUrl);
        }

        conversation.setUpdatedAt(LocalDateTime.now());

        Conversation savedConversation = conversationRepository.save(conversation);

        ConversationDTO dto = convertToDTO(savedConversation);
        populateLatestMessage(dto, savedConversation);
        return dto;
    }

    /**
     * Search for conversations by name that the user has access to.
     *
     * @param query the search query
     * @param userId the ID of the user making the request
     * @return a list of matching conversation DTOs
     */
    public List<ConversationDTO> searchConversations(String query, Long userId) {
        if (query == null || query.trim().isEmpty()) {
            return getConversationsForUser(userId);
        }

        // Get all conversations the user has access to
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            throw new RuntimeException("User not found");
        }

        User user = userOpt.get();

        // Find conversations by name containing the query
        List<Conversation> matchingConversations = conversationRepository.findByNameContainingIgnoreCase(query);

        // Filter to only include conversations the user is a participant in
        return matchingConversations.stream()
                .filter(conversation -> conversation.getParticipants().contains(user))
                .map(conversation -> {
                    ConversationDTO dto = convertToDTO(conversation);
                    populateLatestMessage(dto, conversation);
                    return dto;
                })
                .collect(Collectors.toList());
    }
}