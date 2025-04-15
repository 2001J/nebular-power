package com.solar.core_services.tampering_detection.repository;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.tampering_detection.model.SecurityLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface SecurityLogRepository extends JpaRepository<SecurityLog, Long> {
    
    Page<SecurityLog> findByInstallationOrderByTimestampDesc(SolarInstallation installation, Pageable pageable);
    
    Page<SecurityLog> findByInstallationInOrderByTimestampDesc(List<SolarInstallation> installations, Pageable pageable);
    
    List<SecurityLog> findByInstallationAndActivityTypeOrderByTimestampDesc(
            SolarInstallation installation, SecurityLog.ActivityType activityType);
    
    @Query("SELECT s FROM SecurityLog s WHERE s.installation = ?1 AND s.timestamp BETWEEN ?2 AND ?3 ORDER BY s.timestamp DESC")
    List<SecurityLog> findByInstallationAndTimeRange(SolarInstallation installation, LocalDateTime start, LocalDateTime end);
    
    @Query("SELECT s FROM SecurityLog s WHERE s.activityType = ?1 ORDER BY s.timestamp DESC")
    Page<SecurityLog> findByActivityType(SecurityLog.ActivityType activityType, Pageable pageable);
} 