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
  SCHEDULED:           'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300',
  IN_PROGRESS:         'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300',
  COMPLETED:           'bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300',
  CANCELLED:           'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  // Booking statuses
  PENDING:             'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-300',
  APPROVED:            'bg-teal-100 text-teal-800 dark:bg-teal-500/15 dark:text-teal-300',
  CONFIRMED:           'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300',
  // User statuses
  ACTIVE:              'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300',
  SUSPENDED:           'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300',
  BLOCKED:             'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300',
  PENDING_VERIFICATION:'bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-300',
  REJECTED:            'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  // Payment statuses
  FAILED:              'bg-red-100 text-red-700',
  REFUNDED:            'bg-indigo-100 text-indigo-700',
  // Report statuses
  OPEN:                'bg-red-100 text-red-800',
  REVIEWED:            'bg-yellow-100 text-yellow-800',
  RESOLVED:            'bg-green-100 text-green-800',
};

export const getStatusStyle  = (status) =>
  STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-400';

export const getStatusLabel  = (status) =>
  status?.replace(/_/g, ' ') ?? '—';