package com.solar.core_services.energy_monitoring.service;

import com.solar.core_services.energy_monitoring.dto.EnergyDataDTO;
import com.solar.core_services.energy_monitoring.dto.SolarInstallationDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class WebSocketService {

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Send energy data update to subscribers
     * @param installationId The ID of the installation
     * @param energyData The energy data to send
     */
    public void sendEnergyDataUpdate(Long installationId, EnergyDataDTO energyData) {
        messagingTemplate.convertAndSend("/topic/installation/" + installationId + "/energy-data", energyData);
    }

    /**
     * Send installation status update to subscribers
     * @param installationId The ID of the installation
     * @param installation The installation data to send
     */
    public void sendInstallationStatusUpdate(Long installationId, SolarInstallationDTO installation) {
        messagingTemplate.convertAndSend("/topic/installation/" + installationId + "/status", installation);
    }

    /**
     * Send tamper alert to subscribers
     * @param installationId The ID of the installation
     * @param installation The installation data to send
     */
    public void sendTamperAlert(Long installationId, SolarInstallationDTO installation) {
        messagingTemplate.convertAndSend("/topic/installation/" + installationId + "/tamper-alert", installation);
        messagingTemplate.convertAndSend("/topic/admin/tamper-alerts", installation);
    }

    /**
     * Send system-wide update to admin subscribers
     * @param message The message to send
     */
    public void sendAdminSystemUpdate(Object message) {
        messagingTemplate.convertAndSend("/topic/admin/system-update", message);
    }
} 