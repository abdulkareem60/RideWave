/**
 * MyRidesPage — driver's ride management.
 *
 * Ride start flow (no OTP):
 *   1. Driver clicks "Start Ride" → POST /rides/{id}/start
 *   2. Backend sets status = IN_PROGRESS, startedAt = now()
 *   3. Passengers check in via GPS (separate flow on passenger side)
 *
 * GPS check-in exposed as "Check-in nearby passenger" button for demo/testing.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Car, Play, CheckCircle, Plus, MapPin, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import PageLayout from '../../components/common/PageLayout.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { rideService } from '../../services/rideService.js';
import { formatDate, formatCurrency } from '../../utils/formatters.js';

export default function MyRidesPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['my-rides', statusFilter],
    queryFn:  () => rideService.getMyRides({ status: statusFilter || undefined, size: 20 })
                               .then(r => r.data.data),
  });

  // Start ride — no OTP needed
  const startMutation = useMutation({
    mutationFn: (rideId) => rideService.start(rideId),
    onSuccess:  () => {
      toast.success('Ride started! Passengers can now GPS check-in.');
      queryClient.invalidateQueries({ queryKey: ['my-rides'] });
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Failed to start ride.'),
  });

  // Complete ride
  const completeMutation = useMutation({
    mutationFn: (rideId) => rideService.complete(rideId),
    onSuccess:  () => {
      toast.success('Ride completed! Payment released.');
      queryClient.invalidateQueries({ queryKey: ['my-rides'] });
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Failed to complete ride.'),
  });

  // GPS check-in (uses browser geolocation — driver-side demo trigger)
  const [checkingIn, setCheckingIn] = useState(null);
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

  const rides    = data?.content ?? [];
  const statuses = ['', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

  return (
    <PageLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">My Rides</h1>
        <Link to="/rides/create" className="btn-primary px-4">
          <Plus className="h-4 w-4" /> New Ride
        </Link>
      </div>

      {/* Status filters */}
      <div className="flex gap-2 flex-wrap mb-6">
        {statuses.map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors
                    ${statusFilter === s
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : rides.length === 0 ? (
        <EmptyState icon={Car} title="No rides found"
                    description="Create a ride to start offering seats."
                    action={<Link to="/rides/create" className="btn-primary mt-2">Create a Ride</Link>} />
      ) : (
        <div className="space-y-4">
          {rides.map((r) => (
            <div key={r.rideId} className="card p-5">
              {/* Ride summary */}
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 truncate">
                    {r.originName} → {r.destName}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDate(r.departureTime)} · {r.availableSeats}/{r.totalSeats} seats · {formatCurrency(r.farePerSeat)}/seat
                  </p>
                  {r.startedAt && (
                    <p className="text-xs text-green-600 mt-0.5">
                      Started {formatDate(r.startedAt)}
                    </p>
                  )}
                </div>
                <StatusBadge status={r.status} />
              </div>

              {/* SCHEDULED: Start button (no OTP) */}
              {r.status === 'SCHEDULED' && (
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => startMutation.mutate(r.rideId)}
                    disabled={startMutation.isPending}
                    className="btn-primary text-xs px-4 py-1.5"
                  >
                    {startMutation.isPending
                      ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Starting…</>
                      : <><Play className="h-3.5 w-3.5" /> Start Ride</>}
                  </button>
                  <span className="text-xs text-gray-400">
                    No OTP required — passengers check in by GPS at pickup
                  </span>
                </div>
              )}

              {/* IN_PROGRESS: Complete + GPS check-in */}
              {r.status === 'IN_PROGRESS' && (
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => completeMutation.mutate(r.rideId)}
                    disabled={completeMutation.isPending}
                    className="btn-primary text-xs px-4 py-1.5 bg-green-600 hover:bg-green-700"
                  >
                    {completeMutation.isPending
                      ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Completing…</>
                      : <><CheckCircle className="h-3.5 w-3.5" /> Mark Complete</>}
                  </button>
                  <button
                    onClick={() => handleGpsCheckIn(r.rideId)}
                    disabled={checkingIn === r.rideId}
                    className="btn-secondary text-xs px-3 py-1.5"
                  >
                    {checkingIn === r.rideId
                      ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking…</>
                      : <><MapPin className="h-3.5 w-3.5" /> GPS Check-in</>}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </PageLayout>
  );
}