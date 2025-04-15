package com.solar.core_services.tampering_detection.dto;

import com.solar.core_services.tampering_detection.model.TamperEvent;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TamperEventUpdateDTO {
    @NotNull(message = "Status is required")
    private TamperEvent.TamperEventStatus status;
    
    private String resolvedBy;
    
    private String resolutionNotes;
} 