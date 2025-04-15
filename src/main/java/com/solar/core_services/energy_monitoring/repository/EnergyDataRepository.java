package com.solar.core_services.energy_monitoring.repository;


import com.solar.core_services.energy_monitoring.model.EnergyData;
import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.time.LocalDateTime;
import java.util.List;

public interface EnergyDataRepository extends JpaRepository<EnergyData, Long> {
    List<EnergyData> findByInstallationOrderByTimestampDesc(SolarInstallation installation);
    
    List<EnergyData> findByInstallationAndTimestampBetweenOrderByTimestampDesc(
        SolarInstallation installation, 
        LocalDateTime start, 
        LocalDateTime end
    );

    @Query("SELECT SUM(e.powerGenerationWatts) FROM EnergyData e WHERE e.installation = ?1 AND e.timestamp BETWEEN ?2 AND ?3")
    Double sumPowerGenerationForPeriod(SolarInstallation installation, LocalDateTime start, LocalDateTime end);

    @Query("SELECT SUM(e.powerConsumptionWatts) FROM EnergyData e WHERE e.installation = ?1 AND e.timestamp BETWEEN ?2 AND ?3")
    Double sumPowerConsumptionForPeriod(SolarInstallation installation, LocalDateTime start, LocalDateTime end);
} 