import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import {
  MapPin, Clock, Users, Car, ArrowLeft, Route,
  Navigation, Timer, AlertCircle, Info,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageLayout    from '../../components/common/PageLayout.jsx';
import Spinner       from '../../components/common/Spinner.jsx';
import StatusBadge   from '../../components/common/StatusBadge.jsx';
import TrustScoreBadge from '../../components/common/TrustScoreBadge.jsx';
import BookingModal  from '../../components/booking/BookingModal.jsx';
import RouteMap      from '../../components/rides/RouteMap.jsx';
import { rideService }  from '../../services/rideService.js';
import { formatDate, formatCurrency } from '../../utils/formatters.js';
import { useAuth }   from '../../context/AuthContext.jsx';

export default function RideDetailPage() {
  const { rideId }          = useParams();
  const { user, isPassenger } = useAuth();
  const navigate            = useNavigate();
  const location            = useLocation();
  const [showModal, setShowModal] = useState(false);
  const [routeMeta, setRouteMeta] = useState(null);  // { distanceKm, durationMin }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['ride', rideId],
    queryFn:  () => rideService.getById(rideId).then(r => r.data.data),
  });

  const handleDistanceDuration = useCallback((meta) => {
    setRouteMeta(meta);
  }, []);

  if (isLoading) return (
    <PageLayout>
      <div className="flex justify-center py-20"><Spinner size="lg" /></div>
    </PageLayout>
  );

  if (isError || !data) return (
    <PageLayout>
      <div className="text-center py-20">
        <p className="text-gray-500 dark:text-gray-400">Ride not found.</p>
        <button className="btn-secondary mt-4" onClick={() => navigate(-1)}>Go Back</button>
      </div>
    </PageLayout>
  );

  const ride    = data;
  const canBook = isPassenger && ride.canBookNow && ride.driver?.userId !== user?.userId;

  const fmtDuration = (min) => {
    if (!min) return null;
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60), m = min % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  };

  return (
    <PageLayout>
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Back to results
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left / main column ──────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Route card */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Ride Details</h1>
              <StatusBadge status={ride.status} size="md" />
            </div>

            {/* Origin → Destination with route dots */}
            <div className="flex items-start gap-4 mb-4">
              <div className="flex flex-col items-center gap-1 pt-1 flex-shrink-0">
                <div className="h-3 w-3 rounded-full bg-emerald-500 border-2 border-emerald-200" />
                <div className="w-0.5 h-8 bg-gray-200 dark:bg-gray-700" />
                <div className="h-3 w-3 rounded-full bg-red-400 border-2 border-red-200" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">From</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{ride.originName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">To</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{ride.destName}</p>
                </div>
              </div>
            </div>

            {/* Distance / duration strip — populated by RouteMap callback */}
            {routeMeta && (
              <div className="flex items-center gap-4 px-4 py-3 bg-brand-50 dark:bg-brand-500/10 rounded-xl mb-4">
                <div className="flex items-center gap-2 text-brand-700 dark:text-brand-400">
                  <Navigation className="h-4 w-4" />
                  <span className="text-sm font-semibold">{routeMeta.distanceKm} km</span>
                </div>
                <div className="w-px h-4 bg-brand-200 dark:bg-brand-700" />
                <div className="flex items-center gap-2 text-brand-700 dark:text-brand-400">
                  <Timer className="h-4 w-4" />
                  <span className="text-sm font-semibold">~{fmtDuration(routeMeta.durationMin)}</span>
                </div>
                {!ride.routePolyline && (
                  <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                    <Info className="h-3 w-3" /> Straight-line estimate
                  </span>
                )}
              </div>
            )}

            {/* Route-based booking indicator */}
            {ride.routePolyline ? (
              <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-lg px-3 py-2 mb-5">
                <Route className="h-3.5 w-3.5 flex-shrink-0" />
                Route-based booking — pick up and drop off anywhere along this route.
                Tap the map to see the exact road the driver will follow.
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 mb-5">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                Route map unavailable — this ride books the full route: {ride.originName} → {ride.destName}
              </div>
            )}

            {/* ── ROUTE MAP ─────────────────────────────────────────────── */}
            <RouteMap
              originLat={ride.originLat}
              originLng={ride.originLng}
              originName={ride.originName}
              destLat={ride.destLat}
              destLng={ride.destLng}
              destName={ride.destName}
              routePolyline={ride.routePolyline}
              height="380px"
              onDistanceDuration={handleDistanceDuration}
              className="border border-gray-100 dark:border-gray-800 mb-1"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              Green marker = origin · Red marker = destination · Blue line = driver's route
            </p>

            {/* Stats row */}
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Departure</p>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-brand-500" />
                  {formatDate(ride.departureTime)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Fare / Seat</p>
                <p className="text-sm font-bold text-brand-700 dark:text-brand-400">{formatCurrency(ride.farePerSeat)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Seats Available</p>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-brand-500" />
                  {ride.availableSeats} / {ride.totalSeats}
                </p>
              </div>
            </div>

            {ride.requiresApproval && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/30 rounded-lg text-sm text-yellow-800 dark:text-yellow-300">
                ⚠️ This driver reviews and approves each booking before confirming.
              </div>
            )}
          </div>

          {/* Vehicle */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <Car className="h-4 w-4 text-brand-500" /> Vehicle
            </h2>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div><p className="text-xs text-gray-400 dark:text-gray-500">Make</p><p className="font-medium dark:text-gray-200">{ride.vehicle?.make}</p></div>
              <div><p className="text-xs text-gray-400 dark:text-gray-500">Model</p><p className="font-medium dark:text-gray-200">{ride.vehicle?.model}</p></div>
              <div><p className="text-xs text-gray-400 dark:text-gray-500">Plate</p><p className="font-medium dark:text-gray-200">{ride.vehicle?.plateNumber}</p></div>
              <div><p className="text-xs text-gray-400 dark:text-gray-500">Year</p><p className="font-medium dark:text-gray-200">{ride.vehicle?.year}</p></div>
              <div><p className="text-xs text-gray-400 dark:text-gray-500">Color</p><p className="font-medium dark:text-gray-200">{ride.vehicle?.color ?? '—'}</p></div>
              <div><p className="text-xs text-gray-400 dark:text-gray-500">Capacity</p><p className="font-medium dark:text-gray-200">{ride.vehicle?.totalSeats} seats</p></div>
            </div>
          </div>
        </div>

        {/* ── Right sidebar ────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Driver card */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Driver</h2>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-12 w-12 rounded-full bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center text-lg font-bold text-brand-700 dark:text-brand-400">
                {ride.driver?.fullName?.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{ride.driver?.fullName}</p>
                <TrustScoreBadge score={ride.driver?.trustScore} showLabel />
              </div>
            </div>
          </div>

          {/* Booking CTA */}
          {ride.canBookNow && (
            <div className="card p-5">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                <span className="font-semibold text-brand-700 dark:text-brand-400">
                  {ride.availableSeats} seat{ride.availableSeats !== 1 ? 's' : ''}
                </span>{' '}available
              </p>
              {routeMeta && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                  {routeMeta.distanceKm} km · ~{fmtDuration(routeMeta.durationMin)}
                </p>
              )}

              {canBook ? (
                <button
                  className="btn-primary w-full py-3"
                  onClick={() => setShowModal(true)}
                >
                  Book This Ride
                </button>
              ) : !user ? (
                <button
                  className="btn-primary w-full py-3"
                  onClick={() => {
                    toast.error('Please login first to book a ride.');
                    navigate('/login', { state: { from: location } });
                  }}
                >
                  Login to Book
                </button>
              ) : (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                  You cannot book this ride.
                </p>
              )}

              {ride.routePolyline && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
                  You can choose your pickup & drop when booking
                </p>
              )}
            </div>
          )}

          {!ride.canBookNow && ride.status !== 'SCHEDULED' && (
            <div className="card p-5 text-center">
              <StatusBadge status={ride.status} size="md" />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                This ride is no longer accepting bookings.
              </p>
            </div>
          )}

          {/* Route summary card */}
          {routeMeta && (
            <div className="card p-4">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                Route Summary
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> Distance
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {routeMeta.distanceKm} km
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                    <Timer className="h-3.5 w-3.5" /> Est. Duration
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    ~{fmtDuration(routeMeta.durationMin)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                    <Car className="h-3.5 w-3.5" /> Fare
                  </span>
                  <span className="font-semibold text-brand-700 dark:text-brand-400">
                    {formatCurrency(ride.farePerSeat)} / seat
                  </span>
                </div>
                {!ride.routePolyline && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 pt-1">
                    * Distance is straight-line estimate. Actual road distance may differ.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Booking Modal */}
      {showModal && (
        <BookingModal
          ride={ride}
          onClose={() => setShowModal(false)}
        />
      )}
    </PageLayout>
  );
}