package com.solar.core_services.service_control.dto;

import com.solar.core_services.service_control.model.OperationalLog;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OperationalLogDTO {
    private Long id;
    private Long installationId;
    private String installationName;
    private LocalDateTime timestamp;
    private OperationalLog.OperationType operation;
    private String initiator;
    private String details;
    private String sourceSystem;
    private String sourceAction;
    private String ipAddress;
    private String userAgent;
    private boolean success;
    private String errorDetails;
    
    /**
     * Convert entity to DTO
     */
    public static OperationalLogDTO fromEntity(OperationalLog operationalLog) {
        if (operationalLog == null) {
            return null;
        }
        
        OperationalLogDTO.OperationalLogDTOBuilder builder = OperationalLogDTO.builder()
                .id(operationalLog.getId())
                .timestamp(operationalLog.getTimestamp())
                .operation(operationalLog.getOperation())
                .initiator(operationalLog.getInitiator())
                .details(operationalLog.getDetails())
                .sourceSystem(operationalLog.getSourceSystem())
                .sourceAction(operationalLog.getSourceAction())
                .ipAddress(operationalLog.getIpAddress())
                .userAgent(operationalLog.getUserAgent())
                .success(operationalLog.isSuccess())
                .errorDetails(operationalLog.getErrorDetails());
        
        // Only set installation fields if installation is not null
        if (operationalLog.getInstallation() != null) {
            builder.installationId(operationalLog.getInstallation().getId())
                    .installationName(operationalLog.getInstallation().getName());
        }
        
        return builder.build();
    }
} 