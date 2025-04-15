package com.solar.core_services.tampering_detection.model;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Test class for SecurityLog entity
 * Source file: src/main/java/com/solar/core_services/tampering_detection/model/SecurityLog.java
 */
public class SecurityLogTest {
    
    @Test
    @DisplayName("Should create a valid SecurityLog")
    void shouldCreateValidSecurityLog() {
        // Arrange
        SolarInstallation installation = new SolarInstallation();
        installation.setId(1L);
        installation.setName("Test Installation");
        
        LocalDateTime timestamp = LocalDateTime.now();
        
        SecurityLog securityLog = new SecurityLog();
        securityLog.setInstallation(installation);
        securityLog.setTimestamp(timestamp);
        securityLog.setActivityType(SecurityLog.ActivityType.ALERT_GENERATED);
        securityLog.setDetails("Test security log");
        securityLog.setIpAddress("192.168.1.1");
        securityLog.setLocation("Test Location");
        securityLog.setUserId("admin");
        
        // Assert
        assertEquals(installation, securityLog.getInstallation());
        assertEquals(timestamp, securityLog.getTimestamp());
        assertEquals(SecurityLog.ActivityType.ALERT_GENERATED, securityLog.getActivityType());
        assertEquals("Test security log", securityLog.getDetails());
        assertEquals("192.168.1.1", securityLog.getIpAddress());
        assertEquals("Test Location", securityLog.getLocation());
        assertEquals("admin", securityLog.getUserId());
    }
    
    @Test
    @DisplayName("Should set timestamp during pre-persist if null")
    void shouldSetTimestampDuringPrePersist() {
        // Arrange
        SecurityLog securityLog = new SecurityLog();
        assertNull(securityLog.getTimestamp());
        
        // Act
        securityLog.onCreate();
        
        // Assert
        assertNotNull(securityLog.getTimestamp());
    }
    
    @Test
    @DisplayName("Should not override timestamp during pre-persist if already set")
    void shouldNotOverrideTimestampDuringPrePersist() {
        // Arrange
        SecurityLog securityLog = new SecurityLog();
        LocalDateTime timestamp = LocalDateTime.now().minusDays(1);
        securityLog.setTimestamp(timestamp);
        
        // Act
        securityLog.onCreate();
        
        // Assert
        assertEquals(timestamp, securityLog.getTimestamp());
    }
    
    @Test
    @DisplayName("Should handle all activity types")
    void shouldHandleAllActivityTypes() {
        // Arrange
        SecurityLog securityLog = new SecurityLog();
        
        // Test all activity types
        for (SecurityLog.ActivityType activityType : SecurityLog.ActivityType.values()) {
            // Act
            securityLog.setActivityType(activityType);
            
            // Assert
            assertEquals(activityType, securityLog.getActivityType());
        }
        
        // Ensure all expected activity types are covered
        assertEquals(10, SecurityLog.ActivityType.values().length);
        assertTrue(containsActivityType(SecurityLog.ActivityType.values(), SecurityLog.ActivityType.SENSOR_READING));
        assertTrue(containsActivityType(SecurityLog.ActivityType.values(), SecurityLog.ActivityType.CONFIGURATION_CHANGE));
        assertTrue(containsActivityType(SecurityLog.ActivityType.values(), SecurityLog.ActivityType.ALERT_GENERATED));
        assertTrue(containsActivityType(SecurityLog.ActivityType.values(), SecurityLog.ActivityType.ALERT_ACKNOWLEDGED));
        assertTrue(containsActivityType(SecurityLog.ActivityType.values(), SecurityLog.ActivityType.ALERT_RESOLVED));
        assertTrue(containsActivityType(SecurityLog.ActivityType.values(), SecurityLog.ActivityType.SYSTEM_DIAGNOSTIC));
        assertTrue(containsActivityType(SecurityLog.ActivityType.values(), SecurityLog.ActivityType.SENSITIVITY_CHANGE));
        assertTrue(containsActivityType(SecurityLog.ActivityType.values(), SecurityLog.ActivityType.MANUAL_CHECK));
        assertTrue(containsActivityType(SecurityLog.ActivityType.values(), SecurityLog.ActivityType.REMOTE_ACCESS));
        assertTrue(containsActivityType(SecurityLog.ActivityType.values(), SecurityLog.ActivityType.FIRMWARE_UPDATE));
    }
    
    private boolean containsActivityType(SecurityLog.ActivityType[] activityTypes, SecurityLog.ActivityType targetType) {
        for (SecurityLog.ActivityType type : activityTypes) {
            if (type == targetType) {
                return true;
            }
        }
        return false;
    }
} 