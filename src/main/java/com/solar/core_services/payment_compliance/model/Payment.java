package com.solar.core_services.payment_compliance.model;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payments")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "installation_id", nullable = false)
    private SolarInstallation installation;

    @ManyToOne
    @JoinColumn(name = "payment_plan_id")
    private PaymentPlan paymentPlan;

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(nullable = false)
    private LocalDateTime dueDate;

    private LocalDateTime paidAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentStatus status;

    private String statusReason;

    private LocalDateTime statusUpdatedAt;

    private Integer daysOverdue;

    private String transactionId;

    private String paymentMethod;

    @Column(length = 1000)
    private String notes;

    private BigDecimal lateFee;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum PaymentStatus {
        PENDING,
        PAID,
        OVERDUE,
        CANCELLED,
        REFUNDED,
        PARTIALLY_PAID,
        SCHEDULED,
        UPCOMING,
        DUE_TODAY,
        GRACE_PERIOD,
        SUSPENSION_PENDING
    }
} 