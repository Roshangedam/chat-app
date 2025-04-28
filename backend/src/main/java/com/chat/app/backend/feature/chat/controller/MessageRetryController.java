package com.chat.app.backend.feature.chat.controller;

import com.chat.app.backend.feature.chat.service.MessageRetryService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/**
 * REST controller for message retry operations.
 */
@RestController
@RequestMapping("/api/v1/messages")
public class MessageRetryController {

    private static final Logger logger = LoggerFactory.getLogger(MessageRetryController.class);

    @Autowired
    private MessageRetryService messageRetryService;

    /**
     * Retry a failed message.
     *
     * @param messageId the ID of the message to retry
     * @return a response indicating success or failure
     */
    @PostMapping("/{messageId}/retry")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> retryMessage(@PathVariable Long messageId) {
        logger.info("Received request to retry message {}", messageId);
        
        boolean success = messageRetryService.retryFailedMessage(messageId);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", success);
        
        if (success) {
            response.put("message", "Message queued for retry");
            return ResponseEntity.ok(response);
        } else {
            response.put("message", "Failed to retry message. Message may not exist or is not in FAILED status.");
            return ResponseEntity.badRequest().body(response);
        }
    }
}
