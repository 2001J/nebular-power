package com.solar.core_services.tampering_detection.repository;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.tampering_detection.model.TamperEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TamperEventRepository extends JpaRepository<TamperEvent, Long> {
    
    List<TamperEvent> findByInstallationAndResolvedFalseOrderByTimestampDesc(SolarInstallation installation);
    
    Page<TamperEvent> findByInstallationOrderByTimestampDesc(SolarInstallation installation, Pageable pageable);
    
    Page<TamperEvent> findByInstallationInOrderByTimestampDesc(List<SolarInstallation> installations, Pageable pageable);
    
    List<TamperEvent> findByResolvedFalseOrderByTimestampDesc();
    
    Page<TamperEvent> findByResolvedFalseAndSeverityInOrderBySeverityDescTimestampDesc(
            List<TamperEvent.TamperSeverity> severities, Pageable pageable);
    
    @Query("SELECT e FROM TamperEvent e WHERE e.installation = ?1 AND e.timestamp BETWEEN ?2 AND ?3 ORDER BY e.timestamp DESC")
    List<TamperEvent> findByInstallationAndTimeRange(SolarInstallation installation, LocalDateTime start, LocalDateTime end);
    
    @Query("SELECT COUNT(e) FROM TamperEvent e WHERE e.installation = ?1 AND e.resolved = false")
    long countUnresolvedByInstallation(SolarInstallation installation);
    
    @Query("SELECT e FROM TamperEvent e WHERE e.status = ?1 ORDER BY e.timestamp DESC")
    Page<TamperEvent> findByStatus(TamperEvent.TamperEventStatus status, Pageable pageable);
} 