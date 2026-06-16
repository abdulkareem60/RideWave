import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

/**
 * Routes users to the correct landing page after login.
 *
 * Drivers who are not yet ACTIVE (status = PENDING, PENDING_VERIFICATION,
 * REJECTED) are sent to onboarding — they cannot reach the dashboard
 * until their documents are verified and status transitions to ACTIVE.
 */
export default function DashboardRedirect() {
  const { user } = useAuth();

  if (user?.role === 'DRIVER') {
    // Any status other than ACTIVE → onboarding flow
    if (user.status !== 'ACTIVE') {
      return <Navigate to="/driver/onboarding" replace />;
    }
    return <Navigate to="/driver/dashboard" replace />;
  }

  const map = {
    ADMIN:     '/admin/dashboard',
    PASSENGER: '/passenger/dashboard',
  };
  return <Navigate to={map[user?.role] ?? '/rides/search'} replace />;
}