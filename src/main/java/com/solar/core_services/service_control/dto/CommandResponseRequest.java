package com.solar.core_services.service_control.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommandResponseRequest {
    
    @NotBlank(message = "Correlation ID is required")
    private String correlationId;
    
    @NotNull(message = "Installation ID is required")
    private Long installationId;
    
    @NotNull(message = "Timestamp is required")
    private LocalDateTime timestamp;
    
    @NotNull(message = "Success status is required")
    private Boolean success;
    
    private String message;
    
    private String errorCode;
    
    private String errorDetails;
    
    private Map<String, Object> result;
} 