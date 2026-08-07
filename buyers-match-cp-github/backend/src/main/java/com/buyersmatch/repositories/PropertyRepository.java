package com.buyersmatch.repositories;

import com.buyersmatch.entities.Property;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PropertyRepository extends JpaRepository<Property, UUID> {
    Optional<Property> findByZohoPropertyId(String zohoPropertyId);

    // Lightweight: only fetches zohoPropertyId strings, not full Property objects
    @Query("SELECT p.zohoPropertyId FROM Property p WHERE p.zohoPropertyId IS NOT NULL")
    List<String> findAllZohoPropertyIds();

    // Lightweight: only fetches zohoPropertyId for non-rejected properties
    @Query("SELECT p.zohoPropertyId FROM Property p WHERE p.zohoPropertyId IS NOT NULL AND LOWER(p.status) != 'rejected'")
    List<String> findAllValidZohoPropertyIds();
}
