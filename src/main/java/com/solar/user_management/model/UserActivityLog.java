package com.solar.user_management.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@Entity
@Table(name = "user_activity_logs")
public class UserActivityLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String activity;

    @Column(nullable = false)
    private String details;

    @Column(nullable = false)
    private String ipAddress;

    @Column(nullable = false)
    private LocalDateTime timestamp = LocalDateTime.now();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ActivityType activityType;

    public enum ActivityType {
        LOGIN,
        LOGOUT,
        PASSWORD_CHANGE,
        PROFILE_UPDATE,
        PAYMENT,
        SYSTEM_ACCESS,
        ACCOUNT_STATUS_CHANGE,
        FAILED_LOGIN
    }
} 