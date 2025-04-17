package com.solar.core_services.payment_compliance.service;

import com.solar.core_services.payment_compliance.dto.GracePeriodConfigDTO;
import com.solar.core_services.payment_compliance.model.GracePeriodConfig;
import com.solar.core_services.payment_compliance.repository.GracePeriodConfigRepository;
import com.solar.core_services.payment_compliance.service.impl.GracePeriodConfigServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.never;

/**
 * Test class for GracePeriodConfigService
 * Source file:
 * src/main/java/com/solar/core_services/payment_compliance/service/GracePeriodConfigService.java
 * Implementation:
 * src/main/java/com/solar/core_services/payment_compliance/service/impl/GracePeriodConfigServiceImpl.java
 */
@ExtendWith(MockitoExtension.class)
public class GracePeriodConfigServiceTest {

    @Mock
    private GracePeriodConfigRepository gracePeriodConfigRepository;

    @InjectMocks
    private GracePeriodConfigServiceImpl gracePeriodConfigService;

    private GracePeriodConfig testConfig;
    private GracePeriodConfigDTO testConfigDTO;

    @BeforeEach
    void setUp() {
        // Create test config
        testConfig = new GracePeriodConfig();
        testConfig.setId(1L);
        testConfig.setNumberOfDays(10);
        testConfig.setReminderFrequency(3);
        testConfig.setAutoSuspendEnabled(true);
        testConfig.setCreatedAt(LocalDateTime.now().minusDays(30));
        testConfig.setUpdatedAt(LocalDateTime.now().minusDays(15));
        testConfig.setCreatedBy("admin");
        testConfig.setUpdatedBy("admin");

        // Create test config DTO
        testConfigDTO = GracePeriodConfigDTO.builder()
                .id(1L)
                .numberOfDays(14)
                .reminderFrequency(2)
                .autoSuspendEnabled(false)
                .createdBy("admin")
                .updatedBy("user")
                .build();
    }

    @Test
    @DisplayName("Should get current config")
    void shouldGetCurrentConfig() {
        // Given
        when(gracePeriodConfigRepository.findLatestConfig()).thenReturn(Optional.of(testConfig));

        // When
        GracePeriodConfigDTO result = gracePeriodConfigService.getCurrentConfig();

        // Then
        assertNotNull(result);
        assertEquals(testConfig.getId(), result.getId());
        assertEquals(testConfig.getNumberOfDays(), result.getNumberOfDays());
        assertEquals(testConfig.getReminderFrequency(), result.getReminderFrequency());
        assertEquals(testConfig.getAutoSuspendEnabled(), result.getAutoSuspendEnabled());
        verify(gracePeriodConfigRepository, times(1)).findLatestConfig();
    }

    @Test
    @DisplayName("Should create new config when none exists")
    void shouldCreateNewConfigWhenNoneExists() {
        // Given
        when(gracePeriodConfigRepository.findLatestConfig()).thenReturn(Optional.empty());
        when(gracePeriodConfigRepository.save(any(GracePeriodConfig.class))).thenReturn(testConfig);

        // When
        GracePeriodConfigDTO result = gracePeriodConfigService.getCurrentConfig();

        // Then
        assertNotNull(result);
        verify(gracePeriodConfigRepository, times(1)).findLatestConfig();
        verify(gracePeriodConfigRepository, times(1)).save(any(GracePeriodConfig.class));
    }

    @Test
    @DisplayName("Should update config")
    void shouldUpdateConfig() {
        // Given
        testConfigDTO.setId(1L);
        when(gracePeriodConfigRepository.findLatestConfig()).thenReturn(Optional.of(testConfig));
        when(gracePeriodConfigRepository.save(any(GracePeriodConfig.class))).thenAnswer(invocation -> {
            GracePeriodConfig savedConfig = invocation.getArgument(0);
            savedConfig.setId(1L);
            return savedConfig;
        });

        // When
        GracePeriodConfigDTO result = gracePeriodConfigService.updateConfig(testConfigDTO, "user");

        // Then
        assertNotNull(result);
        assertEquals(testConfigDTO.getNumberOfDays(), result.getNumberOfDays());
        assertEquals(testConfigDTO.getReminderFrequency(), result.getReminderFrequency());
        assertEquals(testConfigDTO.getAutoSuspendEnabled(), result.getAutoSuspendEnabled());
        assertEquals("user", result.getUpdatedBy());
        verify(gracePeriodConfigRepository, times(1)).findLatestConfig();
        verify(gracePeriodConfigRepository, times(1)).save(any(GracePeriodConfig.class));
    }

