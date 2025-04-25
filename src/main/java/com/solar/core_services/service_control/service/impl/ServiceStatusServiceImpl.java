package com.solar.core_services.service_control.service.impl;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.service_control.dto.ServiceStatusDTO;
import com.solar.core_services.service_control.dto.ServiceStatusUpdateRequest;
import com.solar.core_services.service_control.model.ServiceStatus;
import com.solar.core_services.service_control.repository.ServiceStatusRepository;
import com.solar.core_services.service_control.service.ServiceStatusService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ServiceStatusServiceImpl implements ServiceStatusService {

    private final ServiceStatusRepository serviceStatusRepository;
    private final SolarInstallationRepository installationRepository;

    @Override
    @Transactional(readOnly = true)
    public ServiceStatusDTO getCurrentStatus(Long installationId) {
        log.info("Getting current service status for installation {}", installationId);
        
        ServiceStatus status = serviceStatusRepository.findActiveByInstallationId(installationId)
                .orElseThrow(() -> new RuntimeException("No active service status found for installation: " + installationId));
        
        return ServiceStatusDTO.fromEntity(status);
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
                .orElseThrow(() -> new RuntimeException("Installation not found with ID: " + installationId));
        
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
        newStatus.setScheduledChange(request.getScheduledChange());
        newStatus.setScheduledTime(request.getScheduledTime());
        newStatus.setActive(true);
        
        newStatus = serviceStatusRepository.save(newStatus);
        log.info("Service status updated for installation {}: {}", installationId, newStatus.getStatus());
        
        return ServiceStatusDTO.fromEntity(newStatus);
    }

    @Override
    @Transactional
    public ServiceStatusDTO suspendServiceForPayment(Long installationId, String reason, String username) {
        log.info("Suspending service for payment issues for installation {}", installationId);
        
        ServiceStatusUpdateRequest request = new ServiceStatusUpdateRequest();
        request.setStatus(ServiceStatus.ServiceState.SUSPENDED_PAYMENT);
        request.setStatusReason(reason);
        request.setUpdatedBy(username);
        
        return updateServiceStatus(installationId, request, username);
    }

    @Override
    @Transactional
    public ServiceStatusDTO suspendServiceForSecurity(Long installationId, String reason, String username) {
        log.info("Suspending service for security issues for installation {}", installationId);
        
        ServiceStatusUpdateRequest request = new ServiceStatusUpdateRequest();
        request.setStatus(ServiceStatus.ServiceState.SUSPENDED_SECURITY);
        request.setStatusReason(reason);
        request.setUpdatedBy(username);
        
        return updateServiceStatus(installationId, request, username);
    }

    @Override
    @Transactional
    public ServiceStatusDTO suspendServiceForMaintenance(Long installationId, String reason, String username) {
        log.info("Suspending service for maintenance for installation {}", installationId);
        
        ServiceStatusUpdateRequest request = new ServiceStatusUpdateRequest();
        request.setStatus(ServiceStatus.ServiceState.SUSPENDED_MAINTENANCE);
        request.setStatusReason(reason);
        request.setUpdatedBy(username);
        
        return updateServiceStatus(installationId, request, username);
    }

    @Override
    @Transactional
    public ServiceStatusDTO restoreService(Long installationId, String reason, String username) {
        log.info("Restoring service for installation {}", installationId);
        
        ServiceStatusUpdateRequest request = new ServiceStatusUpdateRequest();
        request.setStatus(ServiceStatus.ServiceState.ACTIVE);
        request.setStatusReason(reason);
        request.setUpdatedBy(username);
        
        return updateServiceStatus(installationId, request, username);
    }

    @Override
    @Transactional
    public ServiceStatusDTO scheduleStatusChange(Long installationId, ServiceStatus.ServiceState targetStatus, 
                                               String reason, String username, LocalDateTime scheduledTime) {
        log.info("Scheduling status change to {} for installation {} at {}", targetStatus, installationId, scheduledTime);
        
        if (scheduledTime.isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Scheduled time must be in the future");
        }
        
        ServiceStatus currentStatus = serviceStatusRepository.findActiveByInstallationId(installationId)
                .orElseThrow(() -> new RuntimeException("No active service status found for installation: " + installationId));
        
        currentStatus.setScheduledChange(targetStatus);
        currentStatus.setScheduledTime(scheduledTime);
        currentStatus.setStatusReason(reason);
        currentStatus.setUpdatedBy(username);
        currentStatus.setUpdatedAt(LocalDateTime.now());
        
        currentStatus = serviceStatusRepository.save(currentStatus);
        log.info("Status change scheduled for installation {}: {} at {}", 
                installationId, targetStatus, scheduledTime);
        
        return ServiceStatusDTO.fromEntity(currentStatus);
    }

    @Override
    @Transactional
    public ServiceStatusDTO cancelScheduledChange(Long installationId, String username) {
        log.info("Cancelling scheduled status change for installation {}", installationId);
        
        ServiceStatus currentStatus = serviceStatusRepository.findActiveByInstallationId(installationId)
                .orElseThrow(() -> new RuntimeException("No active service status found for installation: " + installationId));
        
        if (currentStatus.getScheduledChange() == null) {
            throw new RuntimeException("No scheduled status change found for installation: " + installationId);
        }
        
        currentStatus.setScheduledChange(null);
        currentStatus.setScheduledTime(null);
        currentStatus.setStatusReason("Scheduled change cancelled by " + username);
        currentStatus.setUpdatedBy(username);
        currentStatus.setUpdatedAt(LocalDateTime.now());
        
        currentStatus = serviceStatusRepository.save(currentStatus);
        log.info("Scheduled status change cancelled for installation {}", installationId);
        
        return ServiceStatusDTO.fromEntity(currentStatus);
    }

    @Override
    @Transactional
    public void processScheduledChanges() {
        log.info("Processing scheduled status changes");
        
        List<ServiceStatus> scheduledChanges = serviceStatusRepository
                .findByScheduledChangeIsNotNullAndScheduledTimeBefore(LocalDateTime.now());
        
        log.info("Found {} scheduled changes to process", scheduledChanges.size());
        
        for (ServiceStatus status : scheduledChanges) {
            try {
                ServiceStatusUpdateRequest request = new ServiceStatusUpdateRequest();
                request.setStatus(status.getScheduledChange());
                request.setStatusReason("Scheduled change from " + status.getStatus() + " to " + 
                        status.getScheduledChange() + " at " + status.getScheduledTime());
                request.setUpdatedBy("SYSTEM");
                
                updateServiceStatus(status.getInstallation().getId(), request, "SYSTEM");
                
                log.info("Processed scheduled change for installation {}: {} -> {}", 
                        status.getInstallation().getId(), status.getStatus(), status.getScheduledChange());
            } catch (Exception e) {
                log.error("Error processing scheduled change for installation {}: {}", 
                        status.getInstallation().getId(), e.getMessage());
                // Continue with other scheduled changes even if one fails
            }
        }
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
} 