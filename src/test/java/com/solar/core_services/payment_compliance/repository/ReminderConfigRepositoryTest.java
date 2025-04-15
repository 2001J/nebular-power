package com.solar.core_services.payment_compliance.repository;

import com.solar.core_services.payment_compliance.model.ReminderConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Test class for ReminderConfigRepository
 * Source file: src/main/java/com/solar/core_services/payment_compliance/repository/ReminderConfigRepository.java
 */
@DataJpaTest
@ActiveProfiles("test")
public class ReminderConfigRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private ReminderConfigRepository reminderConfigRepository;

    @Test
    @DisplayName("Should find latest config by updatedAt")
    void shouldFindLatestConfigByUpdatedAt() {
        // Given
        ReminderConfig olderConfig = new ReminderConfig();
        olderConfig.setAutoSendReminders(true);
        olderConfig.setFirstReminderDays(1);
        olderConfig.setSecondReminderDays(3);
        olderConfig.setFinalReminderDays(7);
        olderConfig.setReminderMethod("EMAIL");
        olderConfig.setCreatedBy("system");
        olderConfig.setUpdatedBy("system");
        // Set older timestamps explicitly to ensure ordering
        olderConfig.setCreatedAt(LocalDateTime.now().minusDays(10));
        olderConfig.setUpdatedAt(LocalDateTime.now().minusDays(10));
        
        entityManager.persist(olderConfig);
        
        // Force a flush to ensure the first entity is saved before creating the second
        entityManager.flush();
        
        // Create a second config with a later timestamp
        ReminderConfig newerConfig = new ReminderConfig();
        newerConfig.setAutoSendReminders(true);
        newerConfig.setFirstReminderDays(2);
        newerConfig.setSecondReminderDays(5);
        newerConfig.setFinalReminderDays(10);
        newerConfig.setReminderMethod("BOTH");
        newerConfig.setCreatedBy("admin");
        newerConfig.setUpdatedBy("admin");
        // Set newer timestamps with a clear difference to ensure proper ordering
        newerConfig.setCreatedAt(LocalDateTime.now().minusDays(5));
        newerConfig.setUpdatedAt(LocalDateTime.now());
        
        entityManager.persist(newerConfig);
        entityManager.flush();
        entityManager.clear(); // Clear persistence context to ensure fresh query
        
        // When
        Optional<ReminderConfig> result = reminderConfigRepository.findLatestConfig();
        
        // Then
        assertTrue(result.isPresent());
        assertEquals(newerConfig.getFirstReminderDays(), result.get().getFirstReminderDays());
        assertEquals(newerConfig.getSecondReminderDays(), result.get().getSecondReminderDays());
        assertEquals(newerConfig.getFinalReminderDays(), result.get().getFinalReminderDays());
        assertEquals(newerConfig.getReminderMethod(), result.get().getReminderMethod());
    }

    @Test
    @DisplayName("Should return empty when no configs exist")
    void shouldReturnEmptyWhenNoConfigsExist() {
        // When
        Optional<ReminderConfig> result = reminderConfigRepository.findLatestConfig();
        
        // Then
        assertFalse(result.isPresent());
    }
} 