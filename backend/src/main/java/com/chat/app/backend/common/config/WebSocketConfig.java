package com.chat.app.backend.common.config;

import com.chat.app.backend.feature.auth.websocket.WebSocketAuthChannelInterceptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;

/**
 * WebSocket Configuration.
 * This class configures WebSocket support for real-time messaging.
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Autowired
    private WebSocketAuthChannelInterceptor webSocketAuthChannelInterceptor;

    @Autowired
    private Environment env;

    /**
     * Configure message broker options.
     *
     * @param config the MessageBrokerRegistry to configure
     */
    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Enable a simple in-memory message broker to carry messages back to the client on destinations prefixed with /topic
        config.enableSimpleBroker("/topic", "/queue");

        // Set prefix for messages bound for @MessageMapping methods
        config.setApplicationDestinationPrefixes("/app");

        // Set prefix for user-specific messages
        config.setUserDestinationPrefix("/user");
    }

    /**
     * Register STOMP endpoints mapping each to a specific URL and enabling SockJS fallback options.
     *
     * @param registry the StompEndpointRegistry to configure
     */
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Register the "/ws" endpoint, enabling SockJS fallback options
        // Get allowed origins from application properties
        String allowedOriginsStr = env.getProperty("app.cors.allowed-origins");

        // Create the handshake interceptor
        HandshakeInterceptor handshakeInterceptor = new HandshakeInterceptor() {
            @Override
            public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                          WebSocketHandler wsHandler, Map<String, Object> attributes) {
                // Extract token from URL query parameters
                if (request instanceof ServletServerHttpRequest) {
                    ServletServerHttpRequest servletRequest = (ServletServerHttpRequest) request;
                    String token = servletRequest.getServletRequest().getParameter("token");
                    if (token != null) {
                        attributes.put("token", token);
                    }
                }
                return true;
            }

            @Override
            public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                      WebSocketHandler wsHandler, Exception exception) {
                // No action needed after handshake
            }
        };

        // Configure the endpoint
        if (allowedOriginsStr != null && allowedOriginsStr.trim().equals("*")) {
            // For wildcard origin, use allowedOriginPatterns instead of allowedOrigins
            registry.addEndpoint("/ws")
                    .setAllowedOriginPatterns("*")
                    .withSockJS()
                    .setInterceptors(handshakeInterceptor);
        } else if (allowedOriginsStr != null && !allowedOriginsStr.trim().isEmpty()) {
            // If specific origins are configured, use them
            registry.addEndpoint("/ws")
                    .setAllowedOrigins(allowedOriginsStr.split(","))
                    .withSockJS()
                    .setInterceptors(handshakeInterceptor);
        } else {
            // Default to allow all origins
            registry.addEndpoint("/ws")
                    .setAllowedOriginPatterns("*")
                    .withSockJS()
                    .setInterceptors(handshakeInterceptor);
        }
    }

    /**
     * Configure the channel interceptors.
     *
     * @param registration the ChannelRegistration to configure
     */
    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        // Add authentication channel interceptor
        registration.interceptors(webSocketAuthChannelInterceptor);
    }
}