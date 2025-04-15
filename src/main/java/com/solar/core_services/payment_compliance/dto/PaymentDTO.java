package com.solar.core_services.payment_compliance.dto;

import com.solar.core_services.payment_compliance.model.Payment;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentDTO {
    private Long id;
    private Long installationId;
    private String customerName;
    private String customerEmail;
    private Long paymentPlanId;
    private String paymentPlanName;
    private BigDecimal amount;
    private LocalDateTime dueDate;
    private LocalDateTime paidAt;
    private Payment.PaymentStatus status;
    private String statusReason;
    private LocalDateTime statusUpdatedAt;
    private Integer daysOverdue;
    private String transactionId;
    private String paymentMethod;
    private String notes;
    private BigDecimal lateFee;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    public static PaymentDTO fromEntity(Payment payment) {
        return PaymentDTO.builder()
                .id(payment.getId())
                .installationId(payment.getInstallation().getId())
                .customerName(payment.getInstallation().getUser().getFullName())
                .customerEmail(payment.getInstallation().getUser().getEmail())
                .paymentPlanId(payment.getPaymentPlan() != null ? payment.getPaymentPlan().getId() : null)
                .paymentPlanName(payment.getPaymentPlan() != null ? payment.getPaymentPlan().getName() : null)
                .amount(payment.getAmount())
                .dueDate(payment.getDueDate())
                .paidAt(payment.getPaidAt())
                .status(payment.getStatus())
                .statusReason(payment.getStatusReason())
                .statusUpdatedAt(payment.getStatusUpdatedAt())
                .daysOverdue(payment.getDaysOverdue())
                .transactionId(payment.getTransactionId())
                .paymentMethod(payment.getPaymentMethod())
                .notes(payment.getNotes())
                .lateFee(payment.getLateFee())
                .createdAt(payment.getCreatedAt())
                .updatedAt(payment.getUpdatedAt())
                .build();
    }
} 