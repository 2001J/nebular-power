package com.solar.core_services.tampering_detection.scheduler;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.tampering_detection.dto.SecurityLogDTO;
import com.solar.core_services.tampering_detection.model.SecurityLog;
import com.solar.core_services.tampering_detection.model.TamperEvent;
import com.solar.core_services.tampering_detection.repository.TamperEventRepository;
import com.solar.core_services.tampering_detection.service.SecurityLogService;
import com.solar.core_services.tampering_detection.service.TamperDetectionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Test class for TamperDetectionScheduler
 * Source file: src/main/java/com/solar/core_services/tampering_detection/scheduler/TamperDetectionScheduler.java
 */
@ExtendWith(MockitoExtension.class)
public class TamperDetectionSchedulerTest {

    @Mock
    private TamperDetectionService tamperDetectionService;

    @Mock
    private TamperEventRepository tamperEventRepository;

    @Mock
    private SolarInstallationRepository solarInstallationRepository;

    @Mock
    private SecurityLogService securityLogService;

    @InjectMocks
    private TamperDetectionScheduler scheduler;

    private SolarInstallation activeInstallation;
    private SolarInstallation inactiveInstallation;
    private TamperEvent criticalEvent;
    private TamperEvent highEvent;
    private TamperEvent mediumEvent;

    @BeforeEach
    void setUp() {
        // Set up active installation
        activeInstallation = new SolarInstallation();
        activeInstallation.setId(1L);
        activeInstallation.setStatus(SolarInstallation.InstallationStatus.ACTIVE);
        activeInstallation.setName("Test Active Installation");

        // Set up inactive installation
        inactiveInstallation = new SolarInstallation();
        inactiveInstallation.setId(2L);
        inactiveInstallation.setStatus(SolarInstallation.InstallationStatus.MAINTENANCE);
        inactiveInstallation.setName("Test Inactive Installation");

        // Set up critical tamper event (older than 4 hours)
        criticalEvent = new TamperEvent();
        criticalEvent.setId(1L);
        criticalEvent.setInstallation(activeInstallation);
        criticalEvent.setSeverity(TamperEvent.TamperSeverity.CRITICAL);
        criticalEvent.setResolved(false);
        criticalEvent.setTimestamp(LocalDateTime.now().minusHours(5));
        criticalEvent.setDescription("Critical test event");

        // Set up high severity tamper event (older than 4 hours)
        highEvent = new TamperEvent();
        highEvent.setId(2L);
        highEvent.setInstallation(activeInstallation);
        highEvent.setSeverity(TamperEvent.TamperSeverity.HIGH);
        highEvent.setResolved(false);
        highEvent.setTimestamp(LocalDateTime.now().minusHours(5));
        highEvent.setDescription("High severity test event");

        // Set up medium severity tamper event (should not be escalated)
        mediumEvent = new TamperEvent();
        mediumEvent.setId(3L);
        mediumEvent.setInstallation(activeInstallation);
        mediumEvent.setSeverity(TamperEvent.TamperSeverity.MEDIUM);
        mediumEvent.setResolved(false);
        mediumEvent.setTimestamp(LocalDateTime.now().minusHours(5));
        mediumEvent.setDescription("Medium severity test event");
    }

    @Test
    @DisplayName("Should run diagnostics for all monitored installations")
    void shouldRunDiagnosticsForAllMonitoredInstallations() {
        // Arrange
        List<SolarInstallation> installations = Arrays.asList(activeInstallation, inactiveInstallation);
        when(solarInstallationRepository.findAll()).thenReturn(installations);
        when(tamperDetectionService.isMonitoring(activeInstallation.getId())).thenReturn(true);
        when(tamperDetectionService.isMonitoring(inactiveInstallation.getId())).thenReturn(false);
        doNothing().when(tamperDetectionService).runDiagnostics(anyLong());

        // Act
        scheduler.runDailyDiagnostics();

        // Assert
        verify(tamperDetectionService).runDiagnostics(activeInstallation.getId());
        verify(tamperDetectionService, never()).runDiagnostics(inactiveInstallation.getId());
    }

    @Test
    @DisplayName("Should handle exceptions during diagnostics")
    void shouldHandleExceptionsDuringDiagnostics() {
        // Arrange
        List<SolarInstallation> installations = Arrays.asList(activeInstallation);
        when(solarInstallationRepository.findAll()).thenReturn(installations);
        when(tamperDetectionService.isMonitoring(activeInstallation.getId())).thenReturn(true);
        doThrow(new RuntimeException("Test exception")).when(tamperDetectionService).runDiagnostics(activeInstallation.getId());

        // Act
        scheduler.runDailyDiagnostics();

        // Assert - should not throw exception
        verify(tamperDetectionService).runDiagnostics(activeInstallation.getId());
    }

    @Test
    @DisplayName("Should escalate unresolved critical and high severity events")
    void shouldEscalateUnresolvedCriticalAndHighSeverityEvents() {
        // Arrange
        List<TamperEvent> unresolvedEvents = Arrays.asList(criticalEvent, highEvent, mediumEvent);
        when(tamperEventRepository.findByResolvedFalseOrderByTimestampDesc()).thenReturn(unresolvedEvents);
        
        // Fix: Use SecurityLogDTO instead of SecurityLog as the return type
        when(securityLogService.createSecurityLog(
                anyLong(),
                any(SecurityLog.ActivityType.class),
                anyString(),
                isNull(),
                isNull(),
                eq("SYSTEM")
        )).thenReturn(new SecurityLogDTO()); // Return a new SecurityLogDTO object

        // Act
        scheduler.escalateUnresolvedAlerts();

        // Assert
        verify(securityLogService, times(2)).createSecurityLog(
                anyLong(),
                eq(SecurityLog.ActivityType.ALERT_GENERATED),
                argThat(details -> details.contains("ESCALATION")),
                isNull(),
                isNull(),
                eq("SYSTEM")
        );
    }

    @Test
    @DisplayName("Should check and update monitoring status for all installations")
    void shouldCheckAndUpdateMonitoringStatus() {
        // Arrange
        List<SolarInstallation> installations = Arrays.asList(activeInstallation, inactiveInstallation);
        when(solarInstallationRepository.findAll()).thenReturn(installations);
        
        // Active installation that should be monitored but isn't
        when(tamperDetectionService.isMonitoring(activeInstallation.getId())).thenReturn(false);
        
        // Inactive installation that shouldn't be monitored but is
        when(tamperDetectionService.isMonitoring(inactiveInstallation.getId())).thenReturn(true);
        
        doNothing().when(tamperDetectionService).startMonitoring(anyLong());
        doNothing().when(tamperDetectionService).stopMonitoring(anyLong());

        // Act
        scheduler.checkMonitoringStatus();

        // Assert
        verify(tamperDetectionService).startMonitoring(activeInstallation.getId());
        verify(tamperDetectionService).stopMonitoring(inactiveInstallation.getId());
    }

    @Test
    @DisplayName("Should handle exceptions during monitoring status check")
    void shouldHandleExceptionsDuringMonitoringStatusCheck() {
        // Arrange
        List<SolarInstallation> installations = Arrays.asList(activeInstallation);
        when(solarInstallationRepository.findAll()).thenReturn(installations);
        when(tamperDetectionService.isMonitoring(activeInstallation.getId())).thenReturn(false);
        doThrow(new RuntimeException("Test exception")).when(tamperDetectionService).startMonitoring(activeInstallation.getId());

        // Act
        scheduler.checkMonitoringStatus();

        // Assert - should not throw exception
        verify(tamperDetectionService).startMonitoring(activeInstallation.getId());
    }
} 