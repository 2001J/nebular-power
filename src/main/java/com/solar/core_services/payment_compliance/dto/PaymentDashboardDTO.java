package com.solar.core_services.payment_compliance.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentDashboardDTO {
    private Long installationId;
    private BigDecimal totalAmount;
    private BigDecimal remainingAmount;
    private BigDecimal nextPaymentAmount;
    private LocalDateTime nextPaymentDueDate;
    private int totalInstallments;
    private int remainingInstallments;
    private int completedInstallments;
    private boolean hasOverduePayments;
    private List<PaymentDTO> recentPayments;
    private List<PaymentDTO> upcomingPayments;
    
    // Added field for active payment plan details
    private PaymentPlanDTO activePlan;
    
    // Additional payment plan fields to expose directly at the dashboard level
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private String frequency;
    private Long paymentPlanId;
    private BigDecimal installmentAmount;
    private String status; // Added status field
}