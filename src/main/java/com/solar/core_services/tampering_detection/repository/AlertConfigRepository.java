package com.solar.core_services.tampering_detection.repository;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.tampering_detection.model.AlertConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AlertConfigRepository extends JpaRepository<AlertConfig, Long> {
    
    Optional<AlertConfig> findByInstallation(SolarInstallation installation);
    
    Optional<AlertConfig> findByInstallationId(Long installationId);
    
    @Query("SELECT a FROM AlertConfig a WHERE a.alertLevel = ?1")
    List<AlertConfig> findByAlertLevel(AlertConfig.AlertLevel alertLevel);
    
    @Query("SELECT a FROM AlertConfig a WHERE a.autoResponseEnabled = true")
    List<AlertConfig> findByAutoResponseEnabled();
} 