package com.solar.core_services.service_control.service;

import com.solar.core_services.service_control.dto.CommandResponseRequest;
import com.solar.core_services.service_control.dto.DeviceCommandDTO;
import com.solar.core_services.service_control.dto.DeviceHeartbeatRequest;
import com.solar.core_services.service_control.dto.SystemOverviewResponse;
import com.solar.core_services.service_control.model.DeviceCommand;
import com.solar.core_services.service_control.model.OperationalLog;
import com.solar.core_services.service_control.service.impl.SystemIntegrationServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.lenient;

/**
 * Test class for SystemIntegrationService implementation
 * Source file: src/main/java/com/solar/core_services/service_control/service/impl/SystemIntegrationServiceImpl.java
 */
@ExtendWith(MockitoExtension.class)
public class SystemIntegrationServiceTest {

    @Mock
    private SystemMonitoringService systemMonitoringService;

    @Mock
    private DeviceCommandService deviceCommandService;

    @Mock
    private OperationalLogService operationalLogService;

    @InjectMocks
    private SystemIntegrationServiceImpl systemIntegrationService;

    private DeviceHeartbeatRequest heartbeatRequest;
    private CommandResponseRequest commandResponse;
    private DeviceCommandDTO commandDTO;

    @BeforeEach
    void setUp() {
        heartbeatRequest = new DeviceHeartbeatRequest();
        heartbeatRequest.setInstallationId(1L);
        heartbeatRequest.setDeviceId("device-123");
        
        commandResponse = new CommandResponseRequest();
        commandResponse.setInstallationId(1L);
        commandResponse.setCorrelationId("corr-123");
        commandResponse.setSuccess(true);
        
        commandDTO = new DeviceCommandDTO();
        commandDTO.setId(1L);
        commandDTO.setCommand("RESTART");
        commandDTO.setStatus(DeviceCommand.CommandStatus.EXECUTED);
        
        lenient().when(deviceCommandService.processCommandResponse(any(CommandResponseRequest.class)))
                .thenReturn(commandDTO);
        
        SystemOverviewResponse overview = new SystemOverviewResponse();
        overview.setTotalInstallations(10);
        overview.setActiveInstallations(8L);
        
        lenient().when(systemMonitoringService.getSystemOverview())
                .thenReturn(overview);
    }

    @Test
    @DisplayName("Should process device heartbeat correctly")
    void shouldProcessDeviceHeartbeat() {
        // Execute
        systemIntegrationService.processDeviceHeartbeat(heartbeatRequest);
        
        // Verify
        verify(systemMonitoringService).processHeartbeat(eq(heartbeatRequest));
    }

    @Test
    @DisplayName("Should process command response correctly")
    void shouldProcessCommandResponse() {
        // Execute
        DeviceCommandDTO result = systemIntegrationService.processCommandResponse(commandResponse);
        
        // Verify
        verify(deviceCommandService).processCommandResponse(eq(commandResponse));
        
        // Check result
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getStatus()).isEqualTo(DeviceCommand.CommandStatus.EXECUTED);
    }

    @Test
    @DisplayName("Should get system overview")
    void shouldGetSystemOverview() {
        // Execute
        SystemOverviewResponse result = systemIntegrationService.getSystemOverview();
        
        // Verify
        verify(systemMonitoringService).getSystemOverview();
        
        // Check result
        assertThat(result).isNotNull();
        assertThat(result.getTotalInstallations()).isEqualTo(10);
        assertThat(result.getActiveInstallations()).isEqualTo(8);
    }

    @Test
    @DisplayName("Should run system health check")
    void shouldRunSystemHealthCheck() {
        // Execute
        systemIntegrationService.runSystemHealthCheck();
        
        // Verify
        verify(systemMonitoringService).checkUnresponsiveDevices();
        verify(systemMonitoringService).checkLowBatteryDevices();
        verify(systemMonitoringService).checkPoorConnectivityDevices();
    }

    @Test
    @DisplayName("Should register device successfully")
    void shouldRegisterDeviceSuccessfully() {
        // Execute
        systemIntegrationService.registerDevice(1L, "new-device", "SOLAR_PANEL");
        
        // Verify device is active
        assertTrue(systemIntegrationService.isDeviceActive("new-device"));
        
        // Verify we can get last communication time
        assertThat(systemIntegrationService.getLastCommunicationTime("new-device")).isNotNull();
    }

    @Test
    @DisplayName("Should deregister device successfully")
    void shouldDeregisterDeviceSuccessfully() {
        // First register a device
        systemIntegrationService.registerDevice(1L, "temp-device", "SOLAR_PANEL");
        
        // Verify it's active
        assertTrue(systemIntegrationService.isDeviceActive("temp-device"));
        
        // Deregister the device
        systemIntegrationService.deregisterDevice(1L, "temp-device");
        
        // Verify it's no longer active
        assertFalse(systemIntegrationService.isDeviceActive("temp-device"));
    }

    @Test
    @DisplayName("Should get last communication time for registered device")
    void shouldGetLastCommunicationTime() {
        // Register a device
        systemIntegrationService.registerDevice(1L, "comm-device", "BATTERY");
        
        // Get the last communication time
        Long time = systemIntegrationService.getLastCommunicationTime("comm-device");
        
        // Verify time is not null
        assertThat(time).isNotNull();
    }

    @Test
    @DisplayName("Should return null for last communication time of unknown device")
    void shouldReturnNullForLastCommunicationTimeOfUnknownDevice() {
        // Get the last communication time for an unknown device
        Long time = systemIntegrationService.getLastCommunicationTime("unknown-device");
        
        // Verify time is null
        assertThat(time).isNull();
    }
} 