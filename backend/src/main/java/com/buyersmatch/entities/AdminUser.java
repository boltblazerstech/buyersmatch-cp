package com.buyersmatch.entities;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "admin_users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminUser {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "full_name")
    private String fullName;

    @Column(name = "is_super_admin")
    @Builder.Default
    private Boolean isSuperAdmin = false;

    @Column(name = "onboarding_limit")
    @Builder.Default
    private Integer onboardingLimit = 0;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "admin_user_sessions", joinColumns = @JoinColumn(name = "admin_user_id"))
    @Column(name = "session_token")
    @Builder.Default
    private List<String> sessionTokens = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
