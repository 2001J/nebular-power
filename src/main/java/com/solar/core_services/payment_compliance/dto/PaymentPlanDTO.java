package com.solar.core_services.payment_compliance.dto;

import com.solar.core_services.payment_compliance.model.Payment;
import com.solar.core_services.payment_compliance.model.PaymentPlan;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentPlanDTO {
    private Long id;
    private Long installationId;
    private String customerName;
    private String customerEmail;
    private String name;
    private String description;
    private BigDecimal totalAmount;
    private BigDecimal remainingAmount;
    private Integer numberOfPayments;
    private Integer totalInstallments;
    private Integer remainingInstallments;
    private BigDecimal installmentAmount;
    private BigDecimal monthlyPayment;
    private PaymentPlan.PaymentFrequency frequency;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private PaymentPlan.PaymentPlanStatus status;
    private BigDecimal interestRate;
    private BigDecimal lateFeeAmount;
    private Integer gracePeriodDays;
    private List<PaymentDTO> payments;
    private LocalDateTime nextPaymentDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    public static PaymentPlanDTO fromEntity(PaymentPlan paymentPlan) {
        int paidPayments = (int) paymentPlan.getPayments().stream()
                .filter(p -> p.getStatus() == Payment.PaymentStatus.PAID)
                .count();
        
        int remainingPayments = paymentPlan.getNumberOfPayments() - paidPayments;
        
        LocalDateTime nextPaymentDate = null;
        if (paymentPlan.getPayments() != null && !paymentPlan.getPayments().isEmpty()) {
            nextPaymentDate = paymentPlan.getPayments().stream()
                    .filter(p -> p.getStatus() == Payment.PaymentStatus.SCHEDULED || 
                                p.getStatus() == Payment.PaymentStatus.UPCOMING || 
                                p.getStatus() == Payment.PaymentStatus.DUE_TODAY)
                    .min(Comparator.comparing(Payment::getDueDate))
                    .map(Payment::getDueDate)
                    .orElse(null);
        }
        
        return PaymentPlanDTO.builder()
                .id(paymentPlan.getId())
                .installationId(paymentPlan.getInstallation().getId())
                .customerName(paymentPlan.getInstallation().getUser().getFullName())
                .customerEmail(paymentPlan.getInstallation().getUser().getEmail())
                .name(paymentPlan.getName())
                .description(paymentPlan.getDescription())
                .totalAmount(paymentPlan.getTotalAmount())
                .remainingAmount(paymentPlan.getRemainingAmount())
                .numberOfPayments(paymentPlan.getNumberOfPayments())
                .totalInstallments(paymentPlan.getNumberOfPayments())
                .remainingInstallments(remainingPayments)
                .installmentAmount(paymentPlan.getInstallmentAmount())
                .monthlyPayment(paymentPlan.getInstallmentAmount())
                .frequency(paymentPlan.getFrequency())
                .startDate(paymentPlan.getStartDate())
                .endDate(paymentPlan.getEndDate())
                .status(paymentPlan.getStatus())
                .interestRate(paymentPlan.getInterestRate())
                .lateFeeAmount(paymentPlan.getLateFeeAmount())
                .gracePeriodDays(paymentPlan.getGracePeriodDays())
                .payments(paymentPlan.getPayments().stream()
                        .map(PaymentDTO::fromEntity)
                        .collect(Collectors.toList()))
                .nextPaymentDate(nextPaymentDate)
                .createdAt(paymentPlan.getCreatedAt())
                .updatedAt(paymentPlan.getUpdatedAt())
                .build();
    }
    
    public static PaymentPlanDTO fromEntityWithoutPayments(PaymentPlan paymentPlan) {
        PaymentPlanDTO dto = fromEntity(paymentPlan);
        dto.setPayments(null);
        return dto;
    }
} 