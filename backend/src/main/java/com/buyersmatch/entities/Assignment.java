package com.buyersmatch.entities;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "assignments")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Assignment {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(unique = true, nullable = false)
    private String zohoAssignmentId;

    private String zohoContactId;
    private String zohoPropertyId;
    private String zohoBriefId;

    private String zohoStatus;
    private String portalStatus;

    private String jointBuyersName;
    private String secondaryBuyerEmail;

    private String financeOption;
    private String financeStatus;
    private String financeDate;

    private String contractStatus;
    private String contractDate;
    private String contractSettlementDate;
    private String settlementDate;

    private BigDecimal offerAmount;
    private String offerDate;
    private BigDecimal purchasePrice;
    private BigDecimal depositAmount;
    private BigDecimal depositPercentage;
    private String depositDueDate;

    @Column(columnDefinition = "text")
    private String bnpReportLink;

    @Column(columnDefinition = "text")
    private String financeLetterLink;

    @Column(columnDefinition = "text")
    private String contractDownloadLink;

    @Column(columnDefinition = "text")
    private String docusignLink;

    @Column(columnDefinition = "text")
    private String cashflowDocLink;

    private BigDecimal currentWeeklyRent;
    private Double rentalYield;
    private String realEstateAgentName;

    @Column(name = "walkthrough_requested", nullable = false)
    private boolean walkthroughRequested = false;

    @Column(name = "client_notes", columnDefinition = "text")
    private String clientNotes;

    @Column(name = "agent_notes", columnDefinition = "text")
    private String agentNotes;

    private String zohoCreatedAt;
    private String zohoModifiedAt;
    private LocalDateTime syncedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
