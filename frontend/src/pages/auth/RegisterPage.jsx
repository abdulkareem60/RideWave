import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Eye, EyeOff, ArrowLeft, User, Mail, Phone, Lock,
  Shield, Car, Users, CheckCircle, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../../services/authService.js';
import FormInput from '../../components/common/FormInput.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import { rules } from '../../utils/validators.js';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [showPwd, setShowPwd] = useState(false);
  const [selectedRole, setSelectedRole] = useState('PASSENGER');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onChange',
    defaultValues: { role: 'PASSENGER', termsAccepted: false },
  });

  const termsAccepted = watch('termsAccepted');

  const onSubmit = async (data) => {
    try {
      await authService.register({
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        password: data.password,
        role: data.role,
        termsAccepted: data.termsAccepted,
      });
      toast.success('Account created! Check your email for the verification OTP.');
      navigate(`/verify-email?email=${encodeURIComponent(data.email)}`);
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Registration failed. Please try again.';
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Visual Identity */}
      <div className="hidden lg:flex lg:w-[480px] bg-slate-900 relative overflow-hidden flex-col">
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="h-full w-full" style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }}></div>
        </div>

        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-blue-500"></div>

        <div className="relative z-10 flex-1 flex flex-col justify-between p-12">
          <div>
            {/* Logo */}
            <Link to="/" className="inline-flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm
                flex items-center justify-center border border-white/10
                group-hover:bg-white/20 transition-all duration-300">
                <img src="/logo.png" alt="RideWave" className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xl font-bold text-white">Ride</span>
                <span className="text-xl font-bold text-emerald-400">Wave</span>
              </div>
            </Link>

            {/* Brand message */}
            <div className="mt-20">
              <h1 className="text-4xl font-bold text-white leading-tight mb-4">
                Start your
                <br />
                <span className="text-emerald-400">journey today</span>
              </h1>
              <p className="text-lg text-slate-400 leading-relaxed">
                Join thousands who've already discovered safer, smarter ride-sharing.
              </p>
            </div>
          </div>

          {/* Benefits list */}
          <div className="space-y-4">
            {[
              { icon: Shield, text: 'Verified community of drivers & riders' },
              { icon: Car, text: 'GPS-tracked rides for safety' },
              { icon: CheckCircle, text: 'Transparent, fixed pricing' },
            ].map((benefit, index) => (
              <div key={index} className="flex items-center gap-3 text-slate-300">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                  <benefit.icon className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-sm">{benefit.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Registration Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-12 bg-white dark:bg-slate-950 overflow-y-auto">
        <div className="w-full max-w-[460px]">
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
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">Wave</span>
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Create your account
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
              Join the community in less than 2 minutes
            </p>
          </div>

          {/* Role Selection Card */}
          <div className="mb-6">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 block">
              I want to
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  value: 'PASSENGER',
                  icon: Users,
                  label: 'Ride',
                  desc: 'Book seats in shared rides'
                },
                {
                  value: 'DRIVER',
                  icon: Car,
                  label: 'Drive',
                  desc: 'Offer rides & earn money'
                },
              ].map(({ value, icon: Icon, label, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setSelectedRole(value);
                    register('role').onChange({ target: { value, name: 'role' } });
                  }}
                  className={`relative p-4 rounded-2xl border-2 text-left transition-all duration-200
                    ${selectedRole === value
                      ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-500/5'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2
                    ${selectedRole === value
                      ? 'bg-blue-500/10 dark:bg-blue-400/10'
                      : 'bg-slate-100 dark:bg-slate-800'
                    }`}>
                    <Icon className={`w-5 h-5 ${
                      selectedRole === value
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-slate-500 dark:text-slate-400'
                    }`} />
                  </div>
                  <div className="font-semibold text-sm text-slate-900 dark:text-white mb-0.5">
                    {label}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {desc}
                  </div>
                  {selectedRole === value && (
                    <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-blue-500
                      flex items-center justify-center">
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <input
                    type="radio"
                    value={value}
                    className="sr-only"
                    {...register('role', { required: true })}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-6 sm:p-8
            border border-slate-200 dark:border-slate-800">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>

              {/* Full Name */}
              <div className="space-y-1.5">
                <label
                  htmlFor="fullName"
                  className="text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Full name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="fullName"
                    type="text"
                    placeholder="Ali Hassan"
                    className={`w-full pl-10 pr-4 py-3 rounded-xl
                      bg-white dark:bg-slate-800
                      border ${errors.fullName ? 'border-red-300 dark:border-red-600' : 'border-slate-200 dark:border-slate-700'}
                      text-slate-900 dark:text-white
                      placeholder-slate-400 dark:placeholder-slate-500
                      focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                      transition-all duration-200 text-sm`}
                    {...register('fullName', {
                      required: 'Full name is required',
                      minLength: { value: 2, message: 'Too short' }
                    })}
                  />
                </div>
                {errors.fullName && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.fullName.message}</p>
                )}
              </div>

              {/* Email */}
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
                    placeholder="ali@example.com"
                    className={`w-full pl-10 pr-4 py-3 rounded-xl
                      bg-white dark:bg-slate-800
                      border ${errors.email ? 'border-red-300 dark:border-red-600' : 'border-slate-200 dark:border-slate-700'}
                      text-slate-900 dark:text-white
                      placeholder-slate-400 dark:placeholder-slate-500
                      focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                      transition-all duration-200 text-sm`}
                    {...register('email', rules.email)}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.email.message}</p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label
                  htmlFor="phone"
                  className="text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Phone number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="phone"
                    type="tel"
                    placeholder="+923001234567"
                    className={`w-full pl-10 pr-4 py-3 rounded-xl
                      bg-white dark:bg-slate-800
                      border ${errors.phone ? 'border-red-300 dark:border-red-600' : 'border-slate-200 dark:border-slate-700'}
                      text-slate-900 dark:text-white
                      placeholder-slate-400 dark:placeholder-slate-500
                      focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                      transition-all duration-200 text-sm`}
                    {...register('phone', rules.phone)}
                  />
                </div>
                {errors.phone && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.phone.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="password"
                    type={showPwd ? 'text' : 'password'}
                    placeholder="Min 8 chars, uppercase, digit, symbol"
                    className={`w-full pl-10 pr-12 py-3 rounded-xl
                      bg-white dark:bg-slate-800
                      border ${errors.password ? 'border-red-300 dark:border-red-600' : 'border-slate-200 dark:border-slate-700'}
                      text-slate-900 dark:text-white
                      placeholder-slate-400 dark:placeholder-slate-500
                      focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                      transition-all duration-200 text-sm`}
                    {...register('password', rules.password)}
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

              {/* Terms */}
              <div className="pt-2">
                <div className="flex items-start gap-2.5">
                  <input
                    id="termsAccepted"
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 flex-shrink-0 rounded
                      border-slate-300 dark:border-slate-600
                      text-blue-600 dark:text-blue-500
                      focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-0
                      cursor-pointer"
                    aria-required="true"
                    {...register('termsAccepted', {
                      required: 'You must accept the Terms of Service and Privacy Policy',
                    })}
                  />
                  <label
                    htmlFor="termsAccepted"
                    className="text-sm text-slate-600 dark:text-slate-400 leading-snug cursor-pointer"
                  >
                    I agree to the{' '}
                    <Link
                      to="/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
                    >
                      Terms of Service
                    </Link>
                    {' '}and{' '}
                    <Link
                      to="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
                    >
                      Privacy Policy
                    </Link>
                  </label>
                </div>
                {errors.termsAccepted && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-2 ml-6">
                    {errors.termsAccepted.message}
                  </p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting || !termsAccepted}
                title={!termsAccepted ? 'Please accept the Terms of Service and Privacy Policy' : undefined}
                className="w-full py-3 px-6 rounded-xl mt-4
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
                    <span>Creating account...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <span>Create account</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                )}
              </button>
            </form>
          </div>

          {/* Sign in link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>

          {/* Security badge */}
          <div className="mt-8 flex items-center justify-center gap-4
            text-xs text-slate-400 dark:text-slate-500">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3 h-3" />
              <span>SSL encrypted</span>
            </div>
            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-3 h-3" />
              <span>Free account</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}