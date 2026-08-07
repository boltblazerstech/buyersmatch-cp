package com.buyersmatch.services;

import com.buyersmatch.dto.AuthLoginRequest;
import com.buyersmatch.dto.AuthLoginResponse;
import com.buyersmatch.entities.AdminUser;
import com.buyersmatch.entities.BuyerBrief;
import com.buyersmatch.entities.ClientPortalUser;
import com.buyersmatch.repositories.AdminUserRepository;
import com.buyersmatch.repositories.ClientPortalUserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class AuthService {

    private final ClientPortalUserRepository clientPortalUserRepository;
    private final AdminUserRepository adminUserRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final EmailService emailService;

    @Value("${frontend.url:http://localhost:5173}")
    private String frontendUrl;

    // -------------------------------------------------------------------------
    // LOGIN
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public AuthLoginResponse login(AuthLoginRequest request) {
        String email = request.getEmail() != null ? request.getEmail().toLowerCase().trim() : "";

        Optional<ClientPortalUser> clientOpt = clientPortalUserRepository.findByLoginEmail(email);

        if (clientOpt.isPresent()) {
            ClientPortalUser user = clientOpt.get();

            if (!checkPassword(request.getPassword(), user)) {
                log.warn("Failed client login attempt (wrong password): {}", email);
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
            }

            if ("deactivated".equals(user.getStatus())) {
                log.warn("Attempt to login deactivated account: {}", email);
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "Account is deactivated. Contact your agent.");
            }

            log.info("Client successfully logged in: {}", email);

            return AuthLoginResponse.builder()
                    .id(user.getId())
                    .email(user.getLoginEmail())
                    .fullName(
                            user.getBuyerBrief() != null
                                    ? (user.getBuyerBrief().getFullName() != null ? user.getBuyerBrief().getFullName()
                                            : user.getBuyerBrief().getZohoName())
                                    : null)
                    .greetingName(user.getBuyerBrief() != null ? user.getBuyerBrief().getGreetingName() : null)
                    .role("CLIENT")
                    .clientId(user.getBuyerBrief() != null ? user.getBuyerBrief().getId() : null)
                    .zohoContactId(user.getZohoContactId())
                    .build();
        }

        // Fallback: check admin_users (unified login — as documented in API.md)
        Optional<AdminUser> adminOpt = adminUserRepository.findByEmail(email);
        if (adminOpt.isPresent()) {
            AdminUser admin = adminOpt.get();
            if (!passwordEncoder.matches(request.getPassword(), admin.getPasswordHash())) {
                log.warn("Failed admin login attempt via unified login (wrong password): {}", email);
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
            }
            log.info("Admin successfully logged in via unified login: {}", email);
            return AuthLoginResponse.builder()
                    .id(admin.getId())
                    .email(admin.getEmail())
                    .fullName(admin.getFullName())
                    .role("ADMIN")
                    .clientId(null)
                    .zohoContactId(null)
                    .build();
        }

        log.warn("Failed login attempt (email not found): {}", email);
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
    }

    // -------------------------------------------------------------------------
    // INVITE TOKEN — set password via invite link
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public Map<String, String> verifyInviteToken(String token) {
        ClientPortalUser user = clientPortalUserRepository.findByInviteToken(token)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Invite link is invalid or has already been used"));
        return Map.of("email", user.getLoginEmail());
    }

    @Transactional
    public void setPasswordViaInvite(String token, String newPassword) {
        ClientPortalUser user = clientPortalUserRepository.findByInviteToken(token)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Invite link is invalid or has already been used"));

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setSourcePassword(newPassword);
        user.setInviteToken(null);
        clientPortalUserRepository.save(user);
        log.info("Client set password via invite link: {}", user.getLoginEmail());
    }

    // -------------------------------------------------------------------------
    // FORGOT PASSWORD — client
    // -------------------------------------------------------------------------

    @Transactional
    public void requestClientPasswordReset(String email) {
        String normalised = email.toLowerCase().trim();
        Optional<ClientPortalUser> userOpt = clientPortalUserRepository.findByLoginEmail(normalised);
        if (userOpt.isEmpty()) {
            // Don't reveal whether the email exists — silently succeed
            log.info("Password reset requested for unknown client email: {}", normalised);
            return;
        }

        ClientPortalUser user = userOpt.get();
        String token = UUID.randomUUID().toString();
        user.setPasswordResetToken(token);
        user.setPasswordResetTokenExpiry(LocalDateTime.now().plusMinutes(30));
        clientPortalUserRepository.save(user);

        BuyerBrief brief = user.getBuyerBrief();
        String name = brief != null && brief.getFullName() != null ? brief.getFullName()
                : brief != null ? brief.getZohoName() : null;
        if (name == null || name.isBlank()) name = normalised;

        String resetUrl = frontendUrl + "/reset-password?token=" + token;
        try {
            emailService.sendClientPasswordResetEmail(normalised, name, resetUrl);
        } catch (Exception e) {
            log.error("Failed to send client password reset email to {}: {}", normalised, e.getMessage());
        }
        log.info("Client password reset token generated for: {}", normalised);
    }

    @Transactional(readOnly = true)
    public Map<String, String> verifyClientResetToken(String token) {
        ClientPortalUser user = clientPortalUserRepository.findByPasswordResetToken(token)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Reset link is invalid or has already been used"));

        if (user.getPasswordResetTokenExpiry() == null ||
                LocalDateTime.now().isAfter(user.getPasswordResetTokenExpiry())) {
            throw new ResponseStatusException(HttpStatus.GONE,
                    "Reset link has expired. Please request a new one.");
        }

        return Map.of("email", user.getLoginEmail());
    }

    @Transactional
    public void resetClientPassword(String token, String newPassword) {
        ClientPortalUser user = clientPortalUserRepository.findByPasswordResetToken(token)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Reset link is invalid or has already been used"));

        if (user.getPasswordResetTokenExpiry() == null ||
                LocalDateTime.now().isAfter(user.getPasswordResetTokenExpiry())) {
            throw new ResponseStatusException(HttpStatus.GONE,
                    "Reset link has expired. Please request a new one.");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setSourcePassword(newPassword);
        user.setPasswordResetToken(null);
        user.setPasswordResetTokenExpiry(null);
        clientPortalUserRepository.save(user);
        log.info("Client password reset via token: {}", user.getLoginEmail());
    }

    // -------------------------------------------------------------------------
    // PRIVATE HELPERS
    // -------------------------------------------------------------------------

    private boolean checkPassword(String inputPassword, ClientPortalUser user) {
        if (inputPassword != null && inputPassword.equals(user.getSourcePassword())) {
            return true;
        }
        try {
            return passwordEncoder.matches(inputPassword, user.getPasswordHash());
        } catch (Exception e) {
            return false;
        }
    }
}
