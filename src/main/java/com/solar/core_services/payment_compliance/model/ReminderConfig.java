package com.solar.core_services.payment_compliance.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@Entity
@Table(name = "reminder_configs")
public class ReminderConfig {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "auto_send_reminders", nullable = false)
    private Boolean autoSendReminders = true;

    @Column(name = "first_reminder_days", nullable = false)
    private Integer firstReminderDays = 1;

    @Column(name = "second_reminder_days", nullable = false)
    private Integer secondReminderDays = 3;

    @Column(name = "final_reminder_days", nullable = false)
    private Integer finalReminderDays = 7;

    @Column(name = "reminder_method", nullable = false)
    private String reminderMethod = "EMAIL";

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "updated_by")
    private String updatedBy;

    @Version
    private Long version;

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
} 