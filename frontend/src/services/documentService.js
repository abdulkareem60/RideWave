import api from './api.js';

// ── Document type constants (mirrors backend DocumentType enum) ───────────
export const DOC_TYPES = {
  LICENSE:               'LICENSE',
  CNIC:                  'CNIC',
  VEHICLE_REGISTRATION:  'VEHICLE_REGISTRATION',
  INSURANCE:             'INSURANCE',
  PROFILE_PHOTO:         'PROFILE_PHOTO',
  VEHICLE_PHOTO:         'VEHICLE_PHOTO',
};

// ── OCR verification status constants (mirrors backend VerificationStatus) ─
export const OCR_STATUS = {
  PENDING:    'PENDING',
  PROCESSING: 'PROCESSING',
  PASS:       'PASS',
  FAIL:       'FAIL',
  REVIEW:     'REVIEW',
};

// ── Human-readable flag labels ─────────────────────────────────────────
export const FLAG_LABELS = {
  BLUR:                  'Blurry image',
  BLURRY:                'Blurry image',
  UNREADABLE:             'Unreadable',
  EXPIRED:                'Document expired',
  NAME_MISMATCH:          'Name does not match your profile',
  NAME_NOT_FOUND:         'Name not found on document',
  OCR_FAILED:             'Could not read document',
  INVALID_FORMAT:         'Invalid image format',
  INVALID_IMAGE_FORMAT:   'Invalid image format',
  MAX_ATTEMPTS_REACHED:   'Maximum retry attempts reached',
  ADMIN_REVIEW:           'Sent for admin review',
  ANALYSIS_FAILED:        'Analysis failed',
  ANALYSIS_ERROR:         'Analysis error',
  RESULT_SAVE_ERROR:      'Result save error',
  UNKNOWN_ERROR:          'Unknown error',
};

// ── API calls ───────────────────────────────────────────────────────────
// Backend stores document URLs only (no binary upload) — the frontend
// converts the file to a base64 data URL and submits {docType, fileUrl}.
export const documentService = {
  upload: ({ docType, fileUrl }) =>
    api.post('/documents', { docType, fileUrl }),

  myDocuments: () =>
    api.get('/documents/me'),

  documentsForUser: (userId) =>
    api.get(`/documents/user/${userId}`),

  retryOcr: (docId) =>
    api.post(`/documents/${docId}/retry`),
};

// ── File helpers ────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

/**
 * Validates an image file before upload.
 * @returns {string|null} error message, or null if valid
 */
export function validateImageFile(file) {
  if (!file) return 'No file selected.';
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Please upload a JPG, PNG, or WEBP image.';
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'File is too large. Maximum size is 8MB.';
  }
  return null;
}

/**
 * Converts a File object to a base64 data URL string.
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Display helpers ────────────────────────────────────────────────────

/**
 * Converts backend aiScore (0.00–1.00 BigDecimal) to a 0–100 integer for display.
 */
export function displayScore(aiScore) {
  if (aiScore == null) return null;
  return Math.round(Number(aiScore) * 100);
}

// ── Parsing helpers ─────────────────────────────────────────────────────
// aiFlags and aiExtractedData are stored as JSON strings on the backend.

export function parseAiFlags(aiFlags) {
  if (!aiFlags) return [];
  try {
    const parsed = JSON.parse(aiFlags);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parseAiExtractedData(aiExtractedData) {
  if (!aiExtractedData) return null;
  try {
    return JSON.parse(aiExtractedData);
  } catch {
    return null;
  }
}