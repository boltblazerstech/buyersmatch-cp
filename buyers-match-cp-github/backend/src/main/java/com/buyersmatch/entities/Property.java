package com.buyersmatch.entities;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "properties")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Property {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(unique = true, nullable = false)
    private String zohoPropertyId;

    @Column(columnDefinition = "text")
    private String address;

    @Column(columnDefinition = "text")
    private String addressLine1;

    private String suburb;
    private String state;
    private String postCode;
    private String propertyType;

    private Integer bedrooms;
    private Integer bathrooms;
    private Integer carParking;
    private Double areaSqm;
    private Integer yearBuilt;
    private Boolean pool;

    private BigDecimal askingPriceMin;
    private BigDecimal askingPriceMax;
    private BigDecimal minRentPerMonth;
    private Double yieldPercent;

    private String status;
    private String saleType;
    private String rentalSituation;
    private String lgaRegion;

    @Column(columnDefinition = "text")
    private String rentalAppraisal;

    private String dateOfListing;

    @Column(columnDefinition = "text")
    private String linkToListing;

    @Column(columnDefinition = "text")
    private String stashLink;

    @Column(columnDefinition = "text")
    private String cmaLink;

    @Column(columnDefinition = "text")
    private String coreLogicLink;

    private String agentName;

    @Column(columnDefinition = "text")
    private String propertyVideoUrl;

    private String zohoCreatedAt;
    private String zohoModifiedAt;
    private LocalDateTime syncedAt;
}
