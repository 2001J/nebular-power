package com.solar.core_services.service_control.repository;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.service_control.model.OperationalLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface OperationalLogRepository extends JpaRepository<OperationalLog, Long> {
    
    /**
     * Find all logs for an installation
     */
    List<OperationalLog> findByInstallationOrderByTimestampDesc(SolarInstallation installation);
    
    /**
     * Find all logs for an installation with pagination
     */
    Page<OperationalLog> findByInstallationOrderByTimestampDesc(SolarInstallation installation, Pageable pageable);
    
    /**
     * Find all logs for an installation by ID with pagination
     */
    @Query("SELECT o FROM OperationalLog o WHERE o.installation.id = :installationId ORDER BY o.timestamp DESC")
    Page<OperationalLog> findByInstallationIdOrderByTimestampDesc(Long installationId, Pageable pageable);
    
    /**
     * Find all logs by operation type
     */
    Page<OperationalLog> findByOperationOrderByTimestampDesc(OperationalLog.OperationType operation, Pageable pageable);
    
    /**
     * Find all logs by initiator
     */
    Page<OperationalLog> findByInitiatorOrderByTimestampDesc(String initiator, Pageable pageable);
    
    /**
     * Find all logs within a time range
     */
    List<OperationalLog> findByTimestampBetweenOrderByTimestampDesc(LocalDateTime start, LocalDateTime end);
    
    /**
     * Find all logs for installations owned by a user
     */
    @Query("SELECT o FROM OperationalLog o WHERE o.installation.user.id = :userId ORDER BY o.timestamp DESC")
    List<OperationalLog> findByUserIdOrderByTimestampDesc(Long userId);
    
    /**
     * Find all logs by source system
     */
    List<OperationalLog> findBySourceSystemOrderByTimestampDesc(String sourceSystem);
    
    /**
     * Find all logs by operation type and installation
     */
    Page<OperationalLog> findByInstallationAndOperationOrderByTimestampDesc(
            SolarInstallation installation, 
            OperationalLog.OperationType operation, 
            Pageable pageable);
    
    /**
     * Find all logs by operation type and installation ID
     */
    @Query("SELECT o FROM OperationalLog o WHERE o.installation.id = :installationId AND o.operation = :operation ORDER BY o.timestamp DESC")
    Page<OperationalLog> findByInstallationIdAndOperationOrderByTimestampDesc(
            Long installationId, 
            OperationalLog.OperationType operation, 
            Pageable pageable);
    
    /**
     * Count logs by operation type
     */
    @Query("SELECT o.operation, COUNT(o) FROM OperationalLog o GROUP BY o.operation")
    List<Object[]> countByOperation();
    
    /**
     * Count logs by success
     */
    @Query("SELECT o.success, COUNT(o) FROM OperationalLog o GROUP BY o.success")
    List<Object[]> countBySuccess();
} 