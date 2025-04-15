package com.solar.user_management.service.impl;

import com.solar.user_management.model.User;
import com.solar.user_management.model.UserActivityLog;
import com.solar.user_management.repository.UserActivityLogRepository;
import com.solar.user_management.service.UserActivityLogService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserActivityLogServiceImpl implements UserActivityLogService {

    private final UserActivityLogRepository activityLogRepository;

    @Override
    @Transactional
    public void logUserActivity(
            User user,
            UserActivityLog.ActivityType activityType,
            String activity,
            String details,
            HttpServletRequest request) {

        UserActivityLog log = new UserActivityLog();
        log.setUser(user);
        log.setActivityType(activityType);
        log.setActivity(activity);
        log.setDetails(details);
        log.setIpAddress(getClientIp(request));

        activityLogRepository.save(log);
    }

    @Override
    public Page<UserActivityLog> getUserActivityLogs(User user, Pageable pageable) {
        return activityLogRepository.findByUser(user, pageable);
    }

    @Override
    public List<UserActivityLog> getUserActivityByType(
            User user,
            UserActivityLog.ActivityType activityType,
            LocalDateTime start,
            LocalDateTime end) {
        return activityLogRepository.findByUserAndActivityTypeAndTimestampBetween(
                user, activityType, start, end);
    }

    @Override
    public Page<UserActivityLog> getAllActivityLogs(
            LocalDateTime start,
            LocalDateTime end,
            Pageable pageable) {
        return activityLogRepository.findByTimestampBetween(start, end, pageable);
    }

    @Override
    public List<UserActivityLog> getSystemActivityByType(
            UserActivityLog.ActivityType activityType,
            LocalDateTime start,
            LocalDateTime end) {
        return activityLogRepository.findByActivityTypeAndTimestampBetween(
                activityType, start, end);
    }

    private String getClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null || xfHeader.isEmpty() || "unknown".equalsIgnoreCase(xfHeader)) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0];
    }
} 