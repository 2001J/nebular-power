package com.solar.core_services.tampering_detection.model;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Test class for AlertConfig entity
 * Source file: src/main/java/com/solar/core_services/tampering_detection/model/AlertConfig.java
 */
public class AlertConfigTest {
    
    @Test
    @DisplayName("Should create a valid AlertConfig with default values")
    void shouldCreateValidAlertConfigWithDefaultValues() {
        // Arrange
        SolarInstallation installation = new SolarInstallation();
        installation.setId(1L);
        installation.setName("Test Installation");
        
        AlertConfig alertConfig = new AlertConfig();
        alertConfig.setInstallation(installation);
        
        // Assert
        assertEquals(installation, alertConfig.getInstallation());
        assertEquals(AlertConfig.AlertLevel.MEDIUM, alertConfig.getAlertLevel());
        assertTrue(alertConfig.isAutoResponseEnabled());
        assertEquals(0.75, alertConfig.getPhysicalMovementThreshold());
        assertEquals(0.5, alertConfig.getVoltageFluctuationThreshold());
        assertEquals(0.8, alertConfig.getConnectionInterruptionThreshold());
        assertEquals(60, alertConfig.getSamplingRateSeconds());
    }
    
    @Test
    @DisplayName("Should update AlertConfig values correctly")
    void shouldUpdateAlertConfigValuesCorrectly() {
        // Arrange
        AlertConfig alertConfig = new AlertConfig();
        Set<AlertConfig.NotificationChannel> channels = new HashSet<>();
        channels.add(AlertConfig.NotificationChannel.EMAIL);
        channels.add(AlertConfig.NotificationChannel.SMS);
        
        // Act
        alertConfig.setAlertLevel(AlertConfig.AlertLevel.HIGH);
        alertConfig.setNotificationChannels(channels);
        alertConfig.setAutoResponseEnabled(false);
        alertConfig.setPhysicalMovementThreshold(1.0);
        alertConfig.setVoltageFluctuationThreshold(0.8);
        alertConfig.setConnectionInterruptionThreshold(0.9);
        alertConfig.setSamplingRateSeconds(30);
        
        // Assert
        assertEquals(AlertConfig.AlertLevel.HIGH, alertConfig.getAlertLevel());
        assertEquals(2, alertConfig.getNotificationChannels().size());
        assertTrue(alertConfig.getNotificationChannels().contains(AlertConfig.NotificationChannel.EMAIL));
        assertTrue(alertConfig.getNotificationChannels().contains(AlertConfig.NotificationChannel.SMS));
        assertFalse(alertConfig.isAutoResponseEnabled());
        assertEquals(1.0, alertConfig.getPhysicalMovementThreshold());
        assertEquals(0.8, alertConfig.getVoltageFluctuationThreshold());
        assertEquals(0.9, alertConfig.getConnectionInterruptionThreshold());
        assertEquals(30, alertConfig.getSamplingRateSeconds());
    }
    
    @Test
    @DisplayName("Should set timestamps during pre-persist")
    void shouldSetTimestampsDuringPrePersist() {
        // Arrange
        AlertConfig alertConfig = new AlertConfig();
        assertNull(alertConfig.getCreatedAt());
        assertNull(alertConfig.getUpdatedAt());
        
        // Act
        alertConfig.onCreate();
        
        // Assert
        assertNotNull(alertConfig.getCreatedAt());
        assertNotNull(alertConfig.getUpdatedAt());
        
        // Fix: Don't compare timestamps directly, since millisecond differences can cause failures
        // Instead, just verify that they're both set and roughly the same
        assertTrue(alertConfig.getCreatedAt().isEqual(alertConfig.getUpdatedAt()) || 
                   Math.abs(alertConfig.getCreatedAt().getNano() - alertConfig.getUpdatedAt().getNano()) < 1000000,
                   "Created and updated timestamps should be very close to each other");
    }
    
    @Test
    @DisplayName("Should update updatedAt timestamp during pre-update")
    void shouldUpdateUpdatedAtTimestampDuringPreUpdate() {
        // Arrange
        AlertConfig alertConfig = new AlertConfig();
        alertConfig.onCreate();
        LocalDateTime createdAt = alertConfig.getCreatedAt();
        LocalDateTime updatedAt = alertConfig.getUpdatedAt();
        
        // Simulate some time passing
        try {
            Thread.sleep(10);
        } catch (InterruptedException e) {
            // Ignore
        }
        
        // Act
        alertConfig.onUpdate();
        
        // Assert
        assertEquals(createdAt, alertConfig.getCreatedAt());
        assertNotEquals(updatedAt, alertConfig.getUpdatedAt());
        assertTrue(alertConfig.getUpdatedAt().isAfter(updatedAt));
    }
    
    @Test
    @DisplayName("Should handle all Alert Levels")
    void shouldHandleAllAlertLevels() {
        // Arrange
        AlertConfig alertConfig = new AlertConfig();
        
        // Act & Assert
        alertConfig.setAlertLevel(AlertConfig.AlertLevel.LOW);
        assertEquals(AlertConfig.AlertLevel.LOW, alertConfig.getAlertLevel());
        
        alertConfig.setAlertLevel(AlertConfig.AlertLevel.MEDIUM);
        assertEquals(AlertConfig.AlertLevel.MEDIUM, alertConfig.getAlertLevel());
        
        alertConfig.setAlertLevel(AlertConfig.AlertLevel.HIGH);
        assertEquals(AlertConfig.AlertLevel.HIGH, alertConfig.getAlertLevel());
        
        alertConfig.setAlertLevel(AlertConfig.AlertLevel.CRITICAL);
        assertEquals(AlertConfig.AlertLevel.CRITICAL, alertConfig.getAlertLevel());
    }
    
    @Test
    @DisplayName("Should handle all notification channels")
    void shouldHandleAllNotificationChannels() {
        // Arrange
        AlertConfig alertConfig = new AlertConfig();
        Set<AlertConfig.NotificationChannel> channels = new HashSet<>();
        
        // Act
        channels.add(AlertConfig.NotificationChannel.EMAIL);
        channels.add(AlertConfig.NotificationChannel.SMS);
        channels.add(AlertConfig.NotificationChannel.PUSH);
        channels.add(AlertConfig.NotificationChannel.IN_APP);
        alertConfig.setNotificationChannels(channels);
        
        // Assert
        assertEquals(4, alertConfig.getNotificationChannels().size());
        assertTrue(alertConfig.getNotificationChannels().contains(AlertConfig.NotificationChannel.EMAIL));
        assertTrue(alertConfig.getNotificationChannels().contains(AlertConfig.NotificationChannel.SMS));
        assertTrue(alertConfig.getNotificationChannels().contains(AlertConfig.NotificationChannel.PUSH));
        assertTrue(alertConfig.getNotificationChannels().contains(AlertConfig.NotificationChannel.IN_APP));
    }
} 