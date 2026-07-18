import { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck, ShieldAlert, ShieldX, CheckCircle2, Circle,
  Camera, FileText, Car, Loader2, Clock, AlertTriangle,
  RefreshCw, Send, Lock, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageLayout from '../../components/common/PageLayout.jsx';
import Avatar from '../../components/common/Avatar.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  documentService, validateImageFile, fileToBase64,
  DOC_TYPES, FLAG_LABELS, OCR_STATUS, parseAiFlags, displayScore,
} from '../../services/documentService.js';
import { vehicleService } from '../../services/otherServices.js';

// ── Constants ─────────────────────────────────────────────────────────────

const MAX_ATTEMPTS   = 3;
const POLL_INTERVAL  = 3_000;
const TIMEOUT_MS     = 60_000;

/**
 * Strict step order — no step can be skipped.
 * Step is LOCKED until the previous step is PASS.
 */
const STEPS = [
  {
    index: 0,
    key:   'profile',
    docType: DOC_TYPES.PROFILE_PHOTO,
    title:  'Profile Photo',
    icon:   Camera,
    desc:   'A clear, recent photo of your face.',
    hasOcr: false,
    hasForm: false,
    next:   'Upload your Driving License next.',
  },
  {
    index: 1,
    key:   'vehicle',
    docType: null,
    title:  'Vehicle Details',
    icon:   Car,
    desc:   'Register the vehicle you will use for rides.',
    hasOcr: false,
    hasForm: true,
    next:   'Vehicle added! Now upload your Driving License.',
  },
  {
    index: 2,
    key:   'license',
    docType: DOC_TYPES.LICENSE,
    title:  'Driving License',
    icon:   FileText,
    desc:   'Front of your valid driving license. Ensure all text is visible.',
    hasOcr: true,
    hasForm: false,
    next:   'License verified! Now upload your Vehicle Registration.',
  },
  {
    index: 3,
    key:   'registration',
    docType: DOC_TYPES.VEHICLE_REGISTRATION,
    title:  'Vehicle Registration',
    icon:   Car,
    desc:   'Vehicle registration certificate (RC book). All 4 corners must be visible.',
    hasOcr: true,
    hasForm: false,
    next:   null,
  },
];

// ── Main page ─────────────────────────────────────────────────────────────

