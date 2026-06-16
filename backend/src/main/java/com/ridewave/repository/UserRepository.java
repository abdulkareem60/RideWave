package com.ridewave.repository;

import com.ridewave.model.User;
import com.ridewave.model.enums.UserRole;
import com.ridewave.model.enums.UserStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    Optional<User> findByPhone(String phone);

    boolean existsByEmail(String email);

    boolean existsByPhone(String phone);

    Page<User> findByRole(UserRole role, Pageable pageable);

    Page<User> findByStatus(UserStatus status, Pageable pageable);

    @Query("""
           SELECT u FROM User u
           WHERE (:role   IS NULL OR u.role   = :role)
             AND (:status IS NULL OR u.status = :status)
             AND (:search IS NULL
                  OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :search, '%'))
                  OR LOWER(u.email)    LIKE LOWER(CONCAT('%', :search, '%')))
           ORDER BY u.createdAt DESC
           """)
    Page<User> searchUsers(@Param("role")   UserRole   role,
                           @Param("status") UserStatus status,
                           @Param("search") String     search,
                           Pageable pageable);

    /** Atomically update trust score — called by TrustScoreService. */
    @Modifying
    @Query("UPDATE User u SET u.trustScore = :score, u.updatedAt = CURRENT_TIMESTAMP WHERE u.userId = :userId")
    int updateTrustScore(@Param("userId") UUID userId, @Param("score") BigDecimal score);

    @Modifying
    @Query("UPDATE User u SET u.status = :status, u.updatedAt = CURRENT_TIMESTAMP WHERE u.userId = :userId")
    int updateStatus(@Param("userId") UUID userId, @Param("status") UserStatus status);

    @Modifying
    @Query("UPDATE User u SET u.profilePic = :url, u.updatedAt = CURRENT_TIMESTAMP WHERE u.userId = :userId")
    int updateProfilePic(@Param("userId") UUID userId, @Param("url") String url);

    @Modifying
    @Query("UPDATE User u SET u.emailVerified = true, u.updatedAt = CURRENT_TIMESTAMP WHERE u.userId = :userId")
    int markEmailVerified(@Param("userId") UUID userId);

    @Modifying
    @Query("UPDATE User u SET u.phoneVerified = true, u.updatedAt = CURRENT_TIMESTAMP WHERE u.userId = :userId")
    int markPhoneVerified(@Param("userId") UUID userId);

    @Modifying
    @Query("UPDATE User u SET u.passwordHash = :hash, u.updatedAt = CURRENT_TIMESTAMP WHERE u.userId = :userId")
    int updatePasswordHash(@Param("userId") UUID userId, @Param("hash") String hash);

    long countByRole(UserRole role);

    long countByStatus(UserStatus status);

    /** Average trust score across all active users — used in admin analytics. */
    @Query("SELECT AVG(u.trustScore) FROM User u WHERE u.status = 'ACTIVE'")
    Optional<BigDecimal> findAverageTrustScore();
}