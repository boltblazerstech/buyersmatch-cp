package com.buyersmatch.repositories;

import com.buyersmatch.entities.SyncState;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface SyncStateRepository extends JpaRepository<SyncState, String> {
    Optional<SyncState> findByModule(String module);
}
