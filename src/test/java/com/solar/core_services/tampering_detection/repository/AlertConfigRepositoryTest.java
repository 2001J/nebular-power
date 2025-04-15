package com.solar.core_services.tampering_detection.repository;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.model.SolarInstallation.InstallationStatus;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.tampering_detection.model.AlertConfig;
import com.solar.core_services.tampering_detection.model.AlertConfig.AlertLevel;
import com.solar.core_services.tampering_detection.model.AlertConfig.NotificationChannel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Test class for AlertConfigRepository
 * Source file: src/main/java/com/solar/core_services/tampering_detection/repository/AlertConfigRepository.java
 */
@DataJpaTest
@ActiveProfiles("test")
public class AlertConfigRepositoryTest {

    @Autowired
    private AlertConfigRepository alertConfigRepository;

    @Autowired
    private SolarInstallationRepository installationRepository;

    private SolarInstallation testInstallation1;
    private SolarInstallation testInstallation2;
    private SolarInstallation testInstallation3;
    private AlertConfig testConfig1;
    private AlertConfig testConfig2;
    private AlertConfig testConfig3;

    @BeforeEach
    void setUp() {
        // Clear any existing data
        alertConfigRepository.deleteAll();
        
        // Create test installations
        testInstallation1 = new SolarInstallation();
        testInstallation1.setName("Test Installation 1");
        testInstallation1.setCapacity(5.0);
        testInstallation1.setInstalledCapacityKW(5.0);
        testInstallation1.setLocation("Location 1");
        testInstallation1.setStatus(SolarInstallation.InstallationStatus.ACTIVE);
        testInstallation1.setInstallationDate(LocalDateTime.now().minusMonths(3));
        testInstallation1 = installationRepository.save(testInstallation1);

        testInstallation2 = new SolarInstallation();
        testInstallation2.setName("Test Installation 2");
        testInstallation2.setCapacity(7.5);
        testInstallation2.setInstalledCapacityKW(7.5);
        testInstallation2.setLocation("Location 2");
        testInstallation2.setStatus(SolarInstallation.InstallationStatus.ACTIVE);
        testInstallation2.setInstallationDate(LocalDateTime.now().minusMonths(2));
        testInstallation2 = installationRepository.save(testInstallation2);

        testInstallation3 = new SolarInstallation();
        testInstallation3.setName("Test Installation 3");
        testInstallation3.setCapacity(10.0);
        testInstallation3.setInstalledCapacityKW(10.0);
        testInstallation3.setLocation("Location 3");
        testInstallation3.setStatus(SolarInstallation.InstallationStatus.ACTIVE);
        testInstallation3.setInstallationDate(LocalDateTime.now().minusMonths(1));
        testInstallation3 = installationRepository.save(testInstallation3);

        // Create test alert configs
        testConfig1 = new AlertConfig();
        testConfig1.setInstallation(testInstallation1);
        testConfig1.setAlertLevel(AlertLevel.HIGH);
        Set<NotificationChannel> channels1 = new HashSet<>();
        channels1.add(NotificationChannel.EMAIL);
        channels1.add(NotificationChannel.SMS);
        testConfig1.setNotificationChannels(channels1);
        testConfig1.setAutoResponseEnabled(true);
        testConfig1.setPhysicalMovementThreshold(0.8);
        testConfig1.setVoltageFluctuationThreshold(0.6);
        testConfig1.setConnectionInterruptionThreshold(0.9);
        testConfig1.setSamplingRateSeconds(30);
        testConfig1 = alertConfigRepository.save(testConfig1);

        testConfig2 = new AlertConfig();
        testConfig2.setInstallation(testInstallation2);
        testConfig2.setAlertLevel(AlertLevel.MEDIUM);
        Set<NotificationChannel> channels2 = new HashSet<>();
        channels2.add(NotificationChannel.EMAIL);
        channels2.add(NotificationChannel.PUSH);
        testConfig2.setNotificationChannels(channels2);
        testConfig2.setAutoResponseEnabled(false);
        testConfig2.setPhysicalMovementThreshold(0.7);
        testConfig2.setVoltageFluctuationThreshold(0.5);
        testConfig2.setConnectionInterruptionThreshold(0.8);
        testConfig2.setSamplingRateSeconds(60);
        testConfig2 = alertConfigRepository.save(testConfig2);

        testConfig3 = new AlertConfig();
        testConfig3.setInstallation(testInstallation3);
        testConfig3.setAlertLevel(AlertLevel.HIGH);
        Set<NotificationChannel> channels3 = new HashSet<>();
        channels3.add(NotificationChannel.EMAIL);
        channels3.add(NotificationChannel.IN_APP);
        testConfig3.setNotificationChannels(channels3);
        testConfig3.setAutoResponseEnabled(true);
        testConfig3.setPhysicalMovementThreshold(0.75);
        testConfig3.setVoltageFluctuationThreshold(0.55);
        testConfig3.setConnectionInterruptionThreshold(0.85);
        testConfig3.setSamplingRateSeconds(45);
        testConfig3 = alertConfigRepository.save(testConfig3);
    }

