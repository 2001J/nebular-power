package com.solar.core_services.payment_compliance.service;

import com.solar.core_services.payment_compliance.dto.ReminderConfigDTO;
import com.solar.core_services.payment_compliance.model.ReminderConfig;
import com.solar.core_services.payment_compliance.repository.ReminderConfigRepository;
import com.solar.core_services.payment_compliance.service.impl.ReminderConfigServiceImpl;
import com.solar.exception.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

/**
 * Test class for ReminderConfigService
 * Source file: src/main/java/com/solar/core_services/payment_compliance/service/ReminderConfigService.java
 * Implementation: src/main/java/com/solar/core_services/payment_compliance/service/impl/ReminderConfigServiceImpl.java
 */
@ExtendWith(MockitoExtension.class)
public class ReminderConfigServiceTest {

    @Mock
    private ReminderConfigRepository reminderConfigRepository;

    @InjectMocks
    private ReminderConfigServiceImpl reminderConfigService;

    private ReminderConfig testConfig;
    private ReminderConfigDTO testConfigDTO;

    @BeforeEach
    void setUp() {
        // Create test config
        testConfig = new ReminderConfig();
        testConfig.setId(1L);
        testConfig.setAutoSendReminders(true);
        testConfig.setFirstReminderDays(1);
        testConfig.setSecondReminderDays(3);
        testConfig.setFinalReminderDays(7);
        testConfig.setReminderMethod("EMAIL");
        testConfig.setCreatedAt(LocalDateTime.now().minusDays(30));
        testConfig.setUpdatedAt(LocalDateTime.now().minusDays(15));
        testConfig.setCreatedBy("admin");
        testConfig.setUpdatedBy("admin");
        
        // Create test config DTO
        testConfigDTO = ReminderConfigDTO.builder()
                .id(1L)
                .autoSendReminders(true)
                .firstReminderDays(2)
                .secondReminderDays(5)
                .finalReminderDays(10)
                .reminderMethod("BOTH")
                .build();
    }

    @Test
    @DisplayName("Should get current config")
    void shouldGetCurrentConfig() {
        // Given
        when(reminderConfigRepository.findLatestConfig()).thenReturn(Optional.of(testConfig));
        
        // When
        ReminderConfigDTO result = reminderConfigService.getCurrentConfig();
        
        // Then
        assertNotNull(result);
        assertEquals(testConfig.getId(), result.getId());
        assertEquals(testConfig.getFirstReminderDays(), result.getFirstReminderDays());
        assertEquals(testConfig.getSecondReminderDays(), result.getSecondReminderDays());
        assertEquals(testConfig.getFinalReminderDays(), result.getFinalReminderDays());
        assertEquals(testConfig.getReminderMethod(), result.getReminderMethod());
        verify(reminderConfigRepository, times(1)).findLatestConfig();
    }

    @Test
    @DisplayName("Should create new config when none exists")
    void shouldCreateNewConfigWhenNoneExists() {
        // Given
        when(reminderConfigRepository.findLatestConfig()).thenReturn(Optional.empty());
        when(reminderConfigRepository.save(any(ReminderConfig.class))).thenReturn(testConfig);
        
        // When
        ReminderConfigDTO result = reminderConfigService.getCurrentConfig();
        
        // Then
        assertNotNull(result);
        verify(reminderConfigRepository, times(1)).findLatestConfig();
        verify(reminderConfigRepository, times(1)).save(any(ReminderConfig.class));
    }

    @Test
    @DisplayName("Should update config with valid values")
    void shouldUpdateConfigWithValidValues() {
        // Given
        testConfigDTO.setId(1L);
        when(reminderConfigRepository.findById(1L)).thenReturn(Optional.of(testConfig));
        when(reminderConfigRepository.save(any(ReminderConfig.class))).thenAnswer(invocation -> {
            ReminderConfig savedConfig = invocation.getArgument(0);
            savedConfig.setId(1L);
            return savedConfig;
        });
        
        // When
        ReminderConfigDTO result = reminderConfigService.updateConfig(testConfigDTO, "user");
        
        // Then
        assertNotNull(result);
        assertEquals(testConfigDTO.getFirstReminderDays(), result.getFirstReminderDays());
        assertEquals(testConfigDTO.getSecondReminderDays(), result.getSecondReminderDays());
        assertEquals(testConfigDTO.getFinalReminderDays(), result.getFinalReminderDays());
        assertEquals(testConfigDTO.getReminderMethod(), result.getReminderMethod());
        assertEquals("user", result.getUpdatedBy());
        verify(reminderConfigRepository, times(1)).findById(1L);
        verify(reminderConfigRepository, times(1)).save(any(ReminderConfig.class));
    }

