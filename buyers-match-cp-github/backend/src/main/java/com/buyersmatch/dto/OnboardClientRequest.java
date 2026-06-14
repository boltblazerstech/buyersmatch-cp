package com.buyersmatch.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class OnboardClientRequest {

    @NotNull(message = "buyerBriefId is required")
    private UUID buyerBriefId;

    @Email(message = "loginEmail must be a valid email address")
    private String loginEmail; // optional — defaults to buyer_brief.email

    @NotBlank(message = "password is required")
    private String password;

    private String zohoContactId;    // optional — links portal user to Zoho contact
    private String notes;            // optional
    private boolean sendEmail = false; // optional — send portal credentials email to client
}
