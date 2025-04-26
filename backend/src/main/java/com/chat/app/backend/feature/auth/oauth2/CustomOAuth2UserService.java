package com.chat.app.backend.feature.auth.oauth2;

import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

/**
 * Custom OAuth2 user service for loading user details from OAuth2 providers.
 * This service extends the default OAuth2 user service and can be customized
 * to handle specific OAuth2 provider responses.
 */
@Service
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    /**
     * Load a user by OAuth2 user request.
     * This method is called after the OAuth2 provider has authenticated the user
     * and returned the user information.
     *
     * @param userRequest the OAuth2 user request
     * @return the OAuth2 user
     * @throws OAuth2AuthenticationException if an error occurs during authentication
     */
    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);
        
        // You can process the OAuth2 user information here if needed
        // For example, you can extract additional attributes or transform the user information
        
        return oAuth2User;
    }
}