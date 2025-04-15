package com.solar.core_services.tampering_detection.service;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.tampering_detection.dto.AlertConfigDTO;
import com.solar.core_services.tampering_detection.dto.AlertConfigUpdateDTO;
import com.solar.core_services.tampering_detection.dto.TamperEventCreateDTO;
import com.solar.core_services.tampering_detection.dto.TamperEventDTO;
import com.solar.core_services.tampering_detection.model.AlertConfig;
import com.solar.core_services.tampering_detection.model.TamperEvent;
import com.solar.core_services.tampering_detection.model.TamperEvent.TamperEventType;
import com.solar.core_services.tampering_detection.model.TamperEvent.TamperSeverity;
import com.solar.core_services.tampering_detection.model.SecurityLog;
import com.solar.core_services.tampering_detection.model.SecurityLog.ActivityType;
import com.solar.core_services.tampering_detection.service.impl.TamperDetectionServiceImpl;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Test class for TamperDetectionService
 * Source file: src/main/java/com/solar/core_services/tampering_detection/service/TamperDetectionService.java
 * Implementation: src/main/java/com/solar/core_services/tampering_detection/service/impl/TamperDetectionServiceImpl.java
 */
@ExtendWith(MockitoExtension.class)
public class TamperDetectionServiceTest {

    @Mock
    private SolarInstallationRepository solarInstallationRepository;

    @Mock
    private TamperEventService tamperEventService;

    @Mock
    private AlertConfigService alertConfigService;

    @Mock
    private SecurityLogService securityLogService;

    @Mock
    private TamperResponseService tamperResponseService;

    @InjectMocks
    private TamperDetectionServiceImpl tamperDetectionService;

    private SolarInstallation testInstallation;
    private AlertConfig testAlertConfig;
    private TamperEventDTO testTamperEventDTO;
    private Long installationId = 1L;
    private TamperEvent testTamperEvent;
    private Long eventId = 1L;

    @BeforeEach
    void setUp() {
        // Create test installation
        testInstallation = new SolarInstallation();
        testInstallation.setId(installationId);
        testInstallation.setName("Test Installation");
        testInstallation.setCapacity(5.0);
        testInstallation.setInstalledCapacityKW(5.0);
        testInstallation.setLocation("Test Location");
        testInstallation.setStatus(SolarInstallation.InstallationStatus.ACTIVE);
        testInstallation.setInstallationDate(LocalDateTime.now().minusMonths(1));

        // Set up test tamper event
        testTamperEvent = new TamperEvent();
        testTamperEvent.setId(eventId);
        testTamperEvent.setInstallation(testInstallation);
        testTamperEvent.setEventType(TamperEventType.PHYSICAL_MOVEMENT);
        testTamperEvent.setSeverity(TamperSeverity.HIGH);
        testTamperEvent.setTimestamp(LocalDateTime.now());
        testTamperEvent.setDescription("Test tamper event");
        testTamperEvent.setConfidenceScore(0.85);
        testTamperEvent.setRawSensorData("{\"acceleration\": 0.85, \"timestamp\": \"2023-06-15T14:30:00\"}");
        
        // Set up test alert config
        testAlertConfig = new AlertConfig();
        testAlertConfig.setId(1L);
        testAlertConfig.setInstallation(testInstallation);
        testAlertConfig.setAlertLevel(AlertConfig.AlertLevel.MEDIUM);
        testAlertConfig.setPhysicalMovementThreshold(0.75);
        testAlertConfig.setVoltageFluctuationThreshold(0.5);
        testAlertConfig.setConnectionInterruptionThreshold(0.8);
        testAlertConfig.setAutoResponseEnabled(true);
        
        // Set up test tamper event DTO
        testTamperEventDTO = new TamperEventDTO();
        testTamperEventDTO.setId(1L);
        testTamperEventDTO.setInstallationId(installationId);
        testTamperEventDTO.setEventType(TamperEventType.PHYSICAL_MOVEMENT);
        testTamperEventDTO.setSeverity(TamperSeverity.HIGH);
        testTamperEventDTO.setTimestamp(LocalDateTime.now());
        testTamperEventDTO.setDescription("Test tamper event");
        testTamperEventDTO.setConfidenceScore(0.85);
    }

