import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Calendar, Star, Clock } from 'lucide-react';
import PageLayout from '../../components/common/PageLayout.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import TrustScoreBadge from '../../components/common/TrustScoreBadge.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { bookingService } from '../../services/bookingService.js';
import { formatDate, formatCurrency } from '../../utils/formatters.js';

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      </div>
    </div>
  );
}

export default function PassengerDashboard() {
  const { user } = useAuth();

  const { data: bookingsData, isLoading } = useQuery({
    queryKey: ['my-bookings'],
    queryFn:  () => bookingService.getMyBookings({ size: 5 }).then(r => r.data.data),
  });

  const bookings   = bookingsData?.content ?? [];
  const totalCount = bookingsData?.totalElements ?? 0;
  const confirmed  = bookings.filter(b => ['CONFIRMED','APPROVED'].includes(b.status)).length;
  const completed  = bookings.filter(b => b.status === 'COMPLETED').length;

  return (
    <PageLayout>
      {/* Welcome */}
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Welcome back, {user?.fullName?.split(' ')[0]}! 👋
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Here's an overview of your rides.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard icon={Calendar}  label="Total Bookings" value={totalCount} color="bg-brand-500" />
        <StatCard icon={Clock}     label="Upcoming"        value={confirmed}  color="bg-green-500" />
        <StatCard icon={Star}      label="Trust Score"
                  value={Number(user?.trustScore ?? 3).toFixed(1)}
                  color="bg-yellow-400" />
      </div>

      {/* Trust score */}
      <div className="card p-5 mb-8 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Your Trust Score</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Based on ratings from drivers</p>
        </div>
        <TrustScoreBadge score={user?.trustScore} showLabel />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        <Link to="/rides/search" className="card p-5 hover:shadow-md transition-shadow flex items-center gap-4 group">
          <div className="p-3 bg-brand-50 dark:bg-brand-500/15 rounded-xl group-hover:bg-brand-100 dark:group-hover:bg-brand-500/25 transition-colors">
            <Search className="h-5 w-5 text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <p className="font-semibold text-gray-800 dark:text-gray-200">Search Rides</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Find and book your next ride</p>
          </div>
        </Link>
        <Link to="/bookings" className="card p-5 hover:shadow-md transition-shadow flex items-center gap-4 group">
          <div className="p-3 bg-green-50 dark:bg-green-500/15 rounded-xl group-hover:bg-green-100 dark:group-hover:bg-green-500/25 transition-colors">
            <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="font-semibold text-gray-800 dark:text-gray-200">My Bookings</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">View and manage your bookings</p>
          </div>
        </Link>
      </div>

      {/* Recent Bookings */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Recent Bookings</h2>
          <Link to="/bookings" className="text-xs text-brand-600 hover:underline">View all</Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : bookings.length === 0 ? (
          <div className="card p-8 text-center text-sm text-gray-400 dark:text-gray-500">
            No bookings yet.{' '}
            <Link to="/rides/search" className="text-brand-600 hover:underline">Search for a ride!</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((b) => (
              <div key={b.bookingId} className="card p-4 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {b.originName} → {b.destName}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {formatDate(b.departureTime)} · {formatCurrency(b.totalFare)}
                  </p>
                </div>
                <StatusBadge status={b.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}