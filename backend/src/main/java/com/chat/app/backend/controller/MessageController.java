package com.chat.app.backend.controller;

import com.chat.app.backend.dto.MessageDTO;
import com.chat.app.backend.security.jwt.UserDetailsImpl;
import com.chat.app.backend.service.MessageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST Controller for message operations.
 */
@RestController
@RequestMapping("/api/v1/messages")
public class MessageController {

    @Autowired
    private MessageService messageService;

    /**
     * Get messages for a conversation with pagination.
     *
     * @param conversationId the conversation ID
     * @param page the page number (0-based)
     * @param size the page size
     * @return a page of message DTOs
     */
    @GetMapping("/conversation/{conversationId}")
    public ResponseEntity<List<MessageDTO>> getMessagesForConversation(
            @PathVariable Long conversationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Page<MessageDTO> messagesPage = messageService.getMessagesForConversation(conversationId, page, size);
        List<MessageDTO> messages = messagesPage.getContent();
        return ResponseEntity.ok(messages);
    }

    /**
     * Send a new message to a conversation.
     *
     * @param conversationId the conversation ID
     * @param messageDTO the message data
     * @param userDetails the authenticated user details
     * @return the sent message DTO
     */
    @PostMapping("/conversation/{conversationId}")
    public ResponseEntity<MessageDTO> sendMessage(
            @PathVariable Long conversationId,
            @RequestBody MessageDTO messageDTO,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        Long senderId = userDetails.getId();
        MessageDTO sentMessage = messageService.sendMessage(senderId, conversationId, messageDTO.getContent());
        return ResponseEntity.ok(sentMessage);
    }

    /**
     * Mark all messages in a conversation as read.
     *
     * @param conversationId the conversation ID
     * @param userDetails the authenticated user details
     * @return the number of messages marked as read
     */
    @PutMapping("/conversation/{conversationId}/read")
    public ResponseEntity<Integer> markMessagesAsRead(
            @PathVariable Long conversationId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        Long userId = userDetails.getId();
        int messagesRead = messageService.markMessagesAsRead(userId, conversationId);
        return ResponseEntity.ok(messagesRead);
    }

    /**
     * Get the count of unread messages for a user in a conversation.
     *
     * @param conversationId the conversation ID
     * @param userDetails the authenticated user details
     * @return the count of unread messages
     */
    @GetMapping("/conversation/{conversationId}/unread/count")
    public ResponseEntity<Long> getUnreadMessageCount(
            @PathVariable Long conversationId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        Long userId = userDetails.getId();
        long unreadCount = messageService.getUnreadMessageCount(userId, conversationId);
        return ResponseEntity.ok(unreadCount);
    }

    /**
     * Get the latest messages for each conversation a user is part of.
     *
     * @param userDetails the authenticated user details
     * @return a list of the latest message DTOs
     */
    @GetMapping("/latest")
    public ResponseEntity<List<MessageDTO>> getLatestMessagesForUser(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        Long userId = userDetails.getId();
        List<MessageDTO> latestMessages = messageService.getLatestMessagesForUser(userId);
        return ResponseEntity.ok(latestMessages);
    }
}