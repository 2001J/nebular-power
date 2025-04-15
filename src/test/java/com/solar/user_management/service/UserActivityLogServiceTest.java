// Testing: com.solar.user_management.service.impl.UserActivityLogServiceImpl from src/main/java/com/solar/user_management/service/impl/UserActivityLogServiceImpl.java
// Public methods being tested: logUserActivity, getUserActivityLogs, getUserActivityByType, getAllActivityLogs, getSystemActivityByType

package com.solar.user_management.service;

import com.solar.user_management.model.User;
import com.solar.user_management.model.UserActivityLog;
import com.solar.user_management.repository.UserActivityLogRepository;
import com.solar.user_management.service.impl.UserActivityLogServiceImpl;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class UserActivityLogServiceTest {

    @Mock
    private UserActivityLogRepository activityLogRepository;

    @Mock
    private HttpServletRequest request;

    @InjectMocks
    private UserActivityLogServiceImpl activityLogService;

    private User testUser;
    private UserActivityLog testActivityLog;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private Pageable pageable;

    @BeforeEach
    void setUp() {
        // Set up test data
        testUser = new User();
        testUser.setId(1L);
        testUser.setEmail("test@example.com");
        testUser.setFullName("Test User");

        testActivityLog = new UserActivityLog();
        testActivityLog.setId(1L);
        testActivityLog.setUser(testUser);
        testActivityLog.setActivityType(UserActivityLog.ActivityType.LOGIN);
        testActivityLog.setActivity("User login");
        testActivityLog.setDetails("Successful login from web application");
        testActivityLog.setIpAddress("192.168.1.1");
        testActivityLog.setTimestamp(LocalDateTime.now());

        startDate = LocalDateTime.now().minusDays(7);
        endDate = LocalDateTime.now();
        pageable = PageRequest.of(0, 10);
    }

    @Test
    void logUserActivity_Success() {
        // Arrange
        when(request.getHeader("X-Forwarded-For")).thenReturn(null);
        when(request.getRemoteAddr()).thenReturn("192.168.1.1");
        when(activityLogRepository.save(any(UserActivityLog.class))).thenReturn(testActivityLog);

        // Act
        activityLogService.logUserActivity(
                testUser,
                UserActivityLog.ActivityType.LOGIN,
                "User login",
                "Successful login from web application",
                request
        );

        // Assert
        verify(activityLogRepository).save(any(UserActivityLog.class));
    }

    @Test
    void logUserActivity_WithXForwardedFor() {
        // Arrange
        when(request.getHeader("X-Forwarded-For")).thenReturn("10.0.0.1");
        when(activityLogRepository.save(any(UserActivityLog.class))).thenReturn(testActivityLog);

        // Act
        activityLogService.logUserActivity(
                testUser,
                UserActivityLog.ActivityType.LOGIN,
                "User login",
                "Successful login from web application",
                request
        );

        // Assert
        verify(activityLogRepository).save(any(UserActivityLog.class));
    }

    @Test
    void getUserActivityLogs_Success() {
        // Arrange
        List<UserActivityLog> logs = new ArrayList<>();
        logs.add(testActivityLog);
        Page<UserActivityLog> page = new PageImpl<>(logs, pageable, logs.size());
        
        when(activityLogRepository.findByUser(eq(testUser), eq(pageable))).thenReturn(page);

        // Act
        Page<UserActivityLog> result = activityLogService.getUserActivityLogs(testUser, pageable);

        // Assert
        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals(testActivityLog.getId(), result.getContent().get(0).getId());
        verify(activityLogRepository).findByUser(testUser, pageable);
    }

    @Test
    void getUserActivityByType_Success() {
        // Arrange
        List<UserActivityLog> logs = new ArrayList<>();
        logs.add(testActivityLog);
        
        when(activityLogRepository.findByUserAndActivityTypeAndTimestampBetween(
                eq(testUser),
                eq(UserActivityLog.ActivityType.LOGIN),
                eq(startDate),
                eq(endDate)
        )).thenReturn(logs);

        // Act
        List<UserActivityLog> result = activityLogService.getUserActivityByType(
                testUser,
                UserActivityLog.ActivityType.LOGIN,
                startDate,
                endDate
        );

        // Assert
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(testActivityLog.getId(), result.get(0).getId());
        verify(activityLogRepository).findByUserAndActivityTypeAndTimestampBetween(
                testUser,
                UserActivityLog.ActivityType.LOGIN,
                startDate,
                endDate
        );
    }

    @Test
    void getAllActivityLogs_Success() {
        // Arrange
        List<UserActivityLog> logs = new ArrayList<>();
        logs.add(testActivityLog);
        Page<UserActivityLog> page = new PageImpl<>(logs, pageable, logs.size());
        
        when(activityLogRepository.findByTimestampBetween(
                eq(startDate),
                eq(endDate),
                eq(pageable)
        )).thenReturn(page);

        // Act
        Page<UserActivityLog> result = activityLogService.getAllActivityLogs(
                startDate,
                endDate,
                pageable
        );

        // Assert
        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals(testActivityLog.getId(), result.getContent().get(0).getId());
        verify(activityLogRepository).findByTimestampBetween(startDate, endDate, pageable);
    }

    @Test
    void getSystemActivityByType_Success() {
        // Arrange
        List<UserActivityLog> logs = new ArrayList<>();
        logs.add(testActivityLog);
        
        when(activityLogRepository.findByActivityTypeAndTimestampBetween(
                eq(UserActivityLog.ActivityType.SYSTEM_ACCESS),
                eq(startDate),
                eq(endDate)
        )).thenReturn(logs);

        // Act
        List<UserActivityLog> result = activityLogService.getSystemActivityByType(
                UserActivityLog.ActivityType.SYSTEM_ACCESS,
                startDate,
                endDate
        );

        // Assert
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(testActivityLog.getId(), result.get(0).getId());
        verify(activityLogRepository).findByActivityTypeAndTimestampBetween(
                UserActivityLog.ActivityType.SYSTEM_ACCESS,
                startDate,
                endDate
        );
    }
} 