    @Test
    @DisplayName("Should find alert config by installation")
    void shouldFindAlertConfigByInstallation() {
        // Test findByInstallation
        Optional<AlertConfig> foundConfig = alertConfigRepository.findByInstallation(testInstallation1);
        
        assertThat(foundConfig).isPresent();
        assertThat(foundConfig.get().getId()).isEqualTo(testConfig1.getId());
        assertThat(foundConfig.get().getAlertLevel()).isEqualTo(AlertLevel.HIGH);
    }

    @Test
    @DisplayName("Should find alert config by installation ID")
    void shouldFindAlertConfigByInstallationId() {
        // Test findByInstallationId
        Optional<AlertConfig> foundConfig = alertConfigRepository.findByInstallationId(testInstallation2.getId());
        
        assertThat(foundConfig).isPresent();
        assertThat(foundConfig.get().getId()).isEqualTo(testConfig2.getId());
        assertThat(foundConfig.get().getAlertLevel()).isEqualTo(AlertLevel.MEDIUM);
    }

    @Test
    @DisplayName("Should find alert configs by alert level")
    void shouldFindAlertConfigsByAlertLevel() {
        // Test findByAlertLevel
        List<AlertConfig> highConfigs = alertConfigRepository.findByAlertLevel(AlertLevel.HIGH);
        
        assertThat(highConfigs).isNotNull();
        assertThat(highConfigs).hasSize(2);
        assertThat(highConfigs).extracting(AlertConfig::getId)
                .containsExactlyInAnyOrder(testConfig1.getId(), testConfig3.getId());
        
        List<AlertConfig> mediumConfigs = alertConfigRepository.findByAlertLevel(AlertLevel.MEDIUM);
        
        assertThat(mediumConfigs).isNotNull();
        assertThat(mediumConfigs).hasSize(1);
        assertThat(mediumConfigs.get(0).getId()).isEqualTo(testConfig2.getId());
    }

    @Test
    @DisplayName("Should find alert configs with auto response enabled")
    void shouldFindAlertConfigsWithAutoResponseEnabled() {
        // Test findByAutoResponseEnabled
        List<AlertConfig> autoResponseConfigs = alertConfigRepository.findByAutoResponseEnabled();
        
        assertThat(autoResponseConfigs).isNotNull();
        assertThat(autoResponseConfigs).hasSize(2);
        assertThat(autoResponseConfigs).extracting(AlertConfig::getId)
                .containsExactlyInAnyOrder(testConfig1.getId(), testConfig3.getId());
    }

    @Test
    @DisplayName("Should not find alert config for non-existent installation")
    void shouldNotFindAlertConfigForNonExistentInstallation() {
        // Create a new installation and save it to resolve the transient error
        SolarInstallation newInstallation = new SolarInstallation();
        newInstallation.setName("New Installation");
        newInstallation.setCapacity(15.0);
        newInstallation.setInstalledCapacityKW(15.0);
        newInstallation.setLocation("New Location");
        newInstallation.setStatus(SolarInstallation.InstallationStatus.ACTIVE);
        newInstallation.setInstallationDate(LocalDateTime.now());
        newInstallation = installationRepository.save(newInstallation);
        
        // Try to find alert config for this installation
        Optional<AlertConfig> result = alertConfigRepository.findByInstallation(newInstallation);
        
        // Assert that no config exists yet for this new installation
        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("Should save and update alert config")
    void shouldSaveAndUpdateAlertConfig() {
        // Create a new installation
        SolarInstallation newInstallation = new SolarInstallation();
        newInstallation.setName("New Installation");
        newInstallation.setCapacity(15.0);
        newInstallation.setInstalledCapacityKW(15.0);
        newInstallation.setLocation("New Location");
        newInstallation.setStatus(SolarInstallation.InstallationStatus.ACTIVE);
        newInstallation.setInstallationDate(LocalDateTime.now());
        newInstallation = installationRepository.save(newInstallation);
        
        AlertConfig newConfig = new AlertConfig();
        newConfig.setInstallation(newInstallation);
        newConfig.setAlertLevel(AlertLevel.LOW);
        Set<NotificationChannel> channels = new HashSet<>();
        channels.add(NotificationChannel.EMAIL);
        newConfig.setNotificationChannels(channels);
        newConfig.setAutoResponseEnabled(false);
        newConfig.setPhysicalMovementThreshold(0.6);
        newConfig.setVoltageFluctuationThreshold(0.4);
        newConfig.setConnectionInterruptionThreshold(0.7);
        newConfig.setSamplingRateSeconds(90);
        
        AlertConfig savedConfig = alertConfigRepository.save(newConfig);
        
        assertThat(savedConfig).isNotNull();
        assertThat(savedConfig.getId()).isNotNull();
        
        // Update the config
        savedConfig.setAlertLevel(AlertLevel.MEDIUM);
        savedConfig.setAutoResponseEnabled(true);
        
        AlertConfig updatedConfig = alertConfigRepository.save(savedConfig);
        
        assertThat(updatedConfig).isNotNull();
        assertThat(updatedConfig.getId()).isEqualTo(savedConfig.getId());
        assertThat(updatedConfig.getAlertLevel()).isEqualTo(AlertLevel.MEDIUM);
        assertThat(updatedConfig.isAutoResponseEnabled()).isTrue();
    }
} 