    @Test
    @DisplayName("Should throw exception for invalid reminder sequence")
    void shouldThrowExceptionForInvalidReminderSequence() {
        // Given
        testConfigDTO.setFirstReminderDays(5);
        testConfigDTO.setSecondReminderDays(3); // Second is before first - invalid
        
        // When/Then
        assertThrows(IllegalArgumentException.class, () -> 
            reminderConfigService.updateConfig(testConfigDTO, "user")
        );
        
        verify(reminderConfigRepository, never()).save(any(ReminderConfig.class));
    }

    @Test
    @DisplayName("Should create new config when updating and none exists")
    void shouldCreateNewConfigWhenUpdatingAndNoneExists() {
        // Given
        testConfigDTO.setId(null); // Ensure ID is null to trigger creation path
        when(reminderConfigRepository.save(any(ReminderConfig.class))).thenAnswer(invocation -> {
            ReminderConfig savedConfig = invocation.getArgument(0);
            savedConfig.setId(1L);
            return savedConfig;
        });
        
        // When
        ReminderConfigDTO result = reminderConfigService.updateConfig(testConfigDTO, "user");
        
        // Then
        assertNotNull(result);
        assertEquals(testConfigDTO.getFirstReminderDays(), result.getFirstReminderDays());
        assertEquals(testConfigDTO.getSecondReminderDays(), result.getSecondReminderDays());
        assertEquals(testConfigDTO.getFinalReminderDays(), result.getFinalReminderDays());
        assertEquals(testConfigDTO.getReminderMethod(), result.getReminderMethod());
        assertEquals("user", result.getUpdatedBy());
        verify(reminderConfigRepository, never()).findById(anyLong());
        verify(reminderConfigRepository, times(1)).save(any(ReminderConfig.class));
    }

    @Test
    @DisplayName("Should get active reminder config")
    void shouldGetActiveReminderConfig() {
        // Given
        when(reminderConfigRepository.findLatestConfig()).thenReturn(Optional.of(testConfig));
        
        // When
        ReminderConfig result = reminderConfigService.getActiveReminderConfig();
        
        // Then
        assertNotNull(result);
        assertEquals(testConfig.getId(), result.getId());
        verify(reminderConfigRepository, times(1)).findLatestConfig();
    }

    @Test
    @DisplayName("Should get first reminder days")
    void shouldGetFirstReminderDays() {
        // Given
        when(reminderConfigRepository.findLatestConfig()).thenReturn(Optional.of(testConfig));
        
        // When
        int days = reminderConfigService.getFirstReminderDays();
        
        // Then
        assertEquals(testConfig.getFirstReminderDays(), days);
        verify(reminderConfigRepository, times(1)).findLatestConfig();
    }

    @Test
    @DisplayName("Should get second reminder days")
    void shouldGetSecondReminderDays() {
        // Given
        when(reminderConfigRepository.findLatestConfig()).thenReturn(Optional.of(testConfig));
        
        // When
        int days = reminderConfigService.getSecondReminderDays();
        
        // Then
        assertEquals(testConfig.getSecondReminderDays(), days);
        verify(reminderConfigRepository, times(1)).findLatestConfig();
    }

    @Test
    @DisplayName("Should get final reminder days")
    void shouldGetFinalReminderDays() {
        // Given
        when(reminderConfigRepository.findLatestConfig()).thenReturn(Optional.of(testConfig));
        
        // When
        int days = reminderConfigService.getFinalReminderDays();
        
        // Then
        assertEquals(testConfig.getFinalReminderDays(), days);
        verify(reminderConfigRepository, times(1)).findLatestConfig();
    }

    @Test
    @DisplayName("Should get reminder method")
    void shouldGetReminderMethod() {
        // Given
        when(reminderConfigRepository.findLatestConfig()).thenReturn(Optional.of(testConfig));
        
        // When
        String method = reminderConfigService.getReminderMethod();
        
        // Then
        assertEquals(testConfig.getReminderMethod(), method);
        verify(reminderConfigRepository, times(1)).findLatestConfig();
    }

    @Test
    @DisplayName("Should check if auto-send reminders is enabled")
    void shouldCheckIfAutoSendRemindersIsEnabled() {
        // Given
        when(reminderConfigRepository.findLatestConfig()).thenReturn(Optional.of(testConfig));
        
        // When
        boolean isEnabled = reminderConfigService.isAutoSendRemindersEnabled();
        
        // Then
        assertTrue(isEnabled);
        verify(reminderConfigRepository, times(1)).findLatestConfig();
    }

    @Test
    @DisplayName("Should check if auto-send reminders is disabled")
    void shouldCheckIfAutoSendRemindersIsDisabled() {
        // Given
        testConfig.setAutoSendReminders(false);
        when(reminderConfigRepository.findLatestConfig()).thenReturn(Optional.of(testConfig));
        
        // When
        boolean isEnabled = reminderConfigService.isAutoSendRemindersEnabled();
        
        // Then
        assertFalse(isEnabled);
        verify(reminderConfigRepository, times(1)).findLatestConfig();
    }
} 