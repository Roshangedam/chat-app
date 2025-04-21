package com.chat.app.backend.controller;

import com.chat.app.backend.dto.ConversationDTO;
import com.chat.app.backend.security.jwt.UserDetailsImpl;
import com.chat.app.backend.service.ConversationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;

/**
 * REST Controller for conversation operations.
 * Provides endpoints for managing conversations.
 */
@RestController
@RequestMapping("/api/v1/conversations")
public class ConversationController {

    @Autowired
    private ConversationService conversationService;

    /**
     * Get all conversations for the current user.
     *
     * @param userDetails the authenticated user details
     * @return a list of conversation DTOs
     */
    @GetMapping
    public ResponseEntity<List<ConversationDTO>> getConversations(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        
        Long userId = userDetails.getId();
        List<ConversationDTO> conversations = conversationService.getConversationsForUser(userId);
        return ResponseEntity.ok(conversations);
    }

    /**
     * Get a specific conversation by ID.
     *
     * @param conversationId the conversation ID
     * @param userDetails the authenticated user details
     * @return the conversation DTO
     */
    @GetMapping("/{conversationId}")
    public ResponseEntity<ConversationDTO> getConversation(
            @PathVariable Long conversationId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        
        // Verify user has access to this conversation
        Long userId = userDetails.getId();
        ConversationDTO conversation = conversationService.getConversation(conversationId, userId);
        return ResponseEntity.ok(conversation);
    }

    /**
     * Create a new one-to-one conversation with another user.
     *
     * @param request the request containing the participant ID
     * @param userDetails the authenticated user details
     * @return the created conversation DTO
     */
    @PostMapping("/one-to-one")
    public ResponseEntity<ConversationDTO> createOneToOneConversation(
            @RequestBody OneToOneConversationRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        
        Long creatorId = userDetails.getId();
        ConversationDTO conversation = conversationService.createOneToOneConversation(
                creatorId, request.getParticipantId());
        return ResponseEntity.ok(conversation);
    }

    /**
     * Create a new group conversation.
     *
     * @param request the request containing group details
     * @param userDetails the authenticated user details
     * @return the created conversation DTO
     */
    @PostMapping("/group")
    public ResponseEntity<ConversationDTO> createGroupConversation(
            @RequestBody GroupConversationRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        
        Long creatorId = userDetails.getId();
        ConversationDTO conversation = conversationService.createGroupConversation(
                request.getName(), request.getDescription(), creatorId, request.getParticipantIds());
        return ResponseEntity.ok(conversation);
    }

    /**
     * Add participants to a group conversation.
     *
     * @param conversationId the conversation ID
     * @param request the request containing participant IDs
     * @param userDetails the authenticated user details
     * @return the updated conversation DTO
     */
    @PostMapping("/{conversationId}/participants")
    public ResponseEntity<ConversationDTO> addParticipants(
            @PathVariable Long conversationId,
            @RequestBody ParticipantsRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        
        // Verify user has access to this conversation
        Long userId = userDetails.getId();
        ConversationDTO conversation = conversationService.addParticipantsToConversation(
                conversationId, userId, request.getParticipantIds());
        return ResponseEntity.ok(conversation);
    }

    /**
     * Remove a participant from a group conversation.
     *
     * @param conversationId the conversation ID
     * @param participantId the participant ID to remove
     * @param userDetails the authenticated user details
     * @return the updated conversation DTO
     */
    @DeleteMapping("/{conversationId}/participants/{participantId}")
    public ResponseEntity<ConversationDTO> removeParticipant(
            @PathVariable Long conversationId,
            @PathVariable Long participantId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        
        // Verify user has access to this conversation
        Long userId = userDetails.getId();
        ConversationDTO conversation = conversationService.removeParticipantFromConversation(
                conversationId, userId, participantId);
        return ResponseEntity.ok(conversation);
    }

    /**
     * Update a group conversation details.
     *
     * @param conversationId the conversation ID
     * @param request the request containing updated details
     * @param userDetails the authenticated user details
     * @return the updated conversation DTO
     */
    @PutMapping("/{conversationId}")
    public ResponseEntity<ConversationDTO> updateConversation(
            @PathVariable Long conversationId,
            @RequestBody UpdateConversationRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        
        // Verify user has access to this conversation
        Long userId = userDetails.getId();
        ConversationDTO conversation = conversationService.updateConversation(
                conversationId, userId, request.getName(), request.getDescription(), request.getAvatarUrl());
        return ResponseEntity.ok(conversation);
    }

    /**
     * Search for conversations by name.
     *
     * @param query the search query
     * @param userDetails the authenticated user details
     * @return a list of matching conversation DTOs
     */
    @GetMapping("/search")
    public ResponseEntity<List<ConversationDTO>> searchConversations(
            @RequestParam String query,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        
        Long userId = userDetails.getId();
        List<ConversationDTO> conversations = conversationService.searchConversations(query, userId);
        return ResponseEntity.ok(conversations);
    }

    /**
     * Request class for creating a one-to-one conversation.
     */
    public static class OneToOneConversationRequest {
        private Long participantId;

        public Long getParticipantId() {
            return participantId;
        }

        public void setParticipantId(Long participantId) {
            this.participantId = participantId;
        }
    }

    /**
     * Request class for creating a group conversation.
     */
    public static class GroupConversationRequest {
        private String name;
        private String description;
        private Set<Long> participantIds;

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getDescription() {
            return description;
        }

        public void setDescription(String description) {
            this.description = description;
        }

        public Set<Long> getParticipantIds() {
            return participantIds;
        }

        public void setParticipantIds(Set<Long> participantIds) {
            this.participantIds = participantIds;
        }
    }

    /**
     * Request class for adding participants to a conversation.
     */
    public static class ParticipantsRequest {
        private Set<Long> participantIds;

        public Set<Long> getParticipantIds() {
            return participantIds;
        }

        public void setParticipantIds(Set<Long> participantIds) {
            this.participantIds = participantIds;
        }
    }

    /**
     * Request class for updating a conversation.
     */
    public static class UpdateConversationRequest {
        private String name;
        private String description;
        private String avatarUrl;

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getDescription() {
            return description;
        }

        public void setDescription(String description) {
            this.description = description;
        }

        public String getAvatarUrl() {
            return avatarUrl;
        }

        public void setAvatarUrl(String avatarUrl) {
            this.avatarUrl = avatarUrl;
        }
    }
}
