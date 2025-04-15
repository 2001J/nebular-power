package com.solar.core_services.payment_compliance.model;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "payment_plans")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "installation_id", nullable = false)
    private SolarInstallation installation;

    @Column(nullable = false)
    private String name;

    @Column(length = 1000)
    private String description;

    @Column(nullable = false)
    private BigDecimal totalAmount;

    @Column(nullable = false)
    private BigDecimal remainingAmount;

    @Column(nullable = false)
    private Integer numberOfPayments;

    @Column(nullable = false)
    private BigDecimal installmentAmount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentFrequency frequency;

    @Column(nullable = false)
    private LocalDateTime startDate;

    private LocalDateTime endDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentPlanStatus status;

    @Column(nullable = false)
    private BigDecimal interestRate;

    private BigDecimal lateFeeAmount;

    private Integer gracePeriodDays;

    @OneToMany(mappedBy = "paymentPlan", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Payment> payments = new ArrayList<>();

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

    public enum PaymentFrequency {
        WEEKLY,
        BI_WEEKLY,
        MONTHLY,
        QUARTERLY,
        SEMI_ANNUALLY,
        ANNUALLY
    }

    public enum PaymentPlanStatus {
        ACTIVE,
        COMPLETED,
        CANCELLED,
        SUSPENDED,
        DEFAULTED
    }
} 