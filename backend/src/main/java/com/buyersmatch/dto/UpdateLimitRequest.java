package com.buyersmatch.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateLimitRequest {
    @NotNull(message = "New limit must be provided")
    private Integer newLimit;
}
