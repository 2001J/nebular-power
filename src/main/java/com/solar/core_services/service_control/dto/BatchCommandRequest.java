package com.solar.core_services.service_control.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchCommandRequest {
    
    @NotEmpty(message = "Installation IDs are required")
    private List<Long> installationIds;
    
    @NotBlank(message = "Command is required")
    private String command;
    
    private Map<String, Object> parameters;
    
    private LocalDateTime expiresAt;
    
    private String initiatedBy;
    
    @NotNull(message = "Confirmation is required")
    private Boolean confirmation;
} 