export default function DriverOnboardingPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uploadingKey, setUploadingKey] = useState(null);
  const [uploadedAt, setUploadedAt] = useState({});  // step.key → timestamp
  const fileRefs = useRef({});

  const { data: vehicles } = useQuery({
    queryKey: ['my-vehicles'],
    queryFn:  () => vehicleService.getAll().then(r => r.data.data ?? []),
    enabled:  !!user,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['my-documents'],
    queryFn:  () => documentService.myDocuments().then(r => r.data.data ?? []),
    refetchInterval: (q) => {
      const docs = q.state.data ?? [];
      const anyProcessing = STEPS
        .filter(s => s.hasOcr)
        .some(s => {
          const d = docs.find(x => x.docType === s.docType);
          return d && (!d.ocrStatus || d.ocrStatus === OCR_STATUS.PROCESSING || d.ocrStatus === OCR_STATUS.PENDING);
        });
      return anyProcessing ? POLL_INTERVAL : false;
    },
  });

  const findDoc = (docType) => documents.find(d => d.docType === docType);

  // Step is "passed enough to unlock the next step":
  //   - profile: photo uploaded
  //   - vehicle: at least one vehicle registered
  //   - docs: any OCR status other than PENDING/PROCESSING/null
  //     (FAIL and REVIEW both unlock the next step — admin handles exceptions)
  const isStepPassed = (step) => {
    if (step.key === 'profile')  return !!user?.profilePic;
    if (step.key === 'vehicle')  return (vehicles?.length ?? 0) > 0;
    const d = findDoc(step.docType);
    if (!d?.ocrStatus) return false;
    // Uploaded and processed (even if failed/review) → unlocks next step
    return [OCR_STATUS.PASS, OCR_STATUS.FAIL, OCR_STATUS.REVIEW].includes(d.ocrStatus);
  };

  // True PASS (for determining if all docs are clean)
  const isStepVerified = (step) => {
    if (step.key === 'profile')  return !!user?.profilePic;
    if (step.key === 'vehicle')  return (vehicles?.length ?? 0) > 0;
    const d = findDoc(step.docType);
    return d?.ocrStatus === OCR_STATUS.PASS;
  };

  // Step is unlocked if all previous steps PASSED
  const isStepUnlocked = (stepIndex) => {
    if (stepIndex === 0) return true;
    return STEPS.slice(0, stepIndex).every(s => isStepPassed(s));
  };

  // All steps passed → driver can be redirected to dashboard
  const allSubmitted = STEPS.every(s => isStepPassed(s));    // all docs uploaded
  const allPassed    = STEPS.every(s => isStepVerified(s)); // all docs clean OCR

  // Poll /auth/me while docs are still being OCR'd, or while status is
  // PENDING_VERIFICATION after all docs pass (waiting for auto-activation).
  // Stops once status reaches ACTIVE or REJECTED.
  const pollingRef = useRef(null);
  useEffect(() => {
    const shouldPoll = user?.status === 'PENDING' ||
                       user?.status === 'PENDING_VERIFICATION';
    if (shouldPoll && !pollingRef.current) {
      pollingRef.current = setInterval(async () => {
        await refreshUser?.();
      }, 4000);
    }
    if (!shouldPoll && pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    return () => {
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    };
  }, [user?.status]);

  // Redirect immediately when backend auto-activates the account
  useEffect(() => {
    if (user?.status === 'ACTIVE') {
      clearInterval(pollingRef.current);
      toast.success('Verification passed! Welcome to RideWave.');
      setTimeout(() => navigate('/driver/dashboard'), 1800);
    }
    // When all docs submitted (even with fails) → go to pending-approval page
    if (allSubmitted && user?.status === 'PENDING_VERIFICATION') {
      clearInterval(pollingRef.current);
      navigate('/driver/pending-approval', { replace: true });
    }
    // A driver previously rejected by admin should never see the raw upload
    // form again on a fresh page load — the pending-approval page owns the
    // rejection UI (reason, which doc failed, selective re-upload).
    if (user?.status === 'REJECTED') {
      clearInterval(pollingRef.current);
      navigate('/driver/pending-approval', { replace: true });
    }
  }, [user?.status, allSubmitted]);

  const handleFileChange = async (step, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateImageFile(file);
    if (err) { toast.error(err); e.target.value = ''; return; }

    setUploadingKey(step.key);
    try {
      const base64 = await fileToBase64(file);
      await documentService.upload({ docType: step.docType, fileUrl: base64 });

      if (step.key === 'profile') {
        toast.success('Profile photo saved!');
        await refreshUser?.();
      } else {
        // Only show "uploaded" toast — never show "verified!" here.
        // The OCR result drives the next-step message (see OcrStatusBlock).
        toast.success(`${step.title} uploaded — OCR running…`);
        setUploadedAt(p => ({ ...p, [step.key]: Date.now() }));
      }
      queryClient.invalidateQueries({ queryKey: ['my-documents'] });
    } catch (err) {
      toast.error(err.response?.data?.message ?? `Upload failed: ${err.message}`);
    } finally {
      setUploadingKey(null);
      e.target.value = '';
    }
  };

  const handleRetry = async (step) => {
    const doc = findDoc(step.docType);
    if (!doc) return;
    try {
      await documentService.retryOcr(doc.docId);
      toast.success('Retry started.');
      setUploadedAt(p => ({ ...p, [step.key]: Date.now() }));
      queryClient.invalidateQueries({ queryKey: ['my-documents'] });
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Retry failed.');
    }
  };

  const currentStep = STEPS.findIndex(s => !isStepPassed(s));
  const overallStep = currentStep === -1 ? STEPS.length : currentStep;

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header + progress */}
        <div>
          <h1 className="text-xl font-bold text-gray-900">Driver Verification</h1>
          <p className="text-sm text-gray-500 mt-1">
            Complete each step in order. Every step must pass before the next unlocks.
          </p>
        </div>

        <ProgressBar steps={STEPS} currentStep={overallStep} isStepPassed={isStepPassed} />

        <StatusBanner status={user?.status} allPassed={allPassed} />

        {STEPS.map(step => {
          const locked = !isStepUnlocked(step.index);

          if (step.hasForm) {
            return (
              <VehicleStepCard
                key={step.key}
                step={step}
                vehicles={vehicles ?? []}
                locked={locked}
                queryClient={queryClient}
              />
            );
          }

          const doc = step.key === 'profile'
            ? (user?.profilePic ? { fileUrl: user.profilePic, ocrStatus: OCR_STATUS.PASS, ocrAttemptCount: 0 } : null)
            : findDoc(step.docType);

          return (
            <StepCard
              key={step.key}
              step={step}
              doc={doc}
              locked={locked}
              uploading={uploadingKey === step.key}
              uploadedAt={uploadedAt[step.key]}
              onSelect={() => !locked && fileRefs.current[step.key]?.click()}
              onRetry={() => handleRetry(step)}
              fileRef={el => (fileRefs.current[step.key] = el)}
              onFileChange={e => handleFileChange(step, e)}
            />
          );
        })}

        {allPassed && user?.status !== 'ACTIVE' && (
          <ActivationStatusCard status={user?.status} />
        )}
      </div>
    </PageLayout>
  );
}


