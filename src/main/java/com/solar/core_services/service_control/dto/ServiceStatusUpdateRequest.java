package com.solar.core_services.service_control.dto;

import com.solar.core_services.service_control.model.ServiceStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ServiceStatusUpdateRequest {
    
    @NotNull(message = "Status is required")
    private ServiceStatus.ServiceState status;
    
    private String statusReason;
    
    private String updatedBy;
} 