package com.buyersmatch.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ForgotPasswordRequest {

    @NotBlank(message = "email is required")
    @Email(message = "email must be a valid email address")
    private String email;
}
