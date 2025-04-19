package com.chat.app.backend.service;

import com.chat.app.backend.model.User;
import com.chat.app.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * Service for user-related operations.
 */
@Service
public class UserService {

    private static final Logger logger = LoggerFactory.getLogger(UserService.class);

    @Autowired
    private UserRepository userRepository;

    /**
     * Find a user by username.
     *
     * @param username the username to search for
     * @return the user if found, null otherwise
     */
    public User findByUsername(String username) {
        logger.debug("Finding user by username: {}", username);
        Optional<User> user = userRepository.findByUsername(username);
        if (user.isPresent()) {
            logger.debug("User found: {}", username);
            return user.get();
        } else {
            logger.debug("User not found: {}", username);
            return null;
        }
    }

    /**
     * Find a user by email.
     *
     * @param email the email to search for
     * @return the user if found, null otherwise
     */
    public User findByEmail(String email) {
        logger.debug("Finding user by email: {}", email);
        Optional<User> user = userRepository.findByEmail(email);
        if (user.isPresent()) {
            logger.debug("User found with email: {}", email);
            return user.get();
        } else {
            logger.debug("User not found with email: {}", email);
            return null;
        }
    }

    /**
     * Find a user by OAuth2 provider and provider ID.
     *
     * @param provider the OAuth2 provider (e.g., "google")
     * @param providerId the user ID from the provider
     * @return the user if found, null otherwise
     */
    public User findByProviderAndProviderId(String provider, String providerId) {
        logger.debug("Finding user by provider: {} and providerId: {}", provider, providerId);
        Optional<User> user = userRepository.findByProviderAndProviderId(provider, providerId);
        if (user.isPresent()) {
            logger.debug("User found with provider: {} and providerId: {}", provider, providerId);
            return user.get();
        } else {
            logger.debug("User not found with provider: {} and providerId: {}", provider, providerId);
            return null;
        }
    }

    /**
     * Save a user to the database.
     *
     * @param user the user to save
     * @return the saved user
     */
    public User saveUser(User user) {
        logger.debug("Saving user: {}", user.getUsername());
        return userRepository.save(user);
    }
}