/**
 * MyRidesPage — driver's ride management.
 * UI redesign: Premium timeline layout with rich ride cards.
 * ALL backend logic, APIs, React Query, routing, pagination, filtering,
 * and ride actions unchanged.
 */

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Car, Play, CheckCircle, Plus, MapPin, Loader2,
  Calendar, Clock, Navigation, ChevronRight, ChevronDown,
  ChevronUp, Search, Filter, SlidersHorizontal, X,
  Eye, Pencil, Trash2, Ban, MoreHorizontal, Route,
  Users, Armchair, DollarSign, BarChart3, Timer,
  Star, Gauge, AlertTriangle, ArrowUpRight, RefreshCw,
  TrendingUp, TrendingDown, Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageLayout from '../../components/common/PageLayout.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { rideService } from '../../services/rideService.js';
import { formatDate, formatCurrency, formatTimeAgo } from '../../utils/formatters.js';

// ─── Animation variants ───────────────────────────────────────────────────
const fadeSlideUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.06 } },
};

// ─── Stat card for hero section ────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, trend, onClick, isActive }) {
  const colors = {
    indigo: { bg: 'bg-indigo-50 dark:bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', icon: 'text-indigo-500' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', icon: 'text-emerald-500' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', icon: 'text-amber-500' },
    red: { bg: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-600 dark:text-red-400', icon: 'text-red-500' },
    blue: { bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', icon: 'text-blue-500' },
  };
  const c = colors[color] || colors.indigo;

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={`
        relative flex items-center gap-4 p-4 rounded-2xl transition-all duration-200 text-left w-full
        ${isActive
          ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-lg ring-2 ring-gray-900 dark:ring-white ring-offset-2'
          : 'bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-sm'
        }
      `}
    >
      <div className={`p-2.5 rounded-xl ${isActive ? 'bg-white/20 dark:bg-gray-900/20' : c.bg}`}>
        <Icon className={`h-5 w-5 ${isActive ? 'text-white dark:text-gray-900' : c.icon}`} />
      </div>
      <div>
        <p className={`text-2xl font-bold tracking-tight ${isActive ? 'text-white dark:text-gray-900' : 'text-gray-900 dark:text-gray-100'}`}>
          {value}
        </p>
        <p className={`text-xs font-medium mt-0.5 ${isActive ? 'text-white/70 dark:text-gray-900/70' : 'text-gray-500 dark:text-gray-400'}`}>
          {label}
        </p>
      </div>
      {trend !== undefined && (
        <div className={`absolute top-3 right-3 flex items-center gap-0.5 text-xs font-semibold ${
          trend > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
        } ${isActive ? 'text-white/90 dark:text-gray-900/90' : ''}`}>
          {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {Math.abs(trend)}%
        </div>
      )}
    </motion.button>
  );
}

// ─── Segmented filter tab ──────────────────────────────────────────────────
function FilterTab({ label, icon: Icon, isActive, onClick, count }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`
        flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
        ${isActive
          ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-md'
          : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
        }
      `}
    >
      <Icon className="h-4 w-4" />
      {label}
      {count !== undefined && count > 0 && (
        <span className={`
          px-1.5 py-0.5 rounded-full text-[10px] font-bold
          ${isActive ? 'bg-white/20 text-white dark:bg-gray-900/20 dark:text-gray-900' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}
        `}>
          {count}
        </span>
      )}
    </motion.button>
  );
}

