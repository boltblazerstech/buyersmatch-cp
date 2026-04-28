package com.buyersmatch.entities;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "property_documents")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PropertyDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(unique = true, nullable = false)
    private String zohoDocId;

    private String zohoPropertyId;

    private String documentType;

    @Column(columnDefinition = "text")
    private String caption;

    private String fileName;
    private String fileExtension;
    private String fileSizeBytes;

    // CRM attachment download URL — used to fetch file and upload to R2
    @Column(columnDefinition = "text")
    private String crmDownloadUrl;

    // WorkDrive public URL — optional fallback if crmDownloadUrl fails
    @Column(columnDefinition = "text")
    private String downloadLink;

    // Cloudflare R2 public URL — primary serving URL
    @Column(columnDefinition = "text")
    private String r2Url;

    // External video URL (YouTube, Drive, Dropbox, etc.) from Property_Video_URL field
    @Column(columnDefinition = "text")
    private String propertyVideoUrl;
}
