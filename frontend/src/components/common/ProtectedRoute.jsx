import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import Spinner from './Spinner.jsx';

/**
 * ProtectedRoute — guards any route that requires authentication.
 *
 * allowedRoles: optional array; if present the user's role must be included.
 * While auth is being restored (page refresh) shows a spinner to prevent flash.
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Logged in but wrong role — redirect to their own dashboard
    const dashMap = { ADMIN: '/admin/dashboard', DRIVER: '/driver/dashboard', PASSENGER: '/passenger/dashboard' };
    return <Navigate to={dashMap[user.role] ?? '/dashboard'} replace />;
  }

  return children;
}