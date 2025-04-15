package com.solar.core_services.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Configuration class to enable scheduling in the application.
 * This allows the use of @Scheduled annotations for automated tasks.
 */
@Configuration
@EnableScheduling
public class SchedulingConfig {
    // No additional configuration needed - @EnableScheduling does the work
} 