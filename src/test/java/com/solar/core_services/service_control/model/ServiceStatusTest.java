package com.solar.core_services.service_control.model;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Test class for ServiceStatus entity
 * Source file: src/main/java/com/solar/core_services/service_control/model/ServiceStatus.java
 */
public class ServiceStatusTest {
    
    @Test
    @DisplayName("Should create a valid ServiceStatus with default values")
    void shouldCreateValidServiceStatusWithDefaultValues() {
        // Arrange
        SolarInstallation installation = new SolarInstallation();
        installation.setId(1L);
        installation.setName("Test Installation");
        
        ServiceStatus serviceStatus = new ServiceStatus();
        serviceStatus.setInstallation(installation);
        
        // Act
        serviceStatus.onCreate();
        
        // Assert
        assertEquals(installation, serviceStatus.getInstallation());
        assertEquals(ServiceStatus.ServiceState.ACTIVE, serviceStatus.getStatus());
        assertNotNull(serviceStatus.getUpdatedAt());
        assertTrue(serviceStatus.isActive());
        assertNull(serviceStatus.getScheduledChange());
        assertNull(serviceStatus.getScheduledTime());
        assertNull(serviceStatus.getStatusReason());
    }
    
    @Test
    @DisplayName("Should update ServiceStatus values correctly")
    void shouldUpdateServiceStatusValuesCorrectly() {
        // Arrange
        ServiceStatus serviceStatus = new ServiceStatus();
        LocalDateTime now = LocalDateTime.now();
        
        // Act
        serviceStatus.setStatus(ServiceStatus.ServiceState.SUSPENDED_PAYMENT);
        serviceStatus.setUpdatedAt(now);
        serviceStatus.setUpdatedBy("admin");
        serviceStatus.setActive(false);
        serviceStatus.setStatusReason("Payment overdue");
        serviceStatus.setScheduledChange(ServiceStatus.ServiceState.ACTIVE);
        serviceStatus.setScheduledTime(now.plusDays(3));
        
        // Assert
        assertEquals(ServiceStatus.ServiceState.SUSPENDED_PAYMENT, serviceStatus.getStatus());
        assertEquals(now, serviceStatus.getUpdatedAt());
        assertEquals("admin", serviceStatus.getUpdatedBy());
        assertFalse(serviceStatus.isActive());
        assertEquals("Payment overdue", serviceStatus.getStatusReason());
        assertEquals(ServiceStatus.ServiceState.ACTIVE, serviceStatus.getScheduledChange());
        assertEquals(now.plusDays(3), serviceStatus.getScheduledTime());
    }
    
    @Test
    @DisplayName("Should set updatedAt timestamp during pre-update")
    void shouldUpdateUpdatedAtTimestampDuringPreUpdate() {
        // Arrange
        ServiceStatus serviceStatus = new ServiceStatus();
        serviceStatus.onCreate();
        LocalDateTime initialUpdatedAt = serviceStatus.getUpdatedAt();
        
        // Wait briefly to ensure timestamp difference
        try {
            Thread.sleep(10);
        } catch (InterruptedException e) {
            // Ignore
        }
        
        // Act
        serviceStatus.onUpdate();
        
        // Assert
        assertNotNull(serviceStatus.getUpdatedAt());
        assertTrue(serviceStatus.getUpdatedAt().isAfter(initialUpdatedAt), 
                  "Updated timestamp should be after initial timestamp");
    }
    
    @Test
    @DisplayName("Should handle all ServiceState values")
    void shouldHandleAllServiceStateValues() {
        // Arrange
        ServiceStatus serviceStatus = new ServiceStatus();
        
        // Act & Assert
        serviceStatus.setStatus(ServiceStatus.ServiceState.ACTIVE);
        assertEquals(ServiceStatus.ServiceState.ACTIVE, serviceStatus.getStatus());
        
        serviceStatus.setStatus(ServiceStatus.ServiceState.SUSPENDED_PAYMENT);
        assertEquals(ServiceStatus.ServiceState.SUSPENDED_PAYMENT, serviceStatus.getStatus());
        
        serviceStatus.setStatus(ServiceStatus.ServiceState.SUSPENDED_SECURITY);
        assertEquals(ServiceStatus.ServiceState.SUSPENDED_SECURITY, serviceStatus.getStatus());
        
        serviceStatus.setStatus(ServiceStatus.ServiceState.SUSPENDED_MAINTENANCE);
        assertEquals(ServiceStatus.ServiceState.SUSPENDED_MAINTENANCE, serviceStatus.getStatus());
        
        serviceStatus.setStatus(ServiceStatus.ServiceState.TRANSITIONING);
        assertEquals(ServiceStatus.ServiceState.TRANSITIONING, serviceStatus.getStatus());
    }
    
    @Test
    @DisplayName("Should handle scheduled status changes")
    void shouldHandleScheduledStatusChanges() {
        // Arrange
        ServiceStatus serviceStatus = new ServiceStatus();
        serviceStatus.setStatus(ServiceStatus.ServiceState.ACTIVE);
        LocalDateTime scheduledTime = LocalDateTime.now().plusDays(1);
        
        // Act
        serviceStatus.setScheduledChange(ServiceStatus.ServiceState.SUSPENDED_MAINTENANCE);
        serviceStatus.setScheduledTime(scheduledTime);
        
        // Assert
        assertEquals(ServiceStatus.ServiceState.ACTIVE, serviceStatus.getStatus());
        assertEquals(ServiceStatus.ServiceState.SUSPENDED_MAINTENANCE, serviceStatus.getScheduledChange());
        assertEquals(scheduledTime, serviceStatus.getScheduledTime());
    }
} 