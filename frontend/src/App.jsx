import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import Navbar from './components/common/Navbar.jsx';
import HomePage from './pages/HomePage.jsx';

// ── Auth pages ────────────────────────────────────────────────────────────
import LoginPage           from './pages/auth/LoginPage.jsx';
import RegisterPage        from './pages/auth/RegisterPage.jsx';
import TermsPage           from './pages/legal/TermsPage.jsx';
import PrivacyPage         from './pages/legal/PrivacyPage.jsx';
import VerifyEmailPage     from './pages/auth/VerifyEmailPage.jsx';
import ForgotPasswordPage  from './pages/auth/ForgotPasswordPage.jsx';
import ResetPasswordPage   from './pages/auth/ResetPasswordPage.jsx';

// ── Dashboard pages ───────────────────────────────────────────────────────
import PassengerDashboard  from './pages/dashboard/PassengerDashboard.jsx';
import DriverDashboard       from './pages/dashboard/DriverDashboard.jsx';
import DriverOnboardingPage      from './pages/driver/DriverOnboardingPage.jsx';
import DriverPendingApprovalPage from './pages/driver/DriverPendingApprovalPage.jsx';

// ── Ride pages ────────────────────────────────────────────────────────────
import SearchRidesPage     from './pages/rides/SearchRidesPage.jsx';
import RideDetailPage      from './pages/rides/RideDetailPage.jsx';
import CreateRidePage      from './pages/rides/CreateRidePage.jsx';
import MyRidesPage         from './pages/rides/MyRidesPage.jsx';

// ── Booking pages ─────────────────────────────────────────────────────────
import MyBookingsPage      from './pages/bookings/MyBookingsPage.jsx';

// ── Profile pages ─────────────────────────────────────────────────────────
import ProfilePage         from './pages/profile/ProfilePage.jsx';

// ── Admin pages ───────────────────────────────────────────────────────────
import AdminDashboardPage  from './pages/admin/AdminDashboardPage.jsx';
import UserManagementPage  from './pages/admin/UserManagementPage.jsx';
import DriverVerifyPage    from './pages/admin/DriverVerifyPage.jsx';
import ReportsPage         from './pages/admin/ReportsPage.jsx';

// ── Guards ────────────────────────────────────────────────────────────────
import ProtectedRoute      from './components/common/ProtectedRoute.jsx';
import DashboardRedirect   from './components/common/DashboardRedirect.jsx';


/**
 * RootRoute — "/" handler.
 *
 * Guests            → landing page (with Navbar)
 * PASSENGER (auth)  → /rides/search
 * DRIVER    (auth)  → /driver/dashboard
 * ADMIN     (auth)  → /admin/dashboard
 *
 * We wait until the auth session is restored (loading=false) before
 * deciding, so a page refresh doesn't flash-redirect before localStorage
 * is read.
 */
function RootRoute() {
  const { user, loading, isDriver, isAdmin } = useAuth();

  // Still restoring session from localStorage — render nothing to avoid flash
  if (loading) return null;

  if (user) {
    // Authenticated → redirect to role-appropriate dashboard
    if (isAdmin)  return <Navigate to="/admin/dashboard"    replace />;
    if (isDriver) return <Navigate to="/driver/dashboard"   replace />;
    return               <Navigate to="/rides/search"       replace />;
  }

  // Guest → show public landing page
  return <><Navbar /><HomePage /></>;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* ── Public ──────────────────────────────────────────── */}
        <Route path="/login"            element={<LoginPage />} />
        <Route path="/register"         element={<RegisterPage />} />
        <Route path="/terms"            element={<TermsPage />} />
        <Route path="/privacy"          element={<PrivacyPage />} />
        <Route path="/verify-email"     element={<VerifyEmailPage />} />
        <Route path="/forgot-password"  element={<ForgotPasswordPage />} />
        <Route path="/reset-password"   element={<ResetPasswordPage />} />
        {/* Public — guests can browse; booking itself requires login (enforced at click-time) */}
        <Route path="/rides/search" element={<SearchRidesPage />} />
        <Route path="/rides/:rideId"    element={<RideDetailPage />} />

        {/* ── Smart redirect based on role ─────────────────────── */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardRedirect />
          </ProtectedRoute>
        } />

        {/* ── Passenger ───────────────────────────────────────── */}
        <Route path="/passenger/dashboard" element={
          <ProtectedRoute allowedRoles={['PASSENGER']}>
            <PassengerDashboard />
          </ProtectedRoute>
        } />
        <Route path="/bookings" element={
          <ProtectedRoute allowedRoles={['PASSENGER']}>
            <MyBookingsPage />
          </ProtectedRoute>
        } />

        {/* ── Driver ──────────────────────────────────────────── */}
        <Route path="/driver/onboarding" element={
          <ProtectedRoute allowedRoles={['DRIVER']}>
            <DriverOnboardingPage />
          </ProtectedRoute>
        } />
        <Route path="/driver/pending-approval" element={
          <ProtectedRoute allowedRoles={['DRIVER']}>
            <DriverPendingApprovalPage />
          </ProtectedRoute>
        } />
        <Route path="/driver/dashboard" element={
          <ProtectedRoute allowedRoles={['DRIVER']}>
            <DriverDashboard />
          </ProtectedRoute>
        } />
        <Route path="/rides/create" element={
          <ProtectedRoute allowedRoles={['DRIVER']}>
            <CreateRidePage />
          </ProtectedRoute>
        } />
        <Route path="/rides/my" element={
          <ProtectedRoute allowedRoles={['DRIVER']}>
            <MyRidesPage />
          </ProtectedRoute>
        } />

        {/* ── Shared authenticated ─────────────────────────────── */}
        <Route path="/profile" element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        } />

        {/* ── Admin ───────────────────────────────────────────── */}
        <Route path="/admin/dashboard" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminDashboardPage />
          </ProtectedRoute>
        } />
        <Route path="/admin/users" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <UserManagementPage />
          </ProtectedRoute>
        } />
        <Route path="/admin/drivers/verify" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <DriverVerifyPage />
          </ProtectedRoute>
        } />
        <Route path="/admin/reports" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <ReportsPage />
          </ProtectedRoute>
        } />

        {/* ── Root "/" — guests see landing page, auth users get redirected ── */}
        <Route path="/" element={<RootRoute />} />

        {/* ── Catch-all ─────────────────────────────────────────── */}
        <Route path="*"   element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}