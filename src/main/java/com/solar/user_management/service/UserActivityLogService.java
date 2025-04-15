package com.solar.user_management.service;

import com.solar.user_management.model.User;
import com.solar.user_management.model.UserActivityLog;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.time.LocalDateTime;
import java.util.List;

public interface UserActivityLogService {
    void logUserActivity(
            User user,
            UserActivityLog.ActivityType activityType,
            String activity,
            String details,
            HttpServletRequest request
    );

    Page<UserActivityLog> getUserActivityLogs(User user, Pageable pageable);

    List<UserActivityLog> getUserActivityByType(
            User user,
            UserActivityLog.ActivityType activityType,
            LocalDateTime start,
            LocalDateTime end
    );

    Page<UserActivityLog> getAllActivityLogs(
            LocalDateTime start,
            LocalDateTime end,
            Pageable pageable
    );

    List<UserActivityLog> getSystemActivityByType(
            UserActivityLog.ActivityType activityType,
            LocalDateTime start,
            LocalDateTime end
    );
} 