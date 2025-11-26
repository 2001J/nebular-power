package com.solar.core_services.service_control.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.solar.core_services.service_control.config.DeviceCommandProperties;
import com.solar.core_services.service_control.model.DeviceCommand;
import com.solar.core_services.service_control.service.DeviceTransmissionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Implementation of device transmission service using HTTP/REST.
 * Handles communication with physical device controllers.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DeviceTransmissionServiceImpl implements DeviceTransmissionService {
    
    @Qualifier("deviceCommandRestClient")
    private final RestClient restClient;
    
    private final DeviceCommandProperties properties;
    private final ObjectMapper objectMapper;
    
    // In-memory heartbeat tracking (in production, this would be from database)
    private final Map<Long, LocalDateTime> deviceHeartbeats = new HashMap<>();
    
    @Override
    public boolean transmitCommand(DeviceCommand command) {
        log.info("Attempting to transmit command {} (ID: {}) to installation {}", 
                command.getCommand(), command.getId(), command.getInstallation().getId());
        
        // Check if simulation mode is enabled
        if (properties.isSimulationMode()) {
            return simulateTransmission(command);
        }
        
        // Check device reachability first
        Long installationId = command.getInstallation().getId();
        if (!isDeviceReachable(installationId)) {
            log.warn("Device for installation {} is not reachable. Skipping transmission.", installationId);
            return false;
        }
        
        String endpoint = getDeviceEndpoint(installationId);
        if (endpoint == null) {
            log.error("No endpoint configured for installation {}", installationId);
            return false;
        }
        
        try {
            // Build request payload
            Map<String, Object> payload = buildCommandPayload(command);
            
            // Send command with retry logic
            return transmitWithRetry(endpoint, payload, command.getCorrelationId());
            
        } catch (Exception e) {
            log.error("Failed to transmit command {} to installation {}: {}", 
                    command.getCommand(), installationId, e.getMessage(), e);
            return false;
        }
    }
    
    @Override
    public boolean isDeviceReachable(Long installationId) {
        // Check if we have a recent heartbeat for this device
        LocalDateTime lastHeartbeat = deviceHeartbeats.get(installationId);
        
        if (lastHeartbeat == null) {
            log.warn("No heartbeat recorded for installation {} - device not reachable", installationId);
            // In simulation mode, assume device is reachable
            return properties.isSimulationMode();
        }
        
        LocalDateTime cutoff = LocalDateTime.now().minusSeconds(properties.getHeartbeatValiditySeconds());
        boolean reachable = lastHeartbeat.isAfter(cutoff);
        
        log.info("Installation {} reachability check: {} (last heartbeat: {}, cutoff: {})", 
                installationId, reachable, lastHeartbeat, cutoff);
        
        return reachable;
    }
    
    @Override
    public String getDeviceEndpoint(Long installationId) {
        // In production, this would look up device-specific endpoint from configuration or database
        // For now, we use a template-based approach
        String path = properties.getCommandPath().replace("{installationId}", installationId.toString());
        return properties.getBaseUrl() + path;
    }
    
    /**
     * Simulates command transmission for testing/development.
     * Returns success without actually making HTTP call.
     */
    private boolean simulateTransmission(DeviceCommand command) {
        log.info("SIMULATION MODE: Pretending to send command {} to installation {}", 
                command.getCommand(), command.getInstallation().getId());
        
        // Simulate network delay
        try {
            Thread.sleep(100);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        
        // Simulate 90% success rate
        boolean success = Math.random() > 0.1;
        
        log.info("SIMULATION MODE: Command transmission {}", success ? "SUCCESS" : "FAILED");
        return success;
    }
    
    /**
     * Builds the HTTP request payload for a command.
     */
    private Map<String, Object> buildCommandPayload(DeviceCommand command) throws Exception {
        Map<String, Object> payload = new HashMap<>();
        
        payload.put("command_id", command.getId());
        payload.put("correlation_id", command.getCorrelationId());
        payload.put("command_type", command.getCommand());
        payload.put("timestamp", LocalDateTime.now().toString());
        payload.put("initiated_by", command.getInitiatedBy());
        
        // Parse and include command parameters
        if (command.getParameters() != null && !command.getParameters().isEmpty()) {
            @SuppressWarnings("unchecked")
            Map<String, Object> params = objectMapper.readValue(command.getParameters(), Map.class);
            payload.put("parameters", params);
        } else {
            payload.put("parameters", new HashMap<>());
        }
        
        return payload;
    }
    
    /**
     * Transmits command with exponential backoff retry logic.
     */
    private boolean transmitWithRetry(String endpoint, Map<String, Object> payload, String correlationId) {
        int maxAttempts = properties.getMaxRetries();
        long backoffMs = properties.getRetryBackoffMs();
        
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                log.debug("Transmission attempt {}/{} for correlation ID: {}", 
                        attempt, maxAttempts, correlationId);
                
                @SuppressWarnings("rawtypes")
                ResponseEntity<Map> response = restClient
                        .post()
                        .uri(endpoint)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(payload)
                        .retrieve()
                        .toEntity(Map.class);
                
                if (response.getStatusCode().is2xxSuccessful()) {
                    log.info("Command transmitted successfully on attempt {} (correlation: {})", 
                            attempt, correlationId);
                    return true;
                }
                
                log.warn("Command transmission returned non-success status: {} (attempt {}/{})", 
                        response.getStatusCode(), attempt, maxAttempts);
                
            } catch (RestClientException e) {
                log.warn("Command transmission failed on attempt {}/{}: {}", 
                        attempt, maxAttempts, e.getMessage());
                
                // If this is not the last attempt, wait before retrying
                if (attempt < maxAttempts) {
                    try {
                        long waitTime = backoffMs * (long) Math.pow(2, attempt - 1); // Exponential backoff
                        log.debug("Waiting {}ms before retry", waitTime);
                        Thread.sleep(waitTime);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        log.error("Retry backoff interrupted", ie);
                        return false;
                    }
                }
            }
        }
        
        log.error("Command transmission failed after {} attempts for correlation ID: {}", 
                maxAttempts, correlationId);
        return false;
    }
    
    /**
     * Updates the last heartbeat timestamp for a device.
     * Called by external heartbeat mechanism.
     */
    public void updateDeviceHeartbeat(Long installationId) {
        LocalDateTime now = LocalDateTime.now();
        deviceHeartbeats.put(installationId, now);
        log.info("Updated heartbeat for installation {} at {}", installationId, now);
    }
    
    /**
     * Removes heartbeat tracking for a device (e.g., when device is decommissioned).
     */
    public void removeDeviceHeartbeat(Long installationId) {
        deviceHeartbeats.remove(installationId);
        log.debug("Removed heartbeat tracking for installation {}", installationId);
    }
}
