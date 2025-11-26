package com.solar.core_services.service_control.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration properties for device command scheduling and lifecycle management.
 */
@Configuration
@ConfigurationProperties(prefix = "device.command")
@Data
public class CommandSchedulerConfig {
    
    /**
     * Scheduler configuration
     */
    private SchedulerConfig scheduler = new SchedulerConfig();
    
    /**
     * Command expiration configuration
     */
    private ExpirationConfig expiration = new ExpirationConfig();
    
    /**
     * Command retry configuration
     */
    private RetryConfig retry = new RetryConfig();
    
    @Data
    public static class SchedulerConfig {
        /**
         * Enable/disable automatic command expiration and retry processing
         */
        private boolean enabled = true;
    }
    
    @Data
    public static class ExpirationConfig {
        /**
         * Command expiration time in hours (default: 24 hours)
         */
        private int hours = 24;
        
        /**
         * Cron expression for expiration check (default: every 30 minutes)
         */
        private String cron = "0 */30 * * * *";
    }
    
    @Data
    public static class RetryConfig {
        /**
         * Maximum retry attempts for failed commands (default: 3)
         */
        private int maxAttempts = 3;
        
        /**
         * Minimum delay in minutes between retry attempts (default: 5 minutes)
         */
        private int delayMinutes = 5;
        
        /**
         * Cron expression for retry processing (default: every 5 minutes)
         */
        private String cron = "0 */5 * * * *";
    }
}
