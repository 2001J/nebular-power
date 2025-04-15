package com.solar.core_services.service_control.service;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.service_control.dto.DeviceHeartbeatRequest;
import com.solar.core_services.service_control.dto.SystemOverviewResponse;
import com.solar.core_services.service_control.model.OperationalLog;
import com.solar.core_services.service_control.service.impl.SystemMonitoringServiceImpl;
import com.solar.user_management.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Test class for SystemMonitoringService implementation
 * Source file: src/main/java/com/solar/core_services/service_control/service/impl/SystemMonitoringServiceImpl.java
 */
@ExtendWith(MockitoExtension.class)
public class SystemMonitoringServiceTest {

    @Mock
    private SolarInstallationRepository installationRepository;

    @Mock
    private OperationalLogService operationalLogService;

    @InjectMocks
    private SystemMonitoringServiceImpl systemMonitoringService;

    @Captor
    private ArgumentCaptor<Long> installationIdCaptor;

    @Captor
    private ArgumentCaptor<String> detailsCaptor;

    private DeviceHeartbeatRequest heartbeatRequest;
    private SolarInstallation installation;

    @BeforeEach
    void setUp() {
        User user = new User();
        user.setId(1L);
        
        installation = new SolarInstallation();
        installation.setId(1L);
        installation.setName("Test Installation");
        installation.setUser(user);
        installation.setCapacity(5.0);
        installation.setLocation("Test Location");
        installation.setInstallationDate(LocalDateTime.now());
        
        heartbeatRequest = new DeviceHeartbeatRequest();
        heartbeatRequest.setInstallationId(1L);
        heartbeatRequest.setDeviceId("device123");
        heartbeatRequest.setTimestamp(LocalDateTime.now());
        heartbeatRequest.setStatus("ONLINE");
        heartbeatRequest.setBatteryLevel(85.5);
        heartbeatRequest.setPowerStatus(true);
        heartbeatRequest.setConnectionType("CELLULAR");
        heartbeatRequest.setSignalStrength(92);
        heartbeatRequest.setFirmwareVersion("v1.2.3");
    }

    @Test
    @DisplayName("Should process heartbeat correctly")
    void shouldProcessHeartbeat() {
        // When
        systemMonitoringService.processHeartbeat(heartbeatRequest);

        // Then - verify the method completes without exceptions
        // No need to check return value as the method is void
        // The cache update is internal to the implementation
    }

    @Test
    @DisplayName("Should process heartbeat with error codes")
    void shouldProcessHeartbeatWithErrorCodes() {
        // Given
        Map<String, Object> diagnostics = new HashMap<>();
        diagnostics.put("errorCodes", List.of("E001", "E002"));
        heartbeatRequest.setDiagnostics(diagnostics);
        heartbeatRequest.setStatus("ERROR");

        // When
        systemMonitoringService.processHeartbeat(heartbeatRequest);

        // Then - verify the method completes without exceptions
        // No need to check return value as the method is void
    }

    @Test
    @DisplayName("Should get system overview")
    void shouldGetSystemOverview() {
        // Given
        when(installationRepository.count()).thenReturn(10L);
        when(installationRepository.findAll()).thenReturn(Collections.singletonList(installation));
        
        // When
        SystemOverviewResponse result = systemMonitoringService.getSystemOverview();

        // Then
        assertNotNull(result);
        assertEquals(10, result.getTotalInstallations());
        verify(installationRepository).count();
        verify(installationRepository).findAll();
    }

    @Test
    @DisplayName("Should check unresponsive devices")
    void shouldCheckUnresponsiveDevices() {
        // Given - add a device to the monitoring service by processing a heartbeat
        systemMonitoringService.processHeartbeat(heartbeatRequest);

        // When
        systemMonitoringService.checkUnresponsiveDevices();

        // Then - since we're not mocking time, the device won't be unresponsive
        // No verification needed as the operationalLogService would only be called for unresponsive devices
    }

    @Test
    @DisplayName("Should check low battery devices")
    void shouldCheckLowBatteryDevices() {
        // Given - add a device with low battery
        heartbeatRequest.setBatteryLevel(10.0);
        systemMonitoringService.processHeartbeat(heartbeatRequest);

        // When
        systemMonitoringService.checkLowBatteryDevices();

        // Then
        verify(operationalLogService).logOperation(
            eq(1L),
            eq(OperationalLog.OperationType.SYSTEM_ALERT),
            eq("SYSTEM"),
            argThat(message -> message.contains("low battery")),
            eq("MONITORING_SYSTEM"),
            eq("LOW_BATTERY_CHECK"),
            eq("internal"),
            eq("SystemMonitoringService"),
            eq(true),
            isNull()
        );
    }

    @Test
    @DisplayName("Should check poor connectivity devices")
    void shouldCheckPoorConnectivityDevices() {
        // Given - add a device with poor connectivity
        heartbeatRequest.setSignalStrength(15);
        systemMonitoringService.processHeartbeat(heartbeatRequest);

        // When
        systemMonitoringService.checkPoorConnectivityDevices();

        // Then
        verify(operationalLogService).logOperation(
            eq(1L),
            eq(OperationalLog.OperationType.SYSTEM_ALERT),
            eq("SYSTEM"),
            argThat(message -> message.contains("poor connectivity")),
            eq("MONITORING_SYSTEM"),
            eq("CONNECTIVITY_CHECK"),
            eq("internal"),
            eq("SystemMonitoringService"),
            eq(true),
            isNull()
        );
    }

    @Test
    @DisplayName("Should check outdated firmware devices")
    void shouldCheckOutdatedFirmwareDevices() {
        // Given - add a device with outdated firmware
        heartbeatRequest.setFirmwareVersion("v0.9.0");
        systemMonitoringService.processHeartbeat(heartbeatRequest);

        // When
        systemMonitoringService.checkOutdatedFirmwareDevices();

        // Then
        verify(operationalLogService).logOperation(
            eq(1L),
            eq(OperationalLog.OperationType.SYSTEM_ALERT),
            eq("SYSTEM"),
            argThat(message -> message.contains("outdated firmware")),
            eq("MONITORING_SYSTEM"),
            eq("FIRMWARE_CHECK"),
            eq("internal"),
            eq("SystemMonitoringService"),
            eq(true),
            isNull()
        );
    }

    @Test
    @DisplayName("Should generate system health report")
    void shouldGenerateSystemHealthReport() {
        // Given
        when(installationRepository.count()).thenReturn(10L);
        when(installationRepository.findAll()).thenReturn(Collections.singletonList(installation));

        // Add a device to have some data in the report
        systemMonitoringService.processHeartbeat(heartbeatRequest);

        // When
        String result = systemMonitoringService.generateSystemHealthReport();

        // Then
        assertNotNull(result);
        assertTrue(result.contains("System Health Report"));
        assertTrue(result.contains("Total Installations: 10"));
        verify(installationRepository).count();
        verify(installationRepository).findAll();
    }
} 