package com.solar.core_services.tampering_detection.dto;

import com.solar.core_services.tampering_detection.model.AlertConfig;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AlertConfigUpdateDTO {
    @NotNull(message = "Alert level is required")
    private AlertConfig.AlertLevel alertLevel;
    
    @NotNull(message = "Notification channels are required")
    private Set<AlertConfig.NotificationChannel> notificationChannels;
    
    @NotNull(message = "Auto response enabled flag is required")
    private Boolean autoResponseEnabled;
    
    @NotNull(message = "Physical movement threshold is required")
    @Min(value = 0, message = "Physical movement threshold must be at least 0")
    @Max(value = 1, message = "Physical movement threshold must be at most 1")
    private Double physicalMovementThreshold;
    
    @NotNull(message = "Voltage fluctuation threshold is required")
    @Min(value = 0, message = "Voltage fluctuation threshold must be at least 0")
    @Max(value = 1, message = "Voltage fluctuation threshold must be at most 1")
    private Double voltageFluctuationThreshold;
    
    @NotNull(message = "Connection interruption threshold is required")
    @Min(value = 0, message = "Connection interruption threshold must be at least 0")
    @Max(value = 1, message = "Connection interruption threshold must be at most 1")
    private Double connectionInterruptionThreshold;
    
    @NotNull(message = "Sampling rate is required")
    @Min(value = 10, message = "Sampling rate must be at least 10 seconds")
    @Max(value = 3600, message = "Sampling rate must be at most 3600 seconds (1 hour)")
    private Integer samplingRateSeconds;
} 