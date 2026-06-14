package com.buyersmatch.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class UpdateAssignmentStatusRequest {

    @NotBlank(message = "status is required")
    @Pattern(
            regexp = "ACCEPTED|REJECTED|PURCHASED|PENDING",
            message = "status must be one of: ACCEPTED, REJECTED, PURCHASED, PENDING"
    )
    private String status;
}
