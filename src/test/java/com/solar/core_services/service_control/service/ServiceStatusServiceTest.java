package com.solar.core_services.service_control.service;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.service_control.dto.ServiceStatusDTO;
import com.solar.core_services.service_control.dto.ServiceStatusUpdateRequest;
import com.solar.core_services.service_control.model.ServiceStatus;
import com.solar.core_services.service_control.repository.ServiceStatusRepository;
import com.solar.core_services.service_control.service.impl.ServiceStatusServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Test class for ServiceStatusService implementation
 * Source file: src/main/java/com/solar/core_services/service_control/service/impl/ServiceStatusServiceImpl.java
 */
@ExtendWith(MockitoExtension.class)
public class ServiceStatusServiceTest {

    @Mock
    private ServiceStatusRepository serviceStatusRepository;

    @Mock
    private SolarInstallationRepository installationRepository;

    @InjectMocks
    private ServiceStatusServiceImpl serviceStatusService;

    private SolarInstallation installation;
    private ServiceStatus activeStatus;
    private ServiceStatus historicalStatus;
    private LocalDateTime testTime;
    
    @BeforeEach
    void setUp() {
        // Set up the installation
        installation = new SolarInstallation();
        installation.setId(1L);
        installation.setName("Test Installation");
        
        // Set up an active status
        activeStatus = new ServiceStatus();
        activeStatus.setId(1L);
        activeStatus.setInstallation(installation);
        activeStatus.setStatus(ServiceStatus.ServiceState.ACTIVE);
        activeStatus.setUpdatedAt(LocalDateTime.now());
        activeStatus.setUpdatedBy("admin");
        activeStatus.setActive(true);
        
        // Set up a historical status
        historicalStatus = new ServiceStatus();
        historicalStatus.setId(2L);
        historicalStatus.setInstallation(installation);
        historicalStatus.setStatus(ServiceStatus.ServiceState.SUSPENDED_MAINTENANCE);
        historicalStatus.setStatusReason("Scheduled maintenance");
        historicalStatus.setUpdatedAt(LocalDateTime.now().minusDays(1));
        historicalStatus.setUpdatedBy("system");
        historicalStatus.setActive(false);

        testTime = LocalDateTime.now();
    }

    @Test
    @DisplayName("Should get current service status")
    void shouldGetCurrentServiceStatus() {
        // Arrange
        when(serviceStatusRepository.findActiveByInstallationId(1L)).thenReturn(Optional.of(activeStatus));
        
        // Act
        ServiceStatusDTO result = serviceStatusService.getCurrentStatus(1L);
        
        // Assert
        assertNotNull(result);
        assertEquals(1L, result.getId());
        assertEquals(ServiceStatus.ServiceState.ACTIVE, result.getStatus());
        assertTrue(result.isActive());
        verify(serviceStatusRepository).findActiveByInstallationId(1L);
    }

    @Test
    @DisplayName("Should get service status history")
    void shouldGetServiceStatusHistory() {
        // Arrange
        List<ServiceStatus> statusList = Arrays.asList(activeStatus, historicalStatus);
        Page<ServiceStatus> statusPage = new PageImpl<>(statusList);
        Pageable pageable = PageRequest.of(0, 10);
        
        when(serviceStatusRepository.findByInstallationIdOrderByUpdatedAtDesc(eq(1L), any(Pageable.class)))
            .thenReturn(statusPage);
        
        // Act
        Page<ServiceStatusDTO> result = serviceStatusService.getStatusHistory(1L, pageable);
        
        // Assert
        assertNotNull(result);
        assertEquals(2, result.getContent().size());
        verify(serviceStatusRepository).findByInstallationIdOrderByUpdatedAtDesc(eq(1L), any(Pageable.class));
    }

