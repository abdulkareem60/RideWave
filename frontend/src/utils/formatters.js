import { format, formatDistanceToNow, isToday, isTomorrow } from 'date-fns';

export const formatDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isToday(d))    return `Today, ${format(d, 'h:mm a')}`;
  if (isTomorrow(d)) return `Tomorrow, ${format(d, 'h:mm a')}`;
  return format(d, 'MMM d, yyyy · h:mm a');
};

export const formatDateShort = (iso) =>
  iso ? format(new Date(iso), 'MMM d, yyyy') : '—';

export const formatTimeAgo = (iso) =>
  iso ? formatDistanceToNow(new Date(iso), { addSuffix: true }) : '—';

export const formatCurrency = (amount) =>
  `PKR ${Number(amount ?? 0).toLocaleString('en-PK', { minimumFractionDigits: 0 })}`;

export const formatTrustScore = (score) =>
  Number(score ?? 0).toFixed(1);

// ── Status colours ────────────────────────────────────────────────────────

const STATUS_STYLES = {
  // Ride statuses
  SCHEDULED:           'bg-blue-100 text-blue-800',
  IN_PROGRESS:         'bg-green-100 text-green-800',
  COMPLETED:           'bg-gray-100 text-gray-700',
  CANCELLED:           'bg-red-100 text-red-700',
  // Booking statuses
  PENDING:             'bg-yellow-100 text-yellow-800',
  APPROVED:            'bg-teal-100 text-teal-800',
  CONFIRMED:           'bg-blue-100 text-blue-800',
  // User statuses
  ACTIVE:              'bg-green-100 text-green-800',
  SUSPENDED:           'bg-orange-100 text-orange-800',
  BLOCKED:             'bg-red-100 text-red-800',
  PENDING_VERIFICATION:'bg-purple-100 text-purple-800',
  REJECTED:            'bg-red-100 text-red-700',
  // Payment statuses
  FAILED:              'bg-red-100 text-red-700',
  REFUNDED:            'bg-indigo-100 text-indigo-700',
  // Report statuses
  OPEN:                'bg-red-100 text-red-800',
  REVIEWED:            'bg-yellow-100 text-yellow-800',
  RESOLVED:            'bg-green-100 text-green-800',
};

export const getStatusStyle  = (status) =>
  STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600';

export const getStatusLabel  = (status) =>
  status?.replace(/_/g, ' ') ?? '—';