package com.solar.core_services.service_control.repository;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.service_control.model.DeviceCommand;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface DeviceCommandRepository extends JpaRepository<DeviceCommand, Long> {
    
    /**
     * Find all commands for an installation
     */
    List<DeviceCommand> findByInstallationOrderBySentAtDesc(SolarInstallation installation);
    
    /**
     * Find all commands for an installation with pagination
     */
    Page<DeviceCommand> findByInstallationOrderBySentAtDesc(SolarInstallation installation, Pageable pageable);
    
    /**
     * Find all commands for an installation by ID with pagination
     */
    @Query("SELECT d FROM DeviceCommand d WHERE d.installation.id = :installationId ORDER BY d.sentAt DESC")
    Page<DeviceCommand> findByInstallationIdOrderBySentAtDesc(Long installationId, Pageable pageable);
    
    /**
     * Find all commands by status
     */
    List<DeviceCommand> findByStatusOrderBySentAtDesc(DeviceCommand.CommandStatus status);
    
    /**
     * Find all commands by status with pagination
     */
    Page<DeviceCommand> findByStatusOrderBySentAtDesc(DeviceCommand.CommandStatus status, Pageable pageable);
    
    /**
     * Find all pending commands for an installation
     */
    List<DeviceCommand> findByInstallationAndStatusInOrderBySentAtAsc(
            SolarInstallation installation, 
            List<DeviceCommand.CommandStatus> statuses);
    
    /**
     * Find all pending commands for an installation by ID
     */
    @Query("SELECT d FROM DeviceCommand d WHERE d.installation.id = :installationId AND d.status IN :statuses ORDER BY d.sentAt ASC")
    List<DeviceCommand> findByInstallationIdAndStatusInOrderBySentAtAsc(
            Long installationId, 
            List<DeviceCommand.CommandStatus> statuses);
    
    /**
     * Find command by correlation ID
     */
    Optional<DeviceCommand> findByCorrelationId(String correlationId);
    
    /**
     * Find expired commands
     */
    List<DeviceCommand> findByStatusInAndExpiresAtBefore(
            List<DeviceCommand.CommandStatus> statuses, 
            LocalDateTime expiryTime);
    
    /**
     * Find commands that need retry
     */
    @Query("SELECT d FROM DeviceCommand d WHERE d.status = 'FAILED' AND d.retryCount < :maxRetries AND d.lastRetryAt < :retryAfter")
    List<DeviceCommand> findCommandsForRetry(int maxRetries, LocalDateTime retryAfter);
    
    /**
     * Count commands by status
     */
    @Query("SELECT d.status, COUNT(d) FROM DeviceCommand d GROUP BY d.status")
    List<Object[]> countByStatus();
} 