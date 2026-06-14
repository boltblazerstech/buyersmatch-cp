package com.buyersmatch.dto;

import com.buyersmatch.entities.ClientPortalUser;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class ClientPortalUserResponse {

    private UUID id;
    private UUID buyerBriefId;
    private String fullName;
    private String loginEmail;
    private String status;
    private LocalDateTime lastLoginAt;
    private Integer failedLoginAttempts;
    private LocalDateTime lockedUntil;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private String password;

    // Only populated at onboard time — null on all other responses
    private String generatedPassword;

    public static ClientPortalUserResponse from(ClientPortalUser user) {
        return ClientPortalUserResponse.builder()
                .id(user.getId())
                .buyerBriefId(user.getBuyerBrief().getId())
                .fullName(user.getBuyerBrief().getFullName() != null ? user.getBuyerBrief().getFullName() : user.getBuyerBrief().getZohoName())
                .loginEmail(user.getLoginEmail())
                .status(user.getStatus())
                .lastLoginAt(user.getLastLoginAt())
                .failedLoginAttempts(user.getFailedLoginAttempts())
                .lockedUntil(user.getLockedUntil())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .password(user.getSourcePassword())
                .build();
    }

    public static ClientPortalUserResponse from(ClientPortalUser user, String generatedPassword) {
        ClientPortalUserResponse response = from(user);
        response.setGeneratedPassword(generatedPassword);
        return response;
    }
}
