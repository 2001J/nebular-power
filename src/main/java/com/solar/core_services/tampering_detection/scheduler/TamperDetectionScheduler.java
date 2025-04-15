package com.solar.core_services.tampering_detection.scheduler;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.tampering_detection.model.TamperEvent;
import com.solar.core_services.tampering_detection.repository.TamperEventRepository;
import com.solar.core_services.tampering_detection.service.SecurityLogService;
import com.solar.core_services.tampering_detection.service.TamperDetectionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class TamperDetectionScheduler {

    private final TamperDetectionService tamperDetectionService;
    private final TamperEventRepository tamperEventRepository;
    private final SolarInstallationRepository solarInstallationRepository;
    private final SecurityLogService securityLogService;

    /**
     * Run diagnostics on all installations daily at 2 AM
     */
    @Scheduled(cron = "0 0 2 * * ?")
    public void runDailyDiagnostics() {
        log.info("Running daily diagnostics for all installations");
        
        List<SolarInstallation> installations = solarInstallationRepository.findAll();
        
        for (SolarInstallation installation : installations) {
            try {
                if (tamperDetectionService.isMonitoring(installation.getId())) {
                    tamperDetectionService.runDiagnostics(installation.getId());
                    log.info("Diagnostics completed for installation ID: {}", installation.getId());
                }
            } catch (Exception e) {
                log.error("Error running diagnostics for installation ID: {}", installation.getId(), e);
            }
        }
    }

    /**
     * Escalate unresolved critical and high severity tamper events every 4 hours
     */
    @Scheduled(cron = "0 0 */4 * * ?")
    public void escalateUnresolvedAlerts() {
        log.info("Checking for unresolved critical and high severity tamper events");
        
        List<TamperEvent> unresolvedEvents = tamperEventRepository.findByResolvedFalseOrderByTimestampDesc();
        
        LocalDateTime fourHoursAgo = LocalDateTime.now().minusHours(4);
        
        for (TamperEvent event : unresolvedEvents) {
            // Only escalate critical and high severity events that are older than 4 hours
            if ((event.getSeverity() == TamperEvent.TamperSeverity.CRITICAL || 
                 event.getSeverity() == TamperEvent.TamperSeverity.HIGH) && 
                event.getTimestamp().isBefore(fourHoursAgo)) {
                
                log.info("Escalating unresolved tamper event ID: {}", event.getId());
                
                // Log the escalation
                securityLogService.createSecurityLog(
                        event.getInstallation().getId(),
                        com.solar.core_services.tampering_detection.model.SecurityLog.ActivityType.ALERT_GENERATED,
                        "ESCALATION: Unresolved " + event.getSeverity() + " tamper event from " + 
                                event.getTimestamp() + " - " + event.getDescription(),
                        null,
                        null,
                        "SYSTEM"
                );
                
                // In a real implementation, this would trigger additional notifications
                // or other escalation procedures
            }
        }
    }

    /**
     * Check for installations that should be monitored but aren't every hour
     */
    @Scheduled(cron = "0 0 * * * ?")
    public void checkMonitoringStatus() {
        log.info("Checking monitoring status for all installations");
        
        List<SolarInstallation> installations = solarInstallationRepository.findAll();
        
        for (SolarInstallation installation : installations) {
            try {
                // In a real implementation, there would be logic to determine if an installation
                // should be monitored (e.g., based on subscription status)
                boolean shouldBeMonitored = installation.getStatus() == SolarInstallation.InstallationStatus.ACTIVE;
                boolean isMonitored = tamperDetectionService.isMonitoring(installation.getId());
                
                if (shouldBeMonitored && !isMonitored) {
                    log.info("Starting monitoring for installation ID: {} that should be monitored but isn't", 
                            installation.getId());
                    tamperDetectionService.startMonitoring(installation.getId());
                } else if (!shouldBeMonitored && isMonitored) {
                    log.info("Stopping monitoring for installation ID: {} that shouldn't be monitored but is", 
                            installation.getId());
                    tamperDetectionService.stopMonitoring(installation.getId());
                }
            } catch (Exception e) {
                log.error("Error checking monitoring status for installation ID: {}", installation.getId(), e);
            }
        }
    }
} 