package com.solar.core_services.service_control.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration properties for device command transmission.
 */
@Configuration
@ConfigurationProperties(prefix = "device.command")
@Data
public class DeviceCommandProperties {
    
    /**
     * Base URL for device HTTP endpoints.
     * Example: "http://device-gateway.local" or "https://api.devices.example.com"
     */
    private String baseUrl = "http://localhost:8081";
    
    /**
     * Path template for device command endpoint.
     * Supports {installationId} placeholder.
     */
    private String commandPath = "/api/devices/{installationId}/commands";
    
    /**
     * Connection timeout in milliseconds.
     */
    private int connectionTimeout = 5000;
    
    /**
     * Read timeout in milliseconds.
     */
    private int readTimeout = 10000;
    
    /**
     * Maximum retry attempts for failed transmissions.
     */
    private int maxRetries = 3;
    
    /**
     * Initial backoff delay in milliseconds for retry.
     */
    private long retryBackoffMs = 1000;
    
    /**
     * Maximum time in seconds to consider device heartbeat as valid.
     * If last heartbeat is older than this, device is considered offline.
     */
    private int heartbeatValiditySeconds = 300; // 5 minutes
    
    /**
     * Enable simulation mode (doesn't actually send HTTP requests).
     */
    private boolean simulationMode = true;
}