// ── Vehicle Step Card ─────────────────────────────────────────────────────

function VehicleStepCard({ step, vehicles, locked, queryClient }) {
  const Icon = step.icon;
  const [saving, setSaving]   = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ make:'', model:'', year: new Date().getFullYear(), plateNumber:'', color:'', totalSeats:4 });
  const [errors, setErrors]   = useState({});

  const hasvehicle = vehicles.length > 0;

  const validate = () => {
    const e = {};
    if (!form.make.trim())        e.make        = 'Required';
    if (!form.model.trim())       e.model       = 'Required';
    if (!form.plateNumber.trim()) e.plateNumber = 'Required';
    const yr = parseInt(form.year, 10);
    if (!yr || yr < 1990 || yr > 2030) e.year = '1990–2030';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: null }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await vehicleService.add({
        make: form.make.trim(), model: form.model.trim(),
        year: parseInt(form.year, 10), plateNumber: form.plateNumber.trim().toUpperCase(),
        color: form.color.trim(), totalSeats: parseInt(form.totalSeats, 10),
      });
      toast.success('Vehicle registered!');
      queryClient.invalidateQueries({ queryKey: ['my-vehicles'] });
      setShowForm(false);
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Failed to save vehicle.');
    } finally { setSaving(false); }
  };

  return (
    <div className={`card overflow-hidden transition-all ${locked ? 'opacity-60' : ''}`}>
      <div className={`px-5 py-3 flex items-center gap-2 text-sm font-semibold ${
        hasvehicle ? 'bg-green-50 text-green-800' : locked ? 'bg-gray-50 text-gray-500' : 'bg-blue-50 text-blue-800'
      }`}>
        <span className="opacity-70">Step {step.index + 1} of {STEPS.length}</span>
        <ChevronRight className="h-3 w-3" />
        {step.title}
        {locked && <Lock className="h-3.5 w-3.5 ml-auto" />}
        {hasvehicle && <CheckCircle2 className="h-4 w-4 text-green-600 ml-auto" />}
      </div>

      <div className="p-5">
        <p className="text-sm text-gray-500 mb-4">{step.desc}</p>

        {hasvehicle ? (
          <div className="space-y-2">
            {vehicles.map(v => (
              <div key={v.vehicleId} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
                <Icon className="h-5 w-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{v.make} {v.model} ({v.year})</p>
                  <p className="text-xs text-gray-500">{v.plateNumber} · {v.color} · {v.totalSeats} seats</p>
                </div>
              </div>
            ))}
            {!locked && (
              <button onClick={() => setShowForm(!showForm)}
                      className="text-xs text-blue-600 hover:text-blue-800">
                + Add another vehicle
              </button>
            )}
          </div>
        ) : !locked ? (
          <button onClick={() => setShowForm(true)}
                  className="btn-primary text-sm px-4 py-2">
            <Icon className="h-4 w-4" /> Add Vehicle
          </button>
        ) : null}

        {showForm && !locked && (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <p className="font-semibold text-sm text-gray-800">Vehicle Details</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { name:'make',  label:'Make',   placeholder:'Toyota' },
                { name:'model', label:'Model',  placeholder:'Corolla' },
                { name:'year',  label:'Year',   placeholder:'2020' },
                { name:'plateNumber', label:'Plate Number', placeholder:'ABC-1234' },
                { name:'color', label:'Color',  placeholder:'White' },
                { name:'totalSeats', label:'Passenger Seats', placeholder:'4' },
              ].map(field => (
                <div key={field.name}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{field.label}</label>
                  <input
                    name={field.name}
                    value={form[field.name]}
                    onChange={handleChange}
                    placeholder={field.placeholder}
                    className={`w-full text-sm px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-200 ${
                      errors[field.name] ? 'border-red-400' : 'border-gray-200 focus:border-blue-400'
                    }`}
                  />
                  {errors[field.name] && <p className="text-xs text-red-500 mt-0.5">{errors[field.name]}</p>}
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setShowForm(false)}
                      className="btn-secondary text-xs px-3 py-1.5">Cancel</button>
              <button type="submit" disabled={saving}
                      className="btn-primary text-xs px-3 py-1.5">
                {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...</> : 'Save Vehicle'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}


// ── Activation Status Card ────────────────────────────────────────────────
// Shown when all docs have passed OCR but backend hasn't confirmed ACTIVE yet.

function ActivationStatusCard({ status }) {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (status !== 'PENDING_VERIFICATION') return;
    // If activation hasn't happened within 15s of all docs passing,
    // stop the spinner and show a clear non-infinite message.
    const t = setTimeout(() => setTimedOut(true), 15_000);
    return () => clearTimeout(t);
  }, [status]);

  if (status === 'PENDING_VERIFICATION' && !timedOut) {
    return (
      <div className="card p-5 border border-blue-200 bg-blue-50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
          </div>
          <div>
            <p className="font-semibold text-blue-900">All checks passed — activating your account</p>
            <p className="text-sm text-blue-700 mt-0.5">
              This takes just a moment. You will be redirected automatically.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'PENDING_VERIFICATION' && timedOut) {
    return (
      <div className="card p-5 border border-amber-200 bg-amber-50">
        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900">Activation taking longer than expected</p>
            <p className="text-sm text-amber-700 mt-1">
              Your documents have passed verification. If you are not redirected within a minute,
              please refresh the page. If the problem persists, an admin will review your application.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-800 underline"
            >
              Refresh page
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Admin review required
  return (
    <div className="card p-5 border border-amber-200 bg-amber-50">
      <div className="flex items-center gap-3">
        <Send className="h-6 w-6 text-amber-600 flex-shrink-0" />
        <div>
          <p className="font-semibold text-amber-900">Sent to admin review</p>
          <p className="text-sm text-amber-700 mt-0.5">
            One or more documents require manual verification. You will be notified by email once approved.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Progress Bar ──────────────────────────────────────────────────────────

function ProgressBar({ steps, currentStep, isStepPassed }) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => {
        const passed = isStepPassed(step);
        const active = currentStep === i;
        const Icon   = step.icon;
        return (
          <div key={step.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center transition-all border-2
                ${passed  ? 'bg-green-600 border-green-600 text-white'
                  : active ? 'bg-white border-blue-600 text-blue-600'
                  : 'bg-gray-100 border-gray-300 text-gray-400'}
              `}>
                {passed ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>
              <span className={`text-xs mt-1 font-medium ${
                passed ? 'text-green-700' : active ? 'text-blue-700' : 'text-gray-400'
              }`}>
                {step.title.split(' ')[0]}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mb-4 transition-colors ${
                passed ? 'bg-green-400' : 'bg-gray-200'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Status Banner ─────────────────────────────────────────────────────────

function StatusBanner({ status, allPassed }) {
  // If all docs passed but status is still PENDING_VERIFICATION,
  // backend auto-activation is running — show "Activating..." not "Under Review"
  const activating = allPassed && status === 'PENDING_VERIFICATION';

  const map = {
    PENDING:              { icon: Circle,     bg: 'bg-gray-50 border-gray-200 text-gray-700',
                            title: 'Not started', msg: 'Upload each document below.' },
    PENDING_VERIFICATION: activating
      ? { icon: Loader2,    bg: 'bg-blue-50 border-blue-200 text-blue-800',
          title: 'Activating account...', msg: 'All checks passed. Your account is being activated automatically.' }
      : { icon: Clock,      bg: 'bg-amber-50 border-amber-200 text-amber-800',
          title: 'Under Review', msg: 'Admin is reviewing your application.' },
    ACTIVE:               { icon: ShieldCheck, bg: 'bg-green-50 border-green-200 text-green-800',
                            title: 'Verified Driver', msg: 'Account active. Redirecting to dashboard...' },
    REJECTED:             { icon: ShieldX,    bg: 'bg-red-50 border-red-200 text-red-800',
                            title: 'Rejected', msg: 'Re-upload corrected documents and resubmit.' },
  };
  const cfg = map[status] ?? map.PENDING;
  const Icon = cfg.icon;
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${cfg.bg}`}>
      <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${activating ? 'animate-spin' : ''}`} />
      <div>
        <p className="font-semibold text-sm">{cfg.title}</p>
        <p className="text-xs mt-0.5">{cfg.msg}</p>
      </div>
    </div>
  );
}

// ── Step Card ─────────────────────────────────────────────────────────────

function uiState(doc, uploadedAt) {
  if (!doc) return 'empty';
  const s = doc.ocrStatus;
  if (!s || s === OCR_STATUS.PENDING)   return 'empty';
  if (s === OCR_STATUS.PROCESSING) {
    if (uploadedAt && Date.now() - uploadedAt > TIMEOUT_MS) return 'timeout';
    return 'processing';
  }
  if (s === OCR_STATUS.PASS)   return 'pass';
  if (s === OCR_STATUS.REVIEW) return 'review';
  if (s === OCR_STATUS.FAIL)   return 'fail';
  return 'empty';
}

function StepCard({ step, doc, locked, uploading, uploadedAt, onSelect, onRetry, fileRef, onFileChange }) {
  const Icon   = step.icon;
  const [state, setState] = useState(() => uiState(doc, uploadedAt));
  const flags  = parseAiFlags(doc?.aiFlags);
  const score  = displayScore(doc?.aiScore);
  const attemptsLeft = MAX_ATTEMPTS - (doc?.ocrAttemptCount ?? 0);

  useEffect(() => {
    setState(uiState(doc, uploadedAt));
    // Tick every second while processing so timeout triggers client-side
    if (doc && (doc.ocrStatus === OCR_STATUS.PROCESSING || doc.ocrStatus === OCR_STATUS.PENDING)) {
      const id = setInterval(() => setState(uiState(doc, uploadedAt)), 1000);
      return () => clearInterval(id);
    }
  }, [doc, uploadedAt]);

  const stepNum = step.index + 1;

  return (
    <div className={`card overflow-hidden transition-all ${locked ? 'opacity-60' : ''}`}>
      {/* Step header */}
      <div className={`px-5 py-3 flex items-center gap-2 text-sm font-semibold ${
        state === 'pass' ? 'bg-green-50 text-green-800' :
        locked ? 'bg-gray-50 text-gray-500' : 'bg-blue-50 text-blue-800'
      }`}>
        <span className="opacity-70">Step {stepNum} of {STEPS.length}</span>
        <ChevronRight className="h-3 w-3" />
        {step.title}
        {locked && <Lock className="h-3.5 w-3.5 ml-auto" />}
        {state === 'pass' && <CheckCircle2 className="h-4 w-4 text-green-600 ml-auto" />}
      </div>

      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Thumbnail */}
          <div className="flex-shrink-0">
            {step.key === 'profile'
              ? <Avatar src={doc?.fileUrl} size="lg" alt="Profile" />
              : doc?.fileUrl
                ? <img src={doc.fileUrl} alt={step.title}
                       className="h-20 w-20 rounded-xl object-cover border border-gray-200" />
                : <div className="h-20 w-20 rounded-xl bg-gray-100 flex items-center justify-center">
                    <Icon className="h-8 w-8 text-gray-300" />
                  </div>
            }
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-500 mb-3">{step.desc}</p>

            <input ref={fileRef} type="file"
                   accept="image/jpeg,image/jpg,image/png"
                   className="hidden" onChange={onFileChange} />

            {!locked && (
              <button onClick={onSelect} disabled={uploading || state === 'processing'}
                      className="btn-secondary text-xs px-3 py-1.5 mb-3">
                {uploading
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading...</>
                  : doc ? 'Replace Image' : 'Choose Image'}
              </button>
            )}

            {/* OCR status for non-profile steps */}
            {step.hasOcr && (
              <OcrStatusBlock
                state={state} score={score} flags={flags}
                attemptsLeft={attemptsLeft} onRetry={onRetry}
                nextMessage={step.next}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── OCR Status Block ──────────────────────────────────────────────────────

function OcrStatusBlock({ state, score, flags, attemptsLeft, onRetry, nextMessage }) {
  if (state === 'empty') return (
    <p className="text-xs text-gray-400">Upload an image to begin OCR analysis.</p>
  );

  if (state === 'processing') return (
    <div className="flex items-center gap-2 text-xs text-blue-600">
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      OCR running… verifying document
    </div>
  );

  if (state === 'timeout') return (
    <div className="flex items-center gap-2 text-xs text-amber-600">
      <Clock className="h-3.5 w-3.5" />
      Processing is taking longer than expected. Please wait.
    </div>
  );

  if (state === 'pass') return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-800 border border-green-200">
          <ShieldCheck className="h-3.5 w-3.5" /> Verified
        </span>
        {score != null && <ScoreBar score={score} />}
      </div>
      {/* Show "→ Now upload your X" only AFTER backend confirms PASS */}
      {nextMessage && (
        <p className="text-xs text-green-700 font-medium flex items-center gap-1 mt-1">
          <ChevronRight className="h-3.5 w-3.5" />
          {nextMessage}
        </p>
      )}
    </div>
  );

  if (state === 'review') return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
          <Send className="h-3.5 w-3.5" /> Sent to Admin Review
        </span>
        {score != null && <ScoreBar score={score} />}
      </div>
      <FlagList flags={flags.filter(f => f !== 'ADMIN_REVIEW' && f !== 'MAX_ATTEMPTS_REACHED')} />
    </div>
  );

  if (state === 'fail') return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-red-100 text-red-800 border border-red-200">
          <ShieldX className="h-3.5 w-3.5" />
          Failed — {MAX_ATTEMPTS - attemptsLeft}/{MAX_ATTEMPTS} attempts used
        </span>
        {score != null && <ScoreBar score={score} />}
      </div>
      <FlagList flags={flags} />
      {attemptsLeft > 0 ? (
        <button onClick={onRetry}
                className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors">
          <RefreshCw className="h-3.5 w-3.5" />
          Retry OCR ({attemptsLeft} attempt{attemptsLeft !== 1 ? 's' : ''} left)
        </button>
      ) : (
        <p className="text-xs text-gray-500 flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          Max retries reached — document sent to admin review automatically.
        </p>
      )}
    </div>
  );

  return null;
}

function ScoreBar({ score }) {
  const color = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs text-gray-500">{score}/100</span>
    </div>
  );
}

function FlagList({ flags }) {
  if (!flags?.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {flags.map(f => (
        <span key={f}
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-red-50 text-red-600 border border-red-100">
          <AlertTriangle className="h-2.5 w-2.5" />
          {FLAG_LABELS[f] ?? f}
        </span>
      ))}
    </div>
  );
}