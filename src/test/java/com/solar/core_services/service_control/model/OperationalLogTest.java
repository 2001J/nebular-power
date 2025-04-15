package com.solar.core_services.service_control.model;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Test class for OperationalLog entity
 * Source file: src/main/java/com/solar/core_services/service_control/model/OperationalLog.java
 */
public class OperationalLogTest {
    
    @Test
    @DisplayName("Should create a valid OperationalLog")
    void shouldCreateValidOperationalLog() {
        // Arrange
        SolarInstallation installation = new SolarInstallation();
        installation.setId(1L);
        installation.setName("Test Installation");
        
        LocalDateTime timestamp = LocalDateTime.now();
        
        OperationalLog log = new OperationalLog();
        log.setInstallation(installation);
        log.setOperation(OperationalLog.OperationType.DEVICE_REBOOT);
        log.setTimestamp(timestamp);
        log.setInitiator("admin");
        log.setSourceSystem("ADMIN_PANEL");
        log.setSourceAction("REBOOT_COMMAND");
        log.setIpAddress("192.168.1.1");
        log.setUserAgent("Mozilla/5.0");
        log.setDetails("System reboot triggered manually");
        log.setSuccess(true);
        
        // Assert
        assertEquals(installation, log.getInstallation());
        assertEquals(OperationalLog.OperationType.DEVICE_REBOOT, log.getOperation());
        assertEquals(timestamp, log.getTimestamp());
        assertEquals("admin", log.getInitiator());
        assertEquals("ADMIN_PANEL", log.getSourceSystem());
        assertEquals("REBOOT_COMMAND", log.getSourceAction());
        assertEquals("192.168.1.1", log.getIpAddress());
        assertEquals("Mozilla/5.0", log.getUserAgent());
        assertEquals("System reboot triggered manually", log.getDetails());
        assertTrue(log.isSuccess());
        assertNull(log.getErrorDetails());
    }
    
    @Test
    @DisplayName("Should create a failed OperationalLog with error details")
    void shouldCreateFailedOperationalLogWithErrorDetails() {
        // Arrange
        SolarInstallation installation = new SolarInstallation();
        installation.setId(1L);
        
        LocalDateTime timestamp = LocalDateTime.now();
        
        OperationalLog log = new OperationalLog();
        log.setInstallation(installation);
        log.setOperation(OperationalLog.OperationType.DEVICE_CONFIGURATION);
        log.setTimestamp(timestamp);
        log.setInitiator("system");
        log.setSourceSystem("AUTO_CONFIG");
        log.setSourceAction("UPDATE_SETTINGS");
        log.setDetails("Automatic configuration update");
        log.setSuccess(false);
        log.setErrorDetails("Connection timeout after 30s");
        
        // Assert
        assertEquals(installation, log.getInstallation());
        assertEquals(OperationalLog.OperationType.DEVICE_CONFIGURATION, log.getOperation());
        assertEquals(timestamp, log.getTimestamp());
        assertEquals("system", log.getInitiator());
        assertEquals("AUTO_CONFIG", log.getSourceSystem());
        assertEquals("UPDATE_SETTINGS", log.getSourceAction());
        assertEquals("Automatic configuration update", log.getDetails());
        assertFalse(log.isSuccess());
        assertEquals("Connection timeout after 30s", log.getErrorDetails());
    }
    
    @Test
    @DisplayName("Should set timestamp during pre-persist if null")
    void shouldSetTimestampDuringPrePersist() {
        // Arrange
        OperationalLog log = new OperationalLog();
        assertNull(log.getTimestamp());
        
        // Act
        log.onCreate();
        
        // Assert
        assertNotNull(log.getTimestamp());
    }
    
    @Test
    @DisplayName("Should not override timestamp during pre-persist if already set")
    void shouldNotOverrideTimestampDuringPrePersist() {
        // Arrange
        OperationalLog log = new OperationalLog();
        LocalDateTime timestamp = LocalDateTime.now().minusDays(1);
        log.setTimestamp(timestamp);
        
        // Act
        log.onCreate();
        
        // Assert
        assertEquals(timestamp, log.getTimestamp());
    }
    
    @Test
    @DisplayName("Should handle all OperationType values")
    void shouldHandleAllOperationTypeValues() {
        // Arrange
        OperationalLog log = new OperationalLog();
        
        // Act & Assert - Test a subset of operation types
        log.setOperation(OperationalLog.OperationType.DEVICE_HEARTBEAT);
        assertEquals(OperationalLog.OperationType.DEVICE_HEARTBEAT, log.getOperation());
        
        log.setOperation(OperationalLog.OperationType.DEVICE_CONFIGURATION);
        assertEquals(OperationalLog.OperationType.DEVICE_CONFIGURATION, log.getOperation());
        
        log.setOperation(OperationalLog.OperationType.COMMAND_SENT);
        assertEquals(OperationalLog.OperationType.COMMAND_SENT, log.getOperation());
        
        log.setOperation(OperationalLog.OperationType.COMMAND_RESPONSE);
        assertEquals(OperationalLog.OperationType.COMMAND_RESPONSE, log.getOperation());
        
        log.setOperation(OperationalLog.OperationType.SERVICE_STATUS_CHANGE);
        assertEquals(OperationalLog.OperationType.SERVICE_STATUS_CHANGE, log.getOperation());
        
        log.setOperation(OperationalLog.OperationType.DEVICE_REBOOT);
        assertEquals(OperationalLog.OperationType.DEVICE_REBOOT, log.getOperation());
        
        log.setOperation(OperationalLog.OperationType.SYSTEM_ALERT);
        assertEquals(OperationalLog.OperationType.SYSTEM_ALERT, log.getOperation());
        
        log.setOperation(OperationalLog.OperationType.MAINTENANCE_MODE);
        assertEquals(OperationalLog.OperationType.MAINTENANCE_MODE, log.getOperation());
        
        log.setOperation(OperationalLog.OperationType.SERVICE_SUSPENSION);
        assertEquals(OperationalLog.OperationType.SERVICE_SUSPENSION, log.getOperation());
        
        log.setOperation(OperationalLog.OperationType.SERVICE_RESTORATION);
        assertEquals(OperationalLog.OperationType.SERVICE_RESTORATION, log.getOperation());
    }
} 