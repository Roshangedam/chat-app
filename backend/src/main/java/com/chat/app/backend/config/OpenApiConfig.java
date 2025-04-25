package com.chat.app.backend.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeIn;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.info.License;
import io.swagger.v3.oas.annotations.security.OAuthFlow;
import io.swagger.v3.oas.annotations.security.OAuthFlows;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.security.SecuritySchemes;
import io.swagger.v3.oas.annotations.servers.Server;

@OpenAPIDefinition(
        info = @Info(
                contact = @Contact(
                        name = "Chat App Team",
                        email = "rgedam@microproindia.com",
                        url = "https://chat-app/"
                ),
                description = "OpenApi documentation for Chat App with JWT and OAuth2 authentication",
                title = "Chat App API Documentation",
                version = "1.0",
                license = @License(
                        name = "MIT License",
                        url = "https://opensource.org/licenses/MIT"
                ),
                termsOfService = "Terms of service"
        ),
        servers = {
                @Server(
                        description = "Local ENV",
                        url = "http://localhost:8088/api/"
                ),
                @Server(
                        description = "PROD ENV",
                        url = "https://chat-app.ddns.net/api"
                )
        },
        security = {
                @SecurityRequirement(name = "jwt"),
                @SecurityRequirement(name = "oauth2")
        }
)
@SecuritySchemes({
        @SecurityScheme(
                name = "jwt",
                description = "JWT Authentication",
                scheme = "bearer",
                type = SecuritySchemeType.HTTP,
                bearerFormat = "JWT",
                in = SecuritySchemeIn.HEADER
        ),
        @SecurityScheme(
                name = "oauth2",
                description = "OAuth2 Authentication",
                type = SecuritySchemeType.OAUTH2,
                flows = @OAuthFlows(
                        authorizationCode = @OAuthFlow(
                                authorizationUrl = "/oauth2/authorization/google",
                                tokenUrl = "/oauth2/token"
                        )
                ),
                in = SecuritySchemeIn.HEADER
        )
})
public class OpenApiConfig {
}
