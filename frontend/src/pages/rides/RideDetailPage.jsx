import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { MapPin, Clock, Users, Car, ArrowLeft, ArrowRight, Star, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import PageLayout from '../../components/common/PageLayout.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import TrustScoreBadge from '../../components/common/TrustScoreBadge.jsx';
import Avatar from '../../components/common/Avatar.jsx';
import VehicleThumbnail from '../../components/common/VehicleThumbnail.jsx';
import BookingModal from '../../components/booking/BookingModal.jsx';
import { rideService } from '../../services/rideService.js';
import { formatDate, formatCurrency } from '../../utils/formatters.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function RideDetailPage() {
  const { rideId }  = useParams();
  const { user, isPassenger } = useAuth();
  const navigate    = useNavigate();
  const [showModal, setShowModal] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['ride', rideId],
    queryFn:  () => rideService.getById(rideId).then(r => r.data.data),
  });

  if (isLoading) return (
    <PageLayout>
      <div className="flex justify-center py-20"><Spinner size="lg" /></div>
    </PageLayout>
  );

  if (isError || !data) return (
    <PageLayout>
      <div className="text-center py-20">
        <p className="text-gray-500">Ride not found.</p>
        <button className="btn-secondary mt-4" onClick={() => navigate(-1)}>Go Back</button>
      </div>
    </PageLayout>
  );

  const ride = data;
  const canBook = isPassenger && ride.canBookNow
      && ride.driver?.userId !== user?.userId;

  return (
    <PageLayout>
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to results
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Main card */}
        <div className="lg:col-span-2 space-y-5">

          {/* Route */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold text-gray-900">Ride Details</h1>
              <StatusBadge status={ride.status} size="md" />
            </div>

            <div className="flex items-start gap-4">
              <div className="flex flex-col items-center gap-1 pt-1">
                <div className="h-3 w-3 rounded-full bg-brand-500 border-2 border-brand-200" />
                <div className="w-0.5 h-8 bg-gray-200" />
                <div className="h-3 w-3 rounded-full bg-red-400 border-2 border-red-200" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">From</p>
                  <p className="font-semibold text-gray-900">{ride.originName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">To</p>
                  <p className="font-semibold text-gray-900">{ride.destName}</p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Departure</p>
                <p className="text-sm font-medium text-gray-800 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-brand-500" />
                  {formatDate(ride.departureTime)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Fare / Seat</p>
                <p className="text-sm font-bold text-brand-700">{formatCurrency(ride.farePerSeat)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Available Seats</p>
                <p className="text-sm font-medium text-gray-800 flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-brand-500" />
                  {ride.availableSeats} / {ride.totalSeats}
                </p>
              </div>
            </div>

            {ride.requiresApproval && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                ⚠️ This driver requires approval before confirming bookings.
              </div>
            )}
          </div>

          {/* Vehicle */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Car className="h-4 w-4 text-brand-500" /> Vehicle
            </h2>
            {ride.vehicle?.imageUrl && (
              <div className="mb-4">
                <VehicleThumbnail src={ride.vehicle.imageUrl} size="lg" alt={`${ride.vehicle?.make} ${ride.vehicle?.model}`} />
              </div>
            )}
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div><p className="text-xs text-gray-400">Make</p><p className="font-medium">{ride.vehicle?.make}</p></div>
              <div><p className="text-xs text-gray-400">Model</p><p className="font-medium">{ride.vehicle?.model}</p></div>
              <div><p className="text-xs text-gray-400">Plate</p><p className="font-medium">{ride.vehicle?.plateNumber}</p></div>
              <div><p className="text-xs text-gray-400">Year</p><p className="font-medium">{ride.vehicle?.year}</p></div>
              <div><p className="text-xs text-gray-400">Color</p><p className="font-medium">{ride.vehicle?.color ?? '—'}</p></div>
              <div><p className="text-xs text-gray-400">Capacity</p><p className="font-medium">{ride.vehicle?.totalSeats} seats</p></div>
            </div>
          </div>
        </div>

        {/* Sidebar — Driver + Booking CTA */}
        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-brand-500" /> Driver Information
            </h2>
            <div className="flex items-center gap-3 mb-3">
              <Avatar src={ride.driver?.profilePic} size="lg" alt={ride.driver?.fullName} />
              <div>
                <p className="font-semibold text-gray-900">{ride.driver?.fullName}</p>
                <TrustScoreBadge score={ride.driver?.trustScore} showLabel />
              </div>
            </div>
            {ride.driver?.trustScore != null && (
              <div className="flex items-center gap-2 pt-3 border-t border-gray-100 text-sm text-gray-600">
                <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                <span>
                  <span className="font-semibold text-gray-900">{Number(ride.driver.trustScore).toFixed(2)}</span> driver rating
                </span>
              </div>
            )}
          </div>

          {/* Booking CTA */}
          {ride.canBookNow && (
            <div className="card p-5">
              <p className="text-sm text-gray-600 mb-3">
                <span className="font-semibold text-brand-700">{ride.availableSeats} seat{ride.availableSeats !== 1 ? 's' : ''}</span> available
              </p>
              {canBook ? (
                <button className="btn-primary w-full py-3"
                        onClick={() => setShowModal(true)}>
                  Book This Ride
                </button>
              ) : !user ? (
                <p className="text-xs text-gray-500 text-center">
                  <a href="/login" className="text-brand-600 font-medium hover:underline">Log in</a> to book this ride.
                </p>
              ) : (
                <p className="text-xs text-gray-400 text-center">
                  You cannot book this ride.
                </p>
              )}
            </div>
          )}

          {!ride.canBookNow && ride.status !== 'SCHEDULED' && (
            <div className="card p-5 text-center">
              <StatusBadge status={ride.status} size="md" />
              <p className="text-xs text-gray-400 mt-2">This ride is no longer accepting bookings.</p>
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