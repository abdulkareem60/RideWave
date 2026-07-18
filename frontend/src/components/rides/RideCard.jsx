import { Link } from 'react-router-dom';
import { MapPin, Clock, Users, Star, ArrowRight } from 'lucide-react';
import { formatDate, formatCurrency } from '../../utils/formatters.js';
import TrustScoreBadge from '../common/TrustScoreBadge.jsx';
import StatusBadge from '../common/StatusBadge.jsx';

export default function RideCard({ ride }) {
  return (
    <div className="card hover:shadow-md transition-shadow duration-200">
      <div className="p-5">

        {/* Route header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-brand-500" />
              <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{ride.originName}</span>
            </div>
            <div className="flex items-center gap-2 ml-5 text-brand-600 text-xs mb-1">
              <ArrowRight className="h-3 w-3" />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-red-400" />
              <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{ride.destName}</span>
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <p className="text-lg font-bold text-brand-700">{formatCurrency(ride.farePerSeat)}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">per seat</p>
          </div>
        </div>

        {/* Metadata row */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-4">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {formatDate(ride.departureTime)}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {ride.availableSeats} seat{ride.availableSeats !== 1 ? 's' : ''} left
          </span>
          {ride.requiresApproval && (
            <span className="px-1.5 py-0.5 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded text-xs">
              Approval Required
            </span>
          )}
          <StatusBadge status={ride.status} />
        </div>

        {/* Driver info + CTA */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700">
              {ride.driver?.fullName?.charAt(0) ?? '?'}
            </div>
            <div>
              <p className="text-xs font-medium text-gray-800 dark:text-gray-200">{ride.driver?.fullName}</p>
              <TrustScoreBadge score={ride.driver?.trustScore} />
            </div>
          </div>

          <Link to={`/rides/${ride.rideId}`}>
            <button className={`btn-primary py-1.5 px-3 text-xs ${!ride.canBookNow ? 'opacity-60 pointer-events-none' : ''}`}>
              {ride.canBookNow ? 'View & Book' : 'View Details'}
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}