    @Test
    @DisplayName("Should update service status")
    void shouldUpdateServiceStatus() {
        // Arrange
        ServiceStatusUpdateRequest request = new ServiceStatusUpdateRequest();
        request.setStatus(ServiceStatus.ServiceState.SUSPENDED_PAYMENT);
        request.setStatusReason("Payment overdue");
        
        when(installationRepository.findById(1L)).thenReturn(Optional.of(installation));
        when(serviceStatusRepository.findActiveByInstallationId(1L)).thenReturn(Optional.of(activeStatus));
        when(serviceStatusRepository.save(any(ServiceStatus.class))).thenAnswer(i -> i.getArgument(0));
        
        // Act
        ServiceStatusDTO result = serviceStatusService.updateServiceStatus(1L, request, "admin");
        
        // Assert
        assertNotNull(result);
        assertEquals(ServiceStatus.ServiceState.SUSPENDED_PAYMENT, result.getStatus());
        assertEquals("Payment overdue", result.getStatusReason());
        assertEquals("admin", result.getUpdatedBy());
        
        verify(installationRepository).findById(1L);
        verify(serviceStatusRepository).findActiveByInstallationId(1L);
        verify(serviceStatusRepository, times(2)).save(any(ServiceStatus.class));
    }

    @Test
    @DisplayName("Should suspend service for payment")
    void shouldSuspendServiceForPayment() {
        // Arrange
        when(installationRepository.findById(1L)).thenReturn(Optional.of(installation));
        when(serviceStatusRepository.findActiveByInstallationId(1L)).thenReturn(Optional.of(activeStatus));
        when(serviceStatusRepository.save(any(ServiceStatus.class))).thenAnswer(i -> i.getArgument(0));
        
        // Act
        ServiceStatusDTO result = serviceStatusService.suspendServiceForPayment(1L, "Payment overdue", "admin");
        
        // Assert
        assertNotNull(result);
        assertEquals(ServiceStatus.ServiceState.SUSPENDED_PAYMENT, result.getStatus());
        assertEquals("Payment overdue", result.getStatusReason());
        
        verify(serviceStatusRepository).findActiveByInstallationId(1L);
        verify(serviceStatusRepository, times(2)).save(any(ServiceStatus.class));
    }

    @Test
    @DisplayName("Should suspend service for security")
    void shouldSuspendServiceForSecurity() {
        // Arrange
        when(installationRepository.findById(1L)).thenReturn(Optional.of(installation));
        when(serviceStatusRepository.findActiveByInstallationId(1L)).thenReturn(Optional.of(activeStatus));
        when(serviceStatusRepository.save(any(ServiceStatus.class))).thenAnswer(i -> i.getArgument(0));
        
        // Act
        ServiceStatusDTO result = serviceStatusService.suspendServiceForSecurity(1L, "Security breach detected", "system");
        
        // Assert
        assertNotNull(result);
        assertEquals(ServiceStatus.ServiceState.SUSPENDED_SECURITY, result.getStatus());
        assertEquals("Security breach detected", result.getStatusReason());
        
        verify(serviceStatusRepository).findActiveByInstallationId(1L);
        verify(serviceStatusRepository, times(2)).save(any(ServiceStatus.class));
    }

    @Test
    @DisplayName("Should suspend service for maintenance")
    void shouldSuspendServiceForMaintenance() {
        // Arrange
        when(installationRepository.findById(1L)).thenReturn(Optional.of(installation));
        when(serviceStatusRepository.findActiveByInstallationId(1L)).thenReturn(Optional.of(activeStatus));
        when(serviceStatusRepository.save(any(ServiceStatus.class))).thenAnswer(i -> i.getArgument(0));
        
        // Act
        ServiceStatusDTO result = serviceStatusService.suspendServiceForMaintenance(1L, "Scheduled maintenance", "admin");
        
        // Assert
        assertNotNull(result);
        assertEquals(ServiceStatus.ServiceState.SUSPENDED_MAINTENANCE, result.getStatus());
        assertEquals("Scheduled maintenance", result.getStatusReason());
        
        verify(serviceStatusRepository).findActiveByInstallationId(1L);
        verify(serviceStatusRepository, times(2)).save(any(ServiceStatus.class));
    }

