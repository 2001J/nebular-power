package com.solar.core_services.tampering_detection.dto;

import com.solar.core_services.tampering_detection.model.TamperEvent;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TamperEventDTO {
    private Long id;
    private Long installationId;
    private String installationLocation;
    private TamperEvent.TamperEventType eventType;
    private LocalDateTime timestamp;
    private TamperEvent.TamperSeverity severity;
    private String description;
    private boolean resolved;
    private LocalDateTime resolvedAt;
    private String resolvedBy;
    private double confidenceScore;
    private TamperEvent.TamperEventStatus status;
} 