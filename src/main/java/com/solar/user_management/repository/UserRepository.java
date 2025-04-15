package com.solar.user_management.repository;

import com.solar.user_management.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByVerificationToken(String token);
    Optional<User> findByResetToken(String token);
    boolean existsByEmail(String email);
    List<User> findByRole(User.UserRole role);

    @Query("SELECT u FROM User u WHERE u.role = 'CUSTOMER' AND " +
            "(LOWER(u.fullName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            "LOWER(u.email) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<User> searchCustomers(@Param("query") String query, Pageable pageable);

    @Query("SELECT u FROM User u WHERE u.role = 'CUSTOMER' AND " +
            "u.enabled = :enabled")
    List<User> findCustomersByStatus(@Param("enabled") boolean enabled);

    @Query("SELECT u FROM User u WHERE u.role = 'CUSTOMER' AND " +
            "u.accountLocked = true")
    List<User> findLockedCustomers();

    @Query("SELECT u FROM User u WHERE u.role = 'CUSTOMER' AND " +
            "u.emailVerified = false")
    List<User> findUnverifiedCustomers();
} 