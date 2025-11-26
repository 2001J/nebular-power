package com.solar.core_services.service_control.scheduler;

import com.solar.core_services.service_control.service.DeviceCommandService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduler for automated device command maintenance tasks.
 * Handles command expiration and automatic retry processing.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "device.command.scheduler.enabled", havingValue = "true", matchIfMissing = true)
public class CommandScheduler {
    
    private final DeviceCommandService commandService;
    
    /**
     * Processes expired commands every 30 minutes.
     * Commands that have passed their expiration time and are still in
     * PENDING, SENT, DELIVERED, or QUEUED status will be marked as EXPIRED.
     */
    @Scheduled(cron = "${device.command.expiration.cron:0 */30 * * * *}")
    public void processExpiredCommands() {
        log.debug("Running scheduled command expiration check");
        try {
            commandService.processExpiredCommands();
            log.debug("Command expiration check completed successfully");
        } catch (Exception e) {
            log.error("Error processing expired commands", e);
        }
    }
    
    /**
     * Processes command retries every 5 minutes.
     * Failed commands that haven't exceeded the maximum retry count
     * and have waited the minimum retry delay will be retransmitted.
     */
    @Scheduled(cron = "${device.command.retry.cron:0 */5 * * * *}")
    public void processCommandRetries() {
        log.debug("Running scheduled command retry process");
        try {
            commandService.processCommandRetries();
            log.debug("Command retry process completed successfully");
        } catch (Exception e) {
            log.error("Error processing command retries", e);
        }
    }
}
