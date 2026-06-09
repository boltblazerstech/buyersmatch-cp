package com.buyersmatch.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class AdminLoginResponse {
    private UUID adminId;
    private String email;
    private String fullName;
    private String sessionToken;
    private Boolean isSuperAdmin;
    private Integer onboardingLimit;
}
