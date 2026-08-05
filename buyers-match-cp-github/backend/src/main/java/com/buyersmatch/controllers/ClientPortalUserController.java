package com.buyersmatch.controllers;

import com.buyersmatch.dto.*;
import com.buyersmatch.services.ClientPortalUserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/portal-users")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class ClientPortalUserController {

    private final ClientPortalUserService clientPortalUserService;
    private final com.buyersmatch.repositories.AdminUserRepository adminUserRepository;

    @PostMapping("/onboard")
    public ResponseEntity<Map<String, Object>> onboard(
            @Valid @RequestBody OnboardClientRequest request,
            jakarta.servlet.http.HttpServletRequest httpRequest) {

        com.buyersmatch.entities.AdminUser adminUser = (com.buyersmatch.entities.AdminUser) httpRequest.getAttribute("adminUser");
        if (adminUser != null) {
            int remaining = adminUser.getOnboardingLimit() != null ? adminUser.getOnboardingLimit() : 0;
            if (remaining <= 0) {
                throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Onboarding limit reached. Please purchase more credits to onboard additional clients.");
            }
            adminUser.setOnboardingLimit(remaining - 1);
            adminUserRepository.save(adminUser);
        }

        ClientPortalUserResponse response = clientPortalUserService.onboardClient(request);
        return ResponseEntity.ok(Map.of("success", true, "data", response));
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAll(
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(Map.of("success", true, "data",
                clientPortalUserService.getAllPortalUsers(status)));
    }

    @GetMapping("/{buyerBriefId}")
    public ResponseEntity<Map<String, Object>> getOne(@PathVariable UUID buyerBriefId) {
        return ResponseEntity.ok(Map.of("success", true, "data",
                clientPortalUserService.getPortalUser(buyerBriefId)));
    }

    @PatchMapping("/{buyerBriefId}/deactivate")
    public ResponseEntity<Map<String, Object>> deactivate(@PathVariable UUID buyerBriefId) {
        return ResponseEntity.ok(Map.of("success", true, "data",
                clientPortalUserService.deactivateClient(buyerBriefId)));
    }

    @PatchMapping("/{buyerBriefId}/reactivate")
    public ResponseEntity<Map<String, Object>> reactivate(@PathVariable UUID buyerBriefId) {
        return ResponseEntity.ok(Map.of("success", true, "data",
                clientPortalUserService.reactivateClient(buyerBriefId)));
    }

    @DeleteMapping("/{buyerBriefId}")
    public ResponseEntity<Map<String, Object>> unboard(
            @PathVariable UUID buyerBriefId,
            jakarta.servlet.http.HttpServletRequest httpRequest) {

        com.buyersmatch.entities.AdminUser adminUser = (com.buyersmatch.entities.AdminUser) httpRequest.getAttribute("adminUser");
        if (adminUser != null && !Boolean.TRUE.equals(adminUser.getIsSuperAdmin())) {
            throw new IllegalStateException("Standard admins cannot delete clients. You may only deactivate them.");
        }

        clientPortalUserService.deletePortalUser(buyerBriefId);
        return ResponseEntity.ok(Map.of("success", true, "message", "Client unboarded successfully"));
    }

    @PatchMapping("/{buyerBriefId}/email")
    public ResponseEntity<Map<String, Object>> updateEmail(
            @PathVariable UUID buyerBriefId,
            @Valid @RequestBody UpdatePortalUserRequest request) {
        return ResponseEntity.ok(Map.of("success", true, "data",
                clientPortalUserService.updateLoginEmail(buyerBriefId, request.getLoginEmail())));
    }

    @PatchMapping("/{buyerBriefId}/reset-password")
    public ResponseEntity<Map<String, Object>> resetPassword(
            @PathVariable UUID buyerBriefId,
            @Valid @RequestBody AdminResetPasswordRequest request) {
        return ResponseEntity.ok(Map.of("success", true, "data",
                clientPortalUserService.resetPasswordByAdmin(buyerBriefId, request)));
    }

    // TODO: Secure with client JWT — buyerBriefId will come from token claims
    @PatchMapping("/{buyerBriefId}/change-password")
    public ResponseEntity<Map<String, Object>> changePassword(
            @PathVariable UUID buyerBriefId,
            @Valid @RequestBody ChangePasswordRequest request) {
        return ResponseEntity.ok(Map.of("success", true, "data",
                clientPortalUserService.changePasswordByClient(buyerBriefId, request)));
    }

    // -------------------------------------------------------------------------
    // EXCEPTION HANDLER
    // -------------------------------------------------------------------------

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(Map.of("success", false, "error", ex.getMessage()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalState(IllegalStateException ex) {
        return ResponseEntity.badRequest().body(Map.of("success", false, "error", ex.getMessage()));
    }
}
