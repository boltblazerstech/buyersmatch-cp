package com.buyersmatch.services;

import com.buyersmatch.dto.AdminLoginRequest;
import com.buyersmatch.dto.AdminLoginResponse;
import com.buyersmatch.entities.AdminUser;
import com.buyersmatch.repositories.AdminUserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class AdminAuthService {

    private final AdminUserRepository adminUserRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final EmailService emailService;

    @Value("${frontend.url:http://localhost:5173}")
    private String frontendUrl;

    // -------------------------------------------------------------------------
    // LOGIN / LOGOUT / SESSION
    // -------------------------------------------------------------------------

    public AdminLoginResponse login(AdminLoginRequest request) {
        AdminUser admin = adminUserRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), admin.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        String sessionToken = UUID.randomUUID().toString();
        if (admin.getSessionTokens() == null) {
            admin.setSessionTokens(new ArrayList<>());
        }
        admin.getSessionTokens().add(sessionToken);
        adminUserRepository.save(admin);

        log.info("Admin logged in: {}", admin.getEmail());

        return AdminLoginResponse.builder()
                .adminId(admin.getId())
                .email(admin.getEmail())
                .fullName(admin.getFullName())
                .sessionToken(sessionToken)
                .isSuperAdmin(admin.getIsSuperAdmin())
                .onboardingLimit(admin.getOnboardingLimit())
                .build();
    }

    public void logout(String sessionToken) {
        adminUserRepository.findBySessionTokensContaining(sessionToken).ifPresent(admin -> {
            admin.getSessionTokens().remove(sessionToken);
            adminUserRepository.save(admin);
            log.info("Admin logged out: {}", admin.getEmail());
        });
    }

    public AdminUser validateSession(String sessionToken) {
        if (sessionToken == null || sessionToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing session token");
        }
        return adminUserRepository.findBySessionTokensContaining(sessionToken)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid or expired session token"));
    }

    public void changePassword(String sessionToken, String currentPassword, String newPassword) {
        AdminUser admin = validateSession(sessionToken);

        if (!passwordEncoder.matches(currentPassword, admin.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect");
        }

        admin.setPasswordHash(passwordEncoder.encode(newPassword));
        admin.getSessionTokens().clear();
        adminUserRepository.save(admin);
        log.info("Admin changed password: {}", admin.getEmail());
    }

    // -------------------------------------------------------------------------
    // FORGOT PASSWORD
    // -------------------------------------------------------------------------

    @Transactional
    public void requestAdminPasswordReset(String email) {
        String normalised = email.toLowerCase().trim();
        Optional<AdminUser> adminOpt = adminUserRepository.findByEmail(normalised);
        if (adminOpt.isEmpty()) {
            log.info("Password reset requested for unknown admin email: {}", normalised);
            return;
        }

        AdminUser admin = adminOpt.get();
        String token = UUID.randomUUID().toString();
        admin.setPasswordResetToken(token);
        admin.setPasswordResetTokenExpiry(LocalDateTime.now().plusMinutes(30));
        adminUserRepository.save(admin);

        String name = admin.getFullName() != null ? admin.getFullName() : normalised;
        String resetUrl = frontendUrl + "/admin/reset-password?token=" + token;
        try {
            emailService.sendAdminPasswordResetEmail(normalised, name, resetUrl);
        } catch (Exception e) {
            log.error("Failed to send admin password reset email to {}: {}", normalised, e.getMessage());
        }
        log.info("Admin password reset token generated for: {}", normalised);
    }

    @Transactional(readOnly = true)
    public Map<String, String> verifyAdminResetToken(String token) {
        AdminUser admin = adminUserRepository.findByPasswordResetToken(token)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Reset link is invalid or has already been used"));

        if (admin.getPasswordResetTokenExpiry() == null ||
                LocalDateTime.now().isAfter(admin.getPasswordResetTokenExpiry())) {
            throw new ResponseStatusException(HttpStatus.GONE,
                    "Reset link has expired. Please request a new one.");
        }

        return Map.of("email", admin.getEmail());
    }

    public Map<String, Object> getAdminMe(String sessionToken) {
        AdminUser admin = validateSession(sessionToken);
        return Map.of(
                "adminId", admin.getId().toString(),
                "email", admin.getEmail(),
                "fullName", admin.getFullName() != null ? admin.getFullName() : "",
                "isSuperAdmin", admin.getIsSuperAdmin() != null ? admin.getIsSuperAdmin() : false,
                "onboardingLimit", admin.getOnboardingLimit() != null ? admin.getOnboardingLimit() : 0
        );
    }

    @Transactional
    public void resetAdminPassword(String token, String newPassword) {
        AdminUser admin = adminUserRepository.findByPasswordResetToken(token)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Reset link is invalid or has already been used"));

        if (admin.getPasswordResetTokenExpiry() == null ||
                LocalDateTime.now().isAfter(admin.getPasswordResetTokenExpiry())) {
            throw new ResponseStatusException(HttpStatus.GONE,
                    "Reset link has expired. Please request a new one.");
        }

        admin.setPasswordHash(passwordEncoder.encode(newPassword));
        admin.setPasswordResetToken(null);
        admin.setPasswordResetTokenExpiry(null);
        admin.getSessionTokens().clear();
        adminUserRepository.save(admin);
        log.info("Admin password reset via token: {}", admin.getEmail());
    }
}
