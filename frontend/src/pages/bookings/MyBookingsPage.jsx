import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, X, Car } from 'lucide-react';
import toast from 'react-hot-toast';
import PageLayout from '../../components/common/PageLayout.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import Avatar from '../../components/common/Avatar.jsx';
import VehicleThumbnail from '../../components/common/VehicleThumbnail.jsx';
import { bookingService } from '../../services/bookingService.js';
import { formatDate, formatCurrency } from '../../utils/formatters.js';

const STATUSES = ['', 'PENDING', 'APPROVED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

export default function MyBookingsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['my-bookings', statusFilter, page],
    queryFn:  () => bookingService.getMyBookings({
      status: statusFilter || undefined, page, size: 10,
    }).then(r => r.data.data),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ bookingId, reason }) => bookingService.cancel(bookingId, reason),
    onSuccess: () => {
      toast.success('Booking cancelled. Refund will be processed.');
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Cancel failed.'),
  });

  const bookings   = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;

  const handleCancel = (bookingId) => {
    if (!window.confirm('Cancel this booking?')) return;
    cancelMutation.mutate({ bookingId, reason: 'Passenger cancelled' });
  };

  return (
    <PageLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">My Bookings</h1>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap mb-6">
        {STATUSES.map((s) => (
          <button key={s}
                  onClick={() => { setStatusFilter(s); setPage(0); }}
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
      ) : bookings.length === 0 ? (
        <EmptyState icon={Calendar} title="No bookings found"
                    description="Your bookings will appear here after you book a ride." />
      ) : (
        <>
          <div className="space-y-3">
            {bookings.map((b) => (
              <div key={b.bookingId} className="card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 truncate">
                      {b.originName} → {b.destName}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDate(b.departureTime)}
                    </p>

                    {/* Driver + Vehicle row */}
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-2">
                        <Avatar src={b.driver?.profilePic} size="sm" alt={b.driver?.fullName} />
                        <div>
                          <p className="text-xs font-medium text-gray-800">{b.driver?.fullName}</p>
                          <p className="text-xs text-gray-400">Driver</p>
                        </div>
                      </div>

                      {b.vehicle && (
                        <div className="flex items-center gap-2 pl-4 border-l border-gray-100">
                          <VehicleThumbnail src={b.vehicle?.imageUrl} size="sm" alt={`${b.vehicle?.make} ${b.vehicle?.model}`} />
                          <div>
                            <p className="text-xs font-medium text-gray-800">
                              {b.vehicle?.make} {b.vehicle?.model}
                            </p>
                            <p className="text-xs text-gray-400 flex items-center gap-1">
                              <Car className="h-3 w-3" /> {b.vehicle?.plateNumber}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500">
                      <span>{b.seatsBooked} seat{b.seatsBooked !== 1 ? 's' : ''}</span>
                      <span className="font-semibold text-brand-700">{formatCurrency(b.totalFare)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge status={b.status} />
                    {['PENDING','CONFIRMED','APPROVED'].includes(b.status) && (
                      <button
                        onClick={() => handleCancel(b.bookingId)}
                        disabled={cancelMutation.isPending}
                        className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700">
                        <X className="h-3 w-3" /> Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button className="btn-secondary px-4" disabled={page === 0}
                      onClick={() => setPage(p => p - 1)}>Previous</button>
              <button className="btn-secondary px-4" disabled={page >= totalPages - 1}
                      onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          )}
        </>
      )}
    </PageLayout>
  );
}