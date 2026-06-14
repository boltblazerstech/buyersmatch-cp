package com.buyersmatch.entities;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "buyer_briefs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BuyerBrief {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(unique = true, nullable = false)
    private String zohoBriefId;

    private String zohoContactId;
    private String zohoName;
    private String fullName;
    private String email;
    private String secondaryEmail;
    private String greetingName;

    private BigDecimal minBudget;
    private BigDecimal maxBudget;
    private BigDecimal availableDeposit;
    private BigDecimal depositEquityPercent;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(columnDefinition = "text[]")
    private String[] propertyTypes;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(columnDefinition = "text[]")
    private String[] preferredStates;

    @Column(columnDefinition = "text")
    private String preferredSuburbs;

    private String bedBathGarage;
    private String landSizeSqm;
    private String timelineToBuy;
    private Boolean preApproved;

    private BigDecimal interestRate;
    private BigDecimal weeklyRent;
    private BigDecimal monthlyHoldingCost;
    private BigDecimal yieldPercent;
    private BigDecimal taxRate;

    private String status;
    private String priority;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(columnDefinition = "text[]")
    private String[] assignedAgents;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(columnDefinition = "text[]")
    private String[] tags;

    private String financerName;
    private Boolean propertyAssigned;

    private String zohoCreatedAt;
    private String zohoModifiedAt;
    private LocalDateTime syncedAt;
}
