package com.solar.core_services.payment_compliance.repository;

import com.solar.core_services.payment_compliance.model.GracePeriodConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface GracePeriodConfigRepository extends JpaRepository<GracePeriodConfig, Long> {
    @Query("SELECT g FROM GracePeriodConfig g ORDER BY g.id DESC")
    Optional<GracePeriodConfig> findLatestConfig();
} 