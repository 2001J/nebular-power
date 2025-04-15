package com.solar.core_services.payment_compliance.dto;

import com.solar.core_services.payment_compliance.model.PaymentReminder;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentReminderDTO {
    private Long id;
    private Long paymentId;
    private LocalDateTime sentDate;
    private PaymentReminder.ReminderType reminderType;
    private PaymentReminder.DeliveryStatus deliveryStatus;
    private String deliveryChannel;
    private String recipientAddress;
    private Integer retryCount;
    private LocalDateTime lastRetryDate;
} 