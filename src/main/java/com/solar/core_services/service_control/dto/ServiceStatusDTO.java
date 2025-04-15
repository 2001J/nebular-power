package com.solar.core_services.service_control.dto;

import com.solar.core_services.service_control.model.ServiceStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ServiceStatusDTO {
    private Long id;
    private Long installationId;
    private String installationName;
    private ServiceStatus.ServiceState status;
    private LocalDateTime updatedAt;
    private String updatedBy;
    private ServiceStatus.ServiceState scheduledChange;
    private LocalDateTime scheduledTime;
    private String statusReason;
    private boolean active;
    
    /**
     * Convert entity to DTO
     */
    public static ServiceStatusDTO fromEntity(ServiceStatus serviceStatus) {
        if (serviceStatus == null) {
            return null;
        }
        
        return ServiceStatusDTO.builder()
                .id(serviceStatus.getId())
                .installationId(serviceStatus.getInstallation().getId())
                .installationName(serviceStatus.getInstallation().getName())
                .status(serviceStatus.getStatus())
                .updatedAt(serviceStatus.getUpdatedAt())
                .updatedBy(serviceStatus.getUpdatedBy())
                .scheduledChange(serviceStatus.getScheduledChange())
                .scheduledTime(serviceStatus.getScheduledTime())
                .statusReason(serviceStatus.getStatusReason())
                .active(serviceStatus.isActive())
                .build();
    }
} 