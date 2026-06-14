package com.buyersmatch.repositories;

import com.buyersmatch.entities.Property;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface PropertyRepository extends JpaRepository<Property, UUID> {
    Optional<Property> findByZohoPropertyId(String zohoPropertyId);
}
