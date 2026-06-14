package com.buyersmatch.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AdminResetPasswordRequest {

    @NotBlank(message = "newPassword is required")
    private String newPassword;
}
