package com.solar.core_services.service_control.service;

import com.solar.core_services.service_control.dto.ServiceStatusDTO;
import com.solar.core_services.service_control.dto.ServiceStatusUpdateRequest;
import com.solar.core_services.service_control.model.ServiceStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface ServiceStatusService {
    
    /**
     * Get the current service status for an installation
     */
    ServiceStatusDTO getCurrentStatus(Long installationId);
    
    /**
     * Get service status history for an installation
     */
    Page<ServiceStatusDTO> getStatusHistory(Long installationId, Pageable pageable);
    
    /**
     * Update service status for an installation
     */
    ServiceStatusDTO updateServiceStatus(Long installationId, ServiceStatusUpdateRequest request, String username);
    
    /**
     * Suspend service for an installation due to payment issues
     */
    ServiceStatusDTO suspendServiceForPayment(Long installationId, String reason, String username);
    
    /**
     * Suspend service for an installation due to security issues
     */
    ServiceStatusDTO suspendServiceForSecurity(Long installationId, String reason, String username);
    
    /**
     * Suspend service for an installation for maintenance
     */
    ServiceStatusDTO suspendServiceForMaintenance(Long installationId, String reason, String username);
    
    /**
     * Restore service for an installation
     */
    ServiceStatusDTO restoreService(Long installationId, String reason, String username);
    
    /**
     * Schedule a service status change
     */
    ServiceStatusDTO scheduleStatusChange(Long installationId, ServiceStatus.ServiceState targetStatus, 
                                         String reason, String username, java.time.LocalDateTime scheduledTime);
    
    /**
     * Cancel a scheduled service status change
     */
    ServiceStatusDTO cancelScheduledChange(Long installationId, String username);
    
    /**
     * Process all scheduled service status changes that are due
     */
    void processScheduledChanges();
    
    /**
     * Get all service statuses for installations owned by a user
     */
    List<ServiceStatusDTO> getStatusesByUserId(Long userId);
    
    /**
     * Get all installations with a specific status
     */
    Page<ServiceStatusDTO> getInstallationsByStatus(ServiceStatus.ServiceState status, Pageable pageable);
} 