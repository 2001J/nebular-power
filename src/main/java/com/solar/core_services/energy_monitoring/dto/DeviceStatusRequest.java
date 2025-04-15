package com.solar.core_services.energy_monitoring.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeviceStatusRequest {
    @NotNull(message = "Installation ID is required")
    private Long installationId;
    
    @NotNull(message = "Device authentication token is required")
    private String deviceToken;
    
    @Positive(message = "Battery level must be positive")
    private double batteryLevel;
    
    private boolean tamperDetected;
    
    private String firmwareVersion;
    
    private String connectionStatus;
    
    private String errorCode;
    
    private String errorMessage;
} 