    @Test
    @DisplayName("Should start monitoring for an installation")
    void shouldStartMonitoring() {
        // Arrange
        when(solarInstallationRepository.findById(installationId)).thenReturn(Optional.of(testInstallation));
        
        // Act
        tamperDetectionService.startMonitoring(installationId);
        
        // Assert
        verify(solarInstallationRepository).findById(installationId);
        verify(alertConfigService, never()).getAlertConfigByInstallationId(installationId);
        verify(alertConfigService).createDefaultAlertConfig(installationId);
        verify(securityLogService).createSecurityLog(
                eq(installationId), 
                eq(ActivityType.SYSTEM_DIAGNOSTIC), 
                eq("Tamper detection monitoring started"), 
                isNull(), 
                isNull(), 
                eq("SYSTEM"));
    }

    @Test
    @DisplayName("Should throw exception when starting monitoring for non-existent installation")
    void shouldThrowExceptionWhenStartingMonitoringForNonExistentInstallation() {
        // Arrange
        when(solarInstallationRepository.findById(installationId)).thenReturn(Optional.empty());
        
        // Act & Assert
        assertThrows(ResourceNotFoundException.class, () -> {
            tamperDetectionService.startMonitoring(installationId);
        });
        
        verify(solarInstallationRepository).findById(installationId);
        verifyNoInteractions(alertConfigService);
        verifyNoInteractions(securityLogService);
    }

    @Test
    @DisplayName("Should stop monitoring for an installation")
    void shouldStopMonitoring() {
        // Arrange
        when(solarInstallationRepository.findById(installationId)).thenReturn(Optional.of(testInstallation));
        
        // First start monitoring
        tamperDetectionService.startMonitoring(installationId);
        
        // Reset mocks after starting monitoring
        reset(solarInstallationRepository, securityLogService);
        when(solarInstallationRepository.findById(installationId)).thenReturn(Optional.of(testInstallation));
        
        // Act
        tamperDetectionService.stopMonitoring(installationId);
        
        // Assert
        verify(solarInstallationRepository).findById(installationId);
        verify(securityLogService).createSecurityLog(
                eq(installationId), 
                eq(ActivityType.SYSTEM_DIAGNOSTIC), 
                eq("Tamper detection monitoring stopped"), 
                isNull(), 
                isNull(), 
                eq("SYSTEM"));
    }

    @Test
    @DisplayName("Should process physical movement data and detect tampering")
    void shouldProcessPhysicalMovementData() {
        // Arrange
        double movementValue = 0.85; // Above threshold
        String rawData = "{\"acceleration\": 0.85, \"timestamp\": \"2023-06-15T14:30:00\"}";
        
        when(solarInstallationRepository.findById(installationId)).thenReturn(Optional.of(testInstallation));
        when(alertConfigService.getThresholdForEventType(installationId, "PHYSICAL_MOVEMENT")).thenReturn(0.75);
        
        // Setup tamperEventService to return our test DTO when createTamperEvent is called
        when(tamperEventService.createTamperEvent(any(TamperEventCreateDTO.class))).thenReturn(testTamperEventDTO);
        
        // We need to start monitoring first
        tamperDetectionService.startMonitoring(installationId);
        
        // Act
        TamperEventDTO result = tamperDetectionService.processPhysicalMovementData(installationId, movementValue, rawData);
        
        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(testTamperEventDTO.getId());
        
        verify(solarInstallationRepository, atLeastOnce()).findById(installationId);
        verify(alertConfigService).getThresholdForEventType(installationId, "PHYSICAL_MOVEMENT");
        verify(tamperEventService).createTamperEvent(any(TamperEventCreateDTO.class));
    }

