package com.solar.core_services.tampering_detection.service;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.tampering_detection.dto.AlertConfigDTO;
import com.solar.core_services.tampering_detection.dto.AlertConfigUpdateDTO;
import com.solar.core_services.tampering_detection.model.AlertConfig;
import com.solar.core_services.tampering_detection.model.AlertConfig.AlertLevel;
import com.solar.core_services.tampering_detection.model.AlertConfig.NotificationChannel;
import com.solar.core_services.tampering_detection.repository.AlertConfigRepository;
import com.solar.core_services.tampering_detection.service.impl.AlertConfigServiceImpl;
import com.solar.exception.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Test class for AlertConfigService
 * Source file: src/main/java/com/solar/core_services/tampering_detection/service/AlertConfigService.java
 * Implementation: src/main/java/com/solar/core_services/tampering_detection/service/impl/AlertConfigServiceImpl.java
 */
@ExtendWith(MockitoExtension.class)
public class AlertConfigServiceTest {

    @Mock
    private AlertConfigRepository alertConfigRepository;

    @Mock
    private SolarInstallationRepository installationRepository;

    @Mock
    private SecurityLogService securityLogService;

    @InjectMocks
    private AlertConfigServiceImpl alertConfigService;

    private SolarInstallation testInstallation;
    private AlertConfig testAlertConfig;
    private AlertConfigUpdateDTO testUpdateDTO;
    private Long installationId = 1L;
    private Long configId = 1L;

    @BeforeEach
    void setUp() {
        // Create test installation
        testInstallation = new SolarInstallation();
        testInstallation.setName("Test Installation");
        testInstallation.setCapacity(5.0);
        testInstallation.setInstalledCapacityKW(5.0);
        testInstallation.setLocation("Test Location");
        testInstallation.setStatus(SolarInstallation.InstallationStatus.ACTIVE);
        testInstallation.setInstallationDate(LocalDateTime.now().minusMonths(1));
        testInstallation.setId(1L);
        
        // Set up test alert config
        testAlertConfig = new AlertConfig();
        testAlertConfig.setId(configId);
        testAlertConfig.setInstallation(testInstallation);
        testAlertConfig.setAlertLevel(AlertLevel.MEDIUM);
        Set<NotificationChannel> channels = new HashSet<>();
        channels.add(NotificationChannel.EMAIL);
        channels.add(NotificationChannel.SMS);
        testAlertConfig.setNotificationChannels(channels);
        testAlertConfig.setAutoResponseEnabled(true);
        testAlertConfig.setPhysicalMovementThreshold(0.75);
        testAlertConfig.setVoltageFluctuationThreshold(0.5);
        testAlertConfig.setConnectionInterruptionThreshold(0.8);
        testAlertConfig.setSamplingRateSeconds(60);
        
        // Set up test update DTO
        testUpdateDTO = new AlertConfigUpdateDTO();
        testUpdateDTO.setAlertLevel(AlertLevel.MEDIUM);
        
        Set<NotificationChannel> updateChannels = new HashSet<>();
        updateChannels.add(NotificationChannel.EMAIL);
        updateChannels.add(NotificationChannel.PUSH);
        testUpdateDTO.setNotificationChannels(updateChannels);
        
        testUpdateDTO.setAutoResponseEnabled(false);
        testUpdateDTO.setPhysicalMovementThreshold(0.7);
        testUpdateDTO.setVoltageFluctuationThreshold(0.5);
        testUpdateDTO.setConnectionInterruptionThreshold(0.8);
        testUpdateDTO.setSamplingRateSeconds(60);
    }

    @Test
    @DisplayName("Should get alert config by installation ID")
    void shouldGetAlertConfigByInstallationId() {
        // Arrange
        when(installationRepository.findById(installationId)).thenReturn(Optional.of(testInstallation));
        when(alertConfigRepository.findByInstallation(testInstallation)).thenReturn(Optional.of(testAlertConfig));
        
        // Act
        AlertConfigDTO result = alertConfigService.getAlertConfigByInstallationId(installationId);
        
        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(configId);
        assertThat(result.getInstallationId()).isEqualTo(installationId);
        assertThat(result.getAlertLevel()).isEqualTo(AlertLevel.MEDIUM.name());
        assertThat(result.isAutoResponseEnabled()).isTrue();
        
        verify(installationRepository).findById(installationId);
        verify(alertConfigRepository).findByInstallation(testInstallation);
    }

    @Test
    @DisplayName("Should throw exception when getting alert config for non-existent installation")
    void shouldThrowExceptionWhenGettingAlertConfigForNonExistentInstallation() {
        // Arrange
        when(installationRepository.findById(installationId)).thenReturn(Optional.empty());
        
        // Act & Assert
        assertThrows(ResourceNotFoundException.class, () -> {
            alertConfigService.getAlertConfigByInstallationId(installationId);
        });
        
        verify(installationRepository).findById(installationId);
        verifyNoInteractions(alertConfigRepository);
    }

    @Test
    @DisplayName("Should create default alert config")
    void shouldCreateDefaultAlertConfig() {
        // Arrange
        when(installationRepository.findById(installationId)).thenReturn(Optional.of(testInstallation));
        when(alertConfigRepository.save(any(AlertConfig.class))).thenReturn(testAlertConfig);
        
        // Act
        AlertConfigDTO result = alertConfigService.createDefaultAlertConfig(installationId);
        
        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(configId);
        assertThat(result.getInstallationId()).isEqualTo(installationId);
        
        verify(installationRepository).findById(installationId);
        verify(alertConfigRepository).save(any(AlertConfig.class));
        verify(securityLogService).logConfigurationChange(eq(installationId), anyString(), eq("SYSTEM"));
    }

