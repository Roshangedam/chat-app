package com.chat.app.backend.controller;

import com.chat.app.backend.dto.TypingIndicatorDTO;
import com.chat.app.backend.security.jwt.UserDetailsImpl;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private static final Logger logger = LoggerFactory.getLogger(ChatTypingController.class);

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
        if (authentication == null) {
            logger.error("Authentication is null in handleTypingIndicator");
            return;
        }

        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

            // Add the username to the typing indicator
            typingIndicator.setUsername(userDetails.getUsername());

            // Broadcast the typing indicator to all subscribers of the conversation's typing topic
            messagingTemplate.convertAndSend(
                    "/topic/conversation." + typingIndicator.getConversationId() + ".typing",
                    typingIndicator
            );
        } catch (Exception e) {
            logger.error("Error in handleTypingIndicator: {}", e.getMessage(), e);
        }
    }
}
