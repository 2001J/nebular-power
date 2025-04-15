package com.solar.user_management.repository;

import com.solar.user_management.model.User;
import com.solar.user_management.model.UserActivityLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;

public interface UserActivityLogRepository extends JpaRepository<UserActivityLog, Long> {
    Page<UserActivityLog> findByUser(User user, Pageable pageable);
    List<UserActivityLog> findByUserAndActivityTypeAndTimestampBetween(
            User user,
            UserActivityLog.ActivityType activityType,
            LocalDateTime start,
            LocalDateTime end
    );
    List<UserActivityLog> findByActivityTypeAndTimestampBetween(
            UserActivityLog.ActivityType activityType,
            LocalDateTime start,
            LocalDateTime end
    );
    Page<UserActivityLog> findByTimestampBetween(LocalDateTime start, LocalDateTime end, Pageable pageable);
} 