package com.buyersmatch.entities;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "sync_state")
@Data
@NoArgsConstructor
public class SyncState {

    @Id
    private String module;

    private LocalDateTime lastSyncedAt;
    private LocalDateTime lastFullSyncAt;
}
