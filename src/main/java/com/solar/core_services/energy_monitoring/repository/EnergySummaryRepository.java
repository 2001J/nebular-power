package com.solar.core_services.energy_monitoring.repository;


import com.solar.core_services.energy_monitoring.model.EnergySummary;
import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface EnergySummaryRepository extends JpaRepository<EnergySummary, Long> {
    
    List<EnergySummary> findByInstallationAndPeriodOrderByDateDesc(
        SolarInstallation installation,
        EnergySummary.SummaryPeriod period
    );
    
    List<EnergySummary> findByInstallationAndPeriodAndDateBetweenOrderByDateDesc(
        SolarInstallation installation, 
        EnergySummary.SummaryPeriod period,
        LocalDate startDate, 
        LocalDate endDate
    );
    
    Optional<EnergySummary> findByInstallationAndPeriodAndDate(
        SolarInstallation installation, 
        EnergySummary.SummaryPeriod period,
        LocalDate date
    );
    
    @Query("SELECT SUM(es.totalGenerationKWh) FROM EnergySummary es WHERE es.installation = ?1 AND es.period = ?2 AND es.date BETWEEN ?3 AND ?4")
    Double sumTotalGenerationForPeriod(
        SolarInstallation installation, 
        EnergySummary.SummaryPeriod period,
        LocalDate startDate, 
        LocalDate endDate
    );
    
    @Query("SELECT SUM(es.totalConsumptionKWh) FROM EnergySummary es WHERE es.installation = ?1 AND es.period = ?2 AND es.date BETWEEN ?3 AND ?4")
    Double sumTotalConsumptionForPeriod(
        SolarInstallation installation, 
        EnergySummary.SummaryPeriod period,
        LocalDate startDate, 
        LocalDate endDate
    );
    
    @Query("SELECT AVG(es.efficiencyPercentage) FROM EnergySummary es WHERE es.installation = ?1 AND es.period = ?2 AND es.date BETWEEN ?3 AND ?4")
    Double avgEfficiencyForPeriod(
        SolarInstallation installation, 
        EnergySummary.SummaryPeriod period,
        LocalDate startDate, 
        LocalDate endDate
    );
    
    // New methods to support system overview
    List<EnergySummary> findByPeriodAndDate(
        EnergySummary.SummaryPeriod period,
        LocalDate date
    );
    
    List<EnergySummary> findByPeriodAndDateBetween(
        EnergySummary.SummaryPeriod period,
        LocalDate startDate,
        LocalDate endDate
    );
}