package com.buyersmatch.repositories;

import com.buyersmatch.entities.SyncLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface SyncLogRepository extends JpaRepository<SyncLog, UUID> {
    List<SyncLog> findAllByModuleOrderByStartedAtDesc(String module);
    List<SyncLog> findTop10ByOrderByStartedAtDesc();
    List<SyncLog> findByModuleInAndStartedAtAfterOrderByStartedAtDesc(Collection<String> modules, LocalDateTime after);
}
