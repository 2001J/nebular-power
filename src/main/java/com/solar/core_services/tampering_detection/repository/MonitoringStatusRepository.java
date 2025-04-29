package com.solar.core_services.tampering_detection.repository;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.tampering_detection.model.MonitoringStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MonitoringStatusRepository extends JpaRepository<MonitoringStatus, Long> {
    
    Optional<MonitoringStatus> findByInstallation(SolarInstallation installation);
    
    Optional<MonitoringStatus> findByInstallationId(Long installationId);
} 