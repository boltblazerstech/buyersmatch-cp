package com.buyersmatch.repositories;

import com.buyersmatch.entities.PropertyDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PropertyDocumentRepository extends JpaRepository<PropertyDocument, UUID> {
    Optional<PropertyDocument> findByZohoDocId(String zohoDocId);
    List<PropertyDocument> findAllByZohoPropertyId(String zohoPropertyId);
    List<PropertyDocument> findAllByR2UrlIsNullAndCrmDownloadUrlIsNotNull();
    List<PropertyDocument> findAllByR2UrlIsNullAndCrmDownloadUrlIsNullAndDownloadLinkIsNotNull();
    void deleteAllByZohoPropertyId(String zohoPropertyId);
}
