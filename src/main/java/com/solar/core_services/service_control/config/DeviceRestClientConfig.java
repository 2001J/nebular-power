package com.solar.core_services.service_control.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.web.client.RestClientCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.web.client.RestClient;

import java.time.Duration;

/**
 * Configuration for RestClient used in device command transmission.
 */
@Configuration
@RequiredArgsConstructor
@Slf4j
public class DeviceRestClientConfig {
    
    private final DeviceCommandProperties properties;
    
    @Bean(name = "deviceCommandRestClient")
    public RestClient deviceCommandRestClient(RestClient.Builder builder) {
        return builder
                .baseUrl(properties.getBaseUrl())
                .requestInterceptor(loggingInterceptor())
                .build();
    }
    
    @Bean
    public RestClientCustomizer restClientCustomizer() {
        return restClientBuilder -> restClientBuilder
                .requestFactory(new org.springframework.http.client.SimpleClientHttpRequestFactory() {
                    {
                        setConnectTimeout(Duration.ofMillis(properties.getConnectionTimeout()));
                        setReadTimeout(Duration.ofMillis(properties.getReadTimeout()));
                    }
                });
    }
    
    /**
     * Interceptor for logging HTTP requests and responses.
     */
    private ClientHttpRequestInterceptor loggingInterceptor() {
        return (request, body, execution) -> {
            log.debug("Sending device command: {} {}", request.getMethod(), request.getURI());
            
            var response = execution.execute(request, body);
            
            log.debug("Device command response: {} (status: {})", 
                    request.getURI(), response.getStatusCode());
            
            return response;
        };
    }
}
