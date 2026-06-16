import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Eye,
  EyeOff,
  User,
  Mail,
  Phone,
  Lock,
  Users,
  Car,
  Shield,
  CheckCircle,
  ArrowRight,
  Briefcase,
  Award
} from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../../services/authService.js';
import FormInput from '../../components/common/FormInput.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import { rules } from '../../utils/validators.js';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [showPwd, setShowPwd] = useState(false);

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
  const selectedRole = watch('role');

  const onSubmit = async (data) => {
    try {
      await authService.register({
        fullName: data.fullName,
        email:    data.email,
        phone:    data.phone,
        password: data.password,
        role:     data.role,
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4 md:p-6">
      <div className="w-full max-w-[440px] animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Logo Area - Reserved for manual logo insertion */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 dark:bg-indigo-500 rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30">
            <Users className="w-7 h-7 text-white" />
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-200/60 dark:border-slate-700/60 p-6 md:p-8 transition-all duration-300">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Create Account
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1.5">
              Join the RideWave community today
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {/* Role Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block">
                I want to...
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'PASSENGER', label: 'Ride as Passenger', icon: Briefcase },
                  { value: 'DRIVER', label: 'Drive & Earn', icon: Car },
                ].map(({ value, label, icon: Icon }) => (
                  <label
                    key={value}
                    className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border-2 cursor-pointer text-sm font-medium transition-all duration-200 ${
                      selectedRole === value
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <input type="radio" value={value} className="sr-only" {...register('role', { required: true })} />
                    <Icon className={`w-4 h-4 ${selectedRole === value ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {/* Full Name */}
            <div className="space-y-1.5">
              <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Full Name
              </label>
              <div className="relative">
                <input
                  id="fullName"
                  type="text"
                  autoComplete="name"
                  placeholder="Ali Hassan"
                  className={`w-full px-4 py-3 pl-11 bg-slate-50 dark:bg-slate-900 border ${
                    errors.fullName
                      ? 'border-red-500 dark:border-red-500 focus:ring-red-500'
                      : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500'
                  } rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 dark:text-white text-base placeholder:text-slate-400 dark:placeholder:text-slate-500`}
                  {...register('fullName', {
                    required: 'Full name is required',
                    minLength: { value: 2, message: 'Name must be at least 2 characters' }
                  })}
                />
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
              </div>
              {errors.fullName && (
                <p className="mt-1.5 text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5">
                  <span className="inline-block w-1 h-1 rounded-full bg-red-600 dark:bg-red-400"></span>
                  {errors.fullName.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Email Address
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="ali@example.com"
                  className={`w-full px-4 py-3 pl-11 bg-slate-50 dark:bg-slate-900 border ${
                    errors.email
                      ? 'border-red-500 dark:border-red-500 focus:ring-red-500'
                      : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500'
                  } rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 dark:text-white text-base placeholder:text-slate-400 dark:placeholder:text-slate-500`}
                  {...register('email', rules.email)}
                />
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5">
                  <span className="inline-block w-1 h-1 rounded-full bg-red-600 dark:bg-red-400"></span>
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label htmlFor="phone" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Phone Number
              </label>
              <div className="relative">
                <input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+923001234567"
                  className={`w-full px-4 py-3 pl-11 bg-slate-50 dark:bg-slate-900 border ${
                    errors.phone
                      ? 'border-red-500 dark:border-red-500 focus:ring-red-500'
                      : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500'
                  } rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 dark:text-white text-base placeholder:text-slate-400 dark:placeholder:text-slate-500`}
                  {...register('phone', rules.phone)}
                />
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
              </div>
              {errors.phone && (
                <p className="mt-1.5 text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5">
                  <span className="inline-block w-1 h-1 rounded-full bg-red-600 dark:bg-red-400"></span>
                  {errors.phone.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Min 8 chars, uppercase, digit, symbol"
                  className={`w-full px-4 py-3 pl-11 bg-slate-50 dark:bg-slate-900 border ${
                    errors.password
                      ? 'border-red-500 dark:border-red-500 focus:ring-red-500'
                      : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500'
                  } rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 dark:text-white text-base placeholder:text-slate-400 dark:placeholder:text-slate-500 pr-12`}
                  {...register('password', rules.password)}
                />
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors duration-200 p-1"
                  aria-label={showPwd ? 'Hide password' : 'Show password'}
                >
                  {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5">
                  <span className="inline-block w-1 h-1 rounded-full bg-red-600 dark:bg-red-400"></span>
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Terms of Service */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-start gap-3">
                <input
                  id="termsAccepted"
                  type="checkbox"
                  className="mt-0.5 w-4 h-4 flex-shrink-0 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 dark:bg-slate-900 transition-colors duration-200 cursor-pointer"
                  aria-required="true"
                  aria-invalid={errors.termsAccepted ? 'true' : 'false'}
                  aria-describedby={errors.termsAccepted ? 'termsAccepted-error' : undefined}
                  {...register('termsAccepted', {
                    required: 'You must accept the Terms of Service and Privacy Policy to continue',
                  })}
                />
                <label htmlFor="termsAccepted" className="text-sm text-slate-600 dark:text-slate-400 leading-snug cursor-pointer">
                  I agree to the{' '}
                  <Link
                    to="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
                  >
                    Terms of Service
                  </Link>
                  {' '}and{' '}
                  <Link
                    to="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
                  >
                    Privacy Policy
                  </Link>
                </label>
              </div>
              {errors.termsAccepted && (
                <p id="termsAccepted-error" role="alert" className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5 ml-7">
                  <span className="inline-block w-1 h-1 rounded-full bg-red-600 dark:bg-red-400"></span>
                  {errors.termsAccepted.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !termsAccepted}
              title={!termsAccepted ? 'You must accept the Terms of Service and Privacy Policy' : undefined}
              className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2.5 shadow-lg shadow-indigo-200/50 dark:shadow-indigo-900/30 text-base mt-2"
            >
              {isSubmitting ? (
                <Spinner size="sm" className="text-white" />
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="flex items-center justify-center gap-3 mt-6 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>Secure</span>
            </div>
            <span className="w-px h-3 bg-slate-300 dark:bg-slate-600"></span>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Verified</span>
            </div>
            <span className="w-px h-3 bg-slate-300 dark:bg-slate-600"></span>
            <div className="flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5" />
              <span>Trusted</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-sm">
            <span className="text-slate-600 dark:text-slate-400">Already have an account?</span>
            <Link
              to="/login"
              className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors duration-200"
            >
              Sign in
            </Link>
          </div>

          <div className="flex items-center justify-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            <Link to="/terms" className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors duration-200">
              Terms
            </Link>
            <span className="w-px h-3 bg-slate-300 dark:bg-slate-600"></span>
            <Link to="/privacy" className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors duration-200">
              Privacy
            </Link>
            <span className="w-px h-3 bg-slate-300 dark:bg-slate-600"></span>
            <Link to="/support" className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors duration-200">
              Support
            </Link>
          </div>

          <p className="text-xs text-slate-400 dark:text-slate-500 mt-4">
            &copy; 2026 RideWave. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}