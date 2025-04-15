package com.solar.core_services.tampering_detection.model;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Test class for TamperEvent entity
 * Source file: src/main/java/com/solar/core_services/tampering_detection/model/TamperEvent.java
 */
public class TamperEventTest {
    
    @Test
    @DisplayName("Should create a valid TamperEvent")
    void shouldCreateValidTamperEvent() {
        // Arrange
        SolarInstallation installation = new SolarInstallation();
        installation.setId(1L);
        installation.setName("Test Installation");
        
        TamperEvent tamperEvent = new TamperEvent();
        tamperEvent.setInstallation(installation);
        tamperEvent.setEventType(TamperEvent.TamperEventType.PHYSICAL_MOVEMENT);
        tamperEvent.setSeverity(TamperEvent.TamperSeverity.MEDIUM);
        tamperEvent.setDescription("Test tamper event");
        tamperEvent.setConfidenceScore(0.85);
        tamperEvent.setRawSensorData("{\"data\": \"test\"}");
        
        // Assert
        assertEquals(installation, tamperEvent.getInstallation());
        assertEquals(TamperEvent.TamperEventType.PHYSICAL_MOVEMENT, tamperEvent.getEventType());
        assertEquals(TamperEvent.TamperSeverity.MEDIUM, tamperEvent.getSeverity());
        assertEquals("Test tamper event", tamperEvent.getDescription());
        assertEquals(0.85, tamperEvent.getConfidenceScore());
        assertEquals("{\"data\": \"test\"}", tamperEvent.getRawSensorData());
        assertEquals(TamperEvent.TamperEventStatus.NEW, tamperEvent.getStatus());
        assertFalse(tamperEvent.isResolved());
    }
    
    @Test
    @DisplayName("Should set timestamp during pre-persist if null")
    void shouldSetTimestampDuringPrePersist() {
        // Arrange
        TamperEvent tamperEvent = new TamperEvent();
        assertNull(tamperEvent.getTimestamp());
        
        // Act
        tamperEvent.onCreate();
        
        // Assert
        assertNotNull(tamperEvent.getTimestamp());
    }
    
    @Test
    @DisplayName("Should not override timestamp during pre-persist if already set")
    void shouldNotOverrideTimestampDuringPrePersist() {
        // Arrange
        TamperEvent tamperEvent = new TamperEvent();
        LocalDateTime timestamp = LocalDateTime.now().minusDays(1);
        tamperEvent.setTimestamp(timestamp);
        
        // Act
        tamperEvent.onCreate();
        
        // Assert
        assertEquals(timestamp, tamperEvent.getTimestamp());
    }
    
    @Test
    @DisplayName("Should properly resolve a tamper event")
    void shouldProperlyResolveTamperEvent() {
        // Arrange
        TamperEvent tamperEvent = new TamperEvent();
        tamperEvent.setEventType(TamperEvent.TamperEventType.PHYSICAL_MOVEMENT);
        tamperEvent.setSeverity(TamperEvent.TamperSeverity.MEDIUM);
        tamperEvent.setDescription("Test tamper event");
        tamperEvent.setConfidenceScore(0.85);
        
        // Act
        tamperEvent.setResolved(true);
        tamperEvent.setResolvedAt(LocalDateTime.now());
        tamperEvent.setResolvedBy("admin");
        tamperEvent.setStatus(TamperEvent.TamperEventStatus.RESOLVED);
        
        // Assert
        assertTrue(tamperEvent.isResolved());
        assertNotNull(tamperEvent.getResolvedAt());
        assertEquals("admin", tamperEvent.getResolvedBy());
        assertEquals(TamperEvent.TamperEventStatus.RESOLVED, tamperEvent.getStatus());
    }
    
    @Test
    @DisplayName("Should properly update tamper event status")
    void shouldProperlyUpdateTamperEventStatus() {
        // Arrange
        TamperEvent tamperEvent = new TamperEvent();
        assertEquals(TamperEvent.TamperEventStatus.NEW, tamperEvent.getStatus());
        
        // Act & Assert
        tamperEvent.setStatus(TamperEvent.TamperEventStatus.ACKNOWLEDGED);
        assertEquals(TamperEvent.TamperEventStatus.ACKNOWLEDGED, tamperEvent.getStatus());
        
        tamperEvent.setStatus(TamperEvent.TamperEventStatus.INVESTIGATING);
        assertEquals(TamperEvent.TamperEventStatus.INVESTIGATING, tamperEvent.getStatus());
        
        tamperEvent.setStatus(TamperEvent.TamperEventStatus.RESOLVED);
        assertEquals(TamperEvent.TamperEventStatus.RESOLVED, tamperEvent.getStatus());
    }
} 