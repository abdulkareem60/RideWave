/**
 * DriverVerifyPage — Admin driver verification queue + review modal.
 *
 * Workflow is deliberately two-step to prevent accidental approval:
 *   1. List view shows only driver identity + a status badge — no
 *      Approve/Reject controls exist here at all.
 *   2. Clicking "Review Documents" opens a modal with every piece of
 *      evidence (profile photo, document images, OCR text, score, AI
 *      flags, upload dates). Approve/Reject only appear inside this modal.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck, ShieldX, ShieldAlert, FileText, Car, AlertTriangle,
  Loader2, Lock, Calendar, RotateCcw, Eye, EyeOff, RefreshCw, X,
  FileSearch, Clock, CheckCircle2, XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageLayout   from '../../components/common/PageLayout.jsx';
import Spinner      from '../../components/common/Spinner.jsx';
import EmptyState   from '../../components/common/EmptyState.jsx';
import Avatar       from '../../components/common/Avatar.jsx';
import { adminService }    from '../../services/adminService.js';
import { documentService, parseAiFlags, parseAiExtractedData } from '../../services/documentService.js';
import { formatDateShort, formatDate } from '../../utils/formatters.js';

const FLAG_LABELS = {
  BLUR:                 'Blurry image',
  BLURRY:                'Blurry image',
  UNREADABLE:            'Unreadable',
  EXPIRED:               'Document expired',
  NAME_MISMATCH:         'Name mismatch',
  NAME_NOT_FOUND:        'Name not found on document',
  OCR_FAILED:            'OCR failed',
  INVALID_FORMAT:        'Invalid image format',
  MAX_ATTEMPTS_REACHED:  'Max retry attempts reached',
  ADMIN_REVIEW:          'Flagged for admin review',
  UNKNOWN_ERROR:         'Unknown error',
};

const DOC_LABELS = {
  LICENSE:               'Driving License',
  VEHICLE_REGISTRATION:  'Vehicle Registration (VRC)',
  CNIC:                   'National ID (CNIC)',
  INSURANCE:              'Insurance',
  PROFILE_PHOTO:          'Profile Photo',
};

const REQUIRED_DOC_TYPES = ['LICENSE', 'VEHICLE_REGISTRATION'];

const DOC_ICONS = {
  LICENSE: FileText,
  VEHICLE_REGISTRATION: Car,
  CNIC: FileText,
  INSURANCE: FileText,
};

// ── Score badge ─────────────────────────────────────────────────────────
function ScoreBadge({ score }) {
  let color, Icon;
  if (score >= 0.8)      { color = 'text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-500/15 border-green-200 dark:border-green-500/30'; Icon = ShieldCheck; }
  else if (score >= 0.5) { color = 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/15 border-amber-200 dark:border-amber-500/30'; Icon = ShieldAlert; }
  else                    { color = 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-500/15 border-red-200 dark:border-red-500/30';       Icon = ShieldX; }
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg border flex-shrink-0 ${color}`}>
      <Icon className="h-3.5 w-3.5" />
      {(score * 100).toFixed(0)}/100
    </span>
  );
}

// ── List-row verification status badge ──────────────────────────────────
// One of: Documents Uploaded / Under Review / Manual Review Required /
//         Verification Passed / Verification Failed
function VerificationStatusBadge({ documents, isLoading }) {
  if (isLoading) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
        bg-gray-50 dark:bg-surface-dark text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading...
      </span>
    );
  }

  const docs = documents ?? [];
  const required = docs.filter(d => REQUIRED_DOC_TYPES.includes(d.docType));

  if (required.length === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
        bg-gray-50 dark:bg-surface-dark text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
        <Clock className="h-3 w-3" /> Documents Pending
      </span>
    );
  }

  const allChecked  = required.every(d => d.ocrStatus && d.ocrStatus !== 'PENDING' && d.ocrStatus !== 'PROCESSING');
  const anyFail      = required.some(d => d.ocrStatus === 'FAIL');
  const anyReview     = required.some(d => d.ocrStatus === 'REVIEW');
  const allPass        = required.every(d => d.ocrStatus === 'PASS');

  if (!allChecked) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
        bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30">
        <FileSearch className="h-3 w-3" /> Documents Uploaded
      </span>
    );
  }
  if (anyFail) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
        bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-500/30">
        <XCircle className="h-3 w-3" /> Verification Failed
      </span>
    );
  }
  if (anyReview) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
        bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
        <ShieldAlert className="h-3 w-3" /> Manual Review Required
      </span>
    );
  }
  if (allPass) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
        bg-green-50 dark:bg-green-500/15 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-500/30">
        <CheckCircle2 className="h-3 w-3" /> Verification Passed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
      bg-gray-50 dark:bg-surface-dark text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
      <Clock className="h-3 w-3" /> Under Review
    </span>
  );
}

// ── Re-upload request modal (nested inside the review modal) ────────────
function ReuploadModal({ docType, onClose, onConfirm, isPending }) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-surface-dark-raised rounded-2xl p-5 max-w-sm w-full shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
            Request re-upload — {DOC_LABELS[docType] ?? docType}
          </h3>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Explain why the driver needs to re-upload this document..."
          rows={3}
          autoFocus
          className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-xl p-3 outline-none
            focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 resize-none"
        />
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400
            border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason.trim() || 'Document did not meet requirements.')}
            disabled={isPending}
            className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-amber-500
              rounded-xl hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
            Send request
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Single document evidence block ───────────────────────────────────────
function DocumentReview({ doc, onRequestReupload }) {
  const [showRaw, setShowRaw] = useState(false);
  const Icon = DOC_ICONS[doc.docType] ?? FileText;
  const flags = parseAiFlags(doc.aiFlags);
  const extracted = parseAiExtractedData(doc.aiExtractedData);
  const score = doc.aiScore != null ? Number(doc.aiScore) : null;

  return (
    <div className="bg-gray-50 dark:bg-surface-dark rounded-xl p-4 border border-gray-100 dark:border-gray-800">
      <div className="flex gap-4">
        {doc.fileUrl ? (
          <img src={doc.fileUrl} alt={doc.docType}
            className="h-24 w-24 rounded-lg object-cover border border-gray-200 dark:border-gray-700 flex-shrink-0 cursor-pointer
              hover:opacity-90 transition-opacity"
            onClick={() => window.open(doc.fileUrl, '_blank')} />
        ) : (
          <div className="h-24 w-24 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
            <Icon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Icon className="h-4 w-4 text-indigo-500" />
              {DOC_LABELS[doc.docType] ?? doc.docType.replace(/_/g, ' ')}
            </h4>
            <div className="flex items-center gap-2">
              {score !== null
                ? <ScoreBadge score={score} />
                : doc.aiCheckedAt
                  ? <span className="text-xs text-gray-400 dark:text-gray-500">No AI score</span>
                  : <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Processing</span>}
            </div>
          </div>

          {/* Upload date + attempt count — verification history */}
          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400 dark:text-gray-500 flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Uploaded {formatDateShort(doc.uploadedAt)}
            </span>
            {doc.ocrAttemptCount > 0 && (
              <span>· Attempt {doc.ocrAttemptCount}/3</span>
            )}
            <span className={`font-medium ${
              doc.ocrStatus === 'PASS' ? 'text-green-600' :
              doc.ocrStatus === 'REVIEW' ? 'text-amber-600' :
              doc.ocrStatus === 'FAIL' ? 'text-red-600' : 'text-gray-500 dark:text-gray-400'
            }`}>
              · {doc.ocrStatus}
            </span>
          </div>

          {/* Flags */}
          {flags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {flags.map(flag => (
                <span key={flag}
                  className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md
                    bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-300 border border-red-100 dark:border-red-500/30">
                  <AlertTriangle className="h-3 w-3" />
                  {FLAG_LABELS[flag] ?? flag}
                </span>
              ))}
            </div>
          )}

          {/* Extracted fields */}
          {extracted && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 text-xs">
              <div>
                <dt className="text-gray-400 dark:text-gray-500">Extracted Name</dt>
                <dd className={`font-medium ${extracted.nameMatch ? 'text-gray-800 dark:text-gray-200' : 'text-red-600'}`}>
                  {extracted.fullName ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-400 dark:text-gray-500">Expected Name</dt>
                <dd className="font-medium text-gray-800 dark:text-gray-200">{extracted.expectedName ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-400 dark:text-gray-500">Document No.</dt>
                <dd className="font-medium text-gray-800 dark:text-gray-200">{extracted.docNumber ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-400 dark:text-gray-500">Expiry Date</dt>
                <dd className={`font-medium ${extracted.expired ? 'text-red-600' : 'text-gray-800 dark:text-gray-200'}`}>
                  {extracted.expiryDate ?? extracted.expiryRaw ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-400 dark:text-gray-500">Name Match</dt>
                <dd className={`font-medium ${extracted.nameMatch ? 'text-green-600' : 'text-red-600'}`}>
                  {extracted.nameMatch ? 'Yes' : 'No'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-400 dark:text-gray-500">Checked At</dt>
                <dd className="font-medium text-gray-800 dark:text-gray-200">
                  {doc.aiCheckedAt ? formatDate(doc.aiCheckedAt) : '—'}
                </dd>
              </div>
            </dl>
          )}

          {/* Raw OCR text toggle */}
          {extracted?.ocrText && (
            <div className="mt-2">
              <button
                onClick={() => setShowRaw(s => !s)}
                className="flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-300 hover:text-indigo-700 dark:hover:text-indigo-300"
              >
                {showRaw ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {showRaw ? 'Hide raw OCR text' : 'View raw OCR text'}
              </button>
              {showRaw && (
                <pre className="mt-2 text-[11px] text-gray-600 dark:text-gray-400 bg-white dark:bg-surface-dark-raised border border-gray-100 dark:border-gray-800
                  rounded-lg p-3 whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {extracted.ocrText}
                </pre>
              )}
            </div>
          )}

          {/* Per-document request re-upload */}
          <div className="mt-3">
            <button
              onClick={() => onRequestReupload(doc.docType)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-300
                hover:text-amber-700 dark:hover:text-amber-300 px-2.5 py-1 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-500/20"
            >
              <RotateCcw className="h-3 w-3" /> Request re-upload
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Review Modal — the ONLY place Approve/Reject exist ───────────────────
function ReviewModal({ driver, onClose, verifyMutation, reuploadMutation }) {
  const [forceOverride, setForceOverride] = useState(false);
  const [rejectMode, setRejectMode]       = useState(false);
  const [rejectReason, setRejectReason]   = useState('');
  const [reuploadDocType, setReuploadDocType] = useState(null);

  const { data: documents, isLoading: loadingDocs } = useQuery({
    queryKey: ['driver-documents', driver.userId],
    queryFn:  () => documentService.documentsForUser(driver.userId).then(r => r.data.data),
  });

  const { data: eligibility, isLoading: loadingEligibility } = useQuery({
    queryKey: ['driver-eligibility', driver.userId],
    queryFn:  () => adminService.checkVerificationEligibility(driver.userId).then(r => r.data.data),
  });

  const docs = documents ?? [];
  const requiredPresent = REQUIRED_DOC_TYPES.every(t => docs.some(d => d.docType === t));
  const missingDocs = REQUIRED_DOC_TYPES.filter(t => !docs.some(d => d.docType === t));

  const scoredDocs = docs.filter(d => d.aiScore != null);
  const avgScore = scoredDocs.length > 0
    ? scoredDocs.reduce((sum, d) => sum + Number(d.aiScore), 0) / scoredDocs.length
    : null;

  // Approve is only possible once documents have loaded, all required
  // documents are present, AND the eligibility gate passes (or admin
  // explicitly overrides it after reviewing).
  const docsReady   = !loadingDocs && !loadingEligibility;
  const canApprove  = docsReady && requiredPresent && (eligibility?.eligible || forceOverride);

  const approveBlockedReason = !docsReady
    ? 'Loading documents...'
    : !requiredPresent
      ? `Missing required document${missingDocs.length > 1 ? 's' : ''}: ${missingDocs.map(t => DOC_LABELS[t] ?? t).join(', ')}`
      : !eligibility?.eligible
        ? eligibility?.reason ?? 'Documents have not passed automated verification.'
        : null;

  const handleApprove = () => {
    if (!canApprove) return;
    verifyMutation.mutate(
      { driverId: driver.userId, approved: true, notes: 'Documents reviewed and approved.', forceOverride },
      { onSuccess: onClose }
    );
  };

  const handleReject = () => {
    if (!rejectMode) { setRejectMode(true); return; }
    if (!rejectReason.trim()) { toast.error('Please provide a rejection reason.'); return; }
    verifyMutation.mutate(
      { driverId: driver.userId, approved: false, notes: rejectReason.trim(), forceOverride: false },
      { onSuccess: onClose }
    );
  };

  const handleReuploadConfirm = (reason) => {
    reuploadMutation.mutate({ driverId: driver.userId, docType: reuploadDocType, reason },
      { onSuccess: () => setReuploadDocType(null) });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-surface-dark-raised rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-5 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar src={driver.profilePic} name={driver.fullName} size={48} />
            <div className="min-w-0">
              <h2 className="font-bold text-gray-900 dark:text-gray-100 truncate">{driver.fullName}</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{driver.email} · {driver.phone}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Applied: {formatDateShort(driver.createdAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {avgScore !== null && <ScoreBadge score={avgScore} />}
            <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 p-1">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Eligibility banner */}
          {loadingEligibility ? (
            <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking verification eligibility...
            </div>
          ) : eligibility?.eligible ? (
            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-500/15 border border-green-200 dark:border-green-500/30 rounded-lg p-3">
              <ShieldCheck className="h-4 w-4 flex-shrink-0" />
              All required documents passed AI verification. This driver can be approved.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-500/15 border border-red-200 dark:border-red-500/30 rounded-lg p-3">
                <Lock className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Approval blocked — AI verification gate not satisfied.</p>
                  <p className="text-xs mt-1 opacity-90">{eligibility?.reason}</p>
                </div>
              </div>
              {requiredPresent && (
                <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 pl-1">
                  <input type="checkbox" checked={forceOverride}
                    onChange={e => setForceOverride(e.target.checked)} className="rounded" />
                  I have manually reviewed these documents and approve despite the AI gate (forceOverride)
                </label>
              )}
            </div>
          )}

          {/* Document evidence — the actual review content */}
          {loadingDocs ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-gray-400 dark:text-gray-500" /></div>
          ) : docs.length === 0 ? (
            <div className="text-center py-8">
              <FileSearch className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-400 dark:text-gray-500">No documents uploaded yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {docs.map(doc => (
                <DocumentReview key={doc.docId} doc={doc}
                  onRequestReupload={(docType) => setReuploadDocType(docType)} />
              ))}
            </div>
          )}

          {missingDocs.length > 0 && docs.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 rounded-lg p-3">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              Missing: {missingDocs.map(t => DOC_LABELS[t] ?? t).join(', ')}
            </div>
          )}
        </div>

        {/* Footer — Approve / Reject live ONLY here */}
        <div className="border-t border-gray-100 dark:border-gray-800 p-5 flex-shrink-0">
          {!canApprove && approveBlockedReason && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
              <Lock className="h-3 w-3 flex-shrink-0" /> {approveBlockedReason}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleApprove}
              disabled={!canApprove || verifyMutation.isPending}
              title={!canApprove ? approveBlockedReason : ''}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                canApprove
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              }`}
            >
              {verifyMutation.isPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : canApprove ? <ShieldCheck className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              Approve Driver
            </button>
            <button
              onClick={handleReject}
              disabled={verifyMutation.isPending}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                rejectMode
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-white dark:bg-surface-dark-raised text-red-600 border border-red-200 hover:bg-red-50'
              }`}
            >
              <ShieldX className="h-4 w-4" /> {rejectMode ? 'Confirm Reject' : 'Reject Driver'}
            </button>
          </div>
          {rejectMode && (
            <input
              type="text"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Rejection reason (required)..."
              autoFocus
              className="mt-2 w-full text-sm border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/15 rounded-xl px-3 py-2 outline-none
                focus:ring-2 focus:ring-red-200"
            />
          )}
        </div>
      </div>

      {reuploadDocType && (
        <ReuploadModal
          docType={reuploadDocType}
          onClose={() => setReuploadDocType(null)}
          onConfirm={handleReuploadConfirm}
          isPending={reuploadMutation.isPending}
        />
      )}
    </div>
  );
}

// ── List row — identity + status badge + Review button ONLY ─────────────
function DriverRow({ driver, onReview }) {
  const { data: documents, isLoading } = useQuery({
    queryKey: ['driver-documents', driver.userId],
    queryFn:  () => documentService.documentsForUser(driver.userId).then(r => r.data.data),
  });

  return (
    <div className="card p-4 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar src={driver.profilePic} name={driver.fullName} size={44} />
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{driver.fullName}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{driver.email} · {driver.phone}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Applied: {formatDateShort(driver.createdAt)}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <VerificationStatusBadge documents={documents} isLoading={isLoading} />
        <button
          onClick={() => onReview(driver)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white text-xs font-semibold
            rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <FileSearch className="h-3.5 w-3.5" /> Review Documents
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main page
// ═══════════════════════════════════════════════════════════════════════════
export default function DriverVerifyPage() {
  const queryClient = useQueryClient();
  const [reviewingDriver, setReviewingDriver] = useState(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['pending-drivers'],
    queryFn:  () => adminService.getPendingDrivers().then(r => r.data.data),
  });

  const verifyMutation = useMutation({
    mutationFn: ({ driverId, approved, notes, forceOverride }) =>
      adminService.verifyDriver(driverId, { approved, notes, forceOverride }),
    onSuccess: (_, { approved }) => {
      toast.success(approved ? 'Driver approved! Notification sent.' : 'Driver rejected. Notification sent.');
      queryClient.invalidateQueries({ queryKey: ['pending-drivers'] });
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Action failed.'),
  });

  const reuploadMutation = useMutation({
    mutationFn: ({ driverId, docType, reason }) =>
      adminService.requestReupload(driverId, docType, reason),
    onSuccess: (_, { driverId }) => {
      toast.success('Re-upload request sent. Driver notified.');
      queryClient.invalidateQueries({ queryKey: ['driver-documents', driverId] });
      queryClient.invalidateQueries({ queryKey: ['driver-eligibility', driverId] });
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Request failed.'),
  });

  const drivers = data?.content ?? [];

  return (
    <PageLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Driver Verification Queue</h1>
        <button onClick={() => refetch()}
          className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : drivers.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="No pending verifications"
          description="All driver applications have been processed." />
      ) : (
        <div className="space-y-3">
          {drivers.map(d => (
            <DriverRow key={d.userId} driver={d} onReview={setReviewingDriver} />
          ))}
        </div>
      )}

      {reviewingDriver && (
        <ReviewModal
          driver={reviewingDriver}
          onClose={() => setReviewingDriver(null)}
          verifyMutation={verifyMutation}
          reuploadMutation={reuploadMutation}
        />
      )}
    </PageLayout>
  );
}