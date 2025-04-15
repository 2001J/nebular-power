package com.solar.core_services.service_control.repository;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.service_control.model.ServiceStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ServiceStatusRepository extends JpaRepository<ServiceStatus, Long> {
    
    /**
     * Find the current active service status for an installation
     */
    Optional<ServiceStatus> findByInstallationAndActiveTrue(SolarInstallation installation);
    
    /**
     * Find the current active service status for an installation by ID
     */
    @Query("SELECT s FROM ServiceStatus s WHERE s.installation.id = :installationId AND s.active = true")
    Optional<ServiceStatus> findActiveByInstallationId(Long installationId);
    
    /**
     * Find all service status records for an installation
     */
    List<ServiceStatus> findByInstallationOrderByUpdatedAtDesc(SolarInstallation installation);
    
    /**
     * Find all service status records for an installation with pagination
     */
    Page<ServiceStatus> findByInstallationOrderByUpdatedAtDesc(SolarInstallation installation, Pageable pageable);
    
    /**
     * Find all service status records for an installation by ID with pagination
     */
    @Query("SELECT s FROM ServiceStatus s WHERE s.installation.id = :installationId ORDER BY s.updatedAt DESC")
    Page<ServiceStatus> findByInstallationIdOrderByUpdatedAtDesc(Long installationId, Pageable pageable);
    
    /**
     * Find all service status records by status
     */
    Page<ServiceStatus> findByStatusAndActiveTrue(ServiceStatus.ServiceState status, Pageable pageable);
    
    /**
     * Find all service status records with scheduled changes
     */
    List<ServiceStatus> findByScheduledChangeIsNotNullAndScheduledTimeBefore(LocalDateTime time);
    
    /**
     * Find all service status records for installations owned by a user
     */
    @Query("SELECT s FROM ServiceStatus s WHERE s.installation.user.id = :userId AND s.active = true")
    List<ServiceStatus> findActiveByUserId(Long userId);
    
    /**
     * Count installations by service status
     */
    @Query("SELECT s.status, COUNT(s) FROM ServiceStatus s WHERE s.active = true GROUP BY s.status")
    List<Object[]> countByStatus();
} 