package com.buyersmatch.repositories;

import com.buyersmatch.entities.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    List<Notification> findAllByZohoContactIdOrderByCreatedAtDesc(String zohoContactId);

    List<Notification> findAllByZohoContactIdAndIsReadFalse(String zohoContactId);

    long countByZohoContactIdAndIsReadFalse(String zohoContactId);

    Optional<Notification> findByZohoAssignmentIdAndType(String zohoAssignmentId, String type);

    void deleteAllByZohoContactId(String zohoContactId);
}
