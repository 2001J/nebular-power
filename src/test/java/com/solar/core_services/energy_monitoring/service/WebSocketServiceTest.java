package com.solar.core_services.energy_monitoring.service;

import com.solar.core_services.energy_monitoring.dto.EnergyDataDTO;
import com.solar.core_services.energy_monitoring.dto.SolarInstallationDTO;
import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Comprehensive test for WebSocketService that covers:
 * 1. Real-time energy data notifications
 * 2. Installation status updates
 * 3. Tamper alerts
 * 4. Admin system updates
 * 5. Proper destination topic formatting
 * 6. Payload correctness verification
 */
@ExtendWith(MockitoExtension.class)
class WebSocketServiceTest {

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private WebSocketService webSocketService;

    private EnergyDataDTO energyDataDTO;
    private SolarInstallationDTO installationDTO;
    private Long installationId;

    @BeforeEach
    void setUp() {
        // Set up test data
        installationId = 1L;
        
        // Create test energy data
        energyDataDTO = EnergyDataDTO.builder()
                .id(100L)
                .installationId(installationId)
                .timestamp(LocalDateTime.now())
                .powerGenerationWatts(1500.0)
                .powerConsumptionWatts(800.0)
                .dailyYieldKWh(12.5)
                .totalYieldKWh(2500.0)
                .isSimulated(false)
                .build();

        // Create test installation data
        installationDTO = SolarInstallationDTO.builder()
                .id(installationId)
                .userId(1L)
                .username("testuser")
                .installedCapacityKW(5.0)
                .location("123 Test St")
                .installationDate(LocalDateTime.now().minusMonths(6))
                .status(SolarInstallation.InstallationStatus.ACTIVE)
                .tamperDetected(false)
                .lastTamperCheck(LocalDateTime.now().minusDays(1))
                .build();
    }

    @Test
    @DisplayName("Should send energy data update to the correct topic")
    void sendEnergyDataUpdate_SendsToCorrectTopic() {
        // Given - setUp provides the necessary objects
        String expectedTopic = "/topic/installation/" + installationId + "/energy-data";

        // When
        webSocketService.sendEnergyDataUpdate(installationId, energyDataDTO);

        // Then
        verify(messagingTemplate).convertAndSend(eq(expectedTopic), eq(energyDataDTO));
    }

    @Test
    @DisplayName("Should send energy data update with correct payload")
    void sendEnergyDataUpdate_SendsCorrectPayload() {
        // Given - setUp provides the necessary objects

        // When
        webSocketService.sendEnergyDataUpdate(installationId, energyDataDTO);

        // Then
        ArgumentCaptor<EnergyDataDTO> payloadCaptor = ArgumentCaptor.forClass(EnergyDataDTO.class);
        verify(messagingTemplate).convertAndSend(anyString(), payloadCaptor.capture());
        
        EnergyDataDTO capturedPayload = payloadCaptor.getValue();
        assertEquals(energyDataDTO.getId(), capturedPayload.getId());
        assertEquals(energyDataDTO.getInstallationId(), capturedPayload.getInstallationId());
        assertEquals(energyDataDTO.getPowerGenerationWatts(), capturedPayload.getPowerGenerationWatts());
        assertEquals(energyDataDTO.getPowerConsumptionWatts(), capturedPayload.getPowerConsumptionWatts());
        assertEquals(energyDataDTO.getDailyYieldKWh(), capturedPayload.getDailyYieldKWh());
        assertEquals(energyDataDTO.getTotalYieldKWh(), capturedPayload.getTotalYieldKWh());
    }

    @Test
    @DisplayName("Should handle null energy data gracefully")
    void sendEnergyDataUpdate_NullData_HandlesGracefully() {
        // Given
        EnergyDataDTO nullData = null;

        // When
        webSocketService.sendEnergyDataUpdate(installationId, nullData);

        // Then
        verify(messagingTemplate).convertAndSend(anyString(), eq(nullData));
    }

    @Test
    @DisplayName("Should send installation status update to the correct topic")
    void sendInstallationStatusUpdate_SendsToCorrectTopic() {
        // Given - setUp provides the necessary objects
        String expectedTopic = "/topic/installation/" + installationId + "/status";

        // When
        webSocketService.sendInstallationStatusUpdate(installationId, installationDTO);

        // Then
        verify(messagingTemplate).convertAndSend(eq(expectedTopic), eq(installationDTO));
    }

