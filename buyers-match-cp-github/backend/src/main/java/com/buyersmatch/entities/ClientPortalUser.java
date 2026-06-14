package com.buyersmatch.entities;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
    name = "client_portal_users",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_portal_users_login_email", columnNames = "login_email"),
        @UniqueConstraint(name = "uk_portal_users_buyer_brief_id", columnNames = "buyer_brief_id")
    },
    indexes = {
        @Index(name = "idx_portal_users_login_email", columnList = "login_email"),
        @Index(name = "idx_portal_users_buyer_brief_id", columnList = "buyer_brief_id"),
        @Index(name = "idx_portal_users_status", columnList = "status")
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClientPortalUser {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "buyer_brief_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private BuyerBrief buyerBrief;

    @Column(unique = true)
    private String zohoContactId;

    @Column(name = "login_email", nullable = false)
    private String loginEmail;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(nullable = false)
    @Builder.Default
    private String status = "not_onboarded";

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    @Column(name = "password_reset_token")
    private String passwordResetToken;

    @Column(name = "password_reset_token_expiry")
    private LocalDateTime passwordResetTokenExpiry;

    @Column(name = "failed_login_attempts")
    @Builder.Default
    private Integer failedLoginAttempts = 0;

    @Column(name = "locked_until")
    private LocalDateTime lockedUntil;

    @Column(name = "source_password")
    private String sourcePassword;

    @Column(name = "invite_token", unique = true)
    private String inviteToken;

    @Column(columnDefinition = "text")
    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
