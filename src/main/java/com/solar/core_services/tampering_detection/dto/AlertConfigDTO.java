package com.solar.core_services.tampering_detection.dto;

import com.solar.core_services.tampering_detection.model.AlertConfig;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AlertConfigDTO {
    private Long id;
    private Long installationId;
    private String alertLevel;
    private Set<AlertConfig.NotificationChannel> notificationChannels;
    private boolean autoResponseEnabled;
    private double physicalMovementThreshold;
    private double voltageFluctuationThreshold;
    private double connectionInterruptionThreshold;
    private int samplingRateSeconds;
    private LocalDateTime updatedAt;
} 