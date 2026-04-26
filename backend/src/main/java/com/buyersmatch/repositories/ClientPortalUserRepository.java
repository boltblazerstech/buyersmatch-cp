package com.buyersmatch.repositories;

import com.buyersmatch.entities.ClientPortalUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ClientPortalUserRepository extends JpaRepository<ClientPortalUser, UUID> {
    Optional<ClientPortalUser> findByLoginEmail(String loginEmail);
    Optional<ClientPortalUser> findByBuyerBriefId(UUID buyerBriefId);
    List<ClientPortalUser> findByStatus(String status);
    List<ClientPortalUser> findAllByZohoContactIdIsNotNull();

    /**
     * Returns every resolved Zoho contact ID across all portal users (any status).
     */
    @Query("SELECT CASE WHEN u.zohoContactId IS NOT NULL THEN u.zohoContactId " +
           "ELSE u.buyerBrief.zohoContactId END " +
           "FROM ClientPortalUser u " +
           "WHERE u.zohoContactId IS NOT NULL OR u.buyerBrief.zohoContactId IS NOT NULL")
    List<String> findAllResolvedZohoContactIds();

    /**
     * Returns resolved Zoho contact IDs for portal users with the given status only.
     */
    @Query("SELECT CASE WHEN u.zohoContactId IS NOT NULL THEN u.zohoContactId " +
           "ELSE u.buyerBrief.zohoContactId END " +
           "FROM ClientPortalUser u " +
           "WHERE u.status = :status AND " +
           "(u.zohoContactId IS NOT NULL OR u.buyerBrief.zohoContactId IS NOT NULL)")
    List<String> findAllResolvedZohoContactIdsByStatus(@Param("status") String status);
}
