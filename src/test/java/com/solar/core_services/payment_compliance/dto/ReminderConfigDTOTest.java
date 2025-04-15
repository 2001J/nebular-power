package com.solar.core_services.payment_compliance.dto;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * Test class for ReminderConfigDTO
 * Source file: src/main/java/com/solar/core_services/payment_compliance/dto/ReminderConfigDTO.java
 */
public class ReminderConfigDTOTest {

    @Test
    @DisplayName("Should create empty ReminderConfigDTO")
    void shouldCreateEmptyReminderConfigDTO() {
        // When
        ReminderConfigDTO dto = new ReminderConfigDTO();
        
        // Then
        assertNotNull(dto);
        assertNull(dto.getId());
        assertNull(dto.getAutoSendReminders());
        assertNull(dto.getFirstReminderDays());
        assertNull(dto.getSecondReminderDays());
        assertNull(dto.getFinalReminderDays());
        assertNull(dto.getReminderMethod());
        assertNull(dto.getCreatedAt());
        assertNull(dto.getUpdatedAt());
        assertNull(dto.getCreatedBy());
        assertNull(dto.getUpdatedBy());
    }
    
    @Test
    @DisplayName("Should create ReminderConfigDTO with builder")
    void shouldCreateReminderConfigDTOWithBuilder() {
        // Given
        LocalDateTime now = LocalDateTime.now();
        
        // When
        ReminderConfigDTO dto = ReminderConfigDTO.builder()
                .id(1L)
                .autoSendReminders(true)
                .firstReminderDays(1)
                .secondReminderDays(3)
                .finalReminderDays(7)
                .reminderMethod("EMAIL")
                .createdAt(now)
                .updatedAt(now)
                .createdBy("admin")
                .updatedBy("admin")
                .build();
        
        // Then
        assertEquals(1L, dto.getId());
        assertEquals(true, dto.getAutoSendReminders());
        assertEquals(1, dto.getFirstReminderDays());
        assertEquals(3, dto.getSecondReminderDays());
        assertEquals(7, dto.getFinalReminderDays());
        assertEquals("EMAIL", dto.getReminderMethod());
        assertEquals(now, dto.getCreatedAt());
        assertEquals(now, dto.getUpdatedAt());
        assertEquals("admin", dto.getCreatedBy());
        assertEquals("admin", dto.getUpdatedBy());
    }
    
    @Test
    @DisplayName("Should create and set ReminderConfigDTO values")
    void shouldCreateAndSetReminderConfigDTOValues() {
        // Given
        ReminderConfigDTO dto = new ReminderConfigDTO();
        LocalDateTime now = LocalDateTime.now();
        
        // When
        dto.setId(1L);
        dto.setAutoSendReminders(true);
        dto.setFirstReminderDays(1);
        dto.setSecondReminderDays(3);
        dto.setFinalReminderDays(7);
        dto.setReminderMethod("EMAIL");
        dto.setCreatedAt(now);
        dto.setUpdatedAt(now);
        dto.setCreatedBy("admin");
        dto.setUpdatedBy("admin");
        
        // Then
        assertEquals(1L, dto.getId());
        assertEquals(true, dto.getAutoSendReminders());
        assertEquals(1, dto.getFirstReminderDays());
        assertEquals(3, dto.getSecondReminderDays());
        assertEquals(7, dto.getFinalReminderDays());
        assertEquals("EMAIL", dto.getReminderMethod());
        assertEquals(now, dto.getCreatedAt());
        assertEquals(now, dto.getUpdatedAt());
        assertEquals("admin", dto.getCreatedBy());
        assertEquals("admin", dto.getUpdatedBy());
    }
    
    @Test
    @DisplayName("Should create with all args constructor")
    void shouldCreateWithAllArgsConstructor() {
        // Given
        LocalDateTime now = LocalDateTime.now();
        
        // When
        ReminderConfigDTO dto = new ReminderConfigDTO(
                1L, true, 1, 3, 7, "EMAIL", now, now, "admin", "admin");
        
        // Then
        assertEquals(1L, dto.getId());
        assertEquals(true, dto.getAutoSendReminders());
        assertEquals(1, dto.getFirstReminderDays());
        assertEquals(3, dto.getSecondReminderDays());
        assertEquals(7, dto.getFinalReminderDays());
        assertEquals("EMAIL", dto.getReminderMethod());
        assertEquals(now, dto.getCreatedAt());
        assertEquals(now, dto.getUpdatedAt());
        assertEquals("admin", dto.getCreatedBy());
        assertEquals("admin", dto.getUpdatedBy());
    }
} 