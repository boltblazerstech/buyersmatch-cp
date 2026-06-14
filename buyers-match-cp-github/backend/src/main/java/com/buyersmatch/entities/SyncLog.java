package com.buyersmatch.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "sync_log")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SyncLog {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    private String module;
    private String syncType;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private Integer recordsSynced;
    private String status;
    private String errorMessage;
}
