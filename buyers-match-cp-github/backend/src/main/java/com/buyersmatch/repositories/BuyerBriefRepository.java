package com.buyersmatch.repositories;

import com.buyersmatch.entities.BuyerBrief;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BuyerBriefRepository extends JpaRepository<BuyerBrief, UUID> {
    Optional<BuyerBrief> findByZohoBriefId(String zohoBriefId);
    Optional<BuyerBrief> findByZohoContactId(String zohoContactId);
    List<BuyerBrief> findAllByZohoContactId(String zohoContactId);
    Optional<BuyerBrief> findByEmail(String email);
    List<BuyerBrief> findAllByEmail(String email);
}
