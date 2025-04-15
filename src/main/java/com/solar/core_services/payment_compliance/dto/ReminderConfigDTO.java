package com.solar.core_services.payment_compliance.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReminderConfigDTO {
    private Long id;
    private Boolean autoSendReminders;
    private Integer firstReminderDays;
    private Integer secondReminderDays;
    private Integer finalReminderDays;
    private String reminderMethod;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String updatedBy;
} 