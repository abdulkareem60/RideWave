package com.ridewave.dto.request;

import com.ridewave.model.enums.DocumentType;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

/**
 * DTO for POST /api/v1/documents — submit a document/photo URL for the
 * current user's verification record.
 *
 * NOTE: This project stores document URLs only (no file upload binary
 * handling). The frontend is expected to upload the file to an external
 * host (e.g. an image CDN, Firebase Storage, or a base64 data URL for
 * small images in dev) and submit the resulting URL here.
 */
@Getter
@Setter
public class UploadDocumentRequest {

    @NotNull(message = "Document type is required")
    private DocumentType docType;

    @NotNull(message = "File URL is required")
    private String fileUrl;
}