package com.chat.app.backend.feature.chat.service;

import com.chat.app.backend.feature.chat.dto.MessageDTO;
import com.chat.app.backend.feature.chat.model.Message;
import org.springframework.stereotype.Component;

/**
 * Mapper for converting between Message entities and DTOs.
 */
@Component
public class MessageMapper {

    /**
     * Convert a Message entity to a MessageDTO.
     *
     * @param message the message entity
     * @return the message DTO
     */
    public MessageDTO toDTO(Message message) {
        if (message == null) {
            return null;
        }

        MessageDTO dto = new MessageDTO();
        dto.setId(message.getId());
        dto.setConversationId(message.getConversation().getId());
        dto.setSenderId(message.getSender().getId());
        dto.setSenderUsername(message.getSender().getUsername());
        dto.setContent(message.getContent());
        dto.setSentAt(message.getSentAt());
        dto.setDeliveredAt(message.getDeliveredAt());
        dto.setReadAt(message.getReadAt());
        dto.setStatus(message.getStatus());

        return dto;
    }
}
