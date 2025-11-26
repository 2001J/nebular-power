package com.solar.core_services.service_control.service.impl;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.service_control.dto.ServiceStatusDTO;
import com.solar.core_services.service_control.dto.ServiceStatusUpdateRequest;
import com.solar.core_services.service_control.exception.InvalidServiceStateException;
import com.solar.core_services.service_control.exception.ServiceStatusNotFoundException;
import com.solar.core_services.service_control.model.ServiceStatus;
import com.solar.core_services.service_control.repository.ServiceStatusRepository;
import com.solar.core_services.service_control.service.DeviceCommandService;
import com.solar.core_services.service_control.service.ServiceStatusService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ServiceStatusServiceImpl implements ServiceStatusService {

    private final ServiceStatusRepository serviceStatusRepository;
    private final SolarInstallationRepository installationRepository;
    private final DeviceCommandService deviceCommandService;

    @Override
    @Transactional
    public ServiceStatusDTO getCurrentStatus(Long installationId) {
        log.info("Getting current service status for installation {}", installationId);
        
        try {
            // Try to find existing active status
            ServiceStatus status = serviceStatusRepository.findActiveByInstallationId(installationId)
                    .orElseThrow(() -> new ServiceStatusNotFoundException("No active service status found for installation: " + installationId));
            
            return ServiceStatusDTO.fromEntity(status);
        } catch (ServiceStatusNotFoundException e) {
            log.warn("Service status not found for installation {}: {}", installationId, e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("Error getting current status for installation {}: {}", installationId, e.getMessage());
            throw new IllegalStateException("Error retrieving current status: " + e.getMessage(), e);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ServiceStatusDTO> getStatusHistory(Long installationId, Pageable pageable) {
        log.info("Getting service status history for installation {}", installationId);
        
        Page<ServiceStatus> statusHistory = serviceStatusRepository.findByInstallationIdOrderByUpdatedAtDesc(installationId, pageable);
        return statusHistory.map(ServiceStatusDTO::fromEntity);
    }

    @Override
    @Transactional
    public ServiceStatusDTO updateServiceStatus(Long installationId, ServiceStatusUpdateRequest request, String username) {
        log.info("Updating service status for installation {} to {}", installationId, request.getStatus());
        
    SolarInstallation installation = installationRepository.findById(installationId)
        .orElseThrow(() -> new ServiceStatusNotFoundException("Installation not found with ID: " + installationId));
        
        // Deactivate current status
    ServiceStatus currentStatus = serviceStatusRepository.findActiveByInstallationId(installationId)
        .orElse(null);
        
        if (currentStatus != null) {
            currentStatus.setActive(false);
            serviceStatusRepository.save(currentStatus);
        }
        
        // Create new status
        ServiceStatus newStatus = new ServiceStatus();
        newStatus.setInstallation(installation);
        newStatus.setStatus(request.getStatus());
        newStatus.setStatusReason(request.getStatusReason());
        newStatus.setUpdatedBy(username != null ? username : request.getUpdatedBy());
        newStatus.setActive(true);
        
        newStatus = serviceStatusRepository.save(newStatus);
        log.info("Service status updated for installation {}: {}", installationId, newStatus.getStatus());
        
        return ServiceStatusDTO.fromEntity(newStatus);
    }

    @Override
    @Transactional
    public ServiceStatusDTO suspendServiceForPayment(Long installationId, String reason, String username) {
        log.info("Suspending service for payment issues for installation {}", installationId);
        
        // Validate current status - can only suspend from ACTIVE
        ServiceStatus currentStatus = serviceStatusRepository.findActiveByInstallationId(installationId)
                .orElseThrow(() -> new ServiceStatusNotFoundException("No active service status found for installation: " + installationId));
        
        if (currentStatus.getStatus() != ServiceStatus.ServiceState.ACTIVE) {
            throw new InvalidServiceStateException(
                "Cannot suspend service that is not ACTIVE. Current status: " + currentStatus.getStatus()
            );
        }
        
        ServiceStatusUpdateRequest request = new ServiceStatusUpdateRequest();
        request.setStatus(ServiceStatus.ServiceState.SUSPENDED_PAYMENT);
        request.setStatusReason(reason);
        request.setUpdatedBy(username);
        
        ServiceStatusDTO result = updateServiceStatus(installationId, request, username);
        
        // Send device command to actually suspend the service
        sendSuspendCommand(installationId, reason, "payment", username);
        
        return result;
    }

    @Override
    @Transactional
    public ServiceStatusDTO suspendServiceForSecurity(Long installationId, String reason, String username) {
        log.info("Suspending service for security issues for installation {}", installationId);
        
        // Validate current status - can only suspend from ACTIVE
        ServiceStatus currentStatus = serviceStatusRepository.findActiveByInstallationId(installationId)
                .orElseThrow(() -> new ServiceStatusNotFoundException("No active service status found for installation: " + installationId));
        
        if (currentStatus.getStatus() != ServiceStatus.ServiceState.ACTIVE) {
            throw new InvalidServiceStateException(
                "Cannot suspend service that is not ACTIVE. Current status: " + currentStatus.getStatus()
            );
        }
        
        ServiceStatusUpdateRequest request = new ServiceStatusUpdateRequest();
        request.setStatus(ServiceStatus.ServiceState.SUSPENDED_SECURITY);
        request.setStatusReason(reason);
        request.setUpdatedBy(username);
        
        ServiceStatusDTO result = updateServiceStatus(installationId, request, username);
        
        // Send device command to actually suspend the service
        sendSuspendCommand(installationId, reason, "security", username);
        
        return result;
    }

    @Override
    @Transactional
    public ServiceStatusDTO suspendServiceForMaintenance(Long installationId, String reason, String username) {
        log.info("Suspending service for maintenance for installation {}", installationId);
        
        // Validate current status - can only suspend from ACTIVE
        ServiceStatus currentStatus = serviceStatusRepository.findActiveByInstallationId(installationId)
                .orElseThrow(() -> new ServiceStatusNotFoundException("No active service status found for installation: " + installationId));
        
        if (currentStatus.getStatus() != ServiceStatus.ServiceState.ACTIVE) {
            throw new InvalidServiceStateException(
                "Cannot suspend service that is not ACTIVE. Current status: " + currentStatus.getStatus()
            );
        }
        
        ServiceStatusUpdateRequest request = new ServiceStatusUpdateRequest();
        request.setStatus(ServiceStatus.ServiceState.SUSPENDED_MAINTENANCE);
        request.setStatusReason(reason);
        request.setUpdatedBy(username);
        
        ServiceStatusDTO result = updateServiceStatus(installationId, request, username);
        
        // Send device command to actually suspend the service
        sendSuspendCommand(installationId, reason, "maintenance", username);
        
        // Also send ENABLE_MAINTENANCE_MODE device command
        sendEnableMaintenanceModeCommand(installationId, username);
        
        return result;
    }

    @Override
    @Transactional
    public ServiceStatusDTO restoreService(Long installationId, String reason, String username) {
        log.info("Restoring service for installation {} by {}", installationId, username);
        
        // Validate current status - can only restore from suspended states
        ServiceStatus currentStatus = serviceStatusRepository.findActiveByInstallationId(installationId)
                .orElseThrow(() -> new ServiceStatusNotFoundException("No active service status found for installation: " + installationId));
        
        if (!currentStatus.getStatus().name().startsWith("SUSPENDED_")) {
            throw new InvalidServiceStateException(
                "Cannot restore service that is not SUSPENDED. Current status: " + currentStatus.getStatus()
            );
        }
        
        // Check if restoring from maintenance - if so, send DISABLE_MAINTENANCE_MODE command
        boolean wasMaintenanceMode = currentStatus.getStatus() == ServiceStatus.ServiceState.SUSPENDED_MAINTENANCE;
        
        // Update status to ACTIVE immediately
        ServiceStatusUpdateRequest restoreRequest = new ServiceStatusUpdateRequest();
        restoreRequest.setStatus(ServiceStatus.ServiceState.ACTIVE);
        restoreRequest.setStatusReason("Restoration requested by " + username + ": " + reason);
        restoreRequest.setUpdatedBy(username);
        
        ServiceStatusDTO result = updateServiceStatus(installationId, restoreRequest, username);
        
        // Send device command to restore the service
        sendRestoreCommand(installationId, reason, username);
        
        // If restoring from maintenance, also send DISABLE_MAINTENANCE_MODE command
        if (wasMaintenanceMode) {
            sendDisableMaintenanceModeCommand(installationId, username);
        }
        
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ServiceStatusDTO> getStatusesByUserId(Long userId) {
        log.info("Getting service statuses for user {}", userId);
        
        List<ServiceStatus> statuses = serviceStatusRepository.findActiveByUserId(userId);
        
        return statuses.stream()
                .map(ServiceStatusDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ServiceStatusDTO> getInstallationsByStatus(ServiceStatus.ServiceState status, Pageable pageable) {
        log.info("Getting installations with status {}", status);
        
        Page<ServiceStatus> statuses = serviceStatusRepository.findByStatusAndActiveTrue(status, pageable);
        return statuses.map(ServiceStatusDTO::fromEntity);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ServiceStatusDTO> getBatchStatuses(List<Long> installationIds) {
        log.info("Getting service statuses for {} installations in batch", installationIds.size());

        if (installationIds == null || installationIds.isEmpty()) {
            return List.of();
        }

        List<ServiceStatusDTO> results = new ArrayList<>();

        for (Long installationId : installationIds) {
            try {
                ServiceStatus status = serviceStatusRepository.findActiveByInstallationId(installationId)
                    .orElse(null);
                
                if (status != null) {
                    results.add(ServiceStatusDTO.fromEntity(status));
                } else {
                    // If no status is found, get the installation to include basic details
                    SolarInstallation installation = installationRepository.findById(installationId).orElse(null);
                    
                    if (installation != null) {
                        // Create a default pending status
                        ServiceStatusDTO defaultStatus = new ServiceStatusDTO();
                        defaultStatus.setInstallationId(installationId);
                        defaultStatus.setInstallationName(installation.getName());
                        defaultStatus.setStatus(ServiceStatus.ServiceState.PENDING);
                        defaultStatus.setStatusReason("No active status record");
                        defaultStatus.setUpdatedAt(LocalDateTime.now());
                        defaultStatus.setUpdatedBy("SYSTEM");
                        defaultStatus.setActive(true);
                        
                        results.add(defaultStatus);
                    }
                }
            } catch (Exception e) {
                log.error("Error fetching status for installation {}: {}", installationId, e.getMessage());
                // Skip failed installations but continue processing others
            }
        }

        return results;
    }

    /**
     * @deprecated Device must report its own status when it starts. Admin cannot "start" a device.
     * Wait for device to come online and report its status.
     */
    @Deprecated(since = "2.0", forRemoval = true)
    @Override
    @Transactional
    public ServiceStatusDTO startService(Long installationId, String username) {
        throw new UnsupportedOperationException(
            "Direct start is not supported. Device must report its own status when it starts. " +
            "Wait for device to come online."
        );
    }

    /**
     * @deprecated Use suspendService() instead. Stopping requires a suspension reason.
     */
    @Deprecated(since = "2.0", forRemoval = true)
    @Override
    @Transactional
    public ServiceStatusDTO stopService(Long installationId, String username) {
        throw new UnsupportedOperationException(
            "Direct stop is not supported. Use suspendService() to suspend with a specific reason " +
            "(PAYMENT, SECURITY, or MAINTENANCE)."
        );
    }

    @Override
    @Transactional
    public ServiceStatusDTO restartService(Long installationId, String username) {
        log.info("Restarting service for installation {} by {}", installationId, username);
        
        // Set status to TRANSITIONING
        ServiceStatusUpdateRequest stopRequest = new ServiceStatusUpdateRequest();
        stopRequest.setStatus(ServiceStatus.ServiceState.TRANSITIONING);
        stopRequest.setStatusReason("Service restart requested by " + username);
        stopRequest.setUpdatedBy(username);
        
        ServiceStatusDTO stoppedStatus = updateServiceStatus(installationId, stopRequest, username);
        
        // Send restart command to device - device will report back when restart is complete
        sendRestartCommand(installationId, "Admin restart requested", username);
        
        // Note: Device should report its status as ACTIVE once restart completes
        // No need to schedule restoration - let the device tell us when it's ready
        
        return stoppedStatus;
    }

    @Override
    @Transactional
    public void processDeviceStatusReport(com.solar.core_services.service_control.dto.DeviceStatusReportDTO statusReport) {
        Long installationId = statusReport.getInstallationId();
        
        log.info("Processing device status report for installation {}: status={}, reason={}", 
                installationId, 
                statusReport.getStatus(), 
                statusReport.getReason());
        
        // Get the installation entity
        com.solar.core_services.energy_monitoring.model.SolarInstallation installation = 
            installationRepository.findById(installationId)
                .orElseThrow(() -> new ServiceStatusNotFoundException("Installation not found: " + installationId));
        
        // Get current service status
        ServiceStatus currentStatus = serviceStatusRepository.findByInstallationAndActiveTrue(installation)
            .orElseGet(() -> {
                // Create new status if it doesn't exist
                log.info("Creating new service status for installation {}", installationId);
                ServiceStatus newStatus = new ServiceStatus();
                newStatus.setInstallation(installation);
                newStatus.setStatus(ServiceStatus.ServiceState.PENDING);
                newStatus.setUpdatedBy("DEVICE");
                newStatus.setActive(true);
                return newStatus;
            });
        
        // Parse the reported status
        ServiceStatus.ServiceState reportedState;
        try {
            reportedState = ServiceStatus.ServiceState.valueOf(statusReport.getStatus());
        } catch (IllegalArgumentException e) {
            log.error("Invalid status reported by device: {}", statusReport.getStatus());
            throw new IllegalArgumentException("Invalid service status: " + statusReport.getStatus());
        }
        
        // Update the status if it has changed
        boolean statusChanged = currentStatus.getStatus() != reportedState;
        
        if (statusChanged) {
            log.info("Device reported status change for installation {}: {} -> {}", 
                    installationId, 
                    currentStatus.getStatus(), 
                    reportedState);
            
            // Update status
            currentStatus.setStatus(reportedState);
            currentStatus.setStatusReason(statusReport.getReason());
            currentStatus.setUpdatedBy("DEVICE");
            
            // Save the updated status
            serviceStatusRepository.save(currentStatus);
            
            log.info("Successfully updated service status from device report for installation {}", 
                    installationId);
        } else {
            log.debug("Device status report matches current status for installation {}: {}", 
                     installationId, 
                     reportedState);
            
            // Touch the record to update the timestamp
            currentStatus.setUpdatedBy("DEVICE");
            serviceStatusRepository.save(currentStatus);
        }
        
        // Store device health information if provided
        if (statusReport.getDeviceHealth() != null && !statusReport.getDeviceHealth().isEmpty()) {
            log.debug("Received device health data for installation {}: {}", 
                     installationId, 
                     statusReport.getDeviceHealth());
            // In a real implementation, you might want to store this in a separate table
            // or use it for monitoring/alerting purposes
        }
    }
    
    /**
     * Send SUSPEND_SERVICE command to device
     */
    private void sendSuspendCommand(Long installationId, String reason, String type, String username) {
        Map<String, Object> parameters = new HashMap<>();
        parameters.put("reason", reason);
        parameters.put("type", type);
        parameters.put("requestedBy", username);
        
        try {
            deviceCommandService.sendCommand(
                installationId,
                "SUSPEND_SERVICE",
                parameters,
                username != null ? username : "SYSTEM"
            );
            log.info("Sent SUSPEND_SERVICE command to installation {} (type: {})", installationId, type);
        } catch (Exception e) {
            log.error("Failed to send SUSPEND_SERVICE command to installation {}: {}", 
                     installationId, e.getMessage(), e);
            // Don't throw - database is already updated
        }
    }
    
    /**
     * Send RESTORE_SERVICE command to device
     */
    private void sendRestoreCommand(Long installationId, String reason, String username) {
        Map<String, Object> parameters = new HashMap<>();
        parameters.put("reason", reason);
        parameters.put("requestedBy", username);
        
        try {
            deviceCommandService.sendCommand(
                installationId,
                "RESTORE_SERVICE",
                parameters,
                username != null ? username : "SYSTEM"
            );
            log.info("Sent RESTORE_SERVICE command to installation {}", installationId);
        } catch (Exception e) {
            log.error("Failed to send RESTORE_SERVICE command to installation {}: {}", 
                     installationId, e.getMessage(), e);
            // Don't throw - database is already updated
        }
    }
    
    /**
     * Send RESTART_SERVICE command to device
     */
    private void sendRestartCommand(Long installationId, String reason, String username) {
        Map<String, Object> parameters = new HashMap<>();
        parameters.put("reason", reason);
        parameters.put("requestedBy", username);
        
        try {
            deviceCommandService.sendCommand(
                installationId,
                "RESTART_SERVICE",
                parameters,
                username != null ? username : "SYSTEM"
            );
            log.info("Sent RESTART_SERVICE command to installation {}", installationId);
        } catch (Exception e) {
            log.error("Failed to send RESTART_SERVICE command to installation {}: {}", 
                     installationId, e.getMessage(), e);
            // Don't throw - database is already updated
        }
    }
    
    /**
     * Send ENABLE_MAINTENANCE_MODE command to device when suspending for maintenance
     */
    private void sendEnableMaintenanceModeCommand(Long installationId, String username) {
        Map<String, Object> parameters = new HashMap<>();
        parameters.put("requestedBy", username);
        // Could add duration_hours if needed in the future
        
        try {
            deviceCommandService.sendCommand(
                installationId,
                "ENABLE_MAINTENANCE_MODE",
                parameters,
                username != null ? username : "SYSTEM"
            );
            log.info("Sent ENABLE_MAINTENANCE_MODE command to installation {}", installationId);
        } catch (Exception e) {
            log.error("Failed to send ENABLE_MAINTENANCE_MODE command to installation {}: {}", 
                     installationId, e.getMessage(), e);
            // Don't throw - database is already updated
        }
    }
    
    /**
     * Send DISABLE_MAINTENANCE_MODE command to device when restoring from maintenance
     */
    private void sendDisableMaintenanceModeCommand(Long installationId, String username) {
        Map<String, Object> parameters = new HashMap<>();
        parameters.put("requestedBy", username);
        
        try {
            deviceCommandService.sendCommand(
                installationId,
                "DISABLE_MAINTENANCE_MODE",
                parameters,
                username != null ? username : "SYSTEM"
            );
            log.info("Sent DISABLE_MAINTENANCE_MODE command to installation {}", installationId);
        } catch (Exception e) {
            log.error("Failed to send DISABLE_MAINTENANCE_MODE command to installation {}: {}", 
                     installationId, e.getMessage(), e);
            // Don't throw - database is already updated
        }
    }
} 