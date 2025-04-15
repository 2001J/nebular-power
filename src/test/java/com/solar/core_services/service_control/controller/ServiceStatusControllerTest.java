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

        sampleStatusDTOList = Arrays.asList(sampleStatusDTO);
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
        request.setScheduledTime(LocalDateTime.now().plusHours(2));

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
    @DisplayName("Should schedule status change")
    @WithMockUser(username = "admin")
    void shouldScheduleStatusChange() throws Exception {
        // Arrange
        LocalDateTime scheduledTime = testTime.plusDays(1);
        String scheduledTimeStr = scheduledTime.format(DateTimeFormatter.ISO_DATE_TIME);
        
        ServiceStatusDTO scheduledStatus = new ServiceStatusDTO();
        scheduledStatus.setId(1L);
        scheduledStatus.setStatus(ServiceStatus.ServiceState.ACTIVE);
        scheduledStatus.setScheduledChange(ServiceStatus.ServiceState.SUSPENDED_MAINTENANCE);
        scheduledStatus.setScheduledTime(scheduledTime);
        scheduledStatus.setStatusReason("Upcoming maintenance");
        scheduledStatus.setUpdatedBy("admin");
        scheduledStatus.setActive(true);
        scheduledStatus.setInstallationId(1L);

        when(serviceStatusService.scheduleStatusChange(eq(1L), eq(ServiceStatus.ServiceState.SUSPENDED_MAINTENANCE), anyString(), eq("admin"), any(LocalDateTime.class)))
                .thenReturn(scheduledStatus);

        // Act & Assert
        mockMvc.perform(post("/api/service/status/1/schedule")
                .with(csrf())
                .param("targetStatus", "SUSPENDED_MAINTENANCE")
                .param("reason", "Upcoming maintenance")
                .param("scheduledTime", scheduledTimeStr))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.scheduledChange").value("SUSPENDED_MAINTENANCE"))
                .andExpect(jsonPath("$.status").value("ACTIVE"));

        verify(serviceStatusService).scheduleStatusChange(eq(1L), eq(ServiceStatus.ServiceState.SUSPENDED_MAINTENANCE), anyString(), eq("admin"), any(LocalDateTime.class));
        verify(operationalLogService).logOperation(
                anyLong(), eq(OperationalLog.OperationType.STATUS_CHANGE_SCHEDULED), anyString(), contains("Scheduled status change"), anyString(), anyString(), anyString(), isNull(), eq(true), isNull());
    }

    @Test
    @DisplayName("Should cancel scheduled change")
    @WithMockUser(username = "admin")
    void shouldCancelScheduledChange() throws Exception {
        // Arrange
        ServiceStatusDTO cancelledSchedule = new ServiceStatusDTO();
        cancelledSchedule.setId(1L);
        cancelledSchedule.setStatus(ServiceStatus.ServiceState.ACTIVE);
        cancelledSchedule.setScheduledChange(null);
        cancelledSchedule.setScheduledTime(null);
        cancelledSchedule.setUpdatedBy("admin");
        cancelledSchedule.setActive(true);
        cancelledSchedule.setInstallationId(1L);

        when(serviceStatusService.cancelScheduledChange(eq(1L), eq("admin")))
                .thenReturn(cancelledSchedule);

        // Act & Assert
        mockMvc.perform(delete("/api/service/status/1/schedule")
                .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.scheduledChange").isEmpty())
                .andExpect(jsonPath("$.status").value("ACTIVE"));

        verify(serviceStatusService).cancelScheduledChange(eq(1L), eq("admin"));
        verify(operationalLogService).logOperation(
                anyLong(), eq(OperationalLog.OperationType.SCHEDULED_CHANGE_CANCELLED), anyString(), contains("Cancelled scheduled status change"), anyString(), anyString(), anyString(), isNull(), eq(true), isNull());
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
} 