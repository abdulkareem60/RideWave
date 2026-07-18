import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../../services/authService.js';
import FormInput from '../../components/common/FormInput.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import { rules } from '../../utils/validators.js';

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const email = params.get('email') ?? '';

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async ({ otp }) => {
    try {
      await authService.verifyEmail({ email, otp });
      toast.success('Email verified! You can now log in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Invalid or expired OTP.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-blue-50 dark:from-surface-dark dark:to-surface-dark px-4">
      <div className="w-full max-w-md">
        <div className="card p-8 shadow-md text-center">
          <div className="inline-flex items-center justify-center p-4 bg-blue-100 dark:bg-blue-500/15 rounded-full mb-4">
            <MailCheck className="h-8 w-8 text-brand-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">Verify your email</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            We sent a 6-digit OTP to{' '}
            <span className="font-semibold text-gray-700 dark:text-gray-300">{email}</span>
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormInput label="6-Digit OTP" id="otp" type="text" inputMode="numeric"
                       placeholder="123456" register={register} error={errors.otp}
                       rules={rules.otp} />

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3">
              {isSubmitting ? <Spinner size="sm" /> : 'Verify Email'}
            </button>
          </form>

          <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
            Didn't receive it? Check your spam folder or{' '}
            <Link to="/register" className="text-brand-600 hover:underline">re-register</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}