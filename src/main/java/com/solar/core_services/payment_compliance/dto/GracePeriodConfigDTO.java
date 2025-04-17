package com.solar.core_services.payment_compliance.dto;

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
public class GracePeriodConfigDTO {
    private Long id;
    private Integer numberOfDays;
    private Integer reminderFrequency;
    private Boolean autoSuspendEnabled;
    private Boolean lateFeesEnabled;
    private BigDecimal lateFeePercentage;
    private BigDecimal lateFeeFixedAmount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String updatedBy;
}