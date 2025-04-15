package com.solar.core_services.payment_compliance.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@Entity
@Table(name = "payment_reminders")
public class PaymentReminder {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_id", nullable = false)
    private Payment payment;

    @Column(name = "sent_date", nullable = false)
    private LocalDateTime sentDate = LocalDateTime.now();

    @Enumerated(EnumType.STRING)
    @Column(name = "reminder_type", nullable = false)
    private ReminderType reminderType;

    @Enumerated(EnumType.STRING)
    @Column(name = "delivery_status", nullable = false)
    private DeliveryStatus deliveryStatus = DeliveryStatus.PENDING;

    @Column(name = "delivery_channel", nullable = false)
    private String deliveryChannel;

    @Column(name = "recipient_address", nullable = false)
    private String recipientAddress;

    @Column(name = "message_content")
    @Lob
    private String messageContent;

    @Column(name = "retry_count")
    private Integer retryCount = 0;

    @Column(name = "last_retry_date")
    private LocalDateTime lastRetryDate;

    @Column(name = "error_message")
    private String errorMessage;

    public enum ReminderType {
        UPCOMING_PAYMENT,
        DUE_TODAY,
        OVERDUE,
        GRACE_PERIOD,
        FINAL_WARNING
    }

    public enum DeliveryStatus {
        PENDING,
        SENT,
        DELIVERED,
        FAILED,
        RETRY_SCHEDULED
    }
} 