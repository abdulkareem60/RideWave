import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, ArrowLeft, Mail, Lock, Shield, Clock, Users, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext.jsx';
import FormInput from '../../components/common/FormInput.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import { rules } from '../../utils/validators.js';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPwd, setShowPwd] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const from = location.state?.from
    ? `${location.state.from.pathname}${location.state.from.search ?? ''}`
    : '/dashboard';

  const onSubmit = async (data) => {
    try {
      const user = await login(data.email, data.password);
      toast.success(`Welcome back, ${user.fullName.split(' ')[0]}!`);
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Login failed. Please check your credentials.';
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Brand Identity */}
      <div className="hidden lg:flex lg:w-[480px] bg-slate-900 relative overflow-hidden flex-col justify-between p-12">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="h-full w-full" style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }}></div>
        </div>

        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-emerald-400"></div>

        <div className="relative z-10">
          {/* Logo */}
          <Link to="/" className="inline-flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm
              flex items-center justify-center border border-white/10
              group-hover:bg-white/20 transition-all duration-300">
              <img src="/logo.png" alt="RideWave" className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold text-white">Ride</span>
              <span className="text-xl font-bold text-blue-400">Wave</span>
            </div>
          </Link>

          {/* Brand message */}
          <div className="mt-20">
            <h1 className="text-4xl font-bold text-white leading-tight mb-4">
              Welcome back to
              <br />
              <span className="text-blue-400">the ride</span>
            </h1>
            <p className="text-lg text-slate-400 leading-relaxed">
              Your next journey starts here. Safe, verified, and ready when you are.
            </p>
          </div>
        </div>

        {/* Stats & Trust */}
        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-4 text-slate-400">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="text-sm">Verified drivers</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-slate-600"></div>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400" />
              <span className="text-sm">4.9 rating</span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Clock className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="text-white text-sm font-medium">2,450+ rides today</div>
              <div className="text-slate-400 text-xs">Across 50+ cities</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-12 bg-white dark:bg-slate-950">
        <div className="w-full max-w-[420px]">
          {/* Mobile back link */}
          <Link
            to="/"
            className="lg:hidden inline-flex items-center gap-2 text-sm text-slate-500
              hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200
              mb-8 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to home
          </Link>

          {/* Header */}
          <div className="mb-8">
            <div className="lg:hidden flex items-center gap-3 mb-6">
              <img src="/logo.png" alt="RideWave" className="w-8 h-8" />
              <div>
                <span className="text-lg font-bold text-slate-900 dark:text-white">Ride</span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">Wave</span>
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Sign in
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
              Enter your credentials to access your account
            </p>
          </div>

          {/* Live activity chip */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-8
            bg-emerald-50 dark:bg-emerald-500/10
            border border-emerald-100 dark:border-emerald-500/20
            rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              12 drivers online near you
            </span>
          </div>

          {/* Form Card */}
          <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-6 sm:p-8
            border border-slate-200 dark:border-slate-800">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>

              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    className={`w-full pl-10 pr-4 py-3 rounded-xl
                      bg-white dark:bg-slate-800
                      border ${errors.email ? 'border-red-300 dark:border-red-600' : 'border-slate-200 dark:border-slate-700'}
                      text-slate-900 dark:text-white
                      placeholder-slate-400 dark:placeholder-slate-500
                      focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                      transition-all duration-200
                      text-sm`}
                    {...register('email', rules.email)}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="password"
                    type={showPwd ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className={`w-full pl-10 pr-12 py-3 rounded-xl
                      bg-white dark:bg-slate-800
                      border ${errors.password ? 'border-red-300 dark:border-red-600' : 'border-slate-200 dark:border-slate-700'}
                      text-slate-900 dark:text-white
                      placeholder-slate-400 dark:placeholder-slate-500
                      focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                      transition-all duration-200
                      text-sm`}
                    {...register('password', { required: 'Password is required' })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2
                      text-slate-400 hover:text-slate-600 dark:hover:text-slate-300
                      transition-colors"
                  >
                    {showPwd ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-6 rounded-xl
                  bg-slate-900 dark:bg-white
                  text-white dark:text-slate-900
                  font-semibold text-sm
                  hover:bg-slate-800 dark:hover:bg-slate-100
                  focus:outline-none focus:ring-2 focus:ring-slate-500/20
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-200
                  active:scale-[0.98]"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <Spinner size="sm" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Create one
              </Link>
            </p>
          </div>

          {/* Trust badge */}
          <div className="mt-8 flex items-center justify-center gap-2
            text-xs text-slate-400 dark:text-slate-500">
            <Shield className="w-3.5 h-3.5" />
            <span>End-to-end encrypted</span>
            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
            <span>GDPR compliant</span>
          </div>
        </div>
      </div>
    </div>
  );
}