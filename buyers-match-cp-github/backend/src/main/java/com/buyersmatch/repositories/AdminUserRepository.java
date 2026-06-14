package com.buyersmatch.repositories;

import com.buyersmatch.entities.AdminUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AdminUserRepository extends JpaRepository<AdminUser, UUID> {
    Optional<AdminUser> findByEmail(String email);
    Optional<AdminUser> findBySessionTokensContaining(String sessionToken);
    Optional<AdminUser> findByPasswordResetToken(String passwordResetToken);
}
