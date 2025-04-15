package com.solar.core_services.tampering_detection.config;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.tampering_detection.model.AlertConfig;
import com.solar.core_services.tampering_detection.repository.AlertConfigRepository;
import com.solar.core_services.tampering_detection.repository.TamperEventRepository;
import com.solar.core_services.tampering_detection.service.TamperDetectionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Test class for TamperDetectionDataLoader
 * Source file: src/main/java/com/solar/core_services/tampering_detection/config/TamperDetectionDataLoader.java
 */
@ExtendWith(MockitoExtension.class)
public class TamperDetectionDataLoaderTest {

    @Mock
    private SolarInstallationRepository installationRepository;

    @Mock
    private AlertConfigRepository alertConfigRepository;

    @Mock
    private TamperEventRepository tamperEventRepository;

    @Mock
    private TamperDetectionService tamperDetectionService;

    @InjectMocks
    private TamperDetectionDataLoader dataLoader;

    @BeforeEach
    void setUp() {
        // Set up any common test objects or state
    }

    @Test
    @DisplayName("Should skip initialization if data already exists")
    void shouldSkipInitializationIfDataExists() {
        // Arrange
        when(installationRepository.count()).thenReturn(5L);

        // Act
        dataLoader.run(new String[]{});

        // Assert
        verify(installationRepository).count();
        verifyNoMoreInteractions(installationRepository);
        verifyNoInteractions(tamperDetectionService);
        verifyNoInteractions(tamperEventRepository);
    }

    @Test
    @DisplayName("Should initialize sample data when no data exists")
    void shouldInitializeSampleDataWhenNoDataExists() {
        // Arrange
        AlertConfig sampleConfig = new AlertConfig();
        SolarInstallation installation = new SolarInstallation();
        installation.setId(1L);
        
        when(installationRepository.count()).thenReturn(0L);
        when(installationRepository.saveAll(anyList())).thenReturn(java.util.Arrays.asList(installation));
        when(alertConfigRepository.findByInstallation(any(SolarInstallation.class))).thenReturn(Optional.of(sampleConfig));
        when(alertConfigRepository.save(any(AlertConfig.class))).thenReturn(sampleConfig);
        doNothing().when(tamperDetectionService).startMonitoring(anyLong());

        // Act
        dataLoader.run(new String[]{});

        // Assert
        verify(installationRepository).count();
        verify(installationRepository).saveAll(anyList());
        verify(tamperDetectionService, atLeastOnce()).startMonitoring(anyLong());
        verify(tamperEventRepository).saveAll(anyList());
        verify(alertConfigRepository, atLeastOnce()).findByInstallation(any(SolarInstallation.class));
        verify(alertConfigRepository, atLeastOnce()).save(any(AlertConfig.class));
    }

    @Test
    @DisplayName("Should start monitoring for all created installations")
    void shouldStartMonitoringForAllCreatedInstallations() {
        // Arrange
        SolarInstallation installation1 = new SolarInstallation();
        installation1.setId(1L);
        
        SolarInstallation installation2 = new SolarInstallation();
        installation2.setId(2L);
        
        when(installationRepository.count()).thenReturn(0L);
        when(installationRepository.saveAll(anyList())).thenReturn(java.util.Arrays.asList(installation1, installation2));
        when(alertConfigRepository.findByInstallation(any(SolarInstallation.class))).thenReturn(Optional.empty());
        doNothing().when(tamperDetectionService).startMonitoring(anyLong());

        // Act
        dataLoader.run(new String[]{});

        // Assert
        verify(tamperDetectionService).startMonitoring(installation1.getId());
        verify(tamperDetectionService).startMonitoring(installation2.getId());
    }
} 