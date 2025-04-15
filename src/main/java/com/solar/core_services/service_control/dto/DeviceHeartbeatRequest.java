package com.solar.core_services.service_control.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeviceHeartbeatRequest {
    
    @NotNull(message = "Installation ID is required")
    private Long installationId;
    
    @NotNull(message = "Device ID is required")
    private String deviceId;
    
    @NotNull(message = "Timestamp is required")
    private LocalDateTime timestamp;
    
    private String status;
    
    private Double batteryLevel;
    
    private Boolean powerStatus;
    
    private String firmwareVersion;
    
    private String connectionType;
    
    private Integer signalStrength;
    
    private Map<String, Object> metrics;
    
    private Map<String, Object> diagnostics;
} 