    @Test
    @DisplayName("Should process voltage fluctuation data and detect tampering")
    void shouldProcessVoltageFluctuationData() {
        // Arrange
        double voltageValue = 180.0; // Significant fluctuation
        String rawData = "{\"voltage\": 180.0, \"normal_voltage\": 240, \"timestamp\": \"2023-06-18T09:15:00\"}";
        
        when(solarInstallationRepository.findById(installationId)).thenReturn(Optional.of(testInstallation));
        when(alertConfigService.getThresholdForEventType(installationId, "VOLTAGE_FLUCTUATION")).thenReturn(0.5);
        
        // Setup tamperEventService to return our test DTO when createTamperEvent is called
        when(tamperEventService.createTamperEvent(any(TamperEventCreateDTO.class))).thenReturn(testTamperEventDTO);
        
        // We need to start monitoring first
        tamperDetectionService.startMonitoring(installationId);
        
        // Act
        TamperEventDTO result = tamperDetectionService.processVoltageFluctuationData(installationId, voltageValue, rawData);
        
        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(testTamperEventDTO.getId());
        
        verify(solarInstallationRepository, atLeastOnce()).findById(installationId);
        verify(alertConfigService).getThresholdForEventType(installationId, "VOLTAGE_FLUCTUATION");
        verify(tamperEventService).createTamperEvent(any(TamperEventCreateDTO.class));
    }

    @Test
    @DisplayName("Should process connection interruption data and detect tampering")
    void shouldProcessConnectionInterruptionData() {
        // Arrange
        boolean connected = false; // Connection interrupted
        String rawData = "{\"connected\": false, \"timestamp\": \"2023-06-20T16:45:00\"}";
        
        when(solarInstallationRepository.findById(installationId)).thenReturn(Optional.of(testInstallation));
        // The implementation doesn't call getThresholdForEventType for connection interruption
        
        // Setup tamperEventService to return our test DTO when createTamperEvent is called
        when(tamperEventService.createTamperEvent(any(TamperEventCreateDTO.class))).thenReturn(testTamperEventDTO);
        
        // We need to start monitoring first
        tamperDetectionService.startMonitoring(installationId);
        
        // Act
        TamperEventDTO result = tamperDetectionService.processConnectionInterruptionData(installationId, connected, rawData);
        
        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(testTamperEventDTO.getId());
        
        verify(solarInstallationRepository, atLeastOnce()).findById(installationId);
        verify(tamperEventService).createTamperEvent(any(TamperEventCreateDTO.class));
    }

    @Test
    @DisplayName("Should process location change data and detect tampering")
    void shouldProcessLocationChangeData() {
        // Arrange
        String newLocation = "37.7749,-122.4194"; // San Francisco
        String previousLocation = "34.0522,-118.2437"; // Los Angeles
        String rawData = "{\"new_location\": \"37.7749,-122.4194\", \"previous_location\": \"34.0522,-118.2437\", \"timestamp\": \"2023-06-22T10:30:00\"}";
        
        when(solarInstallationRepository.findById(installationId)).thenReturn(Optional.of(testInstallation));
        
        // Setup tamperEventService to return our test DTO when createTamperEvent is called
        when(tamperEventService.createTamperEvent(any(TamperEventCreateDTO.class))).thenReturn(testTamperEventDTO);
        
        // We need to start monitoring first
        tamperDetectionService.startMonitoring(installationId);
        
        // Act
        TamperEventDTO result = tamperDetectionService.processLocationChangeData(installationId, newLocation, previousLocation, rawData);
        
        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(testTamperEventDTO.getId());
        
        verify(solarInstallationRepository, atLeastOnce()).findById(installationId);
        verify(tamperEventService).createTamperEvent(any(TamperEventCreateDTO.class));
    }

    @Test
    @DisplayName("Should detect tampering and create tamper event")
    void shouldDetectTamperingAndCreateTamperEvent() {
        // Arrange
        TamperEventType eventType = TamperEventType.PHYSICAL_MOVEMENT;
        double confidenceScore = 0.85;
        String description = "Significant physical movement detected";
        String rawData = "{\"acceleration\": 0.85, \"timestamp\": \"2023-06-15T14:30:00\"}";
        
        when(tamperEventService.createTamperEvent(any(TamperEventCreateDTO.class))).thenReturn(testTamperEventDTO);
        
        // Act
        TamperEventDTO result = tamperDetectionService.detectTampering(
                installationId, eventType, confidenceScore, description, rawData);
        
        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(testTamperEventDTO.getId());
        
        verify(tamperEventService).createTamperEvent(any(TamperEventCreateDTO.class));
        verify(tamperResponseService).executeAutomaticResponse(testTamperEventDTO.getId());
    }

