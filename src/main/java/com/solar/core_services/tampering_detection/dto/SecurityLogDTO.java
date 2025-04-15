package com.solar.core_services.tampering_detection.dto;

import com.solar.core_services.tampering_detection.model.SecurityLog;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SecurityLogDTO {
    private Long id;
    private Long installationId;
    private String installationLocation;
    private LocalDateTime timestamp;
    private String activityType;
    private String details;
    private String ipAddress;
    private String location;
} 