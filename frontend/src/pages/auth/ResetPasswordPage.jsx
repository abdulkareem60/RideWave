import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../../services/authService.js';
import FormInput from '../../components/common/FormInput.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import { rules } from '../../utils/validators.js';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const email = params.get('email') ?? '';
  const [showPwd, setShowPwd] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async ({ otp, newPassword }) => {
    try {
      await authService.resetPassword({ email, otp, newPassword });
      toast.success('Password reset! Please log in with your new password.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Reset failed. Check your OTP.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-blue-50 dark:from-surface-dark dark:to-surface-dark px-4">
      <div className="w-full max-w-md">
        <div className="card p-8 shadow-md">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-green-100 dark:bg-green-500/15 rounded-full">
              <ShieldCheck className="h-7 w-7 text-green-600" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-center text-gray-900 dark:text-gray-100 mb-1">Reset Password</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
            Enter the OTP sent to <span className="font-medium">{email}</span>
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormInput label="6-Digit OTP" id="otp" type="text" inputMode="numeric"
                       placeholder="123456" register={register} error={errors.otp}
                       rules={rules.otp} />

            <div className="flex flex-col gap-1">
              <label htmlFor="newPassword" className="text-sm font-medium text-gray-700 dark:text-gray-300">New Password</label>
              <div className="relative">
                <input id="newPassword" type={showPwd ? 'text' : 'password'}
                       placeholder="Min 8 chars, uppercase, digit, symbol"
                       className={`input pr-10 ${errors.newPassword ? 'input-error' : ''}`}
                       {...register('newPassword', rules.password)} />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.newPassword && <p className="text-xs text-red-600">{errors.newPassword.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3">
              {isSubmitting ? <Spinner size="sm" /> : 'Reset Password'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-5">
            <Link to="/login" className="text-brand-600 hover:underline">Back to login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}