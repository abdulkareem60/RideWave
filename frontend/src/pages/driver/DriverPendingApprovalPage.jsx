/**
 * DriverPendingApprovalPage — shown after all documents are submitted.
 *
 * States handled:
 *   PENDING_VERIFICATION → "Under review" with document status summary
 *   ACTIVE               → redirect to dashboard (auto-activated)
 *   REJECTED             → show rejection reason + which doc failed + re-upload button
 *
 * Polls /auth/me every 10s so the page reacts when admin approves/rejects.
 * No backend changes required — uses existing APIs.
 */

import { useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldCheck, ShieldX, Clock, FileText, Car, CheckCircle,
  AlertTriangle, RefreshCw, ChevronRight, Star,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageLayout      from '../../components/common/PageLayout.jsx';
import Spinner         from '../../components/common/Spinner.jsx';
import { useAuth }     from '../../context/AuthContext.jsx';
import { documentService, parseAiFlags, displayScore, FLAG_LABELS, OCR_STATUS } from '../../services/documentService.js';
import { formatDate }  from '../../utils/formatters.js';

const DOC_LABELS = {
  LICENSE:              'Driving License',
  VEHICLE_REGISTRATION: 'Vehicle Registration',
  PROFILE_PHOTO:        'Profile Photo',
};

const STATUS_COLOR = {
  PASS:       { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle },
  REVIEW:     { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   icon: Clock       },
  FAIL:       { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     icon: AlertTriangle },
  PROCESSING: { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    icon: RefreshCw   },
  PENDING:    { bg: 'bg-gray-50',    text: 'text-gray-600',    border: 'border-gray-200',    icon: Clock       },
};

function DocStatusCard({ doc }) {
  const ocrStatus = doc.ocrStatus ?? 'PENDING';
  const cfg       = STATUS_COLOR[ocrStatus] ?? STATUS_COLOR.PENDING;
  const Icon      = cfg.icon;
  const flags     = parseAiFlags(doc.aiFlags).filter(f => f !== 'ADMIN_REVIEW' && f !== 'MAX_ATTEMPTS_REACHED');
  const score     = displayScore(doc.aiScore);

  return (
    <div className={`rounded-2xl border p-4 ${cfg.bg} ${cfg.border}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-800">
          {DOC_LABELS[doc.docType] ?? doc.docType}
        </span>
        <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
          <Icon className="h-3.5 w-3.5" /> {ocrStatus}
        </span>
      </div>

      {score != null && (
        <div className="mb-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-gray-500">Confidence score</span>
            <span className={`text-xs font-bold ${score >= 80 ? 'text-emerald-700' : score >= 60 ? 'text-amber-700' : 'text-red-700'}`}>
              {score}/100
            </span>
          </div>
          <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-400' : 'bg-red-400'}`}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
      )}

      {flags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {flags.map(f => (
            <span key={f} className="text-[10px] px-2 py-0.5 bg-white/70 border border-red-100 text-red-600 rounded-md">
              {FLAG_LABELS[f] ?? f}
            </span>
          ))}
        </div>
      )}

      <p className="text-[10px] text-gray-400 mt-2">Uploaded {formatDate(doc.uploadedAt)}</p>
    </div>
  );
}

