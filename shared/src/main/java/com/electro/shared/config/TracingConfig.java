package com.electro.shared.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

/**
 * RestTemplate mac dinh qua {@link RestTemplateBuilder} de Micrometer gan Trace ID vao HTTP header.
 * Service co bean rieng (vd GHNConfig) uu tien; bean nay chi tao khi chua co.
 */
@Configuration
public class TracingConfig {

    @Bean
    @ConditionalOnMissingBean(RestTemplate.class)
    public RestTemplate restTemplate(RestTemplateBuilder builder) {
        return builder.build();
    }
}
