package com.buyersmatch.repositories;

import com.buyersmatch.entities.Assignment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AssignmentRepository extends JpaRepository<Assignment, UUID> {
    Optional<Assignment> findByZohoAssignmentId(String zohoAssignmentId);
    List<Assignment> findAllByZohoContactId(String zohoContactId);
    List<Assignment> findAllByZohoContactIdIn(List<String> zohoContactIds);
    List<Assignment> findAllByZohoPropertyId(String zohoPropertyId);
    List<Assignment> findAllByZohoBriefId(String zohoBriefId);
}
