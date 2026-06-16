/**
 * DriverDashboard — RideWave driver experience.
 * UI redesign only. All logic, queries, mutations, and data structures unchanged.
 */

import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusCircle, Car, CheckCircle, Clock, ShieldCheck,
  Star, Armchair, MapPin, Flag, ChevronRight, Bell,
  ThumbsUp, ThumbsDown, RefreshCw, Calendar, ChevronDown,
  ChevronUp, Users, Activity, XCircle, UserCheck, BarChart3,
  ArrowUpRight, Settings,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageLayout          from '../../components/common/PageLayout.jsx';
import Spinner             from '../../components/common/Spinner.jsx';
import StatusBadge         from '../../components/common/StatusBadge.jsx';
import TrustScoreBadge     from '../../components/common/TrustScoreBadge.jsx';
import { useAuth }         from '../../context/AuthContext.jsx';
import { rideService }     from '../../services/rideService.js';
import { bookingService }  from '../../services/bookingService.js';
import { formatDate, formatTimeAgo, formatCurrency } from '../../utils/formatters.js';

// ─── Design tokens ────────────────────────────────────────────────────────
const accent = {
  indigo:  { bg: 'bg-indigo-600',  light: 'bg-indigo-50',  text: 'text-indigo-600',  ring: 'ring-indigo-200' },
  emerald: { bg: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-200' },
  amber:   { bg: 'bg-amber-500',   light: 'bg-amber-50',   text: 'text-amber-600',   ring: 'ring-amber-200'  },
  blue:    { bg: 'bg-blue-500',    light: 'bg-blue-50',    text: 'text-blue-600',    ring: 'ring-blue-200'   },
  red:     { bg: 'bg-red-500',     light: 'bg-red-50',     text: 'text-red-600',     ring: 'ring-red-200'    },
};

// ─── Avatar ───────────────────────────────────────────────────────────────
function Avatar({ src, name, size = 40 }) {
  const [broken, setBroken] = useState(false);
  const initials = (name ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const px = `${size}px`;

  if (src && !broken) {
    return <img src={src} alt={name ?? 'Passenger'} onError={() => setBroken(true)}
      className="rounded-full object-cover ring-2 ring-white shadow-sm flex-shrink-0"
      style={{ width: px, height: px }} />;
  }
  return (
    <div className="rounded-full bg-indigo-100 ring-2 ring-white shadow-sm flex items-center justify-center flex-shrink-0"
      style={{ width: px, height: px }}>
      <span className="font-bold text-indigo-700" style={{ fontSize: Math.round(size * 0.34) }}>
        {initials}
      </span>
    </div>
  );
}

// ─── Stat card ─────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, badge }) {
  const c = accent[color] ?? accent.indigo;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 transition-all duration-150 hover:shadow-md">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 ${c.light} rounded-xl`}>
          <Icon className={`h-5 w-5 ${c.text}`} />
        </div>
        {badge > 0 && (
          <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">
            {badge}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

// ─── Capacity bar ──────────────────────────────────────────────────────────
function CapacityBar({ available, total }) {
  const booked = total - available;
  const pct    = total > 0 ? Math.round((booked / total) * 100) : 0;
  const fill   = pct >= 90 ? 'bg-red-500' : pct >= 60 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1.5">
        <span>{booked} booked</span>
        <span>{available} of {total} left</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${fill} rounded-full transition-all duration-300`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Booking request card ─────────────────────────────────────────────────
function BookingRequestCard({ booking, onDecide, deciding }) {
  const [rejectMode, setRejectMode] = useState(false);
  const [reason, setReason]         = useState('');
  const isDeciding = deciding === booking.bookingId;

  const handleApprove = () => onDecide(booking.bookingId, true, null);
  const handleReject  = () => {
    if (!rejectMode) { setRejectMode(true); return; }
    onDecide(booking.bookingId, false, reason.trim() || 'Driver rejected the request.');
    setRejectMode(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-4 space-y-4">
      {/* Passenger */}
      <div className="flex items-start gap-3">
        <Avatar src={booking.passengerPhoto} name={booking.passengerName} size={44} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900">{booking.passengerName}</span>
            {booking.passengerVerified && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-semibold rounded-md">
                <ShieldCheck className="h-2.5 w-2.5" /> Verified
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {booking.passengerTrustScore != null && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                {Number(booking.passengerTrustScore).toFixed(1)}
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Armchair className="h-3 w-3" />
              {booking.seatsBooked} seat{booking.seatsBooked !== 1 ? 's' : ''}
            </span>
            <span className="text-xs text-gray-400">{formatTimeAgo(booking.bookingTime)}</span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-bold text-gray-900">{formatCurrency(booking.totalFare)}</p>
          <p className="text-[10px] text-gray-400">total fare</p>
        </div>
      </div>

      {/* Route */}
      <div className="bg-gray-50 rounded-xl px-3 py-2.5 flex items-center gap-2 text-sm text-gray-700">
        <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
        <span className="truncate">{booking.originName}</span>
        <ChevronRight className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
        <Flag className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
        <span className="truncate">{booking.destName}</span>
        <span className="ml-auto text-xs text-gray-400 flex-shrink-0">{formatDate(booking.departureTime)}</span>
      </div>

      {/* Reject reason */}
      {rejectMode && (
        <input
          type="text"
          placeholder="Reason (optional)"
          value={reason}
          onChange={e => setReason(e.target.value)}
          autoFocus
          className="w-full text-sm px-3 py-2 rounded-xl border border-red-200 bg-red-50
            outline-none focus:ring-2 focus:ring-red-300 placeholder:text-gray-400"
        />
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleApprove}
          disabled={isDeciding}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-500 text-white
            text-sm font-semibold rounded-xl hover:bg-emerald-600 active:scale-95
            disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
        >
          {isDeciding ? <Spinner size="sm" /> : <><ThumbsUp className="h-4 w-4" /> Approve</>}
        </button>
        <button
          onClick={handleReject}
          disabled={isDeciding}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold
            rounded-xl active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150
            ${rejectMode
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'border border-red-200 text-red-600 bg-white hover:bg-red-50'}`}
        >
          <ThumbsDown className="h-4 w-4" />
          {rejectMode ? 'Confirm' : 'Reject'}
        </button>
        {rejectMode && (
          <button
            onClick={() => { setRejectMode(false); setReason(''); }}
            className="px-3 py-2.5 text-sm text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Approved passenger row ────────────────────────────────────────────────
function ApprovedRow({ booking }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <Avatar src={booking.passengerPhoto} name={booking.passengerName} size={32} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{booking.passengerName}</p>
        <p className="text-xs text-gray-500">{booking.seatsBooked} seat{booking.seatsBooked !== 1 ? 's' : ''} · {formatCurrency(booking.totalFare)}</p>
      </div>
      <StatusBadge status={booking.status} />
    </div>
  );
}

// ─── Per-ride booking panel ────────────────────────────────────────────────
function RideBookingPanel({ ride, onDecide, deciding }) {
  const [open, setOpen] = useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ['ride-bookings', ride.rideId],
    queryFn:  () => rideService.getBookingsForRide(ride.rideId).then(r => r.data.data?.content ?? []),
    refetchInterval: 8_000,
  });

  const bookings = data ?? [];
  const pending  = bookings.filter(b => b.status === 'PENDING');
  const approved = bookings.filter(b => b.status === 'APPROVED' || b.status === 'CONFIRMED');
  const rejected = bookings.filter(b => b.status === 'REJECTED' || b.status === 'CANCELLED');

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left p-4 sm:p-5 hover:bg-gray-50 transition-colors duration-150"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 bg-indigo-50 rounded-xl flex-shrink-0 mt-0.5">
            <Car className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-900 truncate">
                {ride.originName} → {ride.destName}
              </span>
              {pending.length > 0 && (
                <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex-shrink-0">
                  {pending.length} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(ride.departureTime)}</span>
              <span>{formatCurrency(ride.farePerSeat)}/seat</span>
            </div>
            <div className="mt-3">
              <CapacityBar available={ride.availableSeats} total={ride.totalSeats} />
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {[
                { label: `${pending.length} Pending`,  cls: 'bg-amber-50 text-amber-700 border-amber-200' },
                { label: `${approved.length} Approved`, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                { label: `${rejected.length} Rejected`, cls: 'bg-red-50 text-red-600 border-red-200' },
              ].map(c => (
                <span key={c.label} className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${c.cls}`}>
                  {c.label}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <StatusBadge status={ride.status} />
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </button>

      {/* Body */}
      {open && (
        <div className="border-t border-gray-100 p-4 sm:p-5 space-y-5">
          {isLoading && <div className="flex justify-center py-6"><Spinner /></div>}

          {/* Pending requests */}
          {pending.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Bell className="h-3 w-3 text-amber-500" /> Pending ({pending.length})
              </p>
              <div className="space-y-3">
                {pending.map(b => (
                  <BookingRequestCard key={b.bookingId} booking={b} onDecide={onDecide} deciding={deciding} />
                ))}
              </div>
            </div>
          )}

          {/* Approved */}
          {approved.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <UserCheck className="h-3 w-3 text-emerald-500" /> Approved ({approved.length})
              </p>
              <div className="bg-gray-50 rounded-xl px-4 py-1">
                {approved.map(b => <ApprovedRow key={b.bookingId} booking={b} />)}
              </div>
            </div>
          )}

          {!isLoading && bookings.length === 0 && (
            <div className="text-center py-6">
              <Users className="h-8 w-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No requests yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Recent ride row ───────────────────────────────────────────────────────
function RecentRideRow({ ride }) {
  return (
    <Link to={`/rides/${ride.rideId}`}
      className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100
        hover:shadow-sm hover:border-gray-200 transition-all duration-150 group">
      <div className={`p-2 rounded-xl flex-shrink-0 ${
        ride.status === 'COMPLETED' ? 'bg-emerald-50' :
        ride.status === 'IN_PROGRESS' ? 'bg-amber-50' : 'bg-gray-50'
      }`}>
        <Car className={`h-5 w-5 ${
          ride.status === 'COMPLETED' ? 'text-emerald-600' :
          ride.status === 'IN_PROGRESS' ? 'text-amber-600' : 'text-gray-400'
        }`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {ride.originName} → {ride.destName}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-500">{formatDate(ride.departureTime)}</span>
          <span className="text-xs text-gray-300">·</span>
          <span className="text-xs font-medium text-indigo-600">{formatCurrency(ride.farePerSeat)}/seat</span>
          <span className="text-xs text-gray-300">·</span>
          <span className="text-xs text-gray-500">{ride.availableSeats}/{ride.totalSeats} seats</span>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <StatusBadge status={ride.status} />
        <ArrowUpRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
      </div>
    </Link>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Dashboard
// ═══════════════════════════════════════════════════════════════════════════
export default function DriverDashboard() {
  const { user }        = useAuth();
  const queryClient     = useQueryClient();
  const [deciding, setDeciding] = useState(null);
  const [tab, setTab]   = useState('requests'); // 'requests' | 'history'

  const { data: ridesData, isLoading: ridesLoading } = useQuery({
    queryKey: ['my-rides'],
    queryFn:  () => rideService.getMyRides({ size: 20 }).then(r => r.data.data),
    refetchInterval: 15_000,
  });

  const allRides        = ridesData?.content ?? [];
  const scheduledRides  = allRides.filter(r => r.status === 'SCHEDULED');
  const inProgressRides = allRides.filter(r => r.status === 'IN_PROGRESS');
  const completedRides  = allRides.filter(r => r.status === 'COMPLETED');
  const totalRides      = ridesData?.totalElements ?? 0;
  const activeRides     = [...inProgressRides, ...scheduledRides];

  const { data: pendingCountData } = useQuery({
    queryKey: ['pending-bookings-count', scheduledRides.map(r => r.rideId)],
    queryFn:  async () => {
      if (!scheduledRides.length) return 0;
      const counts = await Promise.all(
        scheduledRides.map(r =>
          rideService.getBookingsForRide(r.rideId)
            .then(res => (res.data.data?.content ?? []).filter(b => b.status === 'PENDING').length)
            .catch(() => 0)
        )
      );
      return counts.reduce((a, b) => a + b, 0);
    },
    enabled: scheduledRides.length > 0,
    refetchInterval: 8_000,
  });

  const pendingTotal = pendingCountData ?? 0;

  const decideMutation = useMutation({
    mutationFn: ({ bookingId, approved, reason }) =>
      bookingService.decide(bookingId, { approved, reason }),
    onMutate:   ({ bookingId }) => setDeciding(bookingId),
    onSuccess:  (_, { approved }) => {
      toast.success(approved ? 'Approved — passenger notified.' : 'Booking rejected.');
      queryClient.invalidateQueries({ queryKey: ['my-rides'] });
      queryClient.invalidateQueries({ queryKey: ['ride-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['pending-bookings-count'] });
    },
    onError:    (err) => toast.error(err.response?.data?.message ?? 'Action failed.'),
    onSettled:  () => setDeciding(null),
  });

  const handleDecide = useCallback((bookingId, approved, reason) => {
    decideMutation.mutate({ bookingId, approved, reason });
  }, [decideMutation]);

  return (
    <PageLayout>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},
            {' '}{user?.fullName?.split(' ')[0] ?? 'Driver'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Here's what's happening with your rides</p>
        </div>
        <Link to="/rides/create"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold
            rounded-xl hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-500/20">
          <PlusCircle className="h-4 w-4" />
          <span className="hidden sm:inline">New Ride</span>
        </Link>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Car}          label="Total rides"        value={totalRides}          color="indigo" />
        <StatCard icon={Bell}         label="Pending requests"   value={pendingTotal}         color="amber"  badge={pendingTotal} />
        <StatCard icon={CheckCircle}  label="Completed"          value={completedRides.length} color="emerald" />
        <StatCard icon={Activity}     label="Active rides"       value={activeRides.length}   color="blue" />
      </div>

      {/* ── Trust score strip ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 mb-6 shadow-sm">
        <div className="p-2.5 bg-indigo-50 rounded-xl">
          <Star className="h-5 w-5 text-indigo-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">Trust Score</p>
          <p className="text-xs text-gray-500">Based on passenger ratings and ride history</p>
        </div>
        <TrustScoreBadge score={user?.trustScore} showLabel />
      </div>

      {/* ── Tab bar ────────────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6">
        {[
          { key: 'requests', label: 'Booking Requests', icon: Bell, count: pendingTotal },
          { key: 'history',  label: 'Ride History',      icon: Clock },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold
              rounded-lg transition-all duration-150
              ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <t.icon className="h-4 w-4" />
            {t.label}
            {t.count > 0 && (
              <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Requests tab ───────────────────────────────────────────────── */}
      {tab === 'requests' && (
        <div>
          {ridesLoading ? (
            <div className="flex justify-center py-16"><Spinner size="lg" /></div>
          ) : activeRides.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-gray-700">
                  {activeRides.length} active ride{activeRides.length !== 1 ? 's' : ''}
                </p>
                <button
                  onClick={() => {
                    queryClient.invalidateQueries({ queryKey: ['ride-bookings'] });
                    queryClient.invalidateQueries({ queryKey: ['pending-bookings-count'] });
                  }}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700
                    px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                  <RefreshCw className="h-3.5 w-3.5" /> Refresh
                </button>
              </div>
              <div className="space-y-3">
                {activeRides.map(ride => (
                  <RideBookingPanel key={ride.rideId} ride={ride} onDecide={handleDecide} deciding={deciding} />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                <Car className="h-8 w-8 text-gray-300" />
              </div>
              <h3 className="text-base font-semibold text-gray-700 mb-1">No active rides</h3>
              <p className="text-sm text-gray-400 mb-5 max-w-xs">
                Create a ride to start receiving booking requests from passengers.
              </p>
              <Link to="/rides/create"
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold
                  rounded-xl hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-500/20">
                <PlusCircle className="h-4 w-4" /> Create a Ride
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── History tab ────────────────────────────────────────────────── */}
      {tab === 'history' && (
        <div className="space-y-6">
          {/* Quick actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { to: '/rides/create', icon: PlusCircle, label: 'Create a Ride',   sub: 'Offer seats on your next trip', color: 'indigo' },
              { to: '/rides/my',     icon: Car,         label: 'All My Rides',   sub: 'Full ride history and management', color: 'emerald' },
            ].map(a => {
              const c = accent[a.color];
              return (
                <Link key={a.to} to={a.to}
                  className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100
                    hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 group">
                  <div className={`p-2.5 ${c.light} rounded-xl group-hover:scale-105 transition-transform`}>
                    <a.icon className={`h-5 w-5 ${c.text}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{a.label}</p>
                    <p className="text-xs text-gray-500">{a.sub}</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-gray-300 ml-auto group-hover:text-gray-500 transition-colors" />
                </Link>
              );
            })}
          </div>

          {/* Recent rides */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-900">Recent Rides</h2>
              <Link to="/rides/my" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                View all <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {ridesLoading ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : allRides.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                <Clock className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No rides yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {allRides.slice(0, 8).map(ride => (
                  <RecentRideRow key={ride.rideId} ride={ride} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </PageLayout>
  );
}