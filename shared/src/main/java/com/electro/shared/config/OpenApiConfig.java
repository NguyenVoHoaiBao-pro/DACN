package com.electro.shared.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI electroOpenAPI(
            @Value("${spring.application.name:electro-service}") String serviceName,
            @Value("${server.port:8080}") String port) {
        final String securitySchemeName = "Bearer Authentication";
        return new OpenAPI()
                .info(new Info()
                        .title("Electro Store — " + serviceName)
                        .description("Test truc tiep service nay qua Swagger UI. "
                                + "Dang nhap auth-service (port 8081) lay JWT, roi bam Authorize: Bearer <token>")
                        .version("1.0"))
                .servers(List.of(
                        new Server().url("http://localhost:" + port).description("Service truc tiep"),
                        new Server().url("http://localhost:8080").description("Qua API Gateway")))
                .addSecurityItem(new SecurityRequirement().addList(securitySchemeName))
                .components(new Components()
                        .addSecuritySchemes(securitySchemeName, new SecurityScheme()
                                .name(securitySchemeName)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")));
    }
}
