package com.buyersmatch.controllers;

import com.buyersmatch.dto.UpdateLimitRequest;
import com.buyersmatch.entities.AdminUser;
import com.buyersmatch.repositories.AdminUserRepository;
import com.buyersmatch.services.ClientPortalUserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/super-admin")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class SuperAdminController {

    private final AdminUserRepository adminUserRepository;
    private final ClientPortalUserService clientPortalUserService;

    private void requireSuperAdmin(HttpServletRequest request) {
        AdminUser admin = (AdminUser) request.getAttribute("adminUser");
        if (admin == null || !Boolean.TRUE.equals(admin.getIsSuperAdmin())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access Denied: Super Admin only");
        }
    }

    @GetMapping("/admins")
    public ResponseEntity<Map<String, Object>> getAdmins(HttpServletRequest request) {
        requireSuperAdmin(request);
        long totalClients = clientPortalUserService.getAllPortalUsers(null).size();

        List<Map<String, Object>> admins = adminUserRepository.findAll().stream()
                .filter(a -> !Boolean.TRUE.equals(a.getIsSuperAdmin()))
                .map(a -> {
                    Map<String, Object> map = new java.util.HashMap<>();
                    map.put("id", a.getId());
                    map.put("email", a.getEmail());
                    map.put("fullName", a.getFullName() != null ? a.getFullName() : "");
                    map.put("onboardingLimit", a.getOnboardingLimit() != null ? a.getOnboardingLimit() : 0);
                    map.put("totalOnboarded", totalClients);
                    return map;
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(Map.of("success", true, "data", admins));
    }

    @PostMapping("/admins/{id}/limit")
    public ResponseEntity<Map<String, Object>> updateLimit(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateLimitRequest requestBody,
            HttpServletRequest request) {
        requireSuperAdmin(request);

        AdminUser admin = adminUserRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Admin not found"));

        admin.setOnboardingLimit(requestBody.getNewLimit());
        adminUserRepository.save(admin);

        return ResponseEntity.ok(Map.of("success", true, "message", "Limit updated successfully"));
    }

    @DeleteMapping("/clients/{buyerBriefId}/offboard")
    public ResponseEntity<Map<String, Object>> offboardClient(
            @PathVariable UUID buyerBriefId,
            HttpServletRequest request) {
        requireSuperAdmin(request);
        clientPortalUserService.deletePortalUser(buyerBriefId);
        return ResponseEntity.ok(Map.of("success", true, "message", "Client permanently offboarded"));
    }

    @PostMapping("/clients/onboard")
    public ResponseEntity<Map<String, Object>> onboardClient(
            @Valid @RequestBody com.buyersmatch.dto.OnboardClientRequest requestBody,
            HttpServletRequest request) {
        requireSuperAdmin(request);
        com.buyersmatch.dto.ClientPortalUserResponse response = clientPortalUserService.onboardClient(requestBody);
        return ResponseEntity.ok(Map.of("success", true, "data", response));
    }
}
