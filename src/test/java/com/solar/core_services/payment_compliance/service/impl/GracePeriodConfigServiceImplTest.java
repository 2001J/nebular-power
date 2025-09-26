package com.solar.core_services.payment_compliance.service.impl;

import com.solar.core_services.payment_compliance.dto.GracePeriodConfigDTO;
import com.solar.core_services.payment_compliance.model.GracePeriodConfig;
import com.solar.core_services.payment_compliance.repository.GracePeriodConfigRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GracePeriodConfigServiceImplTest {

    @Mock
    private GracePeriodConfigRepository repository;

    @InjectMocks
    private GracePeriodConfigServiceImpl service;

    private GracePeriodConfig existingConfig;

    @BeforeEach
    void setUp() {
        existingConfig = new GracePeriodConfig();
        existingConfig.setId(1L);
        existingConfig.setNumberOfDays(7);
        existingConfig.setReminderFrequency(2);
        existingConfig.setAutoSuspendEnabled(true);
        existingConfig.setLateFeesEnabled(false);
        existingConfig.setLateFeePercentage(BigDecimal.ZERO);
        existingConfig.setLateFeeFixedAmount(BigDecimal.ZERO);

        when(repository.findLatestConfig()).thenReturn(Optional.of(existingConfig));
        lenient().when(repository.save(any(GracePeriodConfig.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    @DisplayName("should update auto-suspension independently when late fees are enabled")
    void shouldUpdateAutoSuspendWhenLateFeesEnabled() {
        GracePeriodConfigDTO request = GracePeriodConfigDTO.builder()
                .numberOfDays(10)
                .reminderFrequency(3)
                .autoSuspendEnabled(false)
                .lateFeesEnabled(true)
                .lateFeePercentage(BigDecimal.valueOf(5))
                .lateFeeFixedAmount(BigDecimal.ZERO)
                .build();

        GracePeriodConfigDTO response = service.updateConfig(request, "tester");

        assertNotNull(response);
        assertFalse(response.getAutoSuspendEnabled(), "Auto suspension should reflect request value");
        assertTrue(response.getLateFeesEnabled());
        assertEquals(BigDecimal.valueOf(5), response.getLateFeePercentage());
        assertEquals(BigDecimal.ZERO, response.getLateFeeFixedAmount());

        ArgumentCaptor<GracePeriodConfig> captor = ArgumentCaptor.forClass(GracePeriodConfig.class);
        verify(repository, atLeastOnce()).save(captor.capture());
        GracePeriodConfig saved = captor.getValue();
        assertFalse(saved.getAutoSuspendEnabled());
        assertTrue(saved.getLateFeesEnabled());
    }

    @Test
    @DisplayName("should clear fees when late fees disabled")
    void shouldClearFeesWhenLateFeesDisabled() {
        existingConfig.setLateFeesEnabled(true);
        existingConfig.setLateFeePercentage(BigDecimal.TEN);
        existingConfig.setLateFeeFixedAmount(BigDecimal.valueOf(25));

        GracePeriodConfigDTO request = GracePeriodConfigDTO.builder()
                .numberOfDays(8)
                .reminderFrequency(2)
                .autoSuspendEnabled(true)
                .lateFeesEnabled(false)
                .lateFeePercentage(BigDecimal.ZERO)
                .lateFeeFixedAmount(BigDecimal.ZERO)
                .build();

        GracePeriodConfigDTO response = service.updateConfig(request, "tester");

        assertNotNull(response);
        assertFalse(response.getLateFeesEnabled());
        assertEquals(BigDecimal.ZERO, response.getLateFeePercentage());
        assertEquals(BigDecimal.ZERO, response.getLateFeeFixedAmount());
    }

    @Test
    @DisplayName("should require at least one fee value when late fees enabled")
    void shouldRequireAtLeastOneFeeValue() {
        GracePeriodConfigDTO request = GracePeriodConfigDTO.builder()
                .numberOfDays(7)
                .reminderFrequency(2)
                .autoSuspendEnabled(true)
                .lateFeesEnabled(true)
                .lateFeePercentage(BigDecimal.ZERO)
                .lateFeeFixedAmount(BigDecimal.ZERO)
                .build();

        assertThrows(IllegalArgumentException.class, () -> service.updateConfig(request, "tester"));
    }
}
