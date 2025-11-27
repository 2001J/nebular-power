package com.solar.core_services.service_control.service.impl;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.service_control.dto.ServiceStatusDTO;
import com.solar.core_services.service_control.model.ServiceStatus;
import com.solar.core_services.service_control.repository.ServiceStatusRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ServiceStatusServiceImplTest {

    @Mock
    private ServiceStatusRepository serviceStatusRepository;

    @Mock
    private SolarInstallationRepository installationRepository;

    @InjectMocks
    private ServiceStatusServiceImpl serviceStatusService;

    private SolarInstallation testInstallation;
    private ServiceStatus testStatus;

    @BeforeEach
    void setUp() {
        testInstallation = new SolarInstallation();
        testInstallation.setId(101L);
        testInstallation.setName("Test Installation");

        testStatus = new ServiceStatus();
        testStatus.setId(1L);
        testStatus.setInstallation(testInstallation);
        testStatus.setStatus(ServiceStatus.ServiceState.ACTIVE);
        testStatus.setStatusReason("Initial status");
        testStatus.setUpdatedBy("system");
        testStatus.setUpdatedAt(LocalDateTime.now());
        testStatus.setActive(true);
    }

    @Test
    void getCurrentStatus_WhenActiveStatusExists_ShouldReturnIt() {
        when(serviceStatusRepository.findActiveByInstallationId(101L)).thenReturn(Optional.of(testStatus));

        ServiceStatusDTO result = serviceStatusService.getCurrentStatus(101L);

        assertNotNull(result);
        assertEquals(101L, result.getInstallationId());
        assertEquals(ServiceStatus.ServiceState.ACTIVE, result.getStatus());
        verify(serviceStatusRepository).findActiveByInstallationId(101L);
    }

    @Test
    void getCurrentStatus_WhenNoActiveStatus_ShouldThrowException() {
        when(serviceStatusRepository.findActiveByInstallationId(101L)).thenReturn(Optional.empty());

        RuntimeException exception = assertThrows(RuntimeException.class, () -> 
            serviceStatusService.getCurrentStatus(101L)
        );
        
        assertTrue(exception.getMessage().contains("No active service status found for installation: 101"));
        verify(serviceStatusRepository).findActiveByInstallationId(101L);
        verify(installationRepository, never()).findById(anyLong());
    }

    // Add tests for startService, stopService, and restartService

    @Test
    void startService_ShouldUpdateStatusToActive() {
        // Act & Assert - startService is now deprecated and throws UnsupportedOperationException
        UnsupportedOperationException exception = assertThrows(
            UnsupportedOperationException.class,
            () -> serviceStatusService.startService(101L, "admin")
        );
        
        assertTrue(exception.getMessage().contains("Direct start is not supported"));
        assertTrue(exception.getMessage().contains("Device must report its own status"));
    }

    @Test
    void stopService_ShouldUpdateStatusToSuspendedMaintenance() {
        // Act & Assert - stopService is now deprecated and throws UnsupportedOperationException
        UnsupportedOperationException exception = assertThrows(
            UnsupportedOperationException.class,
            () -> serviceStatusService.stopService(101L, "admin")
        );
        
        assertTrue(exception.getMessage().contains("Direct stop is not supported"));
        assertTrue(exception.getMessage().contains("suspendService()"));
    }

    @Test
    void restartService_ShouldStopThenStartService() {
        // Arrange - Restart now sets TRANSITIONING and schedules restoration
        when(installationRepository.findById(101L)).thenReturn(Optional.of(testInstallation));
        when(serviceStatusRepository.findActiveByInstallationId(101L))
            .thenReturn(Optional.of(testStatus))  // First call for the initial check
            .thenReturn(Optional.of(testStatus)); // Second call might happen during update
        when(serviceStatusRepository.save(any(ServiceStatus.class))).thenAnswer(i -> {
            ServiceStatus status = i.getArgument(0);
            status.setId(2L);
            return status;
        });

        // Act
        ServiceStatusDTO result = serviceStatusService.restartService(101L, "admin");

        // Assert - Now expects TRANSITIONING status, not ACTIVE
        assertNotNull(result);
        assertEquals(101L, result.getInstallationId());
        assertEquals(ServiceStatus.ServiceState.TRANSITIONING, result.getStatus());
        assertTrue(result.getStatusReason().contains("Service restart requested"));
        assertEquals("admin", result.getUpdatedBy());
        
        // Verify the status was queried at least once
        verify(serviceStatusRepository, atLeastOnce()).findActiveByInstallationId(101L);
        verify(installationRepository, atLeast(1)).findById(101L);
        // Verify save was called for the TRANSITIONING status and for scheduling
        verify(serviceStatusRepository, atLeast(2)).save(any(ServiceStatus.class));
    }

    // ============================================================
    // Device Status Report Tests (NEW)
    // ============================================================

    @Test
    void testProcessDeviceStatusReport_NewInstallation_CreatesStatus() {
        // Arrange
        com.solar.core_services.service_control.dto.DeviceStatusReportDTO reportDTO = 
            com.solar.core_services.service_control.dto.DeviceStatusReportDTO.builder()
                .installationId(101L)
                .status("ACTIVE")
                .reason("Device initialized")
                .timestamp(LocalDateTime.now())
                .lastCommandId(123L)
                .build();

        when(installationRepository.findById(101L)).thenReturn(Optional.of(testInstallation));
        when(serviceStatusRepository.findByInstallationAndActiveTrue(testInstallation))
            .thenReturn(Optional.empty()); // No existing status
        when(serviceStatusRepository.save(any(ServiceStatus.class))).thenAnswer(invocation -> {
            ServiceStatus saved = invocation.getArgument(0);
            saved.setId(1L);
            return saved;
        });

        // Act
        serviceStatusService.processDeviceStatusReport(reportDTO);

        // Assert
        verify(installationRepository).findById(101L);
        verify(serviceStatusRepository).findByInstallationAndActiveTrue(testInstallation);
        verify(serviceStatusRepository).save(argThat(status -> 
            status.getStatus() == ServiceStatus.ServiceState.ACTIVE &&
            status.getStatusReason().equals("Device initialized") &&
            status.getUpdatedBy().equals("DEVICE")
        ));
    }

    @Test
    void testProcessDeviceStatusReport_StatusChanged_UpdatesStatus() {
        // Arrange
        testStatus.setStatus(ServiceStatus.ServiceState.PENDING);
        testStatus.setActive(true);

        com.solar.core_services.service_control.dto.DeviceStatusReportDTO reportDTO = 
            com.solar.core_services.service_control.dto.DeviceStatusReportDTO.builder()
                .installationId(101L)
                .status("ACTIVE")
                .reason("Service started")
                .timestamp(LocalDateTime.now())
                .lastCommandId(456L)
                .build();

        when(installationRepository.findById(101L)).thenReturn(Optional.of(testInstallation));
        when(serviceStatusRepository.findByInstallationAndActiveTrue(testInstallation))
            .thenReturn(Optional.of(testStatus));
        when(serviceStatusRepository.save(any(ServiceStatus.class))).thenReturn(testStatus);

        // Act
        serviceStatusService.processDeviceStatusReport(reportDTO);

        // Assert
        verify(serviceStatusRepository).save(argThat(status -> 
            status.getStatus() == ServiceStatus.ServiceState.ACTIVE &&
            status.getStatusReason().equals("Service started") &&
            status.getUpdatedBy().equals("DEVICE")
        ));
    }

    @Test
    void testProcessDeviceStatusReport_StatusUnchanged_TouchesRecord() {
        // Arrange
        testStatus.setStatus(ServiceStatus.ServiceState.ACTIVE);
        testStatus.setStatusReason("Already active");
        testStatus.setActive(true);

        com.solar.core_services.service_control.dto.DeviceStatusReportDTO reportDTO = 
            com.solar.core_services.service_control.dto.DeviceStatusReportDTO.builder()
                .installationId(101L)
                .status("ACTIVE")
                .reason("Already active")
                .timestamp(LocalDateTime.now())
                .build();

        when(installationRepository.findById(101L)).thenReturn(Optional.of(testInstallation));
        when(serviceStatusRepository.findByInstallationAndActiveTrue(testInstallation))
            .thenReturn(Optional.of(testStatus));
        when(serviceStatusRepository.save(any(ServiceStatus.class))).thenReturn(testStatus);

        // Act
        serviceStatusService.processDeviceStatusReport(reportDTO);

        // Assert
        verify(serviceStatusRepository).save(argThat(status -> 
            status.getUpdatedBy().equals("DEVICE")
        ));
    }

    @Test
    void testProcessDeviceStatusReport_InstallationNotFound_ThrowsException() {
        // Arrange
        com.solar.core_services.service_control.dto.DeviceStatusReportDTO reportDTO = 
            com.solar.core_services.service_control.dto.DeviceStatusReportDTO.builder()
                .installationId(999L)
                .status("ACTIVE")
                .timestamp(LocalDateTime.now())
                .build();

        when(installationRepository.findById(999L)).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(RuntimeException.class, () -> {
            serviceStatusService.processDeviceStatusReport(reportDTO);
        });

        verify(serviceStatusRepository, never()).save(any());
    }

    @Test
    void testProcessDeviceStatusReport_InvalidStatus_ThrowsException() {
        // Arrange
        com.solar.core_services.service_control.dto.DeviceStatusReportDTO reportDTO = 
            com.solar.core_services.service_control.dto.DeviceStatusReportDTO.builder()
                .installationId(101L)
                .status("INVALID_STATUS")
                .timestamp(LocalDateTime.now())
                .build();

        when(installationRepository.findById(101L)).thenReturn(Optional.of(testInstallation));
        when(serviceStatusRepository.findByInstallationAndActiveTrue(testInstallation))
            .thenReturn(Optional.of(testStatus));

        // Act & Assert
        assertThrows(IllegalArgumentException.class, () -> {
            serviceStatusService.processDeviceStatusReport(reportDTO);
        });

        verify(serviceStatusRepository, never()).save(any());
    }

    @Test
    void testProcessDeviceStatusReport_WithDeviceHealth() {
        // Arrange
        java.util.Map<String, Object> deviceHealth = new java.util.HashMap<>();
        deviceHealth.put("cpu_usage", 75.5);
        deviceHealth.put("memory_usage", 82.3);
        deviceHealth.put("temperature", 55.0);

        com.solar.core_services.service_control.dto.DeviceStatusReportDTO reportDTO = 
            com.solar.core_services.service_control.dto.DeviceStatusReportDTO.builder()
                .installationId(101L)
                .status("ACTIVE")
                .reason("Normal operation")
                .timestamp(LocalDateTime.now())
                .deviceHealth(deviceHealth)
                .build();

        when(installationRepository.findById(101L)).thenReturn(Optional.of(testInstallation));
        when(serviceStatusRepository.findByInstallationAndActiveTrue(testInstallation))
            .thenReturn(Optional.of(testStatus));
        when(serviceStatusRepository.save(any(ServiceStatus.class))).thenReturn(testStatus);

        // Act
        serviceStatusService.processDeviceStatusReport(reportDTO);

        // Assert - Should process successfully even with health data
        verify(serviceStatusRepository).save(any(ServiceStatus.class));
    }
} 