    @Test
    @DisplayName("Should run diagnostics for an installation")
    void shouldRunDiagnostics() {
        // Arrange
        when(solarInstallationRepository.findById(installationId)).thenReturn(Optional.of(testInstallation));
        
        // Act
        tamperDetectionService.runDiagnostics(installationId);
        
        // Assert
        verify(solarInstallationRepository).findById(installationId);
        verify(securityLogService).createSecurityLog(
                eq(installationId), 
                eq(ActivityType.SYSTEM_DIAGNOSTIC), 
                eq("Tamper detection diagnostics executed"), 
                isNull(), 
                isNull(), 
                eq("SYSTEM"));
    }

    @Test
    @DisplayName("Should adjust sensitivity for an installation")
    void shouldAdjustSensitivity() {
        // Arrange
        String eventType = "PHYSICAL_MOVEMENT";
        double newThreshold = 0.8;
        
        // Create a mock AlertConfigDTO
        AlertConfigDTO mockConfig = new AlertConfigDTO();
        mockConfig.setInstallationId(installationId);
        mockConfig.setAlertLevel("MEDIUM");
        mockConfig.setAutoResponseEnabled(true);
        
        when(alertConfigService.getAlertConfigByInstallationId(installationId)).thenReturn(mockConfig);
        
        // Act
        tamperDetectionService.adjustSensitivity(installationId, eventType, newThreshold);
        
        // Assert
        verify(alertConfigService).getAlertConfigByInstallationId(installationId);
        verify(alertConfigService).updateAlertConfig(eq(installationId), any(AlertConfigUpdateDTO.class));
        verify(securityLogService).createSecurityLog(
                eq(installationId), 
                eq(ActivityType.SENSITIVITY_CHANGE), 
                eq("Tamper detection sensitivity adjusted for PHYSICAL_MOVEMENT to 0.8"), 
                isNull(), 
                isNull(), 
                eq("SYSTEM"));
    }

    @Test
    @DisplayName("Should log security event when monitoring starts")
    void shouldLogSecurityEventWhenMonitoringStarts() {
        // Arrange
        when(solarInstallationRepository.findById(installationId)).thenReturn(Optional.of(testInstallation));
        
        // Act
        tamperDetectionService.startMonitoring(installationId);
        
        // Assert
        verify(securityLogService).createSecurityLog(
                eq(installationId),
                eq(ActivityType.SYSTEM_DIAGNOSTIC),
                eq("Tamper detection monitoring started"),
                isNull(),
                isNull(),
                eq("SYSTEM")
        );
    }

    @Test
    @DisplayName("Should log security event when monitoring stops")
    void shouldLogSecurityEventWhenMonitoringStops() {
        // Arrange
        when(solarInstallationRepository.findById(installationId)).thenReturn(Optional.of(testInstallation));
        
        // Act
        tamperDetectionService.stopMonitoring(installationId);
        
        // Assert
        verify(securityLogService).createSecurityLog(
                eq(installationId),
                eq(ActivityType.SYSTEM_DIAGNOSTIC),
                eq("Tamper detection monitoring stopped"),
                isNull(),
                isNull(),
                eq("SYSTEM")
        );
    }

    @Test
    @DisplayName("Should log security event when diagnostics run")
    void shouldLogSecurityEventWhenDiagnosticsRun() {
        // Arrange
        when(solarInstallationRepository.findById(installationId)).thenReturn(Optional.of(testInstallation));
        
        // Act
        tamperDetectionService.runDiagnostics(installationId);
        
        // Assert
        verify(securityLogService).createSecurityLog(
                eq(installationId),
                eq(ActivityType.SYSTEM_DIAGNOSTIC),
                eq("Tamper detection diagnostics executed"),
                isNull(),
                isNull(),
                eq("SYSTEM")
        );
    }
} 