export default function DriverPendingApprovalPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const pollRef  = useRef(null);

  const { data: docs = [] } = useQuery({
    queryKey: ['my-documents'],
    queryFn:  () => documentService.myDocuments().then(r => r.data.data ?? []),
  });

  // Poll /auth/me every 10s to catch admin approval/rejection
  useEffect(() => {
    pollRef.current = setInterval(async () => {
      await refreshUser?.();
    }, 10_000);
    return () => clearInterval(pollRef.current);
  }, [refreshUser]);

  // React to status changes
  useEffect(() => {
    if (user?.status === 'ACTIVE') {
      clearInterval(pollRef.current);
      toast.success('Account approved! Welcome to RideWave Driver.');
      navigate('/driver/dashboard', { replace: true });
    }
  }, [user?.status, navigate]);

  const verifiableDocs = docs.filter(d => ['LICENSE', 'VEHICLE_REGISTRATION'].includes(d.docType));
  const failedDocs     = verifiableDocs.filter(d => d.ocrStatus === OCR_STATUS.FAIL || d.ocrStatus === OCR_STATUS.REVIEW);

  // ── REJECTED state ───────────────────────────────────────────────────────
  if (user?.status === 'REJECTED') {
    return (
      <PageLayout>
        <div className="max-w-lg mx-auto py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ShieldX className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Application Rejected</h1>
            <p className="text-sm text-gray-500">
              Your driver application was reviewed and could not be approved at this time.
              You can re-upload the documents listed below.
            </p>
          </div>

          {/* Actual admin rejection reason */}
          {user?.reviewNotes && (
            <div className="card p-4 bg-red-50 border border-red-200 mb-6">
              <p className="text-sm font-semibold text-red-800 mb-1">Reason for rejection</p>
              <p className="text-sm text-red-700">{user.reviewNotes}</p>
              {user?.reviewedAt && (
                <p className="text-xs text-red-400 mt-2">
                  Reviewed on {new Date(user.reviewedAt).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Document statuses */}
          <div className="space-y-3 mb-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Document Review</h2>
            {verifiableDocs.map(d => <DocStatusCard key={d.docId} doc={d} />)}
          </div>

          {/* Re-upload action */}
          {failedDocs.length > 0 && (
            <div className="card p-4 bg-amber-50 border border-amber-200 mb-6">
              <p className="text-sm font-semibold text-amber-800 mb-1">Action required</p>
              <p className="text-xs text-amber-700 mb-3">
                Re-upload the documents that failed verification to re-submit your application.
              </p>
              <Link
                to="/driver/onboarding"
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white
                  text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
              >
                Re-upload Documents <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          )}

          <button
            onClick={() => refreshUser?.()}
            className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200
              rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4" /> Refresh status
          </button>
        </div>
      </PageLayout>
    );
  }

  // ── PENDING_VERIFICATION state ────────────────────────────────────────────
  return (
    <PageLayout>
      <div className="max-w-lg mx-auto py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Clock className="h-8 w-8 text-indigo-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Documents Under Review</h1>
          <p className="text-sm text-gray-500">
            Your documents have been submitted and are being reviewed by our team.
            We'll notify you by email and in-app once a decision is made.
          </p>
        </div>

        {/* Progress indicator */}
        <div className="card p-5 mb-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-1.5 bg-indigo-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: '75%' }} />
            </div>
            <span className="text-xs font-semibold text-indigo-600 flex-shrink-0">Step 3 / 4</span>
          </div>
          <div className="grid grid-cols-4 text-center gap-1">
            {['Submitted', 'In Review', 'Decision', 'Active'].map((s, i) => (
              <div key={s}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-1 text-xs font-bold ${
                  i < 2 ? 'bg-indigo-600 text-white' : i === 2 ? 'bg-indigo-100 text-indigo-600 border-2 border-indigo-300 border-dashed' : 'bg-gray-100 text-gray-400'
                }`}>{i + 1}</div>
                <p className={`text-[10px] font-medium ${i < 2 ? 'text-indigo-700' : 'text-gray-400'}`}>{s}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Document status cards */}
        <div className="space-y-3 mb-6">
          <h2 className="text-sm font-semibold text-gray-700">Verification details</h2>
          {verifiableDocs.length === 0 ? (
            <div className="text-center py-6"><Spinner /></div>
          ) : (
            verifiableDocs.map(d => <DocStatusCard key={d.docId} doc={d} />)
          )}
        </div>

        {/* What happens next */}
        <div className="card p-4 bg-gray-50 border border-gray-200">
          <p className="text-xs font-semibold text-gray-600 mb-2">What happens next</p>
          <ul className="space-y-1.5">
            {[
              'Our team reviews your submitted documents',
              'You receive an email + in-app notification',
              'If approved: your account activates immediately',
              'If rejected: you can re-upload and resubmit',
            ].map((t, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-500">
                <span className="mt-0.5 w-4 h-4 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[9px] font-bold flex-shrink-0">{i + 1}</span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={() => refreshUser?.()}
          className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200
            rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="h-4 w-4" /> Check for updates
        </button>
      </div>
    </PageLayout>
  );
}