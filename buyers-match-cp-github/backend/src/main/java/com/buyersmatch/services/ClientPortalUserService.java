package com.buyersmatch.services;

import com.buyersmatch.dto.*;
import com.buyersmatch.entities.BuyerBrief;
import com.buyersmatch.entities.ClientPortalUser;
import com.buyersmatch.repositories.BuyerBriefRepository;
import com.buyersmatch.repositories.ClientPortalUserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class ClientPortalUserService {

    private final ClientPortalUserRepository portalUserRepository;
    private final BuyerBriefRepository buyerBriefRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final ZohoSyncService zohoSyncService;
    private final EmailService emailService;

    private static final String CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    // -------------------------------------------------------------------------

    private String generateRandomPassword() {
        StringBuilder sb = new StringBuilder(10);
        for (int i = 0; i < 10; i++) {
            sb.append(CHARS.charAt(RANDOM.nextInt(CHARS.length())));
        }
        return sb.toString();
    }

    private BuyerBrief requireBuyerBrief(UUID buyerBriefId) {
        return buyerBriefRepository.findById(buyerBriefId)
                .orElseThrow(() -> new IllegalArgumentException("BuyerBrief not found: " + buyerBriefId));
    }

    private ClientPortalUser requirePortalUser(UUID buyerBriefId) {
        return portalUserRepository.findByBuyerBriefId(buyerBriefId)
                .orElseThrow(() -> new IllegalArgumentException("Portal user not found for buyerBriefId: " + buyerBriefId));
    }

    // -------------------------------------------------------------------------
    // ONBOARD
    // -------------------------------------------------------------------------

    public ClientPortalUserResponse onboardClient(OnboardClientRequest request) {
        BuyerBrief brief = requireBuyerBrief(request.getBuyerBriefId());

        if (portalUserRepository.findByBuyerBriefId(request.getBuyerBriefId()).isPresent()) {
            throw new IllegalStateException("Client is already onboarded for buyerBriefId: " + request.getBuyerBriefId());
        }

        String loginEmail = (request.getLoginEmail() != null && !request.getLoginEmail().isBlank())
                ? request.getLoginEmail()
                : brief.getEmail();

        if (loginEmail != null) {
            loginEmail = loginEmail.toLowerCase().trim();
        }

        if (loginEmail == null || loginEmail.isBlank()) {
            throw new IllegalArgumentException("No login email available — BuyerBrief has no email and none was provided");
        }

        if (portalUserRepository.findByLoginEmail(loginEmail).isPresent()) {
            throw new IllegalStateException("Login email already in use: " + loginEmail);
        }

        boolean passwordProvided = request.getPassword() != null && !request.getPassword().isBlank();
        String plainPassword = passwordProvided ? request.getPassword() : generateRandomPassword();

        String inviteToken = java.util.UUID.randomUUID().toString();

        ClientPortalUser user = ClientPortalUser.builder()
                .buyerBrief(brief)
                .loginEmail(loginEmail)
                .passwordHash(passwordEncoder.encode(plainPassword))
                .sourcePassword(plainPassword)
                .status("onboarded")
                .zohoContactId(request.getZohoContactId() != null ? request.getZohoContactId() : brief.getZohoContactId())
                .notes(request.getNotes())
                .inviteToken(inviteToken)
                .build();

        portalUserRepository.save(user);
        log.info("Onboarded client: buyerBriefId={}, loginEmail={}", request.getBuyerBriefId(), loginEmail);

        // Immediately queue R2 uploads for this client's existing property assignments
        CompletableFuture.runAsync(zohoSyncService::uploadMissingR2Documents);

        if (request.isSendEmail()) {
            String clientName = brief.getFullName() != null ? brief.getFullName() : brief.getZohoName();
            if (clientName == null || clientName.isBlank()) clientName = loginEmail;
            try {
                emailService.sendPortalInviteEmail(loginEmail, clientName, plainPassword, inviteToken);
            } catch (Exception e) {
                log.warn("Onboarding email failed for {}: {}", loginEmail, e.getMessage());
            }
        }

        // Plain password returned only at onboard time — never stored
        String passwordToReturn = passwordProvided ? null : plainPassword;
        return ClientPortalUserResponse.from(user, passwordToReturn);
    }

    // -------------------------------------------------------------------------
    // DEACTIVATE / REACTIVATE
    // -------------------------------------------------------------------------

    public ClientPortalUserResponse deactivateClient(UUID buyerBriefId) {
        ClientPortalUser user = requirePortalUser(buyerBriefId);
        user.setStatus("deactivated");
        portalUserRepository.save(user);
        log.info("Deactivated portal user: buyerBriefId={}", buyerBriefId);
        return ClientPortalUserResponse.from(user);
    }

    public ClientPortalUserResponse reactivateClient(UUID buyerBriefId) {
        ClientPortalUser user = requirePortalUser(buyerBriefId);
        user.setStatus("onboarded");
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        portalUserRepository.save(user);
        log.info("Reactivated portal user: buyerBriefId={}", buyerBriefId);
        CompletableFuture.runAsync(zohoSyncService::uploadMissingR2Documents);
        return ClientPortalUserResponse.from(user);
    }

    public void deletePortalUser(UUID buyerBriefId) {
        ClientPortalUser user = requirePortalUser(buyerBriefId);
        portalUserRepository.delete(user);
        log.info("Deleted portal user (unboarded): buyerBriefId={}", buyerBriefId);
    }

    // -------------------------------------------------------------------------
    // UPDATE EMAIL
    // -------------------------------------------------------------------------

    public ClientPortalUserResponse updateLoginEmail(UUID buyerBriefId, String newEmail) {
        ClientPortalUser user = requirePortalUser(buyerBriefId);

        String loginEmail = newEmail.toLowerCase().trim();
        if (portalUserRepository.findByLoginEmail(loginEmail)
                .filter(existing -> !existing.getId().equals(user.getId()))
                .isPresent()) {
            throw new IllegalStateException("Login email already in use: " + loginEmail);
        }

        user.setLoginEmail(loginEmail);
        portalUserRepository.save(user);
        log.info("Updated login email for buyerBriefId={} to {}", buyerBriefId, newEmail);
        return ClientPortalUserResponse.from(user);
    }

    // -------------------------------------------------------------------------
    // PASSWORD — ADMIN RESET
    // -------------------------------------------------------------------------

    public ClientPortalUserResponse resetPasswordByAdmin(UUID buyerBriefId, AdminResetPasswordRequest request) {
        ClientPortalUser user = requirePortalUser(buyerBriefId);

        boolean passwordProvided = request.getNewPassword() != null && !request.getNewPassword().isBlank();
        String plainPassword = passwordProvided ? request.getNewPassword() : generateRandomPassword();

        user.setPasswordHash(passwordEncoder.encode(plainPassword));
        user.setSourcePassword(plainPassword);
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        user.setPasswordResetToken(null);
        user.setPasswordResetTokenExpiry(null);
        portalUserRepository.save(user);
        log.info("Admin reset password for buyerBriefId={}", buyerBriefId);

        // Return the plain password so admin can share it with the client
        return ClientPortalUserResponse.from(user, plainPassword);
    }

    // -------------------------------------------------------------------------
    // PASSWORD — CLIENT CHANGE
    // -------------------------------------------------------------------------

    public ClientPortalUserResponse changePasswordByClient(UUID buyerBriefId, ChangePasswordRequest request) {
        // TODO: This endpoint will be protected by client JWT auth — buyerBriefId
        //       will be extracted from the JWT claims, not from the path variable
        ClientPortalUser user = requirePortalUser(buyerBriefId);

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Current password is incorrect");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setSourcePassword(request.getNewPassword());
        portalUserRepository.save(user);
        log.info("Client changed password for buyerBriefId={}", buyerBriefId);
        return ClientPortalUserResponse.from(user);
    }

    // -------------------------------------------------------------------------
    // QUERIES
    // -------------------------------------------------------------------------

    // -------------------------------------------------------------------------
    // PASSWORD — RESET BY USER ID (portal user's own UUID, not buyerBriefId)
    // -------------------------------------------------------------------------

    @Transactional
    public String resetPasswordByUserId(UUID userId, String requestedPassword, boolean sendEmail) {
        ClientPortalUser user = portalUserRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Portal user not found: " + userId));
        String plainPassword = (requestedPassword != null && !requestedPassword.isBlank())
                ? requestedPassword : generateRandomPassword();
        user.setPasswordHash(passwordEncoder.encode(plainPassword));
        user.setSourcePassword(plainPassword);
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        portalUserRepository.save(user);
        log.info("Admin reset password by userId={}", userId);

        if (sendEmail) {
            BuyerBrief brief = user.getBuyerBrief();
            String clientName = brief != null && brief.getFullName() != null ? brief.getFullName()
                    : brief != null ? brief.getZohoName() : null;
            if (clientName == null || clientName.isBlank()) clientName = user.getLoginEmail();
            try {
                emailService.sendCredentialsUpdateEmail(user.getLoginEmail(), clientName, plainPassword);
            } catch (Exception e) {
                log.warn("Credentials update email failed for {}: {}", user.getLoginEmail(), e.getMessage());
            }
        }

        return plainPassword;
    }

    // -------------------------------------------------------------------------
    // QUERIES
    // -------------------------------------------------------------------------

    public List<ClientPortalUserResponse> getAllPortalUsers(String status) {
        List<ClientPortalUser> users = (status != null && !status.isBlank())
                ? portalUserRepository.findByStatus(status)
                : portalUserRepository.findAll();

        return users.stream()
                .map(ClientPortalUserResponse::from)
                .collect(Collectors.toList());
    }

    public ClientPortalUserResponse getPortalUser(UUID buyerBriefId) {
        return ClientPortalUserResponse.from(requirePortalUser(buyerBriefId));
    }
}
