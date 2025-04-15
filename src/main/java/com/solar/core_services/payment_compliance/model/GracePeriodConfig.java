package com.solar.core_services.payment_compliance.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@Entity
@Table(name = "grace_period_configs")
public class GracePeriodConfig {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "number_of_days", nullable = false)
    private Integer numberOfDays = 7; // Default 7 days grace period

    @Column(name = "reminder_frequency", nullable = false)
    private Integer reminderFrequency = 2; // Send reminder every 2 days during grace period

    @Column(name = "auto_suspend_enabled", nullable = false)
    private Boolean autoSuspendEnabled = true;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "updated_by")
    private String updatedBy;

    @Version
    private Long version;

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
} 