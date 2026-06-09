package com.buyersmatch.services;

import com.buyersmatch.dto.AdminLoginRequest;
import com.buyersmatch.dto.AdminLoginResponse;
import com.buyersmatch.entities.AdminUser;
import com.buyersmatch.repositories.AdminUserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class AdminAuthService {

    private final AdminUserRepository adminUserRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    public AdminLoginResponse login(AdminLoginRequest request) {
        AdminUser admin = adminUserRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), admin.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        String sessionToken = UUID.randomUUID().toString();
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
        admin.getSessionTokens().clear(); // invalidate all sessions after password change
        adminUserRepository.save(admin);
        log.info("Admin changed password: {}", admin.getEmail());
    }
}
