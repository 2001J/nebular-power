package com.solar.core_services.service_control.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.solar.core_services.energy_monitoring.controller.TestSecurityConfig;
import com.solar.core_services.service_control.dto.MaintenanceRequest;
import com.solar.core_services.service_control.dto.OperationalLogDTO;
import com.solar.core_services.service_control.dto.ServiceStatusDTO;
import com.solar.core_services.service_control.dto.ServiceStatusUpdateRequest;
import com.solar.core_services.service_control.model.OperationalLog;
import com.solar.core_services.service_control.model.ServiceStatus;
import com.solar.core_services.service_control.service.OperationalLogService;
import com.solar.core_services.service_control.service.ServiceStatusService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ServiceStatusController.class)
@Import(TestSecurityConfig.class)
public class ServiceStatusControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ServiceStatusService serviceStatusService;

    @MockBean
    private OperationalLogService operationalLogService;

    private ServiceStatusDTO sampleStatusDTO;
    private List<ServiceStatusDTO> sampleStatusDTOList;
    private LocalDateTime testTime;

    @BeforeEach
    void setUp() {
        testTime = LocalDateTime.now();
        
        sampleStatusDTO = new ServiceStatusDTO();
        sampleStatusDTO.setId(1L);
        sampleStatusDTO.setStatus(ServiceStatus.ServiceState.ACTIVE);
        sampleStatusDTO.setUpdatedAt(testTime);
        sampleStatusDTO.setUpdatedBy("admin");
        sampleStatusDTO.setActive(true);
        sampleStatusDTO.setInstallationId(1L);
        sampleStatusDTO.setInstallationName("Test Installation");

        sampleStatusDTOList = List.of(sampleStatusDTO);
    }

    @Test
    @DisplayName("Should get current service status")
    @WithMockUser(username = "user")
    void shouldGetCurrentServiceStatus() throws Exception {
        // Arrange
        when(serviceStatusService.getCurrentStatus(1L))
                .thenReturn(sampleStatusDTO);

        // Act & Assert
        mockMvc.perform(get("/api/service/status/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.active").value(true))
                .andExpect(jsonPath("$.installationId").value(1));

        verify(serviceStatusService).getCurrentStatus(1L);
    }

    @Test
    @DisplayName("Should get service status history")
    @WithMockUser(username = "user")
    void shouldGetServiceStatusHistory() throws Exception {
        // Arrange
        Page<ServiceStatusDTO> statusPage = new PageImpl<>(sampleStatusDTOList);
        when(serviceStatusService.getStatusHistory(eq(1L), any(Pageable.class)))
                .thenReturn(statusPage);

        // Act & Assert
        mockMvc.perform(get("/api/service/status/1/history"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(1))
                .andExpect(jsonPath("$.content[0].status").value("ACTIVE"))
                .andExpect(jsonPath("$.totalElements").value(1));

        verify(serviceStatusService).getStatusHistory(eq(1L), any(Pageable.class));
    }

    @Test
    @DisplayName("Should update service status")
    @WithMockUser(username = "admin")
    void shouldUpdateServiceStatus() throws Exception {
        // Arrange
        ServiceStatusUpdateRequest request = new ServiceStatusUpdateRequest();
        request.setStatus(ServiceStatus.ServiceState.SUSPENDED_MAINTENANCE);
        request.setStatusReason("Planned maintenance");

        // Create sample status DTO with matching SUSPENDED_MAINTENANCE status
        ServiceStatusDTO updatedStatus = new ServiceStatusDTO();
        updatedStatus.setId(1L);
        updatedStatus.setInstallationId(1L);
        updatedStatus.setStatus(ServiceStatus.ServiceState.SUSPENDED_MAINTENANCE);
        updatedStatus.setStatusReason("Planned maintenance");
        updatedStatus.setUpdatedAt(LocalDateTime.now());
        updatedStatus.setUpdatedBy("admin");

        when(serviceStatusService.updateServiceStatus(
                eq(1L), any(ServiceStatusUpdateRequest.class), eq("admin"))
        ).thenReturn(updatedStatus);
        
        when(operationalLogService.logOperation(
                anyLong(), any(), anyString(), anyString(), anyString(), anyString(), anyString(), isNull(), anyBoolean(), any())
        ).thenReturn(new OperationalLogDTO());

        // Act & Assert
        mockMvc.perform(put("/api/service/status/1")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.installationId").value(1))
                .andExpect(jsonPath("$.status").value("SUSPENDED_MAINTENANCE"));

        verify(serviceStatusService).updateServiceStatus(
                eq(1L), any(ServiceStatusUpdateRequest.class), eq("admin"));
        verify(operationalLogService).logOperation(
                anyLong(), eq(OperationalLog.OperationType.SERVICE_STATUS_UPDATE), anyString(), contains("SUSPENDED_MAINTENANCE"), anyString(), anyString(), anyString(), isNull(), eq(true), isNull());
    }

    @Test
    @DisplayName("Should suspend service for payment")
    @WithMockUser(username = "admin")
    void shouldSuspendServiceForPayment() throws Exception {
        // Arrange
        ServiceStatusDTO suspendedStatus = new ServiceStatusDTO();
        suspendedStatus.setId(1L);
        suspendedStatus.setStatus(ServiceStatus.ServiceState.SUSPENDED_PAYMENT);
        suspendedStatus.setStatusReason("Payment overdue");
        suspendedStatus.setUpdatedBy("admin");
        suspendedStatus.setActive(false);
        suspendedStatus.setInstallationId(1L);

        when(serviceStatusService.suspendServiceForPayment(eq(1L), anyString(), eq("admin")))
                .thenReturn(suspendedStatus);

        // Act & Assert
        mockMvc.perform(post("/api/service/status/1/suspend/payment")
                .with(csrf())
                .param("reason", "Payment overdue"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.status").value("SUSPENDED_PAYMENT"))
                .andExpect(jsonPath("$.statusReason").value("Payment overdue"))
                .andExpect(jsonPath("$.active").value(false));

        verify(serviceStatusService).suspendServiceForPayment(eq(1L), anyString(), eq("admin"));
        verify(operationalLogService).logOperation(
                anyLong(), eq(OperationalLog.OperationType.SERVICE_SUSPENSION), anyString(), contains("payment issues"), anyString(), anyString(), anyString(), isNull(), eq(true), isNull());
    }

    @Test
    @DisplayName("Should suspend service for security")
    @WithMockUser(username = "admin")
    void shouldSuspendServiceForSecurity() throws Exception {
        // Arrange
        ServiceStatusDTO suspendedStatus = new ServiceStatusDTO();
        suspendedStatus.setId(1L);
        suspendedStatus.setStatus(ServiceStatus.ServiceState.SUSPENDED_SECURITY);
        suspendedStatus.setStatusReason("Security breach detected");
        suspendedStatus.setUpdatedBy("admin");
        suspendedStatus.setActive(false);
        suspendedStatus.setInstallationId(1L);

        when(serviceStatusService.suspendServiceForSecurity(eq(1L), anyString(), eq("admin")))
                .thenReturn(suspendedStatus);

        // Act & Assert
        mockMvc.perform(post("/api/service/status/1/suspend/security")
                .with(csrf())
                .param("reason", "Security breach detected"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.status").value("SUSPENDED_SECURITY"))
                .andExpect(jsonPath("$.statusReason").value("Security breach detected"))
                .andExpect(jsonPath("$.active").value(false));

        verify(serviceStatusService).suspendServiceForSecurity(eq(1L), anyString(), eq("admin"));
        verify(operationalLogService).logOperation(
                anyLong(), eq(OperationalLog.OperationType.SERVICE_SUSPENSION), anyString(), contains("security issues"), anyString(), anyString(), anyString(), isNull(), eq(true), isNull());
    }

    @Test
    @DisplayName("Should suspend service for maintenance")
    @WithMockUser(username = "admin")
    void shouldSuspendServiceForMaintenance() throws Exception {
        // Arrange
        MaintenanceRequest request = new MaintenanceRequest();
        request.setReason("Scheduled maintenance");
        // Set future times to satisfy @Future validation
        request.setStartTime(LocalDateTime.now().plusHours(1));
        request.setEndTime(LocalDateTime.now().plusHours(3));
        
        ServiceStatusDTO suspendedStatus = new ServiceStatusDTO();
        suspendedStatus.setId(1L);
        suspendedStatus.setStatus(ServiceStatus.ServiceState.SUSPENDED_MAINTENANCE);
        suspendedStatus.setStatusReason("Scheduled maintenance");
        suspendedStatus.setUpdatedBy("admin");
        suspendedStatus.setActive(false);
        suspendedStatus.setInstallationId(1L);

        when(serviceStatusService.suspendServiceForMaintenance(eq(1L), anyString(), eq("admin")))
                .thenReturn(suspendedStatus);

        // Act & Assert
        mockMvc.perform(post("/api/service/status/1/suspend/maintenance")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.status").value("SUSPENDED_MAINTENANCE"))
                .andExpect(jsonPath("$.statusReason").value("Scheduled maintenance"))
                .andExpect(jsonPath("$.active").value(false));

        verify(serviceStatusService).suspendServiceForMaintenance(eq(1L), anyString(), eq("admin"));
        verify(operationalLogService).logOperation(
                anyLong(), eq(OperationalLog.OperationType.SERVICE_SUSPENSION), anyString(), contains("maintenance"), anyString(), anyString(), anyString(), isNull(), eq(true), isNull());
    }

    @Test
    @DisplayName("Should restore service")
    @WithMockUser(username = "admin")
    void shouldRestoreService() throws Exception {
        // Arrange
        ServiceStatusDTO restoredStatus = new ServiceStatusDTO();
        restoredStatus.setId(1L);
        restoredStatus.setStatus(ServiceStatus.ServiceState.ACTIVE);
        restoredStatus.setStatusReason("Maintenance completed");
        restoredStatus.setUpdatedBy("admin");
        restoredStatus.setActive(true);
        restoredStatus.setInstallationId(1L);

        when(serviceStatusService.restoreService(eq(1L), anyString(), eq("admin")))
                .thenReturn(restoredStatus);

        // Act & Assert
        mockMvc.perform(post("/api/service/status/1/restore")
                .with(csrf())
                .param("reason", "Maintenance completed"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.statusReason").value("Maintenance completed"))
                .andExpect(jsonPath("$.active").value(true));

        verify(serviceStatusService).restoreService(eq(1L), anyString(), eq("admin"));
        verify(operationalLogService).logOperation(
                anyLong(), eq(OperationalLog.OperationType.SERVICE_RESTORATION), anyString(), contains("Restored service"), anyString(), anyString(), anyString(), isNull(), eq(true), isNull());
    }

    @Test
    @DisplayName("Should get statuses by user ID")
    @WithMockUser(username = "user")
    void shouldGetStatusesByUserId() throws Exception {
        // Arrange
        when(serviceStatusService.getStatusesByUserId(1L))
                .thenReturn(sampleStatusDTOList);

        // Act & Assert
        mockMvc.perform(get("/api/service/status/user/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].status").value("ACTIVE"))
                .andExpect(jsonPath("$[0].installationId").value(1));

        verify(serviceStatusService).getStatusesByUserId(1L);
    }

    @Test
    @DisplayName("Should get installations by status")
    @WithMockUser(username = "user")
    void shouldGetInstallationsByStatus() throws Exception {
        // Arrange
        Page<ServiceStatusDTO> statusPage = new PageImpl<>(sampleStatusDTOList);
        when(serviceStatusService.getInstallationsByStatus(eq(ServiceStatus.ServiceState.ACTIVE), any(Pageable.class)))
                .thenReturn(statusPage);

        // Act & Assert
        mockMvc.perform(get("/api/service/status/by-state")
                .param("status", "ACTIVE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(1))
                .andExpect(jsonPath("$.content[0].status").value("ACTIVE"))
                .andExpect(jsonPath("$.totalElements").value(1));

        verify(serviceStatusService).getInstallationsByStatus(eq(ServiceStatus.ServiceState.ACTIVE), any(Pageable.class));
    }

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    void startService() throws Exception {
        // This endpoint is deprecated and should return 501 Not Implemented
        when(serviceStatusService.startService(eq(101L), eq("admin")))
                .thenThrow(new UnsupportedOperationException("Direct start is not supported"));
        
        mockMvc.perform(post("/api/service/status/installations/101/start"))
                .andExpect(status().isNotImplemented()); // Expecting 501
        
        verify(serviceStatusService).startService(101L, "admin");
    }
    
    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    void stopService() throws Exception {
        // This endpoint is deprecated and should return 501 Not Implemented
        when(serviceStatusService.stopService(eq(101L), eq("admin")))
                .thenThrow(new UnsupportedOperationException("Direct stop is not supported"));
        
        mockMvc.perform(post("/api/service/status/installations/101/stop"))
                .andExpect(status().isNotImplemented()); // Expecting 501
        
        verify(serviceStatusService).stopService(101L, "admin");
    }
    
    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    void restartService() throws Exception {
        // Restart now returns TRANSITIONING status, with scheduled restoration to ACTIVE
        ServiceStatusDTO restartedStatusDTO = new ServiceStatusDTO();
        restartedStatusDTO.setId(1L);
        restartedStatusDTO.setInstallationId(101L);
        restartedStatusDTO.setStatus(ServiceStatus.ServiceState.TRANSITIONING);
        restartedStatusDTO.setStatusReason("Service restart requested by admin");
        restartedStatusDTO.setUpdatedBy("admin");
        restartedStatusDTO.setUpdatedAt(LocalDateTime.now());
        restartedStatusDTO.setActive(true);
        
        when(serviceStatusService.restartService(eq(101L), eq("admin"))).thenReturn(restartedStatusDTO);
        
        mockMvc.perform(post("/api/service/status/installations/101/restart"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.installationId").value(101))
                .andExpect(jsonPath("$.status").value("TRANSITIONING"))
                .andExpect(jsonPath("$.statusReason").value("Service restart requested by admin"));
        
        verify(serviceStatusService).restartService(101L, "admin");
    }

    // ============================================================
    // Device Status Report Tests (NEW)
    // ============================================================

    @Test
    @WithMockUser(username = "device", roles = {"DEVICE"})
    @DisplayName("Should receive device status report successfully")
    void testReceiveDeviceStatusReport_Success() throws Exception {
        // Arrange
        com.solar.core_services.service_control.dto.DeviceStatusReportDTO deviceReport = 
            com.solar.core_services.service_control.dto.DeviceStatusReportDTO.builder()
                .installationId(1L)
                .status("ACTIVE")
                .reason("Service started via admin command")
                .timestamp(LocalDateTime.now())
                .lastCommandId(123L)
                .deviceVersion("1.0.0")
                .build();

        doNothing().when(serviceStatusService).processDeviceStatusReport(any());

        // Act & Assert
        mockMvc.perform(post("/api/service/status/device-report")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(deviceReport)))
                .andExpect(status().isOk());

        verify(serviceStatusService, times(1)).processDeviceStatusReport(any());
    }

    @Test
    @WithMockUser(username = "device", roles = {"DEVICE"})
    @DisplayName("Should return 400 when device report has missing required fields")
    void testReceiveDeviceStatusReport_MissingRequiredFields() throws Exception {
        // Arrange - Missing installationId
        com.solar.core_services.service_control.dto.DeviceStatusReportDTO invalidReport = 
            com.solar.core_services.service_control.dto.DeviceStatusReportDTO.builder()
                .status("ACTIVE")
                .timestamp(LocalDateTime.now())
                .build();

        // Act & Assert
        mockMvc.perform(post("/api/service/status/device-report")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidReport)))
                .andExpect(status().isBadRequest());

        verify(serviceStatusService, never()).processDeviceStatusReport(any());
    }

    @Test
    @WithMockUser(username = "device", roles = {"DEVICE"})
    @DisplayName("Should return 400 when status is blank")
    void testReceiveDeviceStatusReport_BlankStatus() throws Exception {
        // Arrange
        com.solar.core_services.service_control.dto.DeviceStatusReportDTO invalidReport = 
            com.solar.core_services.service_control.dto.DeviceStatusReportDTO.builder()
                .installationId(1L)
                .status("")
                .timestamp(LocalDateTime.now())
                .build();

        // Act & Assert
        mockMvc.perform(post("/api/service/status/device-report")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidReport)))
                .andExpect(status().isBadRequest());

        verify(serviceStatusService, never()).processDeviceStatusReport(any());
    }

    @Test
    @WithMockUser(username = "device", roles = {"DEVICE"})
    @DisplayName("Should handle service exception gracefully")
    void testReceiveDeviceStatusReport_ServiceException() throws Exception {
        // Arrange
        com.solar.core_services.service_control.dto.DeviceStatusReportDTO deviceReport = 
            com.solar.core_services.service_control.dto.DeviceStatusReportDTO.builder()
                .installationId(1L)
                .status("ACTIVE")
                .timestamp(LocalDateTime.now())
                .build();

        doThrow(new RuntimeException("Database connection failed"))
                .when(serviceStatusService).processDeviceStatusReport(any());

        // Act & Assert
        mockMvc.perform(post("/api/service/status/device-report")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(deviceReport)))
                .andExpect(status().isInternalServerError());

        verify(serviceStatusService, times(1)).processDeviceStatusReport(any());
    }

    @Test
    @WithMockUser(username = "device", roles = {"DEVICE"})
    @DisplayName("Should accept device report with device health metrics")
    void testReceiveDeviceStatusReport_WithHealthMetrics() throws Exception {
        // Arrange
        java.util.Map<String, Object> deviceHealth = new java.util.HashMap<>();
        deviceHealth.put("cpu_usage", 75.5);
        deviceHealth.put("memory_usage", 82.3);
        deviceHealth.put("temperature", 55.0);
        deviceHealth.put("disk_usage", 60.0);

        com.solar.core_services.service_control.dto.DeviceStatusReportDTO deviceReport = 
            com.solar.core_services.service_control.dto.DeviceStatusReportDTO.builder()
                .installationId(1L)
                .status("ACTIVE")
                .reason("Normal operation")
                .timestamp(LocalDateTime.now())
                .lastCommandId(456L)
                .deviceHealth(deviceHealth)
                .deviceVersion("2.0.0")
                .build();

        doNothing().when(serviceStatusService).processDeviceStatusReport(any());

        // Act & Assert
        mockMvc.perform(post("/api/service/status/device-report")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(deviceReport)))
                .andExpect(status().isOk());

        verify(serviceStatusService, times(1)).processDeviceStatusReport(any());
    }

    @Test
    @WithMockUser(username = "device", roles = {"DEVICE"})
    @DisplayName("Should accept all valid status values")
    void testReceiveDeviceStatusReport_AllValidStatuses() throws Exception {
        // Arrange
        String[] validStatuses = {
            "ACTIVE",
            "SUSPENDED_PAYMENT",
            "SUSPENDED_SECURITY",
            "SUSPENDED_MAINTENANCE",
            "TRANSITIONING",
            "PENDING"
        };

        doNothing().when(serviceStatusService).processDeviceStatusReport(any());

        // Act & Assert
        for (String status : validStatuses) {
            com.solar.core_services.service_control.dto.DeviceStatusReportDTO deviceReport = 
                com.solar.core_services.service_control.dto.DeviceStatusReportDTO.builder()
                    .installationId(1L)
                    .status(status)
                    .timestamp(LocalDateTime.now())
                    .build();

            mockMvc.perform(post("/api/service/status/device-report")
                    .with(csrf())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(deviceReport)))
                    .andExpect(status().isOk());
        }

        verify(serviceStatusService, times(validStatuses.length)).processDeviceStatusReport(any());
    }
} 