    @Test
    @DisplayName("Should restore service")
    void shouldRestoreService() {
        // Arrange
        ServiceStatus suspendedStatus = new ServiceStatus();
        suspendedStatus.setId(3L);
        suspendedStatus.setInstallation(installation);
        suspendedStatus.setStatus(ServiceStatus.ServiceState.SUSPENDED_MAINTENANCE);
        suspendedStatus.setActive(true);
        
        when(installationRepository.findById(1L)).thenReturn(Optional.of(installation));
        when(serviceStatusRepository.findActiveByInstallationId(1L)).thenReturn(Optional.of(suspendedStatus));
        when(serviceStatusRepository.save(any(ServiceStatus.class))).thenAnswer(i -> i.getArgument(0));
        
        // Act
        ServiceStatusDTO result = serviceStatusService.restoreService(1L, "Maintenance completed", "admin");
        
        // Assert
        assertNotNull(result);
        assertEquals(ServiceStatus.ServiceState.ACTIVE, result.getStatus());
        assertEquals("Maintenance completed", result.getStatusReason());
        
        verify(serviceStatusRepository).findActiveByInstallationId(1L);
        verify(serviceStatusRepository, times(2)).save(any(ServiceStatus.class));
    }

    @Test
    @DisplayName("Should schedule status change")
    void shouldScheduleStatusChange() {
        // Arrange
        LocalDateTime scheduledTime = LocalDateTime.now().plusDays(1);
        
        when(serviceStatusRepository.findActiveByInstallationId(1L)).thenReturn(Optional.of(activeStatus));
        when(serviceStatusRepository.save(any(ServiceStatus.class))).thenAnswer(i -> i.getArgument(0));
        
        // Act
        ServiceStatusDTO result = serviceStatusService.scheduleStatusChange(
            1L, 
            ServiceStatus.ServiceState.SUSPENDED_MAINTENANCE, 
            "Scheduled maintenance", 
            scheduledTime,
            "admin");
        
        // Assert
        assertNotNull(result);
        assertEquals(ServiceStatus.ServiceState.ACTIVE, result.getStatus());
        assertEquals(ServiceStatus.ServiceState.SUSPENDED_MAINTENANCE, result.getScheduledChange());
        assertEquals(scheduledTime, result.getScheduledTime());
        
        verify(serviceStatusRepository).findActiveByInstallationId(1L);
        verify(serviceStatusRepository).save(any(ServiceStatus.class));
    }

    @Test
    @DisplayName("Should cancel scheduled change")
    void shouldCancelScheduledChange() {
        // Arrange
        activeStatus.setScheduledChange(ServiceStatus.ServiceState.SUSPENDED_MAINTENANCE);
        activeStatus.setScheduledTime(LocalDateTime.now().plusDays(1));
        
        when(serviceStatusRepository.findActiveByInstallationId(1L)).thenReturn(Optional.of(activeStatus));
        when(serviceStatusRepository.save(any(ServiceStatus.class))).thenAnswer(i -> i.getArgument(0));
        
        // Act
        ServiceStatusDTO result = serviceStatusService.cancelScheduledChange(1L, "admin");
        
        // Assert
        assertNotNull(result);
        assertNull(result.getScheduledChange());
        assertNull(result.getScheduledTime());
        
        verify(serviceStatusRepository).findActiveByInstallationId(1L);
        verify(serviceStatusRepository).save(any(ServiceStatus.class));
    }

    @Test
    @DisplayName("Should process scheduled changes")
    void shouldProcessScheduledChanges() {
        // Arrange
        LocalDateTime scheduledTime = LocalDateTime.now().minusHours(1);
        
        ServiceStatus scheduledStatus = new ServiceStatus();
        scheduledStatus.setId(3L);
        scheduledStatus.setInstallation(installation);
        scheduledStatus.setStatus(ServiceStatus.ServiceState.ACTIVE);
        scheduledStatus.setScheduledChange(ServiceStatus.ServiceState.SUSPENDED_MAINTENANCE);
        scheduledStatus.setScheduledTime(scheduledTime);
        scheduledStatus.setUpdatedAt(LocalDateTime.now().minusDays(1));
        scheduledStatus.setActive(true);
        
        List<ServiceStatus> dueChanges = List.of(scheduledStatus);
        
        when(serviceStatusRepository.findByScheduledChangeIsNotNullAndScheduledTimeBefore(any(LocalDateTime.class)))
            .thenReturn(dueChanges);
        when(installationRepository.findById(anyLong())).thenReturn(Optional.of(installation));
        when(serviceStatusRepository.findActiveByInstallationId(anyLong())).thenReturn(Optional.of(scheduledStatus));
        when(serviceStatusRepository.save(any(ServiceStatus.class))).thenAnswer(i -> i.getArgument(0));
        
        // Act
        serviceStatusService.processScheduledChanges();
        
        // Assert
        verify(serviceStatusRepository).findByScheduledChangeIsNotNullAndScheduledTimeBefore(any(LocalDateTime.class));
        verify(serviceStatusRepository, atLeastOnce()).save(any(ServiceStatus.class));
    }

