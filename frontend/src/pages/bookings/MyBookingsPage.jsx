import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, X } from 'lucide-react';
import toast from 'react-hot-toast';
import PageLayout from '../../components/common/PageLayout.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
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
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">My Bookings</h1>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap mb-6">
        {STATUSES.map((s) => (
          <button key={s}
                  onClick={() => { setStatusFilter(s); setPage(0); }}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors
                    ${statusFilter === s
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-white dark:bg-surface-dark-raised text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'}`}>
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
                    <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {b.pickupName ? (
                        <>{b.pickupName} → {b.dropName}</>
                      ) : (
                        <>{b.rideOriginName ?? b.originName} → {b.rideDestName ?? b.destName}</>
                      )}
                    </p>
                    {b.pickupName && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        Full route: {b.rideOriginName} → {b.rideDestName}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {formatDate(b.rideDepartureTime ?? b.departureTime)}
                    </p>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>Driver: {b.driver?.fullName}</span>
                      <span>{b.seatsBooked} seat{b.seatsBooked !== 1 ? 's' : ''}</span>
                      <span className="font-semibold text-brand-700">{formatCurrency(b.totalFare)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge status={b.status} />
                    {(b.status === 'PENDING' || b.status === 'APPROVED') && (
                      <button
                        onClick={() => handleCancel(b.bookingId)}
                        disabled={cancelMutation.isPending}
                        className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
                      >
                        <X className="h-3 w-3" />
                        Cancel
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