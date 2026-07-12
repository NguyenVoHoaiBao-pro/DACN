package com.electro.auth.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceClientConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.util.StringUtils;

import java.net.URI;

/**
 * Khi dat REDIS_URL (vd redis://:pass@host:6379) — uu tien hon REDIS_HOST/PORT.
 */
@Configuration
@ConditionalOnProperty(name = "REDIS_URL")
public class RedisUrlConfiguration {

    @Bean
    @Primary
    public RedisConnectionFactory redisConnectionFactory(@Value("${REDIS_URL}") String redisUrl) {
        URI uri = URI.create(redisUrl.trim());
        RedisStandaloneConfiguration standalone = new RedisStandaloneConfiguration();
        standalone.setHostName(uri.getHost());
        standalone.setPort(uri.getPort() > 0 ? uri.getPort() : 6379);

        if (StringUtils.hasText(uri.getUserInfo())) {
            String userInfo = uri.getUserInfo();
            int colon = userInfo.indexOf(':');
            if (colon >= 0) {
                standalone.setUsername(userInfo.substring(0, colon));
                standalone.setPassword(userInfo.substring(colon + 1));
            } else {
                standalone.setPassword(userInfo);
            }
        }

        LettuceClientConfiguration.LettuceClientConfigurationBuilder clientBuilder =
                LettuceClientConfiguration.builder();
        if ("rediss".equalsIgnoreCase(uri.getScheme())) {
            clientBuilder.useSsl();
        }

        return new LettuceConnectionFactory(standalone, clientBuilder.build());
    }
}
