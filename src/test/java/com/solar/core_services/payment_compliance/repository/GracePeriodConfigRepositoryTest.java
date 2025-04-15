package com.solar.core_services.payment_compliance.repository;

import com.solar.core_services.payment_compliance.model.GracePeriodConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Test class for GracePeriodConfigRepository
 * Source file: src/main/java/com/solar/core_services/payment_compliance/repository/GracePeriodConfigRepository.java
 */
@DataJpaTest
@ActiveProfiles("test")
public class GracePeriodConfigRepositoryTest {

    @Autowired
    private GracePeriodConfigRepository gracePeriodConfigRepository;

    private GracePeriodConfig testConfig1;
    private GracePeriodConfig testConfig2;

    @BeforeEach
    void setUp() {
        // Clear any existing data
        gracePeriodConfigRepository.deleteAll();
        
        // Create test configs
        testConfig1 = new GracePeriodConfig();
        testConfig1.setNumberOfDays(7);
        testConfig1.setReminderFrequency(2);
        testConfig1.setAutoSuspendEnabled(true);
        testConfig1.setCreatedBy("admin");
        testConfig1.setUpdatedBy("admin");
        
        testConfig2 = new GracePeriodConfig();
        testConfig2.setNumberOfDays(10);
        testConfig2.setReminderFrequency(3);
        testConfig2.setAutoSuspendEnabled(false);
        testConfig2.setCreatedBy("admin");
        testConfig2.setUpdatedBy("admin");
    }

    @Test
    @DisplayName("Should find latest config")
    void shouldFindLatestConfig() {
        // Given - Save only one config for this test
        gracePeriodConfigRepository.deleteAll();
        gracePeriodConfigRepository.save(testConfig2);
        
        // When
        Optional<GracePeriodConfig> latestConfig = gracePeriodConfigRepository.findLatestConfig();
        
        // Then
        assertThat(latestConfig).isPresent();
        assertThat(latestConfig.get().getNumberOfDays()).isEqualTo(10);
        assertThat(latestConfig.get().getReminderFrequency()).isEqualTo(3);
        assertThat(latestConfig.get().getAutoSuspendEnabled()).isFalse();
    }

    @Test
    @DisplayName("Should return empty when no configs exist")
    void shouldReturnEmptyWhenNoConfigsExist() {
        // Given
        gracePeriodConfigRepository.deleteAll();
        
        // When
        Optional<GracePeriodConfig> latestConfig = gracePeriodConfigRepository.findLatestConfig();
        
        // Then
        assertThat(latestConfig).isEmpty();
    }

    @Test
    @DisplayName("Should save and retrieve config with all fields")
    void shouldSaveAndRetrieveConfigWithAllFields() {
        // Given
        GracePeriodConfig newConfig = new GracePeriodConfig();
        newConfig.setNumberOfDays(14);
        newConfig.setReminderFrequency(4);
        newConfig.setAutoSuspendEnabled(true);
        newConfig.setCreatedBy("testUser");
        newConfig.setUpdatedBy("testUser");
        
        // When
        GracePeriodConfig savedConfig = gracePeriodConfigRepository.save(newConfig);
        Optional<GracePeriodConfig> retrievedConfig = gracePeriodConfigRepository.findById(savedConfig.getId());
        
        // Then
        assertThat(retrievedConfig).isPresent();
        assertThat(retrievedConfig.get().getNumberOfDays()).isEqualTo(14);
        assertThat(retrievedConfig.get().getReminderFrequency()).isEqualTo(4);
        assertThat(retrievedConfig.get().getAutoSuspendEnabled()).isTrue();
        assertThat(retrievedConfig.get().getCreatedBy()).isEqualTo("testUser");
        assertThat(retrievedConfig.get().getUpdatedBy()).isEqualTo("testUser");
    }
} 