package com.solar.core_services.payment_compliance.repository;

import com.solar.core_services.payment_compliance.model.ReminderConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReminderConfigRepository extends JpaRepository<ReminderConfig, Long> {
    
    /**
     * Find the most recently created/updated reminder configuration.
     * This approach ensures we always have one active configuration.
     */
    @Query("SELECT rc FROM ReminderConfig rc ORDER BY rc.updatedAt DESC")
    List<ReminderConfig> findLatestConfigs(Pageable pageable);
    
    /**
     * Convenience method to find the latest config.
     * Returns an Optional of the most recent config based on updatedAt timestamp.
     */
    default Optional<ReminderConfig> findLatestConfig() {
        Pageable topOne = org.springframework.data.domain.PageRequest.of(0, 1);
        List<ReminderConfig> configs = findLatestConfigs(topOne);
        return configs.isEmpty() ? Optional.empty() : Optional.of(configs.get(0));
    }
} 