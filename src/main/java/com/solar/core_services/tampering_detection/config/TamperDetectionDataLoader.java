package com.solar.core_services.tampering_detection.config;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.tampering_detection.model.AlertConfig;
import com.solar.core_services.tampering_detection.model.TamperEvent;
import com.solar.core_services.tampering_detection.repository.AlertConfigRepository;
import com.solar.core_services.tampering_detection.repository.TamperEventRepository;
import com.solar.core_services.tampering_detection.service.TamperDetectionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

/**
 * Data loader for initializing sample data for the tamper detection system.
 * Only runs in the "dev" profile to avoid loading sample data in production.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@Profile("dev")
public class TamperDetectionDataLoader implements CommandLineRunner {

    private final SolarInstallationRepository installationRepository;
    private final AlertConfigRepository alertConfigRepository;
    private final TamperEventRepository tamperEventRepository;
    private final TamperDetectionService tamperDetectionService;

    @Override
    public void run(String... args) {
        log.info("Loading sample data for tamper detection system");
        
        // Check if data already exists
        if (installationRepository.count() > 0) {
            log.info("Sample data already exists, skipping initialization");
            return;
        }
        
        // Create sample installations
        SolarInstallation installation1 = new SolarInstallation();
        installation1.setName("Residential Installation 1");
        installation1.setLocation("123 Main St, Anytown, USA");
        installation1.setCapacity(5.5);
        installation1.setInstallationDate(LocalDateTime.now().minusMonths(6));
        installation1.setStatus(SolarInstallation.InstallationStatus.ACTIVE);
        
        SolarInstallation installation2 = new SolarInstallation();
        installation2.setName("Commercial Installation 1");
        installation2.setLocation("456 Business Ave, Anytown, USA");
        installation2.setCapacity(25.0);
        installation2.setInstallationDate(LocalDateTime.now().minusMonths(3));
        installation2.setStatus(SolarInstallation.InstallationStatus.ACTIVE);
        
        List<SolarInstallation> installations = installationRepository.saveAll(Arrays.asList(installation1, installation2));
        
        // Start monitoring for all installations
        for (SolarInstallation installation : installations) {
            tamperDetectionService.startMonitoring(installation.getId());
        }
        
        // Create sample tamper events
        TamperEvent event1 = new TamperEvent();
        event1.setInstallation(installation1);
        event1.setEventType(TamperEvent.TamperEventType.PHYSICAL_MOVEMENT);
        event1.setSeverity(TamperEvent.TamperSeverity.MEDIUM);
        event1.setDescription("Unusual movement detected - 0.75g acceleration");
        event1.setConfidenceScore(0.85);
        event1.setRawSensorData("{\"acceleration\": 0.75, \"timestamp\": \"2023-06-15T14:30:00\", \"sensor_id\": \"ACC001\"}");
        event1.setTimestamp(LocalDateTime.now().minusDays(5));
        event1.setStatus(TamperEvent.TamperEventStatus.RESOLVED);
        event1.setResolved(true);
        event1.setResolvedAt(LocalDateTime.now().minusDays(4));
        event1.setResolvedBy("System Admin");
        
        TamperEvent event2 = new TamperEvent();
        event2.setInstallation(installation1);
        event2.setEventType(TamperEvent.TamperEventType.VOLTAGE_FLUCTUATION);
        event2.setSeverity(TamperEvent.TamperSeverity.HIGH);
        event2.setDescription("Significant voltage drop detected - 40% below normal");
        event2.setConfidenceScore(0.92);
        event2.setRawSensorData("{\"voltage\": 142.5, \"normal_voltage\": 240, \"timestamp\": \"2023-06-18T09:15:00\", \"sensor_id\": \"VOL002\"}");
        event2.setTimestamp(LocalDateTime.now().minusDays(2));
        event2.setStatus(TamperEvent.TamperEventStatus.ACKNOWLEDGED);
        
        TamperEvent event3 = new TamperEvent();
        event3.setInstallation(installation2);
        event3.setEventType(TamperEvent.TamperEventType.CONNECTION_TAMPERING);
        event3.setSeverity(TamperEvent.TamperSeverity.CRITICAL);
        event3.setDescription("Unexpected connection loss during peak hours");
        event3.setConfidenceScore(0.98);
        event3.setRawSensorData("{\"connected\": false, \"last_connected\": \"2023-06-19T13:45:00\", \"device_id\": \"INV003\"}");
        event3.setTimestamp(LocalDateTime.now().minusHours(12));
        event3.setStatus(TamperEvent.TamperEventStatus.NEW);
        
        tamperEventRepository.saveAll(Arrays.asList(event1, event2, event3));
        
        // Update alert configurations with custom settings
        Optional<AlertConfig> config1Opt = alertConfigRepository.findByInstallation(installation1);
        if (config1Opt.isPresent()) {
            AlertConfig config1 = config1Opt.get();
            config1.setAlertLevel(AlertConfig.AlertLevel.HIGH);
            config1.setAutoResponseEnabled(true);
            alertConfigRepository.save(config1);
        }
        
        log.info("Sample data initialization completed");
    }
} 