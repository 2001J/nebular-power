package com.solar.core_services.payment_compliance.dto;

import com.solar.core_services.payment_compliance.model.PaymentPlan;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentPlanRequest {
    @NotNull(message = "Installation ID is required")
    private Long installationId;

    private String name;

    private String description;

    @NotNull(message = "Installment amount is required")
    @DecimalMin(value = "0.01", message = "Installment amount must be greater than 0")
    private BigDecimal installmentAmount;

    @NotNull(message = "Payment frequency is required")
    private PaymentPlan.PaymentFrequency frequency;

    @NotNull(message = "Start date is required")
    private LocalDate startDate;

    @NotNull(message = "End date is required")
    @Future(message = "End date must be in the future")
    private LocalDate endDate;

    @NotNull(message = "Total amount is required")
    @DecimalMin(value = "0.01", message = "Total amount must be greater than 0")
    private BigDecimal totalAmount;

    private BigDecimal interestRate;

    private BigDecimal lateFeeAmount;

    private Integer gracePeriodDays;

    // Flag to indicate whether to use the default system-wide grace period setting
    private boolean useDefaultGracePeriod;

    // Flag to indicate whether to use the default system-wide late fee setting
    private boolean useDefaultLateFee;

    // Flag to indicate whether late fees should be applied at all
    @Builder.Default
    private boolean applyLateFee = true;
}