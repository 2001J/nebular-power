package com.solar.core_services.tampering_detection.dto;

import com.solar.core_services.tampering_detection.model.TamperResponse;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TamperResponseDTO {
    private Long id;
    private Long tamperEventId;
    private TamperResponse.ResponseType responseType;
    private LocalDateTime executedAt;
    private boolean success;
    private String failureReason;
    private String executedBy;
    private String responseDetails;
} 