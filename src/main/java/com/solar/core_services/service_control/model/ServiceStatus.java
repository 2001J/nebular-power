package com.solar.core_services.service_control.model;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "service_status")
public class ServiceStatus {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "installation_id", nullable = false)
    private SolarInstallation installation;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ServiceState status;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @Column(length = 100)
    private String updatedBy;

    @Enumerated(EnumType.STRING)
    @Column
    private ServiceState scheduledChange;

    @Column
    private LocalDateTime scheduledTime;

    @Column(length = 500)
    private String statusReason;

    @Column(nullable = false)
    private boolean active = true;

    @PrePersist
    protected void onCreate() {
        if (updatedAt == null) {
            updatedAt = LocalDateTime.now();
        }
        if (status == null) {
            status = ServiceState.ACTIVE;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum ServiceState {
        ACTIVE,                  // Normal operation
        SUSPENDED_PAYMENT,       // Suspended due to payment issues
        SUSPENDED_SECURITY,      // Suspended due to security concerns
        SUSPENDED_MAINTENANCE,   // Suspended for maintenance
        TRANSITIONING            // Currently changing status
    }
} 