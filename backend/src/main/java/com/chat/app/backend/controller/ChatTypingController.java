package com.chat.app.backend.controller;

import com.chat.app.backend.dto.TypingIndicatorDTO;
import com.chat.app.backend.security.jwt.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

/**
 * Controller for handling typing indicator WebSocket messages.
 */
@Controller
public class ChatTypingController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    /**
     * Handle typing indicator messages.
     *
     * @param typingIndicator the typing indicator data
     * @param authentication the authentication object containing user details
     */
    @MessageMapping("/chat.typing")
    public void handleTypingIndicator(@Payload TypingIndicatorDTO typingIndicator, Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        // Add the username to the typing indicator
        typingIndicator.setUsername(userDetails.getUsername());
        
        // Broadcast the typing indicator to all subscribers of the conversation's typing topic
        messagingTemplate.convertAndSend(
                "/topic/conversation." + typingIndicator.getConversationId() + ".typing",
                typingIndicator
        );
    }
}
