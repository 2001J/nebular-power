package com.solar.core_services.payment_compliance.model;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Test class for ReminderConfig entity
 * Source file: src/main/java/com/solar/core_services/payment_compliance/model/ReminderConfig.java
 */
public class ReminderConfigTest {

    @Test
    @DisplayName("Should create ReminderConfig with default values")
    void shouldCreateReminderConfigWithDefaultValues() {
        // When
        ReminderConfig config = new ReminderConfig();
        
        // Then
        assertNotNull(config);
        assertEquals(true, config.getAutoSendReminders());
        assertEquals(1, config.getFirstReminderDays());
        assertEquals(3, config.getSecondReminderDays());
        assertEquals(7, config.getFinalReminderDays());
        assertEquals("EMAIL", config.getReminderMethod());
        assertNotNull(config.getCreatedAt());
        assertNotNull(config.getUpdatedAt());
    }
    
    @Test
    @DisplayName("Should create and set ReminderConfig values")
    void shouldCreateAndSetReminderConfigValues() {
        // Given
        ReminderConfig config = new ReminderConfig();
        LocalDateTime now = LocalDateTime.now();
        
        // When
        config.setId(1L);
        config.setAutoSendReminders(false);
        config.setFirstReminderDays(2);
        config.setSecondReminderDays(5);
        config.setFinalReminderDays(10);
        config.setReminderMethod("BOTH");
        config.setCreatedAt(now);
        config.setUpdatedAt(now);
        config.setCreatedBy("admin");
        config.setUpdatedBy("admin");
        config.setVersion(1L);
        
        // Then
        assertEquals(1L, config.getId());
        assertEquals(false, config.getAutoSendReminders());
        assertEquals(2, config.getFirstReminderDays());
        assertEquals(5, config.getSecondReminderDays());
        assertEquals(10, config.getFinalReminderDays());
        assertEquals("BOTH", config.getReminderMethod());
        assertEquals(now, config.getCreatedAt());
        assertEquals(now, config.getUpdatedAt());
        assertEquals("admin", config.getCreatedBy());
        assertEquals("admin", config.getUpdatedBy());
        assertEquals(1L, config.getVersion());
    }
    
    @Test
    @DisplayName("Should update updatedAt on PreUpdate")
    void shouldUpdateUpdatedAtOnPreUpdate() {
        // Given
        ReminderConfig config = new ReminderConfig();
        LocalDateTime oldDate = LocalDateTime.now().minusDays(1);
        config.setUpdatedAt(oldDate);
        
        // When
        config.onUpdate();
        
        // Then
        // Check that the updated date is after the old date
        assertTrue(config.getUpdatedAt().isAfter(oldDate));
    }
} 