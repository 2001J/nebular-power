package com.solar.core_services.service_control.dto;

import com.solar.core_services.service_control.model.DeviceCommand;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeviceCommandDTO {
    private Long id;
    private Long installationId;
    private String installationName;
    private String command;
    private String parameters;
    private DeviceCommand.CommandStatus status;
    private LocalDateTime sentAt;
    private LocalDateTime processedAt;
    private LocalDateTime expiresAt;
    private String responseMessage;
    private String initiatedBy;
    private Integer retryCount;
    private LocalDateTime lastRetryAt;
    private String correlationId;
    
    /**
     * Convert entity to DTO
     */
    public static DeviceCommandDTO fromEntity(DeviceCommand deviceCommand) {
        if (deviceCommand == null) {
            return null;
        }
        
        return DeviceCommandDTO.builder()
                .id(deviceCommand.getId())
                .installationId(deviceCommand.getInstallation().getId())
                .installationName(deviceCommand.getInstallation().getName())
                .command(deviceCommand.getCommand())
                .parameters(deviceCommand.getParameters())
                .status(deviceCommand.getStatus())
                .sentAt(deviceCommand.getSentAt())
                .processedAt(deviceCommand.getProcessedAt())
                .expiresAt(deviceCommand.getExpiresAt())
                .responseMessage(deviceCommand.getResponseMessage())
                .initiatedBy(deviceCommand.getInitiatedBy())
                .retryCount(deviceCommand.getRetryCount())
                .lastRetryAt(deviceCommand.getLastRetryAt())
                .correlationId(deviceCommand.getCorrelationId())
                .build();
    }
} 