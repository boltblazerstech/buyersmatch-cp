package com.buyersmatch.entities;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "notifications")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(nullable = false)
    private String zohoContactId;

    private String zohoAssignmentId;

    private String zohoPropertyId;

    @Column(nullable = false)
    private String type;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String message;

    private Boolean isRead = false;

    private LocalDateTime createdAt = LocalDateTime.now();

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getZohoContactId() { return zohoContactId; }
    public void setZohoContactId(String zohoContactId) { this.zohoContactId = zohoContactId; }

    public String getZohoAssignmentId() { return zohoAssignmentId; }
    public void setZohoAssignmentId(String zohoAssignmentId) { this.zohoAssignmentId = zohoAssignmentId; }

    public String getZohoPropertyId() { return zohoPropertyId; }
    public void setZohoPropertyId(String zohoPropertyId) { this.zohoPropertyId = zohoPropertyId; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public Boolean getIsRead() { return isRead; }
    public void setIsRead(Boolean isRead) { this.isRead = isRead; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