    @Test
    @DisplayName("Should update alert config")
    void shouldUpdateAlertConfig() {
        // Arrange
        when(installationRepository.findById(installationId)).thenReturn(Optional.of(testInstallation));
        when(alertConfigRepository.findByInstallation(testInstallation)).thenReturn(Optional.of(testAlertConfig));
        when(alertConfigRepository.save(any(AlertConfig.class))).thenReturn(testAlertConfig);
        
        // Act
        AlertConfigDTO result = alertConfigService.updateAlertConfig(installationId, testUpdateDTO);
        
        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(configId);
        assertThat(result.getInstallationId()).isEqualTo(installationId);
        
        verify(installationRepository).findById(installationId);
        verify(alertConfigRepository).findByInstallation(testInstallation);
        verify(alertConfigRepository).save(any(AlertConfig.class));
        verify(securityLogService).logConfigurationChange(eq(installationId), anyString(), eq("SYSTEM"));
    }

    @Test
    @DisplayName("Should get alert configs by user ID")
    void shouldGetAlertConfigsByUserId() {
        // Arrange
        Long userId = 1L;
        List<SolarInstallation> userInstallations = List.of(testInstallation);
        when(installationRepository.findByUserId(userId)).thenReturn(userInstallations);
        when(alertConfigRepository.findByInstallation(testInstallation)).thenReturn(Optional.of(testAlertConfig));
        
        // Act
        List<AlertConfigDTO> result = alertConfigService.getAlertConfigsByUserId(userId);
        
        // Assert
        assertThat(result).isNotNull();
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo(configId);
        assertThat(result.get(0).getInstallationId()).isEqualTo(installationId);
        
        verify(installationRepository).findByUserId(userId);
        verify(alertConfigRepository).findByInstallation(testInstallation);
    }

    @Test
    @DisplayName("Should get alert configs by installation IDs")
    void shouldGetAlertConfigsByInstallationIds() {
        // Arrange
        List<Long> installationIds = List.of(installationId);
        when(installationRepository.findAllById(installationIds)).thenReturn(List.of(testInstallation));
        when(alertConfigRepository.findByInstallation(testInstallation)).thenReturn(Optional.of(testAlertConfig));
        
        // Act
        List<AlertConfigDTO> result = alertConfigService.getAlertConfigsByInstallationIds(installationIds);
        
        // Assert
        assertThat(result).isNotNull();
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo(configId);
        assertThat(result.get(0).getInstallationId()).isEqualTo(installationId);
        
        verify(installationRepository).findAllById(installationIds);
        verify(alertConfigRepository).findByInstallation(testInstallation);
    }

    @Test
    @DisplayName("Should get alert configs by alert level")
    void shouldGetAlertConfigsByAlertLevel() {
        // Arrange
        AlertLevel alertLevel = AlertLevel.MEDIUM;
        when(alertConfigRepository.findByAlertLevel(alertLevel)).thenReturn(List.of(testAlertConfig));
        
        // Act
        List<AlertConfigDTO> result = alertConfigService.getAlertConfigsByAlertLevel(alertLevel);
        
        // Assert
        assertThat(result).isNotNull();
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo(configId);
        assertThat(result.get(0).getInstallationId()).isEqualTo(installationId);
        
        verify(alertConfigRepository).findByAlertLevel(alertLevel);
    }

    @Test
    @DisplayName("Should get auto response enabled configs")
    void shouldGetAutoResponseEnabledConfigs() {
        // Arrange
        when(alertConfigRepository.findByAutoResponseEnabled()).thenReturn(List.of(testAlertConfig));
        
        // Act
        List<AlertConfigDTO> result = alertConfigService.getAutoResponseEnabledConfigs();
        
        // Assert
        assertThat(result).isNotNull();
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo(configId);
        assertThat(result.get(0).getInstallationId()).isEqualTo(installationId);
        
        verify(alertConfigRepository).findByAutoResponseEnabled();
    }

    @Test
    @DisplayName("Should check if auto response is enabled")
    void shouldCheckIfAutoResponseIsEnabled() {
        // Arrange
        when(installationRepository.findById(installationId)).thenReturn(Optional.of(testInstallation));
        when(alertConfigRepository.findByInstallation(testInstallation)).thenReturn(Optional.of(testAlertConfig));
        
        // Act
        boolean result = alertConfigService.isAutoResponseEnabled(installationId);
        
        // Assert
        assertThat(result).isTrue();
        
        verify(installationRepository).findById(installationId);
        verify(alertConfigRepository).findByInstallation(testInstallation);
    }

    @Test
    @DisplayName("Should get threshold for event type")
    void shouldGetThresholdForEventType() {
        // Arrange
        when(installationRepository.findById(installationId)).thenReturn(Optional.of(testInstallation));
        when(alertConfigRepository.findByInstallation(testInstallation)).thenReturn(Optional.of(testAlertConfig));
        
        // Act
        double result = alertConfigService.getThresholdForEventType(installationId, "PHYSICAL_MOVEMENT");
        
        // Assert
        assertThat(result).isEqualTo(0.75);
        
        verify(installationRepository).findById(installationId);
        verify(alertConfigRepository).findByInstallation(testInstallation);
    }

    @Test
    @DisplayName("Should get sampling rate seconds")
    void shouldGetSamplingRateSeconds() {
        // Arrange
        when(installationRepository.findById(installationId)).thenReturn(Optional.of(testInstallation));
        when(alertConfigRepository.findByInstallation(testInstallation)).thenReturn(Optional.of(testAlertConfig));
        
        // Act
        int result = alertConfigService.getSamplingRateSeconds(installationId);
        
        // Assert
        assertThat(result).isEqualTo(60);
        
        verify(installationRepository).findById(installationId);
        verify(alertConfigRepository).findByInstallation(testInstallation);
    }
} 