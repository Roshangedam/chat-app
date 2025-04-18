package com.chat.app.backend.repository;

import com.chat.app.backend.model.Conversation;
import com.chat.app.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository interface for Conversation entity operations.
 */
@Repository
public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    /**
     * Find all conversations that a user participates in.
     *
     * @param user the user to find conversations for
     * @return a list of conversations the user participates in
     */
    @Query("SELECT c FROM Conversation c JOIN c.participants p WHERE p = :user")
    List<Conversation> findByParticipant(@Param("user") User user);

    /**
     * Find all group conversations that a user participates in.
     *
     * @param user the user to find group conversations for
     * @return a list of group conversations the user participates in
     */
    @Query("SELECT c FROM Conversation c JOIN c.participants p WHERE p = :user AND c.isGroupChat = true")
    List<Conversation> findGroupConversationsByParticipant(@Param("user") User user);

    /**
     * Find all one-to-one conversations that a user participates in.
     *
     * @param user the user to find one-to-one conversations for
     * @return a list of one-to-one conversations the user participates in
     */
    @Query("SELECT c FROM Conversation c JOIN c.participants p WHERE p = :user AND c.isGroupChat = false")
    List<Conversation> findOneToOneConversationsByParticipant(@Param("user") User user);

    /**
     * Find a one-to-one conversation between two users.
     *
     * @param user1 the first user
     * @param user2 the second user
     * @return an Optional containing the conversation if found
     */
    @Query("SELECT c FROM Conversation c JOIN c.participants p1 JOIN c.participants p2 " +
           "WHERE c.isGroupChat = false AND p1 = :user1 AND p2 = :user2")
    Optional<Conversation> findOneToOneConversation(@Param("user1") User user1, @Param("user2") User user2);

    /**
     * Find conversations by name containing the given string (case insensitive).
     *
     * @param name the name pattern to search for
     * @return a list of conversations matching the pattern
     */
    List<Conversation> findByNameContainingIgnoreCase(String name);

    /**
     * Find conversations created by a specific user.
     *
     * @param creator the user who created the conversations
     * @return a list of conversations created by the user
     */
    List<Conversation> findByCreator(User creator);
}