// Testing: com.solar.user_management.repository.UserRepository from src/main/java/com/solar/user_management/repository/UserRepository.java
// Public methods being tested: findByEmail, findByVerificationToken, findByResetToken, existsByEmail, findByRole,
// searchCustomers, findCustomersByStatus, findLockedCustomers, findUnverifiedCustomers

package com.solar.user_management.repository;

import com.solar.user_management.model.User;
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
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
public class UserRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private UserRepository userRepository;

    private User customerUser;
    private User adminUser;
    private User lockedUser;
    private User unverifiedUser;

    @BeforeEach
    void setUp() {
        // Create a customer user
        customerUser = new User();
        customerUser.setEmail("customer@example.com");
        customerUser.setPassword("encodedPassword");
        customerUser.setFullName("Customer User");
        customerUser.setPhoneNumber("+12345678901");
        customerUser.setRole(User.UserRole.CUSTOMER);
        customerUser.setEnabled(true);
        customerUser.setEmailVerified(true);
        customerUser.setCreatedAt(LocalDateTime.now());
        customerUser.setUpdatedAt(LocalDateTime.now());
        customerUser.setVerificationToken("customer-verification-token");
        customerUser.setResetToken("customer-reset-token");
        entityManager.persist(customerUser);

        // Create an admin user
        adminUser = new User();
        adminUser.setEmail("admin@example.com");
        adminUser.setPassword("encodedPassword");
        adminUser.setFullName("Admin User");
        adminUser.setPhoneNumber("+19876543210");
        adminUser.setRole(User.UserRole.ADMIN);
        adminUser.setEnabled(true);
        adminUser.setEmailVerified(true);
        adminUser.setCreatedAt(LocalDateTime.now());
        adminUser.setUpdatedAt(LocalDateTime.now());
        entityManager.persist(adminUser);

        // Create a locked user
        lockedUser = new User();
        lockedUser.setEmail("locked@example.com");
        lockedUser.setPassword("encodedPassword");
        lockedUser.setFullName("Locked User");
        lockedUser.setPhoneNumber("+11122334455");
        lockedUser.setRole(User.UserRole.CUSTOMER);
        lockedUser.setEnabled(true);
        lockedUser.setEmailVerified(true);
        lockedUser.setAccountLocked(true);
        lockedUser.setLockTime(LocalDateTime.now());
        lockedUser.setCreatedAt(LocalDateTime.now());
        lockedUser.setUpdatedAt(LocalDateTime.now());
        entityManager.persist(lockedUser);

        // Create an unverified user
        unverifiedUser = new User();
        unverifiedUser.setEmail("unverified@example.com");
        unverifiedUser.setPassword("encodedPassword");
        unverifiedUser.setFullName("Unverified User");
        unverifiedUser.setPhoneNumber("+15566778899");
        unverifiedUser.setRole(User.UserRole.CUSTOMER);
        unverifiedUser.setEnabled(true);
        unverifiedUser.setEmailVerified(false);
        unverifiedUser.setCreatedAt(LocalDateTime.now());
        unverifiedUser.setUpdatedAt(LocalDateTime.now());
        entityManager.persist(unverifiedUser);

        entityManager.flush();
    }

    @Test
    void findByEmail_ExistingEmail_ReturnsUser() {
        // Act
        Optional<User> foundUser = userRepository.findByEmail(customerUser.getEmail());

        // Assert
        assertTrue(foundUser.isPresent());
        assertEquals(customerUser.getEmail(), foundUser.get().getEmail());
    }

    @Test
    void findByEmail_NonExistingEmail_ReturnsEmpty() {
        // Act
        Optional<User> foundUser = userRepository.findByEmail("nonexistent@example.com");

        // Assert
        assertFalse(foundUser.isPresent());
    }

    @Test
    void findByVerificationToken_ExistingToken_ReturnsUser() {
        // Act
        Optional<User> foundUser = userRepository.findByVerificationToken(customerUser.getVerificationToken());

        // Assert
        assertTrue(foundUser.isPresent());
        assertEquals(customerUser.getEmail(), foundUser.get().getEmail());
    }

    @Test
    void findByVerificationToken_NonExistingToken_ReturnsEmpty() {
        // Act
        Optional<User> foundUser = userRepository.findByVerificationToken("non-existent-token");

        // Assert
        assertFalse(foundUser.isPresent());
    }

    @Test
    void findByResetToken_ExistingToken_ReturnsUser() {
        // Act
        Optional<User> foundUser = userRepository.findByResetToken(customerUser.getResetToken());

        // Assert
        assertTrue(foundUser.isPresent());
        assertEquals(customerUser.getEmail(), foundUser.get().getEmail());
    }

    @Test
    void findByResetToken_NonExistingToken_ReturnsEmpty() {
        // Act
        Optional<User> foundUser = userRepository.findByResetToken("non-existent-token");

        // Assert
        assertFalse(foundUser.isPresent());
    }

    @Test
    void existsByEmail_ExistingEmail_ReturnsTrue() {
        // Act
        boolean exists = userRepository.existsByEmail(customerUser.getEmail());

        // Assert
        assertTrue(exists);
    }

    @Test
    void existsByEmail_NonExistingEmail_ReturnsFalse() {
        // Act
        boolean exists = userRepository.existsByEmail("nonexistent@example.com");

        // Assert
        assertFalse(exists);
    }

    @Test
    void findByRole_CustomerRole_ReturnsCustomers() {
        // Act
        List<User> customers = userRepository.findByRole(User.UserRole.CUSTOMER);

        // Assert
        assertEquals(3, customers.size());
        assertTrue(customers.stream().allMatch(user -> user.getRole() == User.UserRole.CUSTOMER));
    }

    @Test
    void findByRole_AdminRole_ReturnsAdmins() {
        // Act
        List<User> admins = userRepository.findByRole(User.UserRole.ADMIN);

        // Assert
        assertEquals(1, admins.size());
        assertEquals(adminUser.getEmail(), admins.get(0).getEmail());
    }

    @Test
    void searchCustomers_MatchingFullName_ReturnsMatchingCustomers() {
        // Arrange
        Pageable pageable = PageRequest.of(0, 10);

        // Act
        Page<User> result = userRepository.searchCustomers("Customer", pageable);

        // Assert
        assertEquals(1, result.getTotalElements());
        assertEquals(customerUser.getEmail(), result.getContent().get(0).getEmail());
    }

    @Test
    void searchCustomers_MatchingEmail_ReturnsMatchingCustomers() {
        // Arrange
        Pageable pageable = PageRequest.of(0, 10);

        // Act
        Page<User> result = userRepository.searchCustomers("customer@", pageable);

        // Assert
        assertEquals(1, result.getTotalElements());
        assertEquals(customerUser.getEmail(), result.getContent().get(0).getEmail());
    }

    @Test
    void searchCustomers_NoMatch_ReturnsEmptyPage() {
        // Arrange
        Pageable pageable = PageRequest.of(0, 10);

        // Act
        Page<User> result = userRepository.searchCustomers("nonexistent", pageable);

        // Assert
        assertEquals(0, result.getTotalElements());
    }

    @Test
    void findCustomersByStatus_EnabledTrue_ReturnsEnabledCustomers() {
        // Act
        List<User> enabledCustomers = userRepository.findCustomersByStatus(true);

        // Assert
        assertEquals(3, enabledCustomers.size());
        assertTrue(enabledCustomers.stream().allMatch(User::isEnabled));
    }

    @Test
    void findLockedCustomers_ReturnsLockedCustomers() {
        // Act
        List<User> lockedCustomers = userRepository.findLockedCustomers();

        // Assert
        assertEquals(1, lockedCustomers.size());
        assertEquals(lockedUser.getEmail(), lockedCustomers.get(0).getEmail());
        assertTrue(lockedCustomers.get(0).isAccountLocked());
    }

    @Test
    void findUnverifiedCustomers_ReturnsUnverifiedCustomers() {
        // Act
        List<User> unverifiedCustomers = userRepository.findUnverifiedCustomers();

        // Assert
        assertEquals(1, unverifiedCustomers.size());
        assertEquals(unverifiedUser.getEmail(), unverifiedCustomers.get(0).getEmail());
        assertFalse(unverifiedCustomers.get(0).isEmailVerified());
    }
} 