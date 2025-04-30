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
import com.solar.core_services.tampering_detection.repository.MonitoringStatusRepository;
import com.solar.core_services.tampering_detection.model.MonitoringStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

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

    @Mock
    private MonitoringStatusRepository monitoringStatusRepository;

    @InjectMocks
    private TamperDetectionServiceImpl tamperDetectionService;

    private SolarInstallation testInstallation;
    private AlertConfig testAlertConfig;
    private TamperEventDTO testTamperEventDTO;
    private final Long installationId = 1L;
    private TamperEvent testTamperEvent;
    private final Long eventId = 1L;
    private MonitoringStatus testMonitoringStatus;
    
    // Reference to private lastKnownValues map for testing
    private Map<Long, Map<String, Object>> lastKnownValues;

    @BeforeEach
    void setUp() throws Exception {
        // Create test installation
        testInstallation = new SolarInstallation();
        testInstallation.setId(installationId);
        testInstallation.setName("Test Installation");
        testInstallation.setCapacity(5.0);
        testInstallation.setInstalledCapacityKW(5.0);
        testInstallation.setLocation("Test Location");
        testInstallation.setStatus(SolarInstallation.InstallationStatus.ACTIVE);
        testInstallation.setInstallationDate(LocalDateTime.now().minusMonths(1));

        // Set up test monitoring status
        testMonitoringStatus = new MonitoringStatus();
        testMonitoringStatus.setId(1L);
        testMonitoringStatus.setInstallation(testInstallation);
        testMonitoringStatus.setMonitoring(true); // Default to monitoring enabled
        testMonitoringStatus.setUpdatedAt(LocalDateTime.now());
        
        // Configure monitoringStatusRepository mock for all tests - use lenient for common stubs
        lenient().when(monitoringStatusRepository.findByInstallationId(anyLong()))
            .thenReturn(Optional.of(testMonitoringStatus));
        lenient().when(monitoringStatusRepository.save(any(MonitoringStatus.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));

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
        
        // Access the private lastKnownValues map for testing
        Field lastKnownValuesField = TamperDetectionServiceImpl.class.getDeclaredField("lastKnownValues");
        lastKnownValuesField.setAccessible(true);
        lastKnownValues = (Map<Long, Map<String, Object>>) lastKnownValuesField.get(tamperDetectionService);
        
        // Initialize the map for each test
        lastKnownValues.put(installationId, new HashMap<>());
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
        verify(monitoringStatusRepository).findByInstallationId(installationId);
        verify(monitoringStatusRepository).save(any(MonitoringStatus.class));
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
        verifyNoMoreInteractions(securityLogService);
    }

    @Test
    @DisplayName("Should stop monitoring for an installation")
    void shouldStopMonitoring() {
        // Arrange
        when(solarInstallationRepository.findById(installationId)).thenReturn(Optional.of(testInstallation));
        
        // Act
        tamperDetectionService.stopMonitoring(installationId);
        
        // Assert
        verify(solarInstallationRepository).findById(installationId);
        verify(monitoringStatusRepository).findByInstallationId(installationId);
        verify(monitoringStatusRepository).save(any(MonitoringStatus.class));
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
        
        when(alertConfigService.getThresholdForEventType(installationId, "PHYSICAL_MOVEMENT")).thenReturn(0.75);
        when(tamperEventService.createTamperEvent(any(TamperEventCreateDTO.class))).thenReturn(testTamperEventDTO);
        
        // Act
        TamperEventDTO result = tamperDetectionService.processPhysicalMovementData(installationId, movementValue, rawData);
        
        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(testTamperEventDTO.getId());
        
        verify(monitoringStatusRepository).findByInstallationId(installationId);
        verify(alertConfigService).getThresholdForEventType(installationId, "PHYSICAL_MOVEMENT");
        verify(tamperEventService).createTamperEvent(any(TamperEventCreateDTO.class));
        verify(tamperResponseService).executeAutomaticResponse(any());
    }

    @Test
    @DisplayName("Should process voltage fluctuation data and detect tampering")
    void shouldProcessVoltageFluctuationData() {
        // Arrange
        double voltageValue = 245.5; // Assumed to cause fluctuation
        String rawData = "{\"voltage\": 245.5, \"timestamp\": \"2023-06-15T14:30:00\"}";
        
        when(alertConfigService.getThresholdForEventType(installationId, "VOLTAGE_FLUCTUATION")).thenReturn(0.5);
        when(tamperEventService.createTamperEvent(any(TamperEventCreateDTO.class))).thenReturn(testTamperEventDTO);
        
        // Act
        TamperEventDTO result = tamperDetectionService.processVoltageFluctuationData(installationId, voltageValue, rawData);
        
        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(testTamperEventDTO.getId());
        
        verify(monitoringStatusRepository).findByInstallationId(installationId);
        verify(alertConfigService).getThresholdForEventType(installationId, "VOLTAGE_FLUCTUATION");
        verify(tamperEventService).createTamperEvent(any(TamperEventCreateDTO.class));
        verify(tamperResponseService).executeAutomaticResponse(any());
    }

    @Test
    @DisplayName("Should process connection interruption data and detect tampering")
    void shouldProcessConnectionInterruptionData() {
        // Arrange
        boolean connected = false; // Disconnected
        String rawData = "{\"connectionStatus\": \"interrupted\", \"timestamp\": \"2023-06-15T14:30:00\"}";
        
        // Set up that it was previously connected
        lastKnownValues.get(installationId).put("connected", true);
        
        when(tamperEventService.createTamperEvent(any(TamperEventCreateDTO.class))).thenReturn(testTamperEventDTO);
        
        // Act
        TamperEventDTO result = tamperDetectionService.processConnectionInterruptionData(installationId, connected, rawData);
        
        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(testTamperEventDTO.getId());
        
        verify(monitoringStatusRepository).findByInstallationId(installationId);
        verify(tamperEventService).createTamperEvent(any(TamperEventCreateDTO.class));
        verify(tamperResponseService).executeAutomaticResponse(any());
    }

    @Test
    @DisplayName("Should process location change data and detect tampering")
    void shouldProcessLocationChangeData() {
        // Arrange
        String newLocation = "37.7749,-122.4194"; // San Francisco
        String previousLocation = "34.0522,-118.2437"; // Los Angeles
        String rawData = "{\"latitude\": 37.7749, \"longitude\": -122.4194, \"timestamp\": \"2023-06-15T14:30:00\"}";
        
        when(tamperEventService.createTamperEvent(any(TamperEventCreateDTO.class))).thenReturn(testTamperEventDTO);
        
        // Act
        TamperEventDTO result = tamperDetectionService.processLocationChangeData(installationId, newLocation, previousLocation, rawData);
        
        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(testTamperEventDTO.getId());
        
        verify(monitoringStatusRepository).findByInstallationId(installationId);
        verify(tamperEventService).createTamperEvent(any(TamperEventCreateDTO.class));
        verify(tamperResponseService).executeAutomaticResponse(any());
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
    @DisplayName("Should initialize lastKnownValues map when monitoring starts")
    void shouldInitializeLastKnownValuesMapWhenMonitoringStarts() {
        // Arrange
        // Clear the map to test initialization
        lastKnownValues.clear();
        
        when(solarInstallationRepository.findById(installationId)).thenReturn(Optional.of(testInstallation));
        
        // Act
        tamperDetectionService.startMonitoring(installationId);
        
        // Assert - check if the map was initialized
        assertThat(lastKnownValues).containsKey(installationId);
        assertThat(lastKnownValues.get(installationId)).isNotNull();
        
        // Process some data to verify the map works correctly
        when(alertConfigService.getThresholdForEventType(eq(installationId), anyString())).thenReturn(0.5);
        tamperDetectionService.processPhysicalMovementData(installationId, 0.2, "{}");
        
        // Verify the value was stored
        assertThat(lastKnownValues.get(installationId)).containsKey("movement");
        assertThat(lastKnownValues.get(installationId).get("movement")).isEqualTo(0.2);
    }
    
    @Test
    @DisplayName("Should not detect tampering when monitoring is disabled")
    void shouldNotDetectTamperingWhenMonitoringIsDisabled() {
        // Arrange
        testMonitoringStatus.setMonitoring(false);
        
        // Act
        TamperEventDTO physicalResult = tamperDetectionService.processPhysicalMovementData(
                installationId, 1.0, "{}");
        TamperEventDTO voltageResult = tamperDetectionService.processVoltageFluctuationData(
                installationId, 10.0, "{}");
        TamperEventDTO connectionResult = tamperDetectionService.processConnectionInterruptionData(
                installationId, false, "{}");
        TamperEventDTO locationResult = tamperDetectionService.processLocationChangeData(
                installationId, "new-location", "old-location", "{}");
        
        // Assert
        assertThat(physicalResult).isNull();
        assertThat(voltageResult).isNull();
        assertThat(connectionResult).isNull();
        assertThat(locationResult).isNull();
        
        // Verify we checked monitoring status but did not create any events
        verify(monitoringStatusRepository, times(4)).findByInstallationId(installationId);
        verify(tamperEventService, never()).createTamperEvent(any());
    }
    
    @Test
    @DisplayName("Should not detect tampering when values are under threshold")
    void shouldNotDetectTamperingWhenValuesUnderThreshold() {
        // Arrange
        double threshold = 0.5;
        double movementValue = 0.3; // Below threshold
        
        when(alertConfigService.getThresholdForEventType(installationId, "PHYSICAL_MOVEMENT"))
            .thenReturn(threshold);
        
        // Act
        TamperEventDTO result = tamperDetectionService.processPhysicalMovementData(
                installationId, movementValue, "{}");
        
        // Assert
        assertThat(result).isNull();
        
        // Verify we checked monitoring and threshold but did not create an event
        verify(monitoringStatusRepository).findByInstallationId(installationId);
        verify(alertConfigService).getThresholdForEventType(installationId, "PHYSICAL_MOVEMENT");
        verify(tamperEventService, never()).createTamperEvent(any());
    }
    
    @Test
    @DisplayName("Should properly detect connection interruption based on previous state")
    void shouldDetectConnectionInterruptionBasedOnPreviousState() {
        // Arrange
        when(tamperEventService.createTamperEvent(any())).thenReturn(testTamperEventDTO);
        
        // First call with connected = true to set previous state
        tamperDetectionService.processConnectionInterruptionData(installationId, true, "{}");
        
        // Reset mocks to ensure clean verification
        reset(tamperEventService);
        when(tamperEventService.createTamperEvent(any())).thenReturn(testTamperEventDTO);
        
        // Act - second call with connected = false to trigger tampering detection
        TamperEventDTO result = tamperDetectionService.processConnectionInterruptionData(
                installationId, false, "{}");
        
        // Assert
        assertThat(result).isNotNull();
        
        // Verify tampering was detected on the second call only
        verify(tamperEventService).createTamperEvent(any());
        
        // Test the case for a new installation
        reset(tamperEventService);
        // Set up the tamperEventService mock
        when(tamperEventService.createTamperEvent(any())).thenReturn(testTamperEventDTO);
        
        // A new installation with connection data
        Long newInstallationId = 2L;
        // Initialize the map for the new installation
        lastKnownValues.put(newInstallationId, new HashMap<>());
        // Set the previous connection state to connected
        lastKnownValues.get(newInstallationId).put("connected", true);
        
        // Act - call with connected = false for the new installation
        TamperEventDTO newResult = tamperDetectionService.processConnectionInterruptionData(
                newInstallationId, false, "{}");
        
        // Assert - tampering detected as there was a change from connected to disconnected
        assertThat(newResult).isNotNull();
        
        // Verify createTamperEvent was called for the new installation too
        verify(tamperEventService).createTamperEvent(any());
    }
    
    @Test
    @DisplayName("Should properly detect location change based on comparison")
    void shouldDetectLocationChangeBasedOnComparison() {
        // Arrange
        String previousLocation = "34.0522,-118.2437"; // Los Angeles
        String sameLocation = "34.0522,-118.2437"; // Los Angeles (same)
        String newLocation = "37.7749,-122.4194"; // San Francisco (different)
        
        when(tamperEventService.createTamperEvent(any())).thenReturn(testTamperEventDTO);
        
        // Act - same location should not trigger tampering
        TamperEventDTO sameResult = tamperDetectionService.processLocationChangeData(
                installationId, sameLocation, previousLocation, "{}");
        
        // Assert
        assertThat(sameResult).isNull();
        
        // Verify no tampering was detected
        verify(tamperEventService, never()).createTamperEvent(any());
        
        // Reset mocks
        reset(tamperEventService);
        when(tamperEventService.createTamperEvent(any())).thenReturn(testTamperEventDTO);
        
        // Act - different location should trigger tampering
        TamperEventDTO differentResult = tamperDetectionService.processLocationChangeData(
                installationId, newLocation, previousLocation, "{}");
        
        // Assert
        assertThat(differentResult).isNotNull();
        
        // Verify tampering was detected
        verify(tamperEventService).createTamperEvent(any());
    }
} 