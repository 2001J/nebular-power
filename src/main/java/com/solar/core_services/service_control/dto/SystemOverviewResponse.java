package com.solar.core_services.service_control.dto;

import com.solar.core_services.service_control.model.ServiceStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * DTO for system overview response
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SystemOverviewResponse {
    
    /**
     * Timestamp when the overview was generated
     */
    private LocalDateTime timestamp;
    
    /**
     * Total number of installations in the system
     */
    private int totalInstallations;
    
    /**
     * Number of active installations
     */
    private Long activeInstallations;
    
    /**
     * Number of suspended installations
     */
    private Long suspendedInstallations;
    
    /**
     * Number of installations in maintenance mode
     */
    private Long maintenanceInstallations;
    
    /**
     * Number of installations in transitioning state
     */
    private Long transitioningInstallations;
    
    /**
     * Recent status changes
     */
    private List<ServiceStatusDTO> recentStatusChanges;
    
    /**
     * Recent control actions
     */
    private List<ControlActionDTO> recentActions;
    
    /**
     * Command status counts
     */
    private Map<String, Long> commandStatusCounts;
    
    /**
     * Action type counts
     */
    private Map<String, Long> actionTypeCounts;
    
    /**
     * Operation type counts
     */
    private Map<String, Long> operationTypeCounts;
    
    /**
     * Number of pending commands
     */
    private Long pendingCommands;
    
    /**
     * Number of failed commands
     */
    private Long failedCommands;
    
    /**
     * Number of scheduled changes
     */
    private Long scheduledChanges;
    
    /**
     * Total number of devices in the system
     */
    private int totalDevices;
    
    /**
     * Number of active alerts in the system
     */
    private int activeAlerts;
    
    /**
     * Map of installation counts by service status
     * Key: Service status (e.g., ACTIVE, SUSPENDED_PAYMENT)
     * Value: Count of installations with that status
     */
    private Map<ServiceStatus.ServiceState, Long> statusCounts;
    
    /**
     * Map of installation counts by status
     * Key: Status name (e.g., "ACTIVE", "SUSPENDED")
     * Value: Count of installations with that status
     */
    private Map<String, Long> installationsByStatus;
    
    /**
     * Map of device counts by status
     * Key: Status name (e.g., "ACTIVE", "INACTIVE", "LOW_BATTERY")
     * Value: Count of devices with that status
     */
    private Map<String, Integer> devicesByStatus;
} 