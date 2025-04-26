package com.chat.app.backend.feature.auth.oauth2;

import com.chat.app.backend.feature.auth.security.JwtUtils;
import com.chat.app.backend.feature.user.model.Role;
import com.chat.app.backend.feature.user.model.User;
import com.chat.app.backend.feature.user.repository.RoleRepository;
import com.chat.app.backend.feature.user.repository.UserRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Handler for successful OAuth2 authentication.
 * This class processes the OAuth2 authentication response and redirects the user
 * to the frontend with a JWT token.
 */
@Component
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {
        OAuth2AuthenticationToken oauthToken = (OAuth2AuthenticationToken) authentication;
        OAuth2User oAuth2User = oauthToken.getPrincipal();
        String provider = oauthToken.getAuthorizedClientRegistrationId();

        // Extract user details from OAuth2 response
        Map<String, Object> attributes = oAuth2User.getAttributes();
        String email = (String) attributes.get("email");
        String name = (String) attributes.get("name");
        String providerId = (String) attributes.get("sub"); // Google uses "sub" as the user ID

        // Find or create user
        User user = processOAuth2User(provider, providerId, email, name);

        // Generate JWT token
        String token = jwtUtils.generateJwtToken(user);

        // Redirect to frontend with token
        String redirectUrl;
        if ("*".equals(frontendUrl)) {
            // If wildcard is used, default to localhost:4200 for development
            redirectUrl = UriComponentsBuilder.fromUriString("http://localhost:4200")
                    .path("/oauth2/redirect")
                    .queryParam("token", token)
                    .build().toUriString();
        } else {
            redirectUrl = UriComponentsBuilder.fromUriString(frontendUrl)
                    .path("/oauth2/redirect")
                    .queryParam("token", token)
                    .build().toUriString();
        }

        getRedirectStrategy().sendRedirect(request, response, redirectUrl);
    }

    /**
     * Process OAuth2 user information - either find existing user or create a new one.
     *
     * @param provider   the OAuth2 provider (e.g., "google")
     * @param providerId the user ID from the provider
     * @param email      the user's email
     * @param name       the user's full name
     * @return the user entity
     */
    private User processOAuth2User(String provider, String providerId, String email, String name) {
        // Try to find user by provider and providerId
        Optional<User> userOptional = userRepository.findByProviderAndProviderId(provider, providerId);

        if (userOptional.isPresent()) {
            // User exists, update information if needed
            User existingUser = userOptional.get();
            existingUser.setFullName(name);
            existingUser.setUpdatedAt(LocalDateTime.now());
            return userRepository.save(existingUser);
        } else {
            // Try to find user by email
            userOptional = userRepository.findByEmail(email);

            if (userOptional.isPresent()) {
                // User exists with email, link OAuth2 provider
                User existingUser = userOptional.get();
                existingUser.setProvider(provider);
                existingUser.setProviderId(providerId);
                existingUser.setFullName(name);
                existingUser.setUpdatedAt(LocalDateTime.now());
                return userRepository.save(existingUser);
            } else {
                // Create new user
                User newUser = new User();
                newUser.setEmail(email);
                // Generate a username from email (remove @ and domain)
                String username = email.substring(0, email.indexOf('@'));
                // Ensure username is unique
                if (userRepository.existsByUsername(username)) {
                    username = username + providerId.substring(0, 5);
                }
                newUser.setUsername(username);
                newUser.setFullName(name);
                newUser.setProvider(provider);
                newUser.setProviderId(providerId);
                newUser.setPassword(""); // No password for OAuth2 users
                newUser.setCreatedAt(LocalDateTime.now());
                newUser.setUpdatedAt(LocalDateTime.now());

                // Assign default role
                Set<Role> roles = new HashSet<>();
                Role userRole = roleRepository.findByName("ROLE_USER")
                        .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
                roles.add(userRole);
                newUser.setRoles(roles);

                return userRepository.save(newUser);
            }
        }
    }
}