    @Test
    @DisplayName("Should send installation status update with correct payload")
    void sendInstallationStatusUpdate_SendsCorrectPayload() {
        // Given - setUp provides the necessary objects

        // When
        webSocketService.sendInstallationStatusUpdate(installationId, installationDTO);

        // Then
        ArgumentCaptor<SolarInstallationDTO> payloadCaptor = ArgumentCaptor.forClass(SolarInstallationDTO.class);
        verify(messagingTemplate).convertAndSend(anyString(), payloadCaptor.capture());
        
        SolarInstallationDTO capturedPayload = payloadCaptor.getValue();
        assertEquals(installationDTO.getId(), capturedPayload.getId());
        assertEquals(installationDTO.getUserId(), capturedPayload.getUserId());
        assertEquals(installationDTO.getInstalledCapacityKW(), capturedPayload.getInstalledCapacityKW());
        assertEquals(installationDTO.getStatus(), capturedPayload.getStatus());
        assertEquals(installationDTO.isTamperDetected(), capturedPayload.isTamperDetected());
    }

    @Test
    @DisplayName("Should send tamper alert to the correct topics")
    void sendTamperAlert_SendsToCorrectTopics() {
        // Given - setUp provides the necessary objects
        String expectedInstallationTopic = "/topic/installation/" + installationId + "/tamper-alert";
        String expectedAdminTopic = "/topic/admin/tamper-alerts";

        // When
        webSocketService.sendTamperAlert(installationId, installationDTO);

        // Then
        verify(messagingTemplate).convertAndSend(eq(expectedInstallationTopic), eq(installationDTO));
        verify(messagingTemplate).convertAndSend(eq(expectedAdminTopic), eq(installationDTO));
    }

    @Test
    @DisplayName("Should send tamper alert with correct payload")
    void sendTamperAlert_SendsCorrectPayload() {
        // Given - setUp provides the necessary objects
        installationDTO.setTamperDetected(true);

        // When
        webSocketService.sendTamperAlert(installationId, installationDTO);

        // Then
        ArgumentCaptor<SolarInstallationDTO> payloadCaptor = ArgumentCaptor.forClass(SolarInstallationDTO.class);
        verify(messagingTemplate, times(2)).convertAndSend(anyString(), payloadCaptor.capture());
        
        // Check both captured values (same payload sent to two different topics)
        SolarInstallationDTO firstCapture = payloadCaptor.getAllValues().get(0);
        assertEquals(installationDTO.getId(), firstCapture.getId());
        assertEquals(installationDTO.getUserId(), firstCapture.getUserId());
        assertEquals(installationDTO.getStatus(), firstCapture.getStatus());
        assertEquals(true, firstCapture.isTamperDetected());
    }

    @Test
    @DisplayName("Should send admin system update to the correct topic")
    void sendAdminSystemUpdate_SendsToCorrectTopic() {
        // Given
        String message = "System maintenance scheduled for tomorrow";
        String expectedTopic = "/topic/admin/system-update";

        // When
        webSocketService.sendAdminSystemUpdate(message);

        // Then
        verify(messagingTemplate).convertAndSend(eq(expectedTopic), eq(message));
    }

    @Test
    @DisplayName("Should send admin system update with correct payload")
    void sendAdminSystemUpdate_SendsCorrectPayload() {
        // Given
        Object message = new Object() {
            final String content = "Test message";
            final LocalDateTime time = LocalDateTime.now();
            
            @Override
            public String toString() {
                return "Message[content=" + content + ", time=" + time + "]";
            }
        };

        // When
        webSocketService.sendAdminSystemUpdate(message);

        // Then
        ArgumentCaptor<Object> payloadCaptor = ArgumentCaptor.forClass(Object.class);
        verify(messagingTemplate).convertAndSend(anyString(), payloadCaptor.capture());
        
        // The payload should be exactly what we passed in
        Object capturedPayload = payloadCaptor.getValue();
        assertEquals(message, capturedPayload);
    }
} 