import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Car, Bell, Menu, X, LogOut, User, LayoutDashboard,
  Search, Settings, ChevronDown, Star, Shield,
  AlertCircle, TrendingUp, Users, Wallet,
  PlusCircle, List, Calendar, MapPin,
  CheckCheck, Loader2, Sun, Moon,
} from 'lucide-react';
import { useAuth }              from '../../context/AuthContext.jsx';
import { useTheme }             from '../../context/ThemeContext.jsx';
import { notificationService }  from '../../services/notificationService.js';
import { formatTrustScore, formatTimeAgo } from '../../utils/formatters.js';

// ── Notification type → icon + color ──────────────────────────────────────
const NOTIF_STYLE = {
  BOOKING: { icon: Calendar,  color: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10'      },
  RIDE:    { icon: Car,       color: 'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-500/10' },
  PAYMENT: { icon: Wallet,    color: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10' },
  RATING:  { icon: Star,      color: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10'   },
  GENERAL: { icon: Bell,      color: 'text-gray-600 bg-gray-50 dark:text-gray-300 dark:bg-gray-700/40'      },
};
function notifStyle(type) {
  return NOTIF_STYLE[type] ?? NOTIF_STYLE.GENERAL;
}

// ── Dark Mode Toggle ───────────────────────────────────────────────────────
function ThemeToggle({ className = '' }) {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${className}`}
    >
      <Sun  className={`h-5 w-5 text-amber-500 transition-all duration-200 ${isDark ? 'scale-0 -rotate-90 absolute' : 'scale-100 rotate-0'}`} />
      <Moon className={`h-5 w-5 text-indigo-400 transition-all duration-200 ${isDark ? 'scale-100 rotate-0' : 'scale-0 rotate-90 absolute'}`} />
    </button>
  );
}

// ── Notification Bell ─────────────────────────────────────────────────────
function NotificationBell({ count, onClick, isOpen }) {
  return (
    <button
      onClick={onClick}
      className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      aria-label={`Notifications${count > 0 ? ` (${count} unread)` : ''}`}
    >
      <Bell className={`h-5 w-5 ${isOpen ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`} />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white
          text-[10px] font-bold rounded-full flex items-center justify-center">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
}

// ── Notifications Dropdown ─────────────────────────────────────────────────
function NotificationsDropdown({ isOpen, onClose }) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn:  () => notificationService.getAll(0, 15).then(r => r.data.data?.content ?? []),
    enabled:  isOpen,
    staleTime: 30_000,
  });

  const markOneMutation = useMutation({
    mutationFn: (id) => notificationService.markOneRead(id),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notif-count'] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notif-count'] });
    },
  });

  const notifications = data ?? [];

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-surface-dark-raised rounded-2xl
      border border-gray-100 dark:border-gray-800
      shadow-xl shadow-gray-500/10 dark:shadow-black/30 z-50 animate-fadeIn overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Notifications</h3>
        <button
          onClick={() => markAllMutation.mutate()}
          disabled={markAllMutation.isPending || notifications.every(n => n.read)}
          className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400
            hover:text-indigo-700 dark:hover:text-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {markAllMutation.isPending
            ? <Loader2 className="h-3 w-3 animate-spin" />
            : <CheckCheck className="h-3.5 w-3.5" />}
          Mark all read
        </button>
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-gray-300 dark:text-gray-600" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-10 text-center">
            <Bell className="h-8 w-8 text-gray-200 dark:text-gray-700 mx-auto mb-2" />
            <p className="text-sm text-gray-400 dark:text-gray-500">No notifications yet</p>
          </div>
        ) : (
          notifications.map(n => {
            const { icon: Icon, color } = notifStyle(n.type);
            return (
              <div
                key={n.notificationId}
                onClick={() => { if (!n.read) markOneMutation.mutate(n.notificationId); }}
                className={`flex gap-3 px-4 py-3 border-b border-gray-50 dark:border-gray-800/60 last:border-0 cursor-pointer
                  hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors ${n.read ? '' : 'bg-indigo-50/40 dark:bg-indigo-500/5'}`}
              >
                <div className={`p-2 rounded-xl flex-shrink-0 ${color}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">{n.title}</p>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 mt-1" />}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{n.body}</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{formatTimeAgo(n.createdAt)}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-800">
        <Link
          to="/notifications"
          onClick={onClose}
          className="block text-center text-xs font-semibold text-indigo-600 dark:text-indigo-400
            hover:text-indigo-700 dark:hover:text-indigo-300 py-1"
        >
          View all notifications
        </Link>
      </div>
    </div>
  );
}

// ── User Dropdown ──────────────────────────────────────────────────────────
function UserDropdown({ isOpen, onClose, user, isAdmin, isDriver, dashLink, handleLogout, isOnboarding }) {
  if (!isOpen) return null;

  const menuItems = isOnboarding
    ? [] // no navigation during onboarding
    : [
        { to: '/profile',    icon: User,          label: 'Profile'   },
        { to: dashLink,      icon: LayoutDashboard, label: 'Dashboard' },
        ...(isDriver ? [{ to: '/earnings', icon: TrendingUp, label: 'Earnings' }] : []),
        { to: '/settings',   icon: Settings,      label: 'Settings'  },
      ];

  return (
    <div className="absolute right-0 top-full mt-2 w-60 bg-white dark:bg-surface-dark-raised rounded-2xl
      border border-gray-100 dark:border-gray-800
      shadow-xl shadow-gray-500/10 dark:shadow-black/30 z-50 animate-fadeIn overflow-hidden">

      {/* User info */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600
            flex items-center justify-center text-white font-bold text-sm shadow-sm">
            {user?.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{user?.fullName || 'User'}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          {isAdmin ? (
            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-purple-50 dark:bg-purple-500/10
              text-purple-700 dark:text-purple-400 rounded-full border border-purple-200 dark:border-purple-500/30">
              <Shield className="h-2.5 w-2.5" /> Admin
            </span>
          ) : isDriver ? (
            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-blue-50 dark:bg-blue-500/10
              text-blue-700 dark:text-blue-400 rounded-full border border-blue-200 dark:border-blue-500/30">
              <Car className="h-2.5 w-2.5" /> Driver
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-emerald-50 dark:bg-emerald-500/10
              text-emerald-700 dark:text-emerald-400 rounded-full border border-emerald-200 dark:border-emerald-500/30">
              <Users className="h-2.5 w-2.5" /> Passenger
            </span>
          )}
          {!isAdmin && user?.trustScore && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
              <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
              {formatTrustScore(user.trustScore)}
            </span>
          )}
        </div>
      </div>

      {/* Nav links — hidden during onboarding */}
      {menuItems.length > 0 && (
        <div className="p-2">
          {menuItems.map(item => (
            <Link
              key={item.to}
              to={item.to}
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
            >
              <item.icon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              {item.label}
            </Link>
          ))}
        </div>
      )}

      {/* Logout */}
      <div className={`p-2 ${menuItems.length > 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''}`}>
        <button
          onClick={() => { handleLogout(); onClose(); }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
            text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors w-full"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </div>
  );
}

// ── Mobile Bottom Nav ──────────────────────────────────────────────────────
function MobileBottomNav({ isAdmin, isDriver, isPassenger, dashLink, isOnboarding }) {
  if (isOnboarding) return null;

  const linkCls = ({ isActive }) =>
    `flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors
    ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-surface-dark-raised
      border-t border-gray-200 dark:border-gray-800
      px-2 py-1.5 flex items-center justify-around z-50 shadow-lg dark:shadow-black/30">
      {/* Dashboard for auth users; Search for guests (logo → /) */}
      {(isAdmin || isDriver || isPassenger) ? (
        <NavLink to={dashLink} className={linkCls}>
          <LayoutDashboard className="h-5 w-5" />
          <span className="text-[10px] font-semibold">Home</span>
        </NavLink>
      ) : (
        <NavLink to="/rides/search" className={linkCls}>
          <Search className="h-5 w-5" />
          <span className="text-[10px] font-semibold">Rides</span>
        </NavLink>
      )}

      {/* Passengers only */}
      {isPassenger && (
        <NavLink to="/rides/search" className={linkCls}>
          <Search className="h-5 w-5" />
          <span className="text-[10px] font-semibold">Search</span>
        </NavLink>
      )}

      {isDriver && (
        <NavLink to="/rides/create" className={linkCls}>
          <PlusCircle className="h-5 w-5" />
          <span className="text-[10px] font-semibold">Create</span>
        </NavLink>
      )}

      <NavLink to={dashLink} className={linkCls}>
        <LayoutDashboard className="h-5 w-5" />
        <span className="text-[10px] font-semibold">Dashboard</span>
      </NavLink>

      <NavLink to="/profile" className={linkCls}>
        <User className="h-5 w-5" />
        <span className="text-[10px] font-semibold">Profile</span>
      </NavLink>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Navbar
// ═══════════════════════════════════════════════════════════════════════════
export default function Navbar() {
  const { user, logout, isAdmin, isDriver, isPassenger } = useAuth();
  const navigate    = useNavigate();
  const location    = useLocation();
  const queryClient = useQueryClient();

  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [notifOpen,    setNotifOpen]    = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled,     setScrolled]     = useState(false);

  const notifRef   = useRef(null);
  const userMenuRef = useRef(null);

  // ── Onboarding / pending-approval lock ──────────────────────────────────
  const LOCKED_PATHS = ['/driver/onboarding', '/driver/pending-approval'];
  const isOnboarding = LOCKED_PATHS.includes(location.pathname);

  // ── Scroll effect ────────────────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ── Close dropdowns on outside click ────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target))    setNotifOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // ── Unread count (polls every 60s) ───────────────────────────────────────
  const { data: countData } = useQuery({
    queryKey: ['notif-count'],
    queryFn:  () => notificationService.getUnreadCount().then(r => r.data.data?.unreadCount ?? 0),
    enabled:  !!user,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const unreadCount = countData ?? 0;

  const handleLogout = useCallback(async () => {
    await logout();
    navigate('/login');
  }, [logout, navigate]);

  const dashLink = isAdmin
    ? '/admin/dashboard'
    : isDriver
    ? '/driver/dashboard'
    : '/passenger/dashboard';

  const linkCls = ({ isActive }) =>
    `relative text-sm font-medium transition-colors px-3 py-2 rounded-xl ${
      isActive
        ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10'
        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800/60'
    }`;

  // ── Onboarding-only render ───────────────────────────────────────────────
  if (isOnboarding) {
    return (
      <nav className="sticky top-0 z-40 bg-white dark:bg-surface-dark-raised
        border-b border-gray-100 dark:border-gray-800 shadow-sm dark:shadow-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo — not clickable during onboarding */}
            <div className="flex items-center gap-2.5">
              <img src="/logo.png" alt="RideWave Logo" className="h-8 w-8 object-contain" />
              <div>
                <span className="text-xl font-bold text-gray-900 dark:text-gray-100">Ride</span>
                <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">Wave</span>
              </div>
            </div>

            {/* Progress hint */}
            <p className="hidden sm:block text-xs text-gray-400 dark:text-gray-500 font-medium">
              {location.pathname === '/driver/pending-approval'
                ? 'Your documents are under review by our team'
                : 'Complete your profile to access the driver dashboard'}
            </p>

            <div className="flex items-center gap-1">
              <ThemeToggle />
              {/* Logout only */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400
                  hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  // ── Normal render ────────────────────────────────────────────────────────
  return (
    <>
      <nav className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled
          ? 'bg-white/90 dark:bg-surface-dark-raised/90 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-800/50 shadow-lg shadow-gray-500/5 dark:shadow-black/20'
          : 'bg-white dark:bg-surface-dark-raised border-b border-gray-100 dark:border-gray-800 shadow-sm dark:shadow-none'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5">
              <img src="/logo.png" alt="RideWave Logo" className="h-8 w-8 object-contain" />
              <div>
                <span className="text-xl font-bold text-gray-900 dark:text-gray-100">Ride</span>
                <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">Wave</span>
              </div>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              {/* Logo navigates to / — no separate Home link needed */}

              {/* Find Rides — PASSENGER only */}
              {isPassenger && (
                <NavLink to="/rides/search" className={linkCls}>
                  <Search className="h-4 w-4 inline mr-1.5" />Find Rides
                </NavLink>
              )}

              {isDriver && (
                <>
                  <NavLink to="/rides/create" className={linkCls}>
                    <PlusCircle className="h-4 w-4 inline mr-1.5" />Create Ride
                  </NavLink>
                  <NavLink to="/rides/my" className={linkCls}>
                    <List className="h-4 w-4 inline mr-1.5" />My Rides
                  </NavLink>
                </>
              )}

              {isPassenger && (
                <NavLink to="/bookings" className={linkCls}>
                  <Calendar className="h-4 w-4 inline mr-1.5" />My Bookings
                </NavLink>
              )}

              {isAdmin && (
                <>
                  <NavLink to="/admin/users"          className={linkCls}><Users className="h-4 w-4 inline mr-1.5" />Users</NavLink>
                  <NavLink to="/admin/drivers/verify" className={linkCls}><Shield className="h-4 w-4 inline mr-1.5" />Verifications</NavLink>
                  <NavLink to="/admin/reports"        className={linkCls}><AlertCircle className="h-4 w-4 inline mr-1.5" />Reports</NavLink>
                </>
              )}
            </div>

            {/* Right section */}
            <div className="hidden md:flex items-center gap-2">
              {user && !isAdmin && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-500/10
                  rounded-full border border-amber-200 dark:border-amber-500/30">
                  <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                    {formatTrustScore(user.trustScore)}
                  </span>
                </div>
              )}

              <ThemeToggle />

              {user ? (
                <>
                  {/* Notification bell — real data */}
                  <div ref={notifRef} className="relative">
                    <NotificationBell
                      count={unreadCount}
                      onClick={() => { setNotifOpen(o => !o); setUserMenuOpen(false); }}
                      isOpen={notifOpen}
                    />
                    <NotificationsDropdown
                      isOpen={notifOpen}
                      onClose={() => setNotifOpen(false)}
                    />
                  </div>

                  {/* User menu */}
                  <div ref={userMenuRef} className="relative">
                    <button
                      onClick={() => { setUserMenuOpen(o => !o); setNotifOpen(false); }}
                      className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600
                        flex items-center justify-center text-white font-bold text-xs shadow-sm">
                        {user.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                      </div>
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 hidden lg:inline">
                        {user.fullName?.split(' ')[0]}
                      </span>
                      <ChevronDown className={`h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <UserDropdown
                      isOpen={userMenuOpen}
                      onClose={() => setUserMenuOpen(false)}
                      user={user}
                      isAdmin={isAdmin}
                      isDriver={isDriver}
                      dashLink={dashLink}
                      handleLogout={handleLogout}
                      isOnboarding={false}
                    />
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/login"
                        className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200
                          hover:bg-gray-50 dark:hover:bg-gray-800/60 rounded-xl transition-colors">
                    Login
                  </Link>
                  <Link to="/register"
                        className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 dark:bg-indigo-500
                          hover:bg-indigo-700 dark:hover:bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/25 transition-all">
                    Sign Up
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile right section */}
            <div className="md:hidden flex items-center gap-1">
              <ThemeToggle />
              {user && (
                <div ref={notifRef} className="relative">
                  <NotificationBell
                    count={unreadCount}
                    onClick={() => { setNotifOpen(o => !o); setMobileOpen(false); }}
                    isOpen={notifOpen}
                  />
                  <NotificationsDropdown isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
                </div>
              )}
              <button
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                onClick={() => setMobileOpen(o => !o)}
                aria-label="Toggle menu"
              >
                {mobileOpen
                  ? <X className="h-5 w-5 text-gray-700 dark:text-gray-200" />
                  : <Menu className="h-5 w-5 text-gray-700 dark:text-gray-200" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile slide-in */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-surface-dark-raised animate-fadeIn">
            <div className="px-4 py-4 space-y-1 max-h-[calc(100vh-8rem)] overflow-y-auto">
              {user && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/40 rounded-2xl mb-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600
                    flex items-center justify-center text-white font-bold text-lg shadow-sm">
                    {user.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{user.fullName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500 dark:text-gray-400">{isDriver ? 'Driver' : isAdmin ? 'Admin' : 'Passenger'}</span>
                      {!isAdmin && (
                        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                          {formatTrustScore(user.trustScore)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Home link removed — logo links to / */}

              {/* Find Rides — PASSENGER only */}
              {isPassenger && (
                <NavLink to="/rides/search" onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${isActive ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/60'}`}>
                  <Search className="h-5 w-5" />Find Rides
                </NavLink>
              )}

              {isDriver && (
                <>
                  <NavLink to="/rides/create" onClick={() => setMobileOpen(false)}
                    className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${isActive ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/60'}`}>
                    <PlusCircle className="h-5 w-5" />Create Ride
                  </NavLink>
                  <NavLink to="/rides/my" onClick={() => setMobileOpen(false)}
                    className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${isActive ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/60'}`}>
                    <List className="h-5 w-5" />My Rides
                  </NavLink>
                </>
              )}

              {isPassenger && (
                <NavLink to="/bookings" onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${isActive ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/60'}`}>
                  <Calendar className="h-5 w-5" />My Bookings
                </NavLink>
              )}

              <div className="border-t border-gray-100 dark:border-gray-800 my-2" />

              {user ? (
                <>
                  <Link to="/profile" onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
                    <User className="h-5 w-5" />Profile
                  </Link>
                  <Link to={dashLink} onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
                    <LayoutDashboard className="h-5 w-5" />Dashboard
                  </Link>
                  {isDriver && (
                    <Link to="/earnings" onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
                      <TrendingUp className="h-5 w-5" />Earnings
                    </Link>
                  )}
                  <Link to="/settings" onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
                    <Settings className="h-5 w-5" />Settings
                  </Link>
                  <button
                    onClick={() => { handleLogout(); setMobileOpen(false); }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors w-full mt-2"
                  >
                    <LogOut className="h-5 w-5" />Logout
                  </button>
                </>
              ) : (
                <div className="flex gap-3 pt-3">
                  <Link to="/login"    onClick={() => setMobileOpen(false)}
                    className="flex-1 px-4 py-3 text-sm font-semibold text-center text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 rounded-xl">
                    Login
                  </Link>
                  <Link to="/register" onClick={() => setMobileOpen(false)}
                    className="flex-1 px-4 py-3 text-sm font-bold text-center text-white bg-indigo-600 dark:bg-indigo-500 rounded-xl">
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      <MobileBottomNav
        isAdmin={isAdmin}
        isDriver={isDriver}
        isPassenger={isPassenger}
        dashLink={dashLink}
        isOnboarding={isOnboarding}
      />

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.18s ease-out; }
      `}</style>
    </>
  );
}