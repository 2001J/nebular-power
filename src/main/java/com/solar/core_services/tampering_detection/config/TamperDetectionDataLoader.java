package com.solar.core_services.tampering_detection.config;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.tampering_detection.model.AlertConfig;
import com.solar.core_services.tampering_detection.model.TamperEvent;
import com.solar.core_services.tampering_detection.repository.AlertConfigRepository;
import com.solar.core_services.tampering_detection.repository.TamperEventRepository;
import com.solar.core_services.tampering_detection.service.TamperDetectionService;
import com.solar.user_management.model.User;
import com.solar.user_management.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
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
@Order(2) // Run after main data initializers to ensure users exist
public class TamperDetectionDataLoader implements CommandLineRunner {

    private final SolarInstallationRepository installationRepository;
    private final AlertConfigRepository alertConfigRepository;
    private final TamperEventRepository tamperEventRepository;
    private final TamperDetectionService tamperDetectionService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        log.info("Loading sample data for tamper detection system");

        // Check if installations already exist
        if (installationRepository.count() > 0) {
            // Only fix installations without users
            fixOrphanedInstallations();
            log.info("Sample installations already exist, only fixing orphaned installations");
            return;
        }

        // Ensure we have demo users
        User customer1 = ensureDemoUserExists("customer1@solar.com", "Customer One", User.UserRole.CUSTOMER);
        User customer2 = ensureDemoUserExists("customer2@solar.com", "Customer Two", User.UserRole.CUSTOMER);

        // Create sample installations
        SolarInstallation installation1 = new SolarInstallation();
        installation1.setName("Residential Installation 1");
        installation1.setLocation("123 Main St, Anytown, USA");
        installation1.setCapacity(5.5);
        installation1.setInstalledCapacityKW(5.5);
        installation1.setInstallationDate(LocalDateTime.now().minusMonths(6));
        installation1.setStatus(SolarInstallation.InstallationStatus.ACTIVE);
        installation1.setUser(customer1); // Associate with customer1

        SolarInstallation installation2 = new SolarInstallation();
        installation2.setName("Commercial Installation 1");
        installation2.setLocation("456 Business Ave, Anytown, USA");
        installation2.setCapacity(25.0);
        installation2.setInstalledCapacityKW(25.0);
        installation2.setInstallationDate(LocalDateTime.now().minusMonths(3));
        installation2.setStatus(SolarInstallation.InstallationStatus.ACTIVE);
        installation2.setUser(customer2); // Associate with customer2

        List<SolarInstallation> installations = installationRepository
                .saveAll(Arrays.asList(installation1, installation2));

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
        event1.setRawSensorData(
                "{\"acceleration\": 0.75, \"timestamp\": \"2023-06-15T14:30:00\", \"sensor_id\": \"ACC001\"}");
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
        event2.setRawSensorData(
                "{\"voltage\": 142.5, \"normal_voltage\": 240, \"timestamp\": \"2023-06-18T09:15:00\", \"sensor_id\": \"VOL002\"}");
        event2.setTimestamp(LocalDateTime.now().minusDays(2));
        event2.setStatus(TamperEvent.TamperEventStatus.ACKNOWLEDGED);

        TamperEvent event3 = new TamperEvent();
        event3.setInstallation(installation2);
        event3.setEventType(TamperEvent.TamperEventType.CONNECTION_TAMPERING);
        event3.setSeverity(TamperEvent.TamperSeverity.CRITICAL);
        event3.setDescription("Unexpected connection loss during peak hours");
        event3.setConfidenceScore(0.98);
        event3.setRawSensorData(
                "{\"connected\": false, \"last_connected\": \"2023-06-19T13:45:00\", \"device_id\": \"INV003\"}");
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

    /**
     * Ensures a demo user exists with the given email
     * 
     * @param email    Email for the user
     * @param fullName Full name for the user
     * @param role     Role for the user
     * @return The existing or newly created user
     */
    private User ensureDemoUserExists(String email, String fullName, User.UserRole role) {
        Optional<User> existingUser = userRepository.findByEmail(email);

        if (existingUser.isPresent()) {
            return existingUser.get();
        }

        User newUser = new User();
        newUser.setEmail(email);
        newUser.setPassword(passwordEncoder.encode("password123"));
        newUser.setFullName(fullName);
        newUser.setPhoneNumber("+1234567890");
        newUser.setRole(role);
        newUser.setEnabled(true);
        newUser.setEmailVerified(true);

        newUser = userRepository.save(newUser);
        log.info("Created demo user: {}", email);
        return newUser;
    }

    /**
     * Fixes installations that don't have associated users
     */
    private void fixOrphanedInstallations() {
        List<SolarInstallation> orphanedInstallations = installationRepository.findByUserIsNull();

        if (!orphanedInstallations.isEmpty()) {
            log.info("Found {} installation(s) without a user - associating with demo users",
                    orphanedInstallations.size());

            // Ensure demo customers exist
            User customer1 = ensureDemoUserExists("customer1@solar.com", "Customer One", User.UserRole.CUSTOMER);
            User customer2 = ensureDemoUserExists("customer2@solar.com", "Customer Two", User.UserRole.CUSTOMER);

            // Distribute orphaned installations between users
            for (int i = 0; i < orphanedInstallations.size(); i++) {
                SolarInstallation installation = orphanedInstallations.get(i);
                User customer = (i % 2 == 0) ? customer1 : customer2;
                installation.setUser(customer);
                log.info("Fixed installation ID {}: '{}' - now associated with {}",
                        installation.getId(), installation.getName(), customer.getEmail());
            }

            installationRepository.saveAll(orphanedInstallations);
        }
    }
}