    @Test
    @DisplayName("Should create new config when updating and none exists")
    void shouldCreateNewConfigWhenUpdatingAndNoneExists() {
        // Given
        testConfigDTO.setId(null); // Ensure ID is null to trigger creation path
        when(gracePeriodConfigRepository.findLatestConfig()).thenReturn(Optional.empty());
        when(gracePeriodConfigRepository.save(any(GracePeriodConfig.class))).thenAnswer(invocation -> {
            GracePeriodConfig savedConfig = invocation.getArgument(0);
            savedConfig.setId(1L);
            savedConfig.setCreatedAt(LocalDateTime.now());
            savedConfig.setUpdatedAt(LocalDateTime.now());
            return savedConfig;
        });

        // When
        GracePeriodConfigDTO result = gracePeriodConfigService.updateConfig(testConfigDTO, "user");

        // Then
        assertNotNull(result);
        assertEquals(testConfigDTO.getNumberOfDays(), result.getNumberOfDays());
        assertEquals(testConfigDTO.getReminderFrequency(), result.getReminderFrequency());
        assertEquals(testConfigDTO.getAutoSuspendEnabled(), result.getAutoSuspendEnabled());
        assertEquals("user", result.getUpdatedBy());
        verify(gracePeriodConfigRepository, times(1)).findLatestConfig();
        // Now we expect save to be called twice - once for creating the default config
        // and once for updating it
        verify(gracePeriodConfigRepository, times(2)).save(any(GracePeriodConfig.class));
    }

    @Test
    @DisplayName("Should get active grace period config")
    void shouldGetActiveGracePeriodConfig() {
        // Given
        when(gracePeriodConfigRepository.findLatestConfig()).thenReturn(Optional.of(testConfig));

        // When
        GracePeriodConfig result = gracePeriodConfigService.getActiveGracePeriodConfig();

        // Then
        assertNotNull(result);
        assertEquals(testConfig.getId(), result.getId());
        verify(gracePeriodConfigRepository, times(1)).findLatestConfig();
    }

    @Test
    @DisplayName("Should get grace period days")
    void shouldGetGracePeriodDays() {
        // Given
        when(gracePeriodConfigRepository.findLatestConfig()).thenReturn(Optional.of(testConfig));

        // When
        int days = gracePeriodConfigService.getGracePeriodDays();

        // Then
        assertEquals(testConfig.getNumberOfDays(), days);
        verify(gracePeriodConfigRepository, times(1)).findLatestConfig();
    }

    @Test
    @DisplayName("Should get reminder frequency")
    void shouldGetReminderFrequency() {
        // Given
        when(gracePeriodConfigRepository.findLatestConfig()).thenReturn(Optional.of(testConfig));

        // When
        int frequency = gracePeriodConfigService.getReminderFrequency();

        // Then
        assertEquals(testConfig.getReminderFrequency(), frequency);
        verify(gracePeriodConfigRepository, times(1)).findLatestConfig();
    }

    @Test
    @DisplayName("Should check if auto suspend is enabled")
    void shouldCheckIfAutoSuspendIsEnabled() {
        // Given
        when(gracePeriodConfigRepository.findLatestConfig()).thenReturn(Optional.of(testConfig));

        // When
        boolean isEnabled = gracePeriodConfigService.isAutoSuspendEnabled();

        // Then
        assertTrue(isEnabled);
        verify(gracePeriodConfigRepository, times(1)).findLatestConfig();
    }

    @Test
    @DisplayName("Should check if auto suspend is disabled")
    void shouldCheckIfAutoSuspendIsDisabled() {
        // Given
        testConfig.setAutoSuspendEnabled(false);
        when(gracePeriodConfigRepository.findLatestConfig()).thenReturn(Optional.of(testConfig));

        // When
        boolean isEnabled = gracePeriodConfigService.isAutoSuspendEnabled();

        // Then
        assertFalse(isEnabled);
        verify(gracePeriodConfigRepository, times(1)).findLatestConfig();
    }
}