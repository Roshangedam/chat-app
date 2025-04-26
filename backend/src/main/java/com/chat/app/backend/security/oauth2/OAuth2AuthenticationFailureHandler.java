package com.chat.app.backend.security.oauth2;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationFailureHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

/**
 * Handler for OAuth2 authentication failures.
 * This class processes the OAuth2 authentication failure and redirects the user
 * to the frontend with an error message.
 */
@Component
public class OAuth2AuthenticationFailureHandler extends SimpleUrlAuthenticationFailureHandler {

    @Value("${app.cors.allowed-origins}")
    private String frontendUrl;

    @Override
    public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response,
                                        AuthenticationException exception) throws IOException, ServletException {

        // Redirect to frontend with error message
        String redirectUrl;
        if ("*".equals(frontendUrl)) {
            // If wildcard is used, default to localhost:4200 for development
            redirectUrl = UriComponentsBuilder.fromUriString("http://localhost:4200")
                    .path("/oauth2/redirect")
                    .queryParam("error", exception.getLocalizedMessage())
                    .build().toUriString();
        } else {
            redirectUrl = UriComponentsBuilder.fromUriString(frontendUrl)
                    .path("/oauth2/redirect")
                    .queryParam("error", exception.getLocalizedMessage())
                    .build().toUriString();
        }

        getRedirectStrategy().sendRedirect(request, response, redirectUrl);
    }
}