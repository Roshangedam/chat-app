package com.chat.app.backend.repository;

import com.chat.app.backend.model.Conversation;
import com.chat.app.backend.model.Message;
import com.chat.app.backend.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Repository interface for Message entity operations.
 */
@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    /**
     * Find all messages in a conversation, ordered by sent time.
     *
     * @param conversation the conversation to find messages for
     * @param pageable pagination information
     * @return a page of messages in the conversation
     */
    Page<Message> findByConversationOrderBySentAtDesc(Conversation conversation, Pageable pageable);

    /**
     * Find all messages sent by a specific user in a conversation.
     *
     * @param sender the user who sent the messages
     * @param conversation the conversation the messages were sent in
     * @return a list of messages sent by the user in the conversation
     */
    List<Message> findBySenderAndConversation(User sender, Conversation conversation);

    /**
     * Find all unread messages for a specific user in a conversation.
     *
     * @param conversation the conversation to check
     * @param user the user to find unread messages for
     * @return a list of unread messages
     */
    @Query("SELECT m FROM Message m WHERE m.conversation = :conversation " +
           "AND m.sender != :user AND (m.readAt IS NULL OR m.status != 'READ')")
    List<Message> findUnreadMessagesForUser(@Param("conversation") Conversation conversation, @Param("user") User user);

    /**
     * Count the number of unread messages for a specific user in a conversation.
     *
     * @param conversation the conversation to check
     * @param user the user to count unread messages for
     * @return the count of unread messages
     */
    @Query("SELECT COUNT(m) FROM Message m WHERE m.conversation = :conversation " +
           "AND m.sender != :user AND (m.readAt IS NULL OR m.status != 'READ')")
    long countUnreadMessagesForUser(@Param("conversation") Conversation conversation, @Param("user") User user);

    /**
     * Find messages sent after a specific time in a conversation.
     *
     * @param conversation the conversation to find messages in
     * @param timestamp the time after which to find messages
     * @return a list of messages sent after the specified time
     */
    List<Message> findByConversationAndSentAtAfterOrderBySentAtAsc(Conversation conversation, LocalDateTime timestamp);

    /**
     * Find the latest message in each conversation for a user.
     *
     * @param userId the ID of the user to find conversations for
     * @return a list of the latest messages in each conversation
     */
    @Query("SELECT m FROM Message m WHERE m.id IN " +
           "(SELECT MAX(m2.id) FROM Message m2 WHERE m2.conversation IN " +
           "(SELECT c FROM Conversation c JOIN c.participants p WHERE p.id = :userId))")
    List<Message> findLatestMessagesForUser(@Param("userId") Long userId);
}