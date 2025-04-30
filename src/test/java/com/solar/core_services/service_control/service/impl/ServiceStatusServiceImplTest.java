package com.solar.core_services.service_control.service.impl;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.service_control.dto.ServiceStatusDTO;
import com.solar.core_services.service_control.dto.ServiceStatusUpdateRequest;
import com.solar.core_services.service_control.model.ServiceStatus;
import com.solar.core_services.service_control.repository.ServiceStatusRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
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
        // Arrange
        when(installationRepository.findById(101L)).thenReturn(Optional.of(testInstallation));
        when(serviceStatusRepository.findActiveByInstallationId(101L)).thenReturn(Optional.of(testStatus));
        when(serviceStatusRepository.save(any(ServiceStatus.class))).thenAnswer(i -> {
            ServiceStatus status = i.getArgument(0);
            status.setId(2L); // New status record
            return status;
        });

        // Act
        ServiceStatusDTO result = serviceStatusService.startService(101L, "admin");

        // Assert
        assertNotNull(result);
        assertEquals(101L, result.getInstallationId());
        assertEquals(ServiceStatus.ServiceState.ACTIVE, result.getStatus());
        assertTrue(result.getStatusReason().contains("started by admin"));
        assertEquals("admin", result.getUpdatedBy());
        
        verify(serviceStatusRepository).findActiveByInstallationId(101L);
        verify(installationRepository).findById(101L);
        // Verify the old status was deactivated and a new one was created
        verify(serviceStatusRepository, times(2)).save(any(ServiceStatus.class));
    }

    @Test
    void stopService_ShouldUpdateStatusToSuspendedMaintenance() {
        // Arrange
        when(installationRepository.findById(101L)).thenReturn(Optional.of(testInstallation));
        when(serviceStatusRepository.findActiveByInstallationId(101L)).thenReturn(Optional.of(testStatus));
        when(serviceStatusRepository.save(any(ServiceStatus.class))).thenAnswer(i -> {
            ServiceStatus status = i.getArgument(0);
            status.setId(2L); // New status record
            return status;
        });

        // Act
        ServiceStatusDTO result = serviceStatusService.stopService(101L, "admin");

        // Assert
        assertNotNull(result);
        assertEquals(101L, result.getInstallationId());
        assertEquals(ServiceStatus.ServiceState.SUSPENDED_MAINTENANCE, result.getStatus());
        assertTrue(result.getStatusReason().contains("stopped by admin"));
        assertEquals("admin", result.getUpdatedBy());
        
        verify(serviceStatusRepository).findActiveByInstallationId(101L);
        verify(installationRepository).findById(101L);
        // Verify the old status was deactivated and a new one was created
        verify(serviceStatusRepository, times(2)).save(any(ServiceStatus.class));
    }

    @Test
    void restartService_ShouldStopThenStartService() {
        // Arrange - Set up for both stop and start operations
        when(installationRepository.findById(101L)).thenReturn(Optional.of(testInstallation));
        when(serviceStatusRepository.findActiveByInstallationId(101L)).thenReturn(Optional.of(testStatus));
        when(serviceStatusRepository.save(any(ServiceStatus.class))).thenAnswer(i -> {
            ServiceStatus status = i.getArgument(0);
            if (!status.isActive()) {
                // For the deactivated old status
                return status;
            } else if (status.getStatus() == ServiceStatus.ServiceState.SUSPENDED_MAINTENANCE) {
                // For the stop operation
                status.setId(2L);
                return status;
            } else {
                // For the start operation
                status.setId(3L);
                return status;
            }
        });

        // Act
        ServiceStatusDTO result = serviceStatusService.restartService(101L, "admin");

        // Assert
        assertNotNull(result);
        assertEquals(101L, result.getInstallationId());
        assertEquals(ServiceStatus.ServiceState.ACTIVE, result.getStatus());
        assertTrue(result.getStatusReason().contains("started by admin"));
        assertEquals("admin", result.getUpdatedBy());
        
        // Verify multiple service status repository interactions due to restart
        verify(serviceStatusRepository, atLeast(2)).findActiveByInstallationId(101L);
        verify(installationRepository, atLeast(2)).findById(101L);
        // Several saves: deactivate status + new status for stop, deactivate status + new status for start
        verify(serviceStatusRepository, atLeast(3)).save(any(ServiceStatus.class));
    }
} 