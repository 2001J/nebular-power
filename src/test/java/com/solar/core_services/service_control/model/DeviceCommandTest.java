package com.solar.core_services.service_control.model;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Test class for DeviceCommand entity
 * Source file: src/main/java/com/solar/core_services/service_control/model/DeviceCommand.java
 */
public class DeviceCommandTest {
    
    @Test
    @DisplayName("Should create a valid DeviceCommand with initial values")
    void shouldCreateValidDeviceCommand() {
        // Arrange
        SolarInstallation installation = new SolarInstallation();
        installation.setId(1L);
        installation.setName("Test Installation");
        
        LocalDateTime now = LocalDateTime.now();
        
        DeviceCommand command = new DeviceCommand();
        command.setInstallation(installation);
        command.setCommand("REBOOT");
        command.setStatus(DeviceCommand.CommandStatus.QUEUED);
        command.setSentAt(now);
        command.setInitiatedBy("admin");
        command.setParameters("{\"reason\": \"test\"}");
        command.setCorrelationId("CORR-123");
        
        // Assert
        assertEquals(installation, command.getInstallation());
        assertEquals("REBOOT", command.getCommand());
        assertEquals(DeviceCommand.CommandStatus.QUEUED, command.getStatus());
        assertEquals(now, command.getSentAt());
        assertEquals("admin", command.getInitiatedBy());
        assertEquals("{\"reason\": \"test\"}", command.getParameters());
        assertEquals("CORR-123", command.getCorrelationId());
        assertEquals(0, command.getRetryCount());
        assertNull(command.getProcessedAt());
        assertNull(command.getLastRetryAt());
        assertNull(command.getExpiresAt());
        assertNull(command.getResponseMessage());
    }
    
    @Test
    @DisplayName("Should update DeviceCommand status correctly")
    void shouldUpdateDeviceCommandStatusCorrectly() {
        // Arrange
        DeviceCommand command = new DeviceCommand();
        command.setCommand("UPDATE_FIRMWARE");
        command.setStatus(DeviceCommand.CommandStatus.QUEUED);
        
        // Act & Assert - Test status transitions
        command.setStatus(DeviceCommand.CommandStatus.SENT);
        assertEquals(DeviceCommand.CommandStatus.SENT, command.getStatus());
        
        command.setStatus(DeviceCommand.CommandStatus.DELIVERED);
        assertEquals(DeviceCommand.CommandStatus.DELIVERED, command.getStatus());
        
        command.setStatus(DeviceCommand.CommandStatus.EXECUTED);
        assertEquals(DeviceCommand.CommandStatus.EXECUTED, command.getStatus());
        
        // Test setting processed timestamp
        LocalDateTime processedAt = LocalDateTime.now();
        command.setProcessedAt(processedAt);
        assertEquals(processedAt, command.getProcessedAt());
        
        // Test response handling
        command.setResponseMessage("Success");
        assertEquals("Success", command.getResponseMessage());
    }
    
    @Test
    @DisplayName("Should handle command failure scenarios")
    void shouldHandleCommandFailureScenarios() {
        // Arrange
        DeviceCommand command = new DeviceCommand();
        command.setCommand("CHANGE_POWER_LIMIT");
        command.setStatus(DeviceCommand.CommandStatus.SENT);
        
        // Act - Simulate failure
        command.setStatus(DeviceCommand.CommandStatus.FAILED);
        command.setResponseMessage("Device unreachable");
        
        // Assert
        assertEquals(DeviceCommand.CommandStatus.FAILED, command.getStatus());
        assertEquals("Device unreachable", command.getResponseMessage());
    }
    
    @Test
    @DisplayName("Should handle command retries correctly")
    void shouldHandleCommandRetriesCorrectly() {
        // Arrange
        DeviceCommand command = new DeviceCommand();
        command.setCommand("GET_DIAGNOSTICS");
        command.setStatus(DeviceCommand.CommandStatus.QUEUED);
        
        // Act - Simulate retry
        command.setRetryCount(1);
        command.setLastRetryAt(LocalDateTime.now());
        
        // Assert
        assertEquals(1, command.getRetryCount());
        assertNotNull(command.getLastRetryAt());
    }
    
    @Test
    @DisplayName("Should handle command expiration")
    void shouldHandleCommandExpiration() {
        // Arrange
        DeviceCommand command = new DeviceCommand();
        command.setCommand("COLLECT_DATA");
        command.setStatus(DeviceCommand.CommandStatus.QUEUED);
        
        // Act - Set expiration
        LocalDateTime expires = LocalDateTime.now().plusHours(24);
        command.setExpiresAt(expires);
        
        // Act - Simulate expiration
        command.setStatus(DeviceCommand.CommandStatus.EXPIRED);
        
        // Assert
        assertEquals(DeviceCommand.CommandStatus.EXPIRED, command.getStatus());
        assertEquals(expires, command.getExpiresAt());
    }
    
    @Test
    @DisplayName("Should handle all CommandStatus values")
    void shouldHandleAllCommandStatusValues() {
        // Arrange
        DeviceCommand command = new DeviceCommand();
        
        // Act & Assert - Test all status values
        command.setStatus(DeviceCommand.CommandStatus.PENDING);
        assertEquals(DeviceCommand.CommandStatus.PENDING, command.getStatus());
        
        command.setStatus(DeviceCommand.CommandStatus.QUEUED);
        assertEquals(DeviceCommand.CommandStatus.QUEUED, command.getStatus());
        
        command.setStatus(DeviceCommand.CommandStatus.SENT);
        assertEquals(DeviceCommand.CommandStatus.SENT, command.getStatus());
        
        command.setStatus(DeviceCommand.CommandStatus.DELIVERED);
        assertEquals(DeviceCommand.CommandStatus.DELIVERED, command.getStatus());
        
        command.setStatus(DeviceCommand.CommandStatus.EXECUTED);
        assertEquals(DeviceCommand.CommandStatus.EXECUTED, command.getStatus());
        
        command.setStatus(DeviceCommand.CommandStatus.FAILED);
        assertEquals(DeviceCommand.CommandStatus.FAILED, command.getStatus());
        
        command.setStatus(DeviceCommand.CommandStatus.EXPIRED);
        assertEquals(DeviceCommand.CommandStatus.EXPIRED, command.getStatus());
        
        command.setStatus(DeviceCommand.CommandStatus.CANCELLED);
        assertEquals(DeviceCommand.CommandStatus.CANCELLED, command.getStatus());
    }
} 