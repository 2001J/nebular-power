// Testing: com.solar.user_management.repository.UserActivityLogRepository from src/main/java/com/solar/user_management/repository/UserActivityLogRepository.java
// Public methods being tested: findByUser, findByUserAndActivityTypeAndTimestampBetween, 
// findByActivityTypeAndTimestampBetween, findByTimestampBetween

package com.solar.user_management.repository;

import com.solar.user_management.model.User;
import com.solar.user_management.model.UserActivityLog;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@DataJpaTest
public class UserActivityLogRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private UserActivityLogRepository activityLogRepository;

    private User testUser1;
    private User testUser2;
    private UserActivityLog loginLog1;
    private UserActivityLog loginLog2;
    private UserActivityLog paymentLog;
    private UserActivityLog profileUpdateLog;
    private LocalDateTime startDate;
    private LocalDateTime endDate;

    @BeforeEach
    void setUp() {
        // Create test users
        testUser1 = new User();
        testUser1.setEmail("user1@example.com");
        testUser1.setPassword("encodedPassword");
        testUser1.setFullName("Test User 1");
        testUser1.setPhoneNumber("+12345678901");
        testUser1.setRole(User.UserRole.CUSTOMER);
        testUser1.setEnabled(true);
        testUser1.setEmailVerified(true);
        testUser1.setCreatedAt(LocalDateTime.now());
        testUser1.setUpdatedAt(LocalDateTime.now());
        entityManager.persist(testUser1);

        testUser2 = new User();
        testUser2.setEmail("user2@example.com");
        testUser2.setPassword("encodedPassword");
        testUser2.setFullName("Test User 2");
        testUser2.setPhoneNumber("+19876543210");
        testUser2.setRole(User.UserRole.CUSTOMER);
        testUser2.setEnabled(true);
        testUser2.setEmailVerified(true);
        testUser2.setCreatedAt(LocalDateTime.now());
        testUser2.setUpdatedAt(LocalDateTime.now());
        entityManager.persist(testUser2);

        // Set up date range
        startDate = LocalDateTime.now().minusDays(7);
        endDate = LocalDateTime.now().plusDays(1);

        // Create activity logs
        loginLog1 = new UserActivityLog();
        loginLog1.setUser(testUser1);
        loginLog1.setActivityType(UserActivityLog.ActivityType.LOGIN);
        loginLog1.setActivity("User login");
        loginLog1.setDetails("Successful login from web application");
        loginLog1.setIpAddress("192.168.1.1");
        loginLog1.setTimestamp(LocalDateTime.now().minusDays(1));
        entityManager.persist(loginLog1);

        loginLog2 = new UserActivityLog();
        loginLog2.setUser(testUser2);
        loginLog2.setActivityType(UserActivityLog.ActivityType.LOGIN);
        loginLog2.setActivity("User login");
        loginLog2.setDetails("Successful login from mobile application");
        loginLog2.setIpAddress("192.168.1.2");
        loginLog2.setTimestamp(LocalDateTime.now().minusDays(2));
        entityManager.persist(loginLog2);

        paymentLog = new UserActivityLog();
        paymentLog.setUser(testUser1);
        paymentLog.setActivityType(UserActivityLog.ActivityType.PAYMENT);
        paymentLog.setActivity("Payment made");
        paymentLog.setDetails("Payment of $100 for solar service");
        paymentLog.setIpAddress("192.168.1.1");
        paymentLog.setTimestamp(LocalDateTime.now().minusDays(3));
        entityManager.persist(paymentLog);

        profileUpdateLog = new UserActivityLog();
        profileUpdateLog.setUser(testUser1);
        profileUpdateLog.setActivityType(UserActivityLog.ActivityType.PROFILE_UPDATE);
        profileUpdateLog.setActivity("Profile updated");
        profileUpdateLog.setDetails("User updated phone number");
        profileUpdateLog.setIpAddress("192.168.1.1");
        profileUpdateLog.setTimestamp(LocalDateTime.now().minusDays(4));
        entityManager.persist(profileUpdateLog);

        entityManager.flush();
    }

    @Test
    void findByUser_ReturnsUserLogs() {
        // Arrange
        Pageable pageable = PageRequest.of(0, 10);

        // Act
        Page<UserActivityLog> result = activityLogRepository.findByUser(testUser1, pageable);

        // Assert
        assertEquals(3, result.getTotalElements());
        assertEquals(testUser1.getId(), result.getContent().get(0).getUser().getId());
    }

    @Test
    void findByUserAndActivityTypeAndTimestampBetween_ReturnsFilteredLogs() {
        // Act
        List<UserActivityLog> result = activityLogRepository.findByUserAndActivityTypeAndTimestampBetween(
                testUser1,
                UserActivityLog.ActivityType.LOGIN,
                startDate,
                endDate
        );

        // Assert
        assertEquals(1, result.size());
        assertEquals(UserActivityLog.ActivityType.LOGIN, result.get(0).getActivityType());
        assertEquals(testUser1.getId(), result.get(0).getUser().getId());
    }

    @Test
    void findByActivityTypeAndTimestampBetween_ReturnsFilteredLogs() {
        // Act
        List<UserActivityLog> result = activityLogRepository.findByActivityTypeAndTimestampBetween(
                UserActivityLog.ActivityType.LOGIN,
                startDate,
                endDate
        );

        // Assert
        assertEquals(2, result.size());
        assertEquals(UserActivityLog.ActivityType.LOGIN, result.get(0).getActivityType());
        assertEquals(UserActivityLog.ActivityType.LOGIN, result.get(1).getActivityType());
    }

    @Test
    void findByTimestampBetween_ReturnsLogsInTimeRange() {
        // Arrange
        Pageable pageable = PageRequest.of(0, 10);

        // Act
        Page<UserActivityLog> result = activityLogRepository.findByTimestampBetween(
                startDate,
                endDate,
                pageable
        );

        // Assert
        assertEquals(4, result.getTotalElements());
    }
} 