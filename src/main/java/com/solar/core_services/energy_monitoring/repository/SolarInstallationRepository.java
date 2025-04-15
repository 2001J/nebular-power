package com.solar.core_services.energy_monitoring.repository;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.user_management.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface SolarInstallationRepository extends JpaRepository<SolarInstallation, Long> {
    List<SolarInstallation> findByUser(User user);
    List<SolarInstallation> findByTamperDetectedTrue();
    
    @Query("SELECT i FROM SolarInstallation i WHERE i.user.id = :userId")
    List<SolarInstallation> findByUserId(@Param("userId") Long userId);
} 