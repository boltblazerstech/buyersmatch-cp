package com.buyersmatch.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdatePortalUserRequest {

    @NotBlank(message = "loginEmail is required")
    @Email(message = "loginEmail must be a valid email address")
    private String loginEmail;
}
