package com.solar.core_services.service_control.dto;

import com.solar.core_services.service_control.model.ServiceStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ServiceStatusUpdateRequest {
    
    @NotNull(message = "Status is required")
    private ServiceStatus.ServiceState status;
    
    private String statusReason;
    
    private ServiceStatus.ServiceState scheduledChange;
    
    private LocalDateTime scheduledTime;
    
    private String updatedBy;
} 