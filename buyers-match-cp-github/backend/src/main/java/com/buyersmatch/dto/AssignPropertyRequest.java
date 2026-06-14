package com.buyersmatch.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class AssignPropertyRequest {

    @NotNull(message = "clientId is required")
    private UUID clientId;

    @NotNull(message = "propertyId is required")
    private UUID propertyId;

    @NotNull(message = "briefId is required")
    private UUID briefId;
}
