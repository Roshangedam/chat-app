package com.chat.app.backend.feature.chat.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.chat.app.backend.feature.chat.model.Conversation;
import com.chat.app.backend.feature.chat.model.Message;
import com.chat.app.backend.feature.chat.model.MessageStatus;
import com.chat.app.backend.feature.user.model.User;

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
     * Find all messages in a conversation, ordered by sent time ascending (oldest first).
     *
     * @param conversation the conversation to find messages for
     * @param pageable pagination information
     * @return a page of messages in the conversation
     */
    Page<Message> findByConversationOrderBySentAtAsc(Conversation conversation, Pageable pageable);

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

    /**
     * Find pending messages (sent but not delivered) for a user in a conversation.
     * These are messages that were sent while the user was offline.
     *
     * @param conversation the conversation to check
     * @param user the user to find pending messages for
     * @return a list of pending messages
     */
    @Query("SELECT m FROM Message m WHERE m.conversation = :conversation " +
           "AND m.sender != :user AND m.status = 'SENT' AND m.deliveredAt IS NULL")
    List<Message> findPendingMessagesForUser(@Param("conversation") Conversation conversation, @Param("user") User user);

    /**
     * Find messages by status.
     *
     * @param status the status to find messages for
     * @return a list of messages with the specified status
     */
    List<Message> findByStatus(MessageStatus status);

    /**
     * Find messages by status with a limit on retry count.
     *
     * @param status the status to find messages for
     * @param maxRetryCount the maximum retry count
     * @return a list of messages with the specified status and retry count less than or equal to maxRetryCount
     */
    @Query("SELECT m FROM Message m WHERE m.status = :status AND m.retryCount <= :maxRetryCount")
    List<Message> findByStatusAndRetryCountLessThanEqual(@Param("status") MessageStatus status, @Param("maxRetryCount") Integer maxRetryCount);

    /**
     * Find messages sent to a specific user with a specific status.
     *
     * @param user the recipient user
     * @param status the message status
     * @return a list of messages sent to the user with the specified status
     */
    @Query("SELECT m FROM Message m JOIN m.conversation c JOIN c.participants p " +
           "WHERE p.id = :#{#user.id} AND m.sender.id != :#{#user.id} AND m.status = :status")
    List<Message> findBySentToUserAndStatus(@Param("user") User user, @Param("status") MessageStatus status);

    /**
     * Find messages in a conversation with a specific status and not from a specific sender.
     *
     * @param conversation the conversation
     * @param status the message status
     * @param sender the sender to exclude
     * @return a list of messages in the conversation with the specified status and not from the specified sender
     */
    @Query("SELECT m FROM Message m WHERE m.conversation = :conversation AND m.status = :status AND m.sender != :sender")
    List<Message> findByConversationAndStatusAndSenderNot(
            @Param("conversation") Conversation conversation,
            @Param("status") MessageStatus status,
            @Param("sender") User sender);

    /**
     * Find messages in conversations where a user is a participant and sent after a specific time.
     *
     * @param user the participant user
     * @param since the time after which messages were sent
     * @return a list of messages in the user's conversations sent after the specified time
     */
    @Query("SELECT m FROM Message m JOIN m.conversation c JOIN c.participants p " +
           "WHERE p.id = :#{#user.id} AND m.sentAt > :since ORDER BY m.sentAt ASC")
    List<Message> findByConversationParticipantAndSentAtAfter(@Param("user") User user, @Param("since") LocalDateTime since);
}