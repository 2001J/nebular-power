package com.solar.core_services.tampering_detection.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.solar.core_services.tampering_detection.dto.TamperEventDTO;
import com.solar.core_services.tampering_detection.model.TamperEvent.TamperEventType;
import com.solar.core_services.tampering_detection.model.TamperEvent.TamperSeverity;
import com.solar.core_services.tampering_detection.service.TamperDetectionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;

/**
 * Test class for TamperDetectionController
 * Source file: src/main/java/com/solar/core_services/tampering_detection/controller/TamperDetectionController.java
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@ExtendWith(MockitoExtension.class)
public class TamperDetectionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private TamperDetectionService tamperDetectionService;

    private Long installationId = 1L;
    private TamperEventDTO testTamperEventDTO;

    @BeforeEach
    void setUp() {
        // Set up test tamper event DTO
        testTamperEventDTO = new TamperEventDTO();
        testTamperEventDTO.setId(1L);
        testTamperEventDTO.setInstallationId(installationId);
        testTamperEventDTO.setEventType(TamperEventType.PHYSICAL_MOVEMENT);
        testTamperEventDTO.setSeverity(TamperSeverity.HIGH);
        testTamperEventDTO.setTimestamp(LocalDateTime.now());
        testTamperEventDTO.setDescription("Test tamper event");
        testTamperEventDTO.setConfidenceScore(0.85);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Should start monitoring for an installation")
    void shouldStartMonitoring() throws Exception {
        // Arrange
        doNothing().when(tamperDetectionService).startMonitoring(installationId);

        // Act & Assert
        mockMvc.perform(post("/api/security/detection/installations/{installationId}/start", installationId)
                .with(csrf()))
                .andExpect(status().isOk());

        verify(tamperDetectionService).startMonitoring(installationId);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Should stop monitoring for an installation")
    void shouldStopMonitoring() throws Exception {
        // Arrange
        doNothing().when(tamperDetectionService).stopMonitoring(installationId);

        // Act & Assert
        mockMvc.perform(post("/api/security/detection/installations/{installationId}/stop", installationId)
                .with(csrf()))
                .andExpect(status().isOk());

        verify(tamperDetectionService).stopMonitoring(installationId);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Should check monitoring status for an installation")
    void shouldCheckMonitoringStatus() throws Exception {
        // Arrange
        when(tamperDetectionService.isMonitoring(installationId)).thenReturn(true);

        // Act & Assert
        mockMvc.perform(get("/api/security/detection/installations/{installationId}/status", installationId))
                .andExpect(status().isOk())
                .andExpect(content().string("true"));

        verify(tamperDetectionService).isMonitoring(installationId);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Should run diagnostics for an installation")
    void shouldRunDiagnostics() throws Exception {
        // Arrange
        doNothing().when(tamperDetectionService).runDiagnostics(installationId);

        // Act & Assert
        mockMvc.perform(post("/api/security/detection/installations/{installationId}/diagnostics", installationId)
                .with(csrf()))
                .andExpect(status().isOk());

        verify(tamperDetectionService).runDiagnostics(installationId);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Should adjust sensitivity for tampering detection")
    void shouldAdjustSensitivity() throws Exception {
        // Arrange
        String eventType = "PHYSICAL_MOVEMENT";
        double newThreshold = 0.75;
        
        doNothing().when(tamperDetectionService).adjustSensitivity(eq(installationId), eq(eventType), eq(newThreshold));

        // Act & Assert
        mockMvc.perform(put("/api/security/detection/installations/{installationId}/sensitivity/{eventType}", installationId, eventType)
                .param("threshold", String.valueOf(newThreshold))
                .with(csrf()))
                .andExpect(status().isOk());

        verify(tamperDetectionService).adjustSensitivity(eq(installationId), eq(eventType), eq(newThreshold));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Should process physical movement data")
    void shouldProcessPhysicalMovementData() throws Exception {
        // Arrange
        double movementValue = 0.85;
        String rawData = "{\"acceleration\": 0.85, \"timestamp\": \"2023-06-15T14:30:00\"}";
        
        when(tamperDetectionService.processPhysicalMovementData(eq(installationId), eq(movementValue), isNull()))
                .thenReturn(testTamperEventDTO);

        // Act & Assert
        mockMvc.perform(post("/api/security/detection/installations/{installationId}/simulate/movement", installationId)
                .param("movementValue", String.valueOf(movementValue))
                .contentType(MediaType.APPLICATION_JSON)
                .content(rawData)
                .with(csrf()))
                .andExpect(status().isOk());

        verify(tamperDetectionService).processPhysicalMovementData(eq(installationId), eq(movementValue), isNull());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Should process voltage fluctuation data")
    void shouldProcessVoltageFluctuationData() throws Exception {
        // Arrange
        double voltageValue = 245.5;
        String rawData = "{\"voltage\": 245.5, \"timestamp\": \"2023-06-15T14:30:00\"}";
        
        when(tamperDetectionService.processVoltageFluctuationData(eq(installationId), eq(voltageValue), isNull()))
                .thenReturn(testTamperEventDTO);

        // Act & Assert
        mockMvc.perform(post("/api/security/detection/installations/{installationId}/simulate/voltage", installationId)
                .param("voltageValue", String.valueOf(voltageValue))
                .contentType(MediaType.APPLICATION_JSON)
                .content(rawData)
                .with(csrf()))
                .andExpect(status().isOk());

        verify(tamperDetectionService).processVoltageFluctuationData(eq(installationId), eq(voltageValue), isNull());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Should process connection interruption data")
    void shouldProcessConnectionInterruptionData() throws Exception {
        // Arrange
        boolean connected = false;
        String rawData = "{\"connectionStatus\": \"interrupted\", \"timestamp\": \"2023-06-15T14:30:00\"}";
        
        when(tamperDetectionService.processConnectionInterruptionData(eq(installationId), eq(connected), isNull()))
                .thenReturn(testTamperEventDTO);

        // Act & Assert
        mockMvc.perform(post("/api/security/detection/installations/{installationId}/simulate/connection", installationId)
                .param("connected", String.valueOf(connected))
                .contentType(MediaType.APPLICATION_JSON)
                .content(rawData)
                .with(csrf()))
                .andExpect(status().isOk());

        verify(tamperDetectionService).processConnectionInterruptionData(eq(installationId), eq(connected), isNull());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Should process location change data")
    void shouldProcessLocationChangeData() throws Exception {
        // Arrange
        String newLocation = "37.7749,-122.4194";
        String previousLocation = "34.0522,-118.2437";
        String rawData = "{\"latitude\": 37.7749, \"longitude\": -122.4194, \"timestamp\": \"2023-06-15T14:30:00\"}";
        
        when(tamperDetectionService.processLocationChangeData(eq(installationId), eq(newLocation), eq(previousLocation), isNull()))
                .thenReturn(testTamperEventDTO);

        // Act & Assert
        mockMvc.perform(post("/api/security/detection/installations/{installationId}/simulate/location", installationId)
                .param("newLocation", newLocation)
                .param("previousLocation", previousLocation)
                .contentType(MediaType.APPLICATION_JSON)
                .content(rawData)
                .with(csrf()))
                .andExpect(status().isOk());

        verify(tamperDetectionService).processLocationChangeData(eq(installationId), eq(newLocation), eq(previousLocation), isNull());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Should detect tampering")
    void shouldDetectTampering() throws Exception {
        // Arrange
        TamperEventType eventType = TamperEventType.PHYSICAL_MOVEMENT;
        double confidenceScore = 0.85;
        String description = "Significant physical movement detected";
        String rawData = "{\"type\": \"PHYSICAL_MOVEMENT\", \"data\": {\"acceleration\": 0.85}, \"timestamp\": \"2023-06-15T14:30:00\"}";
        
        when(tamperDetectionService.detectTampering(eq(installationId), eq(eventType), eq(confidenceScore), eq(description), isNull()))
                .thenReturn(testTamperEventDTO);

        // Act & Assert
        mockMvc.perform(post("/api/security/detection/installations/{installationId}/simulate/tamper", installationId)
                .param("eventType", eventType.name())
                .param("confidenceScore", String.valueOf(confidenceScore))
                .param("description", description)
                .contentType(MediaType.APPLICATION_JSON)
                .content(rawData)
                .with(csrf()))
                .andExpect(status().isOk());

        verify(tamperDetectionService).detectTampering(eq(installationId), eq(eventType), eq(confidenceScore), eq(description), isNull());
    }

    @Test
    @WithMockUser(roles = "USER")
    @DisplayName("Should return error for non-admin users")
    void shouldReturnForbiddenForNonAdminUsers() throws Exception {
        // Act & Assert
        mockMvc.perform(post("/api/security/detection/installations/{installationId}/start", installationId))
                .andExpect(status().isForbidden()); // Updated to expect 403 (Forbidden) instead of 500 (Internal Server Error)

        verifyNoInteractions(tamperDetectionService);
    }
}