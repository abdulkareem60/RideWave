package com.ridewave.dto.response;

import com.ridewave.model.DriverDocument;
import com.ridewave.model.enums.DocumentType;
import com.ridewave.model.enums.VerificationStatus;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class DocumentResponse {

    private UUID               docId;
    private DocumentType       docType;
    private String             fileUrl;
    private Boolean            verified;
    private LocalDateTime      uploadedAt;

    private VerificationStatus ocrStatus;
    private Integer            ocrAttemptCount;

    private String             aiExtractedData;
    private BigDecimal         aiScore;
    private String             aiFlags;
    private LocalDateTime      aiCheckedAt;
    private String             aiRawResponse;

    public static DocumentResponse from(DriverDocument d) {
        return DocumentResponse.builder()
                .docId(d.getDocId())
                .docType(d.getDocType())
                .fileUrl(d.getFileUrl())
                .verified(d.getVerified())
                .uploadedAt(d.getUploadedAt())
                .ocrStatus(d.getOcrStatus())
                .ocrAttemptCount(d.getOcrAttemptCount())
                .aiExtractedData(d.getAiExtractedData())
                .aiScore(d.getAiScore())
                .aiFlags(d.getAiFlags())
                .aiCheckedAt(d.getAiCheckedAt())
                .aiRawResponse(d.getAiRawResponse())
                .build();
    }
}