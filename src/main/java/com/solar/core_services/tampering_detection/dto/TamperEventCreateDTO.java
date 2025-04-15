package com.solar.core_services.tampering_detection.dto;

import com.solar.core_services.tampering_detection.model.TamperEvent;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TamperEventCreateDTO {
    @NotNull(message = "Installation ID is required")
    @Positive(message = "Installation ID must be positive")
    private Long installationId;
    
    @NotNull(message = "Event type is required")
    private TamperEvent.TamperEventType eventType;
    
    @NotNull(message = "Severity is required")
    private TamperEvent.TamperSeverity severity;
    
    @NotNull(message = "Description is required")
    @Size(min = 10, max = 500, message = "Description must be between 10 and 500 characters")
    private String description;
    
    @NotNull(message = "Confidence score is required")
    private Double confidenceScore;
    
    private String rawSensorData;
} 