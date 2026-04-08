package com.buyersmatch.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class AuthLoginResponse {
    private UUID id;
    private String email;
    private String fullName;
    private String greetingName;
    private String role;            // "CLIENT" or "ADMIN"
    private UUID clientId;          // buyer_brief.id — only set for CLIENT, null for ADMIN
    private String zohoContactId;   // zoho contact id — only set for CLIENT, null for ADMIN
}
