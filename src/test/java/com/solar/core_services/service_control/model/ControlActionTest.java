package com.solar.core_services.service_control.model;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Test class for ControlAction entity
 * Source file: src/main/java/com/solar/core_services/service_control/model/ControlAction.java
 */
public class ControlActionTest {
    
    @Test
    @DisplayName("Should create a valid ControlAction with success")
    void shouldCreateValidControlActionWithSuccess() {
        // Arrange
        SolarInstallation installation = new SolarInstallation();
        installation.setId(1L);
        installation.setName("Test Installation");
        
        LocalDateTime executedAt = LocalDateTime.now();
        
        ControlAction action = new ControlAction();
        action.setInstallation(installation);
        action.setActionType(ControlAction.ActionType.REBOOT_DEVICE);
        action.setExecutedAt(executedAt);
        action.setExecutedBy("admin");
        action.setSourceSystem("TEST_SYSTEM");
        action.setSourceEvent("SYSTEM_ALERT");
        action.setActionDetails("Rebooting device after system hang");
        action.setSuccess(true);
        
        // Assert
        assertEquals(installation, action.getInstallation());
        assertEquals(ControlAction.ActionType.REBOOT_DEVICE, action.getActionType());
        assertEquals(executedAt, action.getExecutedAt());
        assertEquals("admin", action.getExecutedBy());
        assertEquals("TEST_SYSTEM", action.getSourceSystem());
        assertEquals("SYSTEM_ALERT", action.getSourceEvent());
        assertEquals("Rebooting device after system hang", action.getActionDetails());
        assertTrue(action.isSuccess());
        assertNull(action.getFailureReason());
    }
    
    @Test
    @DisplayName("Should create a failed ControlAction with reason")
    void shouldCreateFailedControlActionWithReason() {
        // Arrange
        SolarInstallation installation = new SolarInstallation();
        installation.setId(1L);
        
        LocalDateTime executedAt = LocalDateTime.now();
        
        ControlAction action = new ControlAction();
        action.setInstallation(installation);
        action.setActionType(ControlAction.ActionType.FIRMWARE_UPDATE);
        action.setExecutedAt(executedAt);
        action.setExecutedBy("system");
        action.setSourceSystem("AUTO_UPDATE");
        action.setActionDetails("Applying firmware update v2.3.1");
        action.setSuccess(false);
        action.setFailureReason("Device communication timeout");
        
        // Assert
        assertEquals(installation, action.getInstallation());
        assertEquals(ControlAction.ActionType.FIRMWARE_UPDATE, action.getActionType());
        assertEquals(executedAt, action.getExecutedAt());
        assertEquals("system", action.getExecutedBy());
        assertEquals("AUTO_UPDATE", action.getSourceSystem());
        assertEquals("Applying firmware update v2.3.1", action.getActionDetails());
        assertFalse(action.isSuccess());
        assertEquals("Device communication timeout", action.getFailureReason());
    }
    
    @Test
    @DisplayName("Should set executedAt during pre-persist if null")
    void shouldSetExecutedAtDuringPrePersist() {
        // Arrange
        ControlAction action = new ControlAction();
        assertNull(action.getExecutedAt());
        
        // Act
        action.onCreate();
        
        // Assert
        assertNotNull(action.getExecutedAt());
    }
    
    @Test
    @DisplayName("Should not override executedAt during pre-persist if already set")
    void shouldNotOverrideExecutedAtDuringPrePersist() {
        // Arrange
        ControlAction action = new ControlAction();
        LocalDateTime executedAt = LocalDateTime.now().minusDays(1);
        action.setExecutedAt(executedAt);
        
        // Act
        action.onCreate();
        
        // Assert
        assertEquals(executedAt, action.getExecutedAt());
    }
    
    @Test
    @DisplayName("Should handle all ActionType values")
    void shouldHandleAllActionTypeValues() {
        // Arrange
        ControlAction action = new ControlAction();
        
        // Act & Assert - Test all action types
        action.setActionType(ControlAction.ActionType.REBOOT_DEVICE);
        assertEquals(ControlAction.ActionType.REBOOT_DEVICE, action.getActionType());
        
        action.setActionType(ControlAction.ActionType.FIRMWARE_UPDATE);
        assertEquals(ControlAction.ActionType.FIRMWARE_UPDATE, action.getActionType());
        
        action.setActionType(ControlAction.ActionType.CONFIGURATION_CHANGE);
        assertEquals(ControlAction.ActionType.CONFIGURATION_CHANGE, action.getActionType());
        
        action.setActionType(ControlAction.ActionType.LIMIT_POWER);
        assertEquals(ControlAction.ActionType.LIMIT_POWER, action.getActionType());
        
        action.setActionType(ControlAction.ActionType.RESTORE_POWER);
        assertEquals(ControlAction.ActionType.RESTORE_POWER, action.getActionType());
        
        action.setActionType(ControlAction.ActionType.SECURITY_LOCKDOWN);
        assertEquals(ControlAction.ActionType.SECURITY_LOCKDOWN, action.getActionType());
        
        action.setActionType(ControlAction.ActionType.SECURITY_RESTORE);
        assertEquals(ControlAction.ActionType.SECURITY_RESTORE, action.getActionType());
        
        action.setActionType(ControlAction.ActionType.SUSPEND_SERVICE);
        assertEquals(ControlAction.ActionType.SUSPEND_SERVICE, action.getActionType());
        
        action.setActionType(ControlAction.ActionType.RESTORE_SERVICE);
        assertEquals(ControlAction.ActionType.RESTORE_SERVICE, action.getActionType());
        
        action.setActionType(ControlAction.ActionType.ENABLE_MAINTENANCE_MODE);
        assertEquals(ControlAction.ActionType.ENABLE_MAINTENANCE_MODE, action.getActionType());
        
        action.setActionType(ControlAction.ActionType.DISABLE_MAINTENANCE_MODE);
        assertEquals(ControlAction.ActionType.DISABLE_MAINTENANCE_MODE, action.getActionType());
    }
} 