    @Test
    @DisplayName("Should get statuses by user ID")
    void shouldGetStatusesByUserId() {
        // Arrange
        List<ServiceStatus> userStatuses = Collections.singletonList(activeStatus);
        
        when(serviceStatusRepository.findActiveByUserId(1L)).thenReturn(userStatuses);
        
        // Act
        List<ServiceStatusDTO> result = serviceStatusService.getStatusesByUserId(1L);
        
        // Assert
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(ServiceStatus.ServiceState.ACTIVE, result.get(0).getStatus());
        
        verify(serviceStatusRepository).findActiveByUserId(1L);
    }

    @Test
    @DisplayName("Should get installations by status")
    void shouldGetInstallationsByStatus() {
        // Arrange
        List<ServiceStatus> statusList = Collections.singletonList(activeStatus);
        Page<ServiceStatus> statusPage = new PageImpl<>(statusList);
        Pageable pageable = PageRequest.of(0, 10);
        
        when(serviceStatusRepository.findByStatusAndActiveTrue(eq(ServiceStatus.ServiceState.ACTIVE), any(Pageable.class)))
            .thenReturn(statusPage);
        
        // Act
        Page<ServiceStatusDTO> result = serviceStatusService.getInstallationsByStatus(
            ServiceStatus.ServiceState.ACTIVE, 
            pageable
        );
        
        // Assert
        assertNotNull(result);
        assertEquals(1, result.getContent().size());
        assertEquals(ServiceStatus.ServiceState.ACTIVE, result.getContent().get(0).getStatus());
        
        verify(serviceStatusRepository).findByStatusAndActiveTrue(eq(ServiceStatus.ServiceState.ACTIVE), any(Pageable.class));
    }

    @Test
    @DisplayName("Should throw exception when installation not found")
    void shouldThrowExceptionWhenInstallationNotFound() {
        // Arrange
        ServiceStatusUpdateRequest request = new ServiceStatusUpdateRequest();
        request.setStatus(ServiceStatus.ServiceState.SUSPENDED_PAYMENT);
        
        when(installationRepository.findById(1L)).thenReturn(Optional.empty());
        
        // Act & Assert
        assertThrows(RuntimeException.class, () -> 
            serviceStatusService.updateServiceStatus(1L, request, "admin")
        );
        
        verify(installationRepository).findById(1L);
        verify(serviceStatusRepository, never()).save(any(ServiceStatus.class));
    }

    @Test
    @DisplayName("Should throw exception when no active status found")
    void shouldThrowExceptionWhenNoActiveStatusFound() {
        // Arrange
        when(serviceStatusRepository.findActiveByInstallationId(1L)).thenReturn(Optional.empty());
        
        // Act & Assert
        assertThrows(RuntimeException.class, () -> 
            serviceStatusService.getCurrentStatus(1L)
        );
        
        verify(serviceStatusRepository).findActiveByInstallationId(1L);
    }

    @Test
    @DisplayName("Should throw exception when scheduled time is in the past")
    void shouldThrowExceptionWhenScheduledTimeIsInPast() {
        // Arrange
        LocalDateTime pastTime = LocalDateTime.now().minusHours(1);
        
        // Act & Assert
        assertThrows(RuntimeException.class, () -> 
            serviceStatusService.scheduleStatusChange(
                1L, 
                ServiceStatus.ServiceState.SUSPENDED_MAINTENANCE, 
                "Scheduled maintenance", 
                pastTime,
                "admin")
        );
        
        verify(serviceStatusRepository, never()).findActiveByInstallationId(anyLong());
        verify(serviceStatusRepository, never()).save(any(ServiceStatus.class));
    }
} 