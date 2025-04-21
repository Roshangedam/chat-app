package com.chat.app.backend.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.chat.app.backend.dto.ConversationDTO;
import com.chat.app.backend.dto.UserDTO;
import com.chat.app.backend.model.Conversation;
import com.chat.app.backend.model.User;
import com.chat.app.backend.repository.ConversationRepository;
import com.chat.app.backend.repository.UserRepository;

/**
 * Service for conversation operations.
 */
@Service
public class ConversationService {

    @Autowired
    private ConversationRepository conversationRepository;

    @Autowired
    private UserRepository userRepository;

    /**
     * Get all conversations for a user.
     *
     * @param userId the user ID
     * @return list of conversation DTOs
     */
    public List<ConversationDTO> getConversationsForUser(Long userId) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            throw new RuntimeException("User not found");
        }

        List<Conversation> conversations = conversationRepository.findByParticipant(userOpt.get());
        return conversations.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
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

        return convertToDTO(conversationOpt.get());
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

        return convertToDTO(conversation);
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
            return convertToDTO(existingConversation.get());
        }

        // Create new conversation
        Conversation conversation = new Conversation(creator, participant);
        Conversation savedConversation = conversationRepository.save(conversation);

        return convertToDTO(savedConversation);
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

        return convertToDTO(savedConversation);
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

        return convertToDTO(savedConversation);
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

        return convertToDTO(savedConversation);
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

        return convertToDTO(savedConversation);
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

        return convertToDTO(savedConversation);
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
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
}