// ─── Timeline ride card ────────────────────────────────────────────────────
function RideTimelineCard({ ride, isExpanded, onToggle, onStart, onComplete, onCheckIn, checkingIn, isStarting, isCompleting }) {
  const departureTime = new Date(ride.departureTime);
  const now = new Date();
  const hoursUntilDeparture = Math.round((departureTime - now) / (1000 * 60 * 60));
  const isSoon = hoursUntilDeparture <= 2 && hoursUntilDeparture > 0 && ride.status === 'SCHEDULED';
  const isPast = hoursUntilDeparture < 0;

  const occupancyPercent = ride.totalSeats > 0
    ? Math.round(((ride.totalSeats - ride.availableSeats) / ride.totalSeats) * 100)
    : 0;

  const statusColors = {
    SCHEDULED: 'border-l-blue-500',
    IN_PROGRESS: 'border-l-amber-500',
    COMPLETED: 'border-l-emerald-500',
    CANCELLED: 'border-l-red-400',
    EXPIRED: 'border-l-gray-400',
  };

  const statusDotColors = {
    SCHEDULED: 'bg-blue-500 ring-blue-100 dark:ring-blue-900',
    IN_PROGRESS: 'bg-amber-500 ring-amber-100 dark:ring-amber-900 animate-pulse',
    COMPLETED: 'bg-emerald-500 ring-emerald-100 dark:ring-emerald-900',
    CANCELLED: 'bg-red-400 ring-red-100 dark:ring-red-900',
    EXPIRED: 'bg-gray-400 ring-gray-100 dark:ring-gray-800',
  };

  return (
    <motion.div
      variants={fadeSlideUp}
      layout
      className={`
        bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800
        border-l-4 ${statusColors[ride.status] || 'border-l-gray-300'}
        overflow-hidden transition-shadow duration-200 hover:shadow-md
      `}
    >
      {/* Main content */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Timeline dot */}
          <div className="flex flex-col items-center flex-shrink-0 pt-1">
            <div className={`w-3 h-3 rounded-full ring-4 ${statusDotColors[ride.status]}`} />
          </div>

          {/* Ride info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 truncate">
                  {ride.originName} → {ride.destName}
                </h3>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(ride.departureTime)}
                  </span>
                  {ride.routeDistanceM && (
                    <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                      <Route className="h-3.5 w-3.5" />
                      {(ride.routeDistanceM / 1000).toFixed(1)} km
                    </span>
                  )}
                  {ride.routeDurationS && (
                    <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                      <Clock className="h-3.5 w-3.5" />
                      {Math.round(ride.routeDurationS / 60)} min
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {isSoon && (
                  <span className="px-2 py-1 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] font-bold rounded-full border border-amber-200 dark:border-amber-800">
                    {hoursUntilDeparture}h left
                  </span>
                )}
                <StatusBadge status={ride.status} />
              </div>
            </div>

            {/* Metrics row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div>
                <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Occupancy</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {ride.totalSeats - ride.availableSeats}/{ride.totalSeats}
                  </span>
                  <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden max-w-[60px]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${occupancyPercent}%` }}
                      className={`h-full rounded-full ${
                        occupancyPercent > 80 ? 'bg-emerald-500' : occupancyPercent > 40 ? 'bg-amber-500' : 'bg-blue-500'
                      }`}
                    />
                  </div>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Earnings</p>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-1">
                  {formatCurrency(ride.totalTripFare || (ride.farePerSeat * (ride.totalSeats - ride.availableSeats)))}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Per Seat</p>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-1">
                  {formatCurrency(ride.farePerSeat || (ride.totalTripFare / ride.totalSeats))}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Status</p>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-1 capitalize">
                  {ride.status.replace('_', ' ').toLowerCase()}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* View details */}
              <Link
                to={`/rides/${ride.rideId}`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Eye className="h-3.5 w-3.5" /> View
              </Link>

              {/* Edit (scheduled only, no bookings) */}
              {ride.status === 'SCHEDULED' && (ride.bookingCount ?? 0) === 0 && (
                <Link
                  to={`/rides/${ride.rideId}/edit`}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Link>
              )}

              {/* Start ride */}
              {ride.status === 'SCHEDULED' && (
                <button
                  onClick={(e) => { e.stopPropagation(); onStart(ride.rideId); }}
                  disabled={isStarting}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 transition-colors"
                >
                  {isStarting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                  Start
                </button>
              )}

              {/* Complete ride */}
              {ride.status === 'IN_PROGRESS' && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); onComplete(ride.rideId); }}
                    disabled={isCompleting}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                  >
                    {isCompleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                    Complete
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onCheckIn(ride.rideId); }}
                    disabled={checkingIn === ride.rideId}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
                  >
                    {checkingIn === ride.rideId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MapPin className="h-3.5 w-3.5" />}
                    GPS Check-in
                  </button>
                </>
              )}

              {/* Expand toggle */}
              <button
                onClick={(e) => { e.stopPropagation(); onToggle(ride.rideId); }}
                className="flex items-center gap-1 px-2 py-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors ml-auto"
              >
                {isExpanded ? (
                  <><ChevronUp className="h-4 w-4" /> Less</>
                ) : (
                  <><ChevronDown className="h-4 w-4" /> More</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-gray-100 dark:border-gray-800 px-5 py-4 bg-gray-50/50 dark:bg-gray-800/30">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Route Distance</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">
                    {ride.routeDistanceM ? `${(ride.routeDistanceM / 1000).toFixed(1)} km` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Est. Duration</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">
                    {ride.routeDurationS ? `${Math.round(ride.routeDurationS / 60)} min` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Booking Mode</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">
                    {ride.requiresApproval ? 'Manual approval' : 'Instant'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Booked Seats</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">
                    {ride.totalSeats - ride.availableSeats} of {ride.totalSeats}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Ride ID</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1 font-mono">
                    #{ride.rideId?.slice(0, 8)}
                  </p>
                </div>
                {ride.startedAt && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Started At</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">
                      {formatDate(ride.startedAt)}
                    </p>
                  </div>
                )}
              </div>

              {/* Quick actions */}
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Link
                  to={`/rides/${ride.rideId}`}
                  className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  View full details <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Loading skeleton ──────────────────────────────────────────────────────
function RideCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 border-l-4 border-l-gray-200 dark:border-l-gray-700 p-5 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-3 h-3 rounded-full bg-gray-200 dark:bg-gray-700 mt-1" />
        <div className="flex-1 space-y-3">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          <div className="flex gap-2">
            <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-24" />
            <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-16" />
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i}>
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-12 mb-2" />
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-16" />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded-lg w-16" />
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-16" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════
export default function MyRidesPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRides, setExpandedRides] = useState(new Set());
  const [checkingIn, setCheckingIn] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['my-rides', statusFilter],
    queryFn: () => rideService.getMyRides({ status: statusFilter || undefined, size: 20 })
                             .then(r => r.data.data),
  });

  // Start ride mutation
  const startMutation = useMutation({
    mutationFn: (rideId) => rideService.start(rideId),
    onSuccess: () => {
      toast.success('Ride started! Passengers can now GPS check-in.');
      queryClient.invalidateQueries({ queryKey: ['my-rides'] });
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Failed to start ride.'),
  });

  // Complete ride mutation
  const completeMutation = useMutation({
    mutationFn: (rideId) => rideService.complete(rideId),
    onSuccess: () => {
      toast.success('Ride completed! Payment released.');
      queryClient.invalidateQueries({ queryKey: ['my-rides'] });
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Failed to complete ride.'),
  });

  // GPS check-in
  const handleGpsCheckIn = (rideId) => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported by your browser.');
      return;
    }
    setCheckingIn(rideId);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await rideService.checkIn(
            rideId,
            pos.coords.latitude,
            pos.coords.longitude
          );
          toast.success(res.data.data ?? res.data.message ?? 'Check-in processed.');
        } catch (err) {
          toast.error(err.response?.data?.message ?? 'Check-in failed.');
        } finally {
          setCheckingIn(null);
        }
      },
      () => { toast.error('Location access denied.'); setCheckingIn(null); }
    );
  };

  const toggleExpand = (rideId) => {
    setExpandedRides(prev => {
      const next = new Set(prev);
      if (next.has(rideId)) {
        next.delete(rideId);
      } else {
        next.add(rideId);
      }
      return next;
    });
  };

  const allRides = data?.content ?? [];

  // Calculate stats
  const stats = useMemo(() => {
    const scheduled = allRides.filter(r => r.status === 'SCHEDULED');
    const inProgress = allRides.filter(r => r.status === 'IN_PROGRESS');
    const completed = allRides.filter(r => r.status === 'COMPLETED');
    const cancelled = allRides.filter(r => r.status === 'CANCELLED');
    return {
      total: allRides.length,
      scheduled: { count: scheduled.length, rides: scheduled },
      inProgress: { count: inProgress.length, rides: inProgress },
      completed: { count: completed.length, rides: completed },
      cancelled: { count: cancelled.length, rides: cancelled },
    };
  }, [allRides]);

  // Filter rides based on search
  const filteredRides = useMemo(() => {
    if (!searchQuery.trim()) return allRides;
    const query = searchQuery.toLowerCase();
    return allRides.filter(r =>
      r.originName?.toLowerCase().includes(query) ||
      r.destName?.toLowerCase().includes(query) ||
      r.rideId?.toLowerCase().includes(query)
    );
  }, [allRides, searchQuery]);

  const filterTabs = [
    { key: '', label: 'All Rides', icon: Car, count: stats.total },
    { key: 'SCHEDULED', label: 'Scheduled', icon: Calendar, count: stats.scheduled.count },
    { key: 'IN_PROGRESS', label: 'In Progress', icon: Play, count: stats.inProgress.count },
    { key: 'COMPLETED', label: 'Completed', icon: CheckCircle, count: stats.completed.count },
    { key: 'CANCELLED', label: 'Cancelled', icon: Ban, count: stats.cancelled.count },
  ];

  return (
    <PageLayout>
      <div className="max-w-5xl mx-auto">
        {/* ── Hero Section ────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                My Rides
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Manage and track all your rides
              </p>
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ['my-rides'] });
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm font-semibold rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700"
              >
                <RefreshCw className="h-4 w-4" /> Refresh
              </motion.button>
              <Link to="/rides/create">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-bold rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-lg shadow-gray-900/10"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">New Ride</span>
                </motion.button>
              </Link>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              icon={Car}
              label="Total Rides"
              value={stats.total}
              color="indigo"
              onClick={() => setStatusFilter('')}
              isActive={statusFilter === ''}
            />
            <StatCard
              icon={Calendar}
              label="Scheduled"
              value={stats.scheduled.count}
              color="blue"
              onClick={() => setStatusFilter('SCHEDULED')}
              isActive={statusFilter === 'SCHEDULED'}
            />
            <StatCard
              icon={Play}
              label="In Progress"
              value={stats.inProgress.count}
              color="amber"
              onClick={() => setStatusFilter('IN_PROGRESS')}
              isActive={statusFilter === 'IN_PROGRESS'}
            />
            <StatCard
              icon={CheckCircle}
              label="Completed"
              value={stats.completed.count}
              color="emerald"
              onClick={() => setStatusFilter('COMPLETED')}
              isActive={statusFilter === 'COMPLETED'}
            />
          </div>
        </motion.div>

        {/* ── Sticky filter bar ────────────────────────────────────────── */}
        <div className="sticky top-0 z-20 bg-gray-50 dark:bg-gray-950 pb-4 pt-2 -mx-4 px-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-2 shadow-sm">
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search rides..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-transparent text-sm font-medium text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <X className="h-3.5 w-3.5 text-gray-400" />
                  </button>
                )}
              </div>

              {/* Filter toggle */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2.5 rounded-xl transition-colors ${
                  showFilters ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                }`}
              >
                <SlidersHorizontal className="h-4 w-4" />
              </motion.button>
            </div>

            {/* Expandable filter tabs */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex gap-2 pt-2 px-1 overflow-x-auto pb-1">
                    {filterTabs.map(tab => (
                      <FilterTab
                        key={tab.key}
                        label={tab.label}
                        icon={tab.icon}
                        isActive={statusFilter === tab.key}
                        onClick={() => setStatusFilter(tab.key)}
                        count={tab.count}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Rides list ────────────────────────────────────────────────── */}
        <div className="mt-4">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <RideCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredRides.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {searchQuery ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Search className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">No rides found</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    No rides match "{searchQuery}"
                  </p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                  >
                    Clear search
                  </button>
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <Car className="h-10 w-10 text-gray-300 dark:text-gray-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {statusFilter ? `No ${statusFilter.toLowerCase().replace('_', ' ')} rides` : 'No rides yet'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                    {statusFilter
                      ? `You don't have any rides with this status.`
                      : 'Create your first ride and start offering seats to passengers.'}
                  </p>
                  {!statusFilter && (
                    <Link to="/rides/create">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-bold rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-lg shadow-gray-900/10"
                      >
                        <Plus className="h-4 w-4" /> Create a Ride
                      </motion.button>
                    </Link>
                  )}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="space-y-3"
            >
              {filteredRides.map((ride) => (
                <RideTimelineCard
                  key={ride.rideId}
                  ride={ride}
                  isExpanded={expandedRides.has(ride.rideId)}
                  onToggle={toggleExpand}
                  onStart={(id) => startMutation.mutate(id)}
                  onComplete={(id) => completeMutation.mutate(id)}
                  onCheckIn={handleGpsCheckIn}
                  checkingIn={checkingIn}
                  isStarting={startMutation.isPending}
                  isCompleting={completeMutation.isPending}
                />
              ))}

              {/* Results count */}
              <motion.p
                variants={fadeSlideUp}
                className="text-center text-xs text-gray-400 dark:text-gray-500 py-4"
              >
                Showing {filteredRides.length} ride{filteredRides.length !== 1 ? 's' : ''}
                {statusFilter && ` · ${statusFilter.toLowerCase().replace('_', ' ')}`}
              </motion.p>
            </motion.div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}