package com.solar.core_services.service_control.repository;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.service_control.model.ControlAction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ControlActionRepository extends JpaRepository<ControlAction, Long> {
    
    /**
     * Find all control actions for an installation
     */
    List<ControlAction> findByInstallationOrderByExecutedAtDesc(SolarInstallation installation);
    
    /**
     * Find all control actions for an installation with pagination
     */
    Page<ControlAction> findByInstallationOrderByExecutedAtDesc(SolarInstallation installation, Pageable pageable);
    
    /**
     * Find all control actions for an installation by ID with pagination
     */
    @Query("SELECT c FROM ControlAction c WHERE c.installation.id = :installationId ORDER BY c.executedAt DESC")
    Page<ControlAction> findByInstallationIdOrderByExecutedAtDesc(Long installationId, Pageable pageable);
    
    /**
     * Find all control actions by action type
     */
    Page<ControlAction> findByActionType(ControlAction.ActionType actionType, Pageable pageable);
    
    /**
     * Find all control actions by success status
     */
    Page<ControlAction> findBySuccess(boolean success, Pageable pageable);
    
    /**
     * Find all control actions within a time range
     */
    List<ControlAction> findByExecutedAtBetweenOrderByExecutedAtDesc(LocalDateTime start, LocalDateTime end);
    
    /**
     * Find all control actions for installations owned by a user
     */
    @Query("SELECT c FROM ControlAction c WHERE c.installation.user.id = :userId ORDER BY c.executedAt DESC")
    List<ControlAction> findByUserIdOrderByExecutedAtDesc(Long userId);
    
    /**
     * Find all control actions by source system
     */
    List<ControlAction> findBySourceSystemOrderByExecutedAtDesc(String sourceSystem);
    
    /**
     * Count control actions by action type
     */
    @Query("SELECT c.actionType, COUNT(c) FROM ControlAction c GROUP BY c.actionType")
    List<Object[]> countByActionType();
    
    /**
     * Count successful vs failed actions
     */
    @Query("SELECT c.success, COUNT(c) FROM ControlAction c GROUP BY c.success")
    List<Object[]> countBySuccess();
} 