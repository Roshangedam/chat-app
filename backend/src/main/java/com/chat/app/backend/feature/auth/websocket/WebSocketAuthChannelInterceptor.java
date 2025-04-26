package com.chat.app.backend.feature.auth.websocket;

import com.chat.app.backend.feature.auth.security.JwtUtils;
import com.chat.app.backend.feature.auth.security.UserDetailsServiceImpl;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.List;

/**
 * WebSocket Channel Interceptor for JWT Authentication.
 * This interceptor extracts the JWT token from WebSocket connection and sets the authentication in the security context.
 */
@Component
public class WebSocketAuthChannelInterceptor implements ChannelInterceptor {

    private static final Logger logger = LoggerFactory.getLogger(WebSocketAuthChannelInterceptor.class);

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private UserDetailsServiceImpl userDetailsService;

    /**
     * Pre-send interceptor method to authenticate WebSocket messages.
     *
     * @param message the message being sent
     * @param channel the channel the message is being sent through
     * @return the message, potentially modified
     */
    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null) {
            logger.debug("Processing WebSocket message with command: {}", accessor.getCommand());

            // Check if this is a CONNECT message (initial WebSocket connection)
            if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                logger.debug("Processing WebSocket CONNECT command");
                logger.debug("WebSocket headers: {}", accessor.getMessageHeaders());

                // Extract token from the headers
                String token = extractTokenFromHeaders(accessor);
                logger.debug("Extracted token: {}", token != null ? "[PRESENT]" : "[NULL]");

                if (token != null && jwtUtils.validateJwtToken(token)) {
                    String username = jwtUtils.getUserNameFromJwtToken(token);
                    logger.debug("WebSocket connection authenticated for user: {}", username);

                    // Load user details and set authentication
                    UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());

                    // Set authentication in the accessor
                    accessor.setUser(authentication);

                    // Also set in SecurityContextHolder for the current thread
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                    logger.debug("Authentication set in SecurityContextHolder");
                } else {
                    logger.warn("Invalid or missing JWT token in WebSocket connection");
                }
            } else {
                // For other commands (SEND, SUBSCRIBE, etc.), ensure authentication is propagated
                if (accessor.getUser() != null) {
                    // Set authentication in SecurityContextHolder for the current thread
                    SecurityContextHolder.getContext().setAuthentication((UsernamePasswordAuthenticationToken) accessor.getUser());
                    logger.debug("Authentication propagated for command: {}", accessor.getCommand());
                } else {
                    logger.warn("No authentication found in WebSocket message: {}", accessor.getCommand());
                }
            }
        }

        return message;
    }

    /**
     * Extract JWT token from WebSocket headers.
     *
     * @param accessor the StompHeaderAccessor containing headers
     * @return the JWT token, or null if not found
     */
    private String extractTokenFromHeaders(StompHeaderAccessor accessor) {
        // Try to get from Authorization header first
        List<String> authorization = accessor.getNativeHeader("Authorization");
        if (authorization != null && !authorization.isEmpty()) {
            String authHeader = authorization.get(0);
            if (StringUtils.hasText(authHeader) && authHeader.startsWith("Bearer ")) {
                return authHeader.substring(7);
            }
        }

        // If not found in Authorization header, try to get from URL parameters
        // This is useful when the token is passed as a URL parameter in the WebSocket connection
        String query = null;

        // Try different ways to get the query string
        List<String> queryHeaders = accessor.getNativeHeader("simpConnectMessage.queryString");
        if (queryHeaders != null && !queryHeaders.isEmpty()) {
            query = queryHeaders.get(0);
        }

        // If not found in headers, try to get from session attributes
        if (accessor.getSessionAttributes() != null) {
            // Try to get the token directly from session attributes (set by HandshakeInterceptor)
            Object tokenObj = accessor.getSessionAttributes().get("token");
            if (tokenObj != null) {
                return tokenObj.toString();
            }

            // If token not found directly, try to get from query string
            if (query == null) {
                Object rawQuery = accessor.getSessionAttributes().get("simpConnectMessage.queryString");
                if (rawQuery != null) {
                    query = rawQuery.toString();
                }
            }
        }

        // If not found in session attributes, try to get directly from the URL
        if (query == null) {
            // Try to get from the session ID which might contain the query string
            String sessionId = accessor.getSessionId();
            if (sessionId != null && sessionId.contains("?")) {
                query = sessionId.substring(sessionId.indexOf("?") + 1);
            }
        }

        // Extract token from query string if found
        if (StringUtils.hasText(query) && query.contains("token=")) {
            String[] params = query.split("&");
            for (String param : params) {
                if (param.startsWith("token=")) {
                    return param.substring(6); // "token=".length() == 6
                }
            }
        }

        // Log headers for debugging
        logger.debug("WebSocket headers: {}", accessor.getMessageHeaders());

        return null;
    }
}
