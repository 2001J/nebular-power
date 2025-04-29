package com.solar.core_services.service_control.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.solar.core_services.energy_monitoring.controller.TestSecurityConfig;
import com.solar.core_services.service_control.dto.CommandResponseRequest;
import com.solar.core_services.service_control.dto.DeviceCommandDTO;
import com.solar.core_services.service_control.dto.DeviceHeartbeatRequest;
import com.solar.core_services.service_control.dto.OperationalLogDTO;
import com.solar.core_services.service_control.dto.SystemOverviewResponse;
import com.solar.core_services.service_control.model.DeviceCommand;
import com.solar.core_services.service_control.model.OperationalLog;
import com.solar.core_services.service_control.service.OperationalLogService;
import com.solar.core_services.service_control.service.SystemIntegrationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(SystemIntegrationController.class)
@Import(TestSecurityConfig.class)
public class SystemIntegrationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private SystemIntegrationService systemIntegrationService;

    @MockBean
    private OperationalLogService operationalLogService;

    private DeviceHeartbeatRequest heartbeatRequest;
    private CommandResponseRequest commandResponse;
    private DeviceCommandDTO commandDTO;
    private SystemOverviewResponse overviewResponse;

    @BeforeEach
    void setUp() {
        // Setup heartbeat request
        heartbeatRequest = new DeviceHeartbeatRequest();
        heartbeatRequest.setInstallationId(1L);
        heartbeatRequest.setDeviceId("device-123");
        heartbeatRequest.setTimestamp(LocalDateTime.now());
        heartbeatRequest.setBatteryLevel(85.0);
        heartbeatRequest.setSignalStrength(90);
        heartbeatRequest.setStatus("OPERATIONAL");
        
        // Setup command response
        commandResponse = new CommandResponseRequest();
        commandResponse.setInstallationId(1L);
        commandResponse.setCorrelationId("corr-123");
        commandResponse.setTimestamp(LocalDateTime.now());
        commandResponse.setSuccess(true);
        commandResponse.setMessage("Command executed successfully");
        
        // Setup command DTO
        commandDTO = new DeviceCommandDTO();
        commandDTO.setId(1L);
        commandDTO.setCommand("REBOOT");
        commandDTO.setStatus(DeviceCommand.CommandStatus.EXECUTED);
        commandDTO.setCorrelationId("corr-123");
        commandDTO.setResponseMessage("Command executed successfully");
        commandDTO.setInstallationId(1L);
        
        // Setup system overview
        overviewResponse = new SystemOverviewResponse();
        overviewResponse.setTotalInstallations(100);
        overviewResponse.setActiveInstallations(95L);
        overviewResponse.setSuspendedInstallations(5L);
        overviewResponse.setTotalDevices(250);
        
        // Create devicesByStatus map for active and offline devices
        Map<String, Integer> devicesByStatus = new HashMap<>();
        devicesByStatus.put("ACTIVE", 240);
        devicesByStatus.put("OFFLINE", 10);
        overviewResponse.setDevicesByStatus(devicesByStatus);
        
        overviewResponse.setActiveAlerts(2);
    }

    @Test
    @DisplayName("Should receive device heartbeat")
    @WithMockUser(username = "system")
    void shouldReceiveDeviceHeartbeat() throws Exception {
        // Arrange
        doNothing().when(systemIntegrationService).processDeviceHeartbeat(any(DeviceHeartbeatRequest.class));
        when(operationalLogService.logOperation(anyLong(), any(), anyString(), anyString(), anyString(), anyString(), anyString(), isNull(), anyBoolean(), any())).thenReturn(new OperationalLogDTO());

        // Act & Assert
        mockMvc.perform(post("/api/service/system/device-heartbeat")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(heartbeatRequest)))
                .andExpect(status().isOk());

        verify(systemIntegrationService).processDeviceHeartbeat(any(DeviceHeartbeatRequest.class));
        verify(operationalLogService).logOperation(anyLong(), eq(OperationalLog.OperationType.DEVICE_HEARTBEAT), anyString(), contains("Received heartbeat from device"), anyString(), anyString(), anyString(), isNull(), eq(true), isNull());
    }

    @Test
    @DisplayName("Should receive command response")
    @WithMockUser(username = "system")
    void shouldReceiveCommandResponse() throws Exception {
        // Arrange
        when(systemIntegrationService.processCommandResponse(any(CommandResponseRequest.class)))
                .thenReturn(commandDTO);

        // Act & Assert
        mockMvc.perform(post("/api/service/system/command-response")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(commandResponse)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.command").value("REBOOT"))
                .andExpect(jsonPath("$.status").value("EXECUTED"))
                .andExpect(jsonPath("$.correlationId").value("corr-123"));

        verify(systemIntegrationService).processCommandResponse(any(CommandResponseRequest.class));
        verify(operationalLogService).logOperation(anyLong(), eq(OperationalLog.OperationType.COMMAND_RESPONSE), anyString(), contains("Received command response"), anyString(), anyString(), anyString(), isNull(), eq(true), isNull());
    }

    @Test
    @DisplayName("Should get system overview")
    @WithMockUser(username = "admin")
    void shouldGetSystemOverview() throws Exception {
        // Arrange
        when(systemIntegrationService.getSystemOverview())
                .thenReturn(overviewResponse);

        // Act & Assert
        mockMvc.perform(get("/api/service/system/overview"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalInstallations").value(100))
                .andExpect(jsonPath("$.activeInstallations").value(95))
                .andExpect(jsonPath("$.suspendedInstallations").value(5))
                .andExpect(jsonPath("$.totalDevices").value(250))
                .andExpect(jsonPath("$.devicesByStatus.ACTIVE").value(240))
                .andExpect(jsonPath("$.devicesByStatus.OFFLINE").value(10))
                .andExpect(jsonPath("$.activeAlerts").value(2));

        verify(systemIntegrationService).getSystemOverview();
    }

    @Test
    @DisplayName("Should run health check")
    @WithMockUser(username = "admin")
    void shouldRunHealthCheck() throws Exception {
        // Arrange
        doNothing().when(systemIntegrationService).runSystemHealthCheck();

        // Act & Assert
        mockMvc.perform(get("/api/service/system/health-check"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("completed"))
                .andExpect(jsonPath("$.message").value("Health check completed successfully"));

        verify(systemIntegrationService).runSystemHealthCheck();
    }

    @Test
    @DisplayName("Should generate health report")
    @WithMockUser(username = "admin")
    void shouldGenerateHealthReport() throws Exception {
        // Arrange
        Map<String, Object> reportMap = new HashMap<>();
        reportMap.put("timestamp", LocalDateTime.now().toString());
        reportMap.put("status", "HEALTHY");
        reportMap.put("message", "System is operating normally");
        
        when(systemIntegrationService.generateSystemHealthReport())
                .thenReturn(reportMap);

        // Act & Assert
        mockMvc.perform(get("/api/service/system/health-report"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.timestamp").exists())
                .andExpect(jsonPath("$.status").value("HEALTHY"))
                .andExpect(jsonPath("$.message").value("System is operating normally"));

        verify(systemIntegrationService).generateSystemHealthReport();
    }

    @Test
    @DisplayName("Should register device")
    @WithMockUser(username = "admin")
    void shouldRegisterDevice() throws Exception {
        // Arrange
        when(systemIntegrationService.registerDevice(eq(1L), eq("device-123"), eq("SOLAR_PANEL")))
                .thenReturn(true);

        // Act & Assert
        mockMvc.perform(post("/api/service/system/register-device")
                .with(csrf())
                .param("installationId", "1")
                .param("deviceId", "device-123")
                .param("deviceType", "SOLAR_PANEL"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Device registered successfully"));

        verify(systemIntegrationService).registerDevice(eq(1L), eq("device-123"), eq("SOLAR_PANEL"));
    }

    @Test
    @DisplayName("Should deregister device")
    @WithMockUser(username = "admin")
    void shouldDeregisterDevice() throws Exception {
        // Arrange
        when(systemIntegrationService.deregisterDevice(eq(1L), eq("device-123")))
                .thenReturn(true);

        // Act & Assert
        mockMvc.perform(post("/api/service/system/deregister-device")
                .with(csrf())
                .param("installationId", "1")
                .param("deviceId", "device-123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Device deregistered successfully"));

        verify(systemIntegrationService).deregisterDevice(eq(1L), eq("device-123"));
    }

    @Test
    @DisplayName("Should check device status")
    @WithMockUser(username = "admin")
    void shouldCheckDeviceStatus() throws Exception {
        // Arrange
        when(systemIntegrationService.isDeviceActive(eq("device-123")))
                .thenReturn(true);
        when(systemIntegrationService.getLastCommunicationTime(eq("device-123")))
                .thenReturn(1615382400000L);

        // Act & Assert
        mockMvc.perform(get("/api/service/system/device-status")
                .param("deviceId", "device-123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.deviceId").value("device-123"))
                .andExpect(jsonPath("$.active").value(true))
                .andExpect(jsonPath("$.lastCommunication").value(1615382400000L));

        verify(systemIntegrationService).isDeviceActive(eq("device-123"));
        verify(systemIntegrationService).getLastCommunicationTime(eq("device-123"));
    }
} 