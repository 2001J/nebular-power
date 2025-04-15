package com.solar.core_services.tampering_detection.model;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Test class for TamperResponse entity
 * Source file: src/main/java/com/solar/core_services/tampering_detection/model/TamperResponse.java
 */
public class TamperResponseTest {
    
    @Test
    @DisplayName("Should create a valid TamperResponse")
    void shouldCreateValidTamperResponse() {
        // Arrange
        SolarInstallation installation = new SolarInstallation();
        installation.setId(1L);
        installation.setName("Test Installation");
        
        TamperEvent tamperEvent = new TamperEvent();
        tamperEvent.setId(1L);
        tamperEvent.setInstallation(installation);
        tamperEvent.setEventType(TamperEvent.TamperEventType.PHYSICAL_MOVEMENT);
        
        LocalDateTime executedAt = LocalDateTime.now();
        
        TamperResponse tamperResponse = new TamperResponse();
        tamperResponse.setTamperEvent(tamperEvent);
        tamperResponse.setResponseType(TamperResponse.ResponseType.MANUAL_INTERVENTION);
        tamperResponse.setExecutedAt(executedAt);
        tamperResponse.setSuccess(true);
        tamperResponse.setFailureReason(null);
        tamperResponse.setExecutedBy("admin");
        tamperResponse.setResponseDetails("Test response details");
        
        // Assert
        assertEquals(tamperEvent, tamperResponse.getTamperEvent());
        assertEquals(TamperResponse.ResponseType.MANUAL_INTERVENTION, tamperResponse.getResponseType());
        assertEquals(executedAt, tamperResponse.getExecutedAt());
        assertTrue(tamperResponse.isSuccess());
        assertNull(tamperResponse.getFailureReason());
        assertEquals("admin", tamperResponse.getExecutedBy());
        assertEquals("Test response details", tamperResponse.getResponseDetails());
    }
    
    @Test
    @DisplayName("Should set executedAt during pre-persist if null")
    void shouldSetExecutedAtDuringPrePersist() {
        // Arrange
        TamperResponse tamperResponse = new TamperResponse();
        assertNull(tamperResponse.getExecutedAt());
        
        // Act
        tamperResponse.onCreate();
        
        // Assert
        assertNotNull(tamperResponse.getExecutedAt());
    }
    
    @Test
    @DisplayName("Should not override executedAt during pre-persist if already set")
    void shouldNotOverrideExecutedAtDuringPrePersist() {
        // Arrange
        TamperResponse tamperResponse = new TamperResponse();
        LocalDateTime executedAt = LocalDateTime.now().minusDays(1);
        tamperResponse.setExecutedAt(executedAt);
        
        // Act
        tamperResponse.onCreate();
        
        // Assert
        assertEquals(executedAt, tamperResponse.getExecutedAt());
    }
    
    @Test
    @DisplayName("Should handle failed response with reason")
    void shouldHandleFailedResponseWithReason() {
        // Arrange
        TamperResponse tamperResponse = new TamperResponse();
        tamperResponse.setResponseType(TamperResponse.ResponseType.SYSTEM_LOCKDOWN);
        
        // Act
        tamperResponse.setSuccess(false);
        tamperResponse.setFailureReason("Connection timeout");
        
        // Assert
        assertFalse(tamperResponse.isSuccess());
        assertEquals("Connection timeout", tamperResponse.getFailureReason());
    }
    
    @Test
    @DisplayName("Should handle all response types")
    void shouldHandleAllResponseTypes() {
        // Arrange
        TamperResponse tamperResponse = new TamperResponse();
        
        // Test all response types
        TamperResponse.ResponseType[] responseTypes = TamperResponse.ResponseType.values();
        
        // Act & Assert
        for (TamperResponse.ResponseType responseType : responseTypes) {
            tamperResponse.setResponseType(responseType);
            assertEquals(responseType, tamperResponse.getResponseType());
        }
        
        // Ensure all expected response types are covered
        assertEquals(8, responseTypes.length);
        assertTrue(containsResponseType(responseTypes, TamperResponse.ResponseType.NOTIFICATION_SENT));
        assertTrue(containsResponseType(responseTypes, TamperResponse.ResponseType.SERVICE_SUSPENDED));
        assertTrue(containsResponseType(responseTypes, TamperResponse.ResponseType.SYSTEM_LOCKDOWN));
        assertTrue(containsResponseType(responseTypes, TamperResponse.ResponseType.REMOTE_DIAGNOSTIC));
        assertTrue(containsResponseType(responseTypes, TamperResponse.ResponseType.EVIDENCE_COLLECTION));
        assertTrue(containsResponseType(responseTypes, TamperResponse.ResponseType.ADMIN_ALERT));
        assertTrue(containsResponseType(responseTypes, TamperResponse.ResponseType.AUTOMATIC_RESET));
        assertTrue(containsResponseType(responseTypes, TamperResponse.ResponseType.MANUAL_INTERVENTION));
    }
    
    private boolean containsResponseType(TamperResponse.ResponseType[] responseTypes, TamperResponse.ResponseType targetType) {
        for (TamperResponse.ResponseType type : responseTypes) {
            if (type == targetType) {
                return true;
            }
        }
        return false;
    }
} 