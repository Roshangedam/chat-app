package com.chat.app.backend.controller;

import com.chat.app.backend.dto.MessageDTO;
import com.chat.app.backend.model.MessageStatus;
import com.chat.app.backend.security.jwt.UserDetailsImpl;
import com.chat.app.backend.service.MessageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

import java.time.LocalDateTime;

/**
 * Controller for handling WebSocket chat messages.
 */
@Controller
public class ChatMessageController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    
    @Autowired
    private MessageService messageService;

    /**
     * Handle messages sent to a conversation.
     *
     * @param messageDTO the message data transfer object
     * @param authentication the authentication object containing sender details
     */
    @MessageMapping("/chat.send")
    public void sendMessage(@Payload MessageDTO messageDTO, Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Long senderId = userDetails.getId();
        
        // Use the message service to send the message
        MessageDTO sentMessage = messageService.sendMessage(senderId, messageDTO.getConversationId(), messageDTO.getContent());
        
        // The message service already handles WebSocket and Kafka distribution
    }

    /**
     * Handle message read status updates.
     *
     * @param messageDTO the message data transfer object containing conversation ID
     * @param authentication the authentication object containing user details
     */
    @MessageMapping("/chat.read")
    public void markMessagesAsRead(@Payload MessageDTO messageDTO, Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Long userId = userDetails.getId();
        
        // Mark messages as read in the conversation
        int messagesRead = messageService.markMessagesAsRead(userId, messageDTO.getConversationId());
        
        // Notify about read status if any messages were marked as read
        if (messagesRead > 0) {
            // Create a status update DTO
            MessageDTO statusUpdate = new MessageDTO();
            statusUpdate.setConversationId(messageDTO.getConversationId());
            statusUpdate.setStatus(MessageStatus.READ);
            statusUpdate.setReadAt(LocalDateTime.now());
            
            // Send to the conversation topic
            messagingTemplate.convertAndSend(
                    "/topic/conversation." + messageDTO.getConversationId() + ".status",
                    statusUpdate
            );
        }
    }
}