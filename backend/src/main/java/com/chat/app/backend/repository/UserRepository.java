package com.chat.app.backend.repository;

import com.chat.app.backend.model.User;
import com.chat.app.backend.model.UserStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository interface for User entity operations.
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    /**
     * Find a user by username.
     *
     * @param username the username to search for
     * @return an Optional containing the user if found
     */
    Optional<User> findByUsername(String username);

    /**
     * Find a user by email.
     *
     * @param email the email to search for
     * @return an Optional containing the user if found
     */
    Optional<User> findByEmail(String email);

    /**
     * Check if a username is already taken.
     *
     * @param username the username to check
     * @return true if the username exists, false otherwise
     */
    boolean existsByUsername(String username);

    /**
     * Check if an email is already registered.
     *
     * @param email the email to check
     * @return true if the email exists, false otherwise
     */
    boolean existsByEmail(String email);

    /**
     * Find users by status.
     *
     * @param status the status to search for
     * @return a list of users with the specified status
     */
    List<User> findByStatus(UserStatus status);

    /**
     * Find users by username containing the given string (case insensitive).
     *
     * @param username the username pattern to search for
     * @return a list of users matching the pattern
     */
    List<User> findByUsernameContainingIgnoreCase(String username);

    /**
     * Find a user by OAuth2 provider and provider ID.
     *
     * @param provider the OAuth2 provider (e.g., "google")
     * @param providerId the provider-specific user ID
     * @return an Optional containing the user if found
     */
    Optional<User> findByProviderAndProviderId(String provider, String providerId);
}