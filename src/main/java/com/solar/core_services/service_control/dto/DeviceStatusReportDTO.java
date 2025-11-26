package com.solar.core_services.service_control.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Data Transfer Object for device status reports from Pi devices.
 * This is used when the device reports its current status back to the backend.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeviceStatusReportDTO {
    
    /**
     * The ID of the installation reporting its status.
     */
    @NotNull(message = "Installation ID is required")
    private Long installationId;
    
    /**
     * The current status of the service on the device.
     * Valid values: PENDING, ACTIVE, SUSPENDED_PAYMENT, SUSPENDED_SECURITY, SUSPENDED_MAINTENANCE, TRANSITIONING
     */
    @NotBlank(message = "Status is required")
    private String status;
    
    /**
     * The reason for the current status.
     */
    private String reason;
    
    /**
     * The timestamp when this status was recorded on the device.
     */
    @NotNull(message = "Timestamp is required")
    private LocalDateTime timestamp;
    
    /**
     * The ID of the last command that was executed by the device.
     * This helps correlate device status with backend commands.
     */
    private Long lastCommandId;
    
    /**
     * Device health information (optional).
     * May include metrics like CPU usage, memory, temperature, etc.
     */
    private Map<String, Object> deviceHealth;
    
    /**
     * The version of the device software/firmware.
     */
    private String deviceVersion;
    
    /**
     * Additional metadata about the device or status.
     */
    private Map<String, Object> metadata;
}
