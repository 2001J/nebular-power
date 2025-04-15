package com.solar.core_services.tampering_detection.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "tamper_responses")
public class TamperResponse {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tamper_event_id", nullable = false)
    private TamperEvent tamperEvent;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ResponseType responseType;

    @Column(nullable = false)
    private LocalDateTime executedAt;

    @Column(nullable = false)
    private boolean success;

    @Column(length = 500)
    private String failureReason;

    @Column(length = 100)
    private String executedBy;

    @Column(columnDefinition = "TEXT")
    private String responseDetails;

    @PrePersist
    protected void onCreate() {
        if (executedAt == null) {
            executedAt = LocalDateTime.now();
        }
    }

    public enum ResponseType {
        NOTIFICATION_SENT,
        SERVICE_SUSPENDED,
        SYSTEM_LOCKDOWN,
        REMOTE_DIAGNOSTIC,
        EVIDENCE_COLLECTION,
        ADMIN_ALERT,
        AUTOMATIC_RESET,
        MANUAL_INTERVENTION
    }
} 