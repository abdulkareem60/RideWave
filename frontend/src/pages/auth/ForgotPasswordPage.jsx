import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../../services/authService.js';
import FormInput from '../../components/common/FormInput.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import { rules } from '../../utils/validators.js';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async ({ email }) => {
    try {
      await authService.forgotPassword({ email });
      toast.success('Reset OTP sent! Check your email.');
      navigate(`/reset-password?email=${encodeURIComponent(email)}`);
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Something went wrong. Please try again.';
      toast.error(msg);
      // Stay on this page — do not navigate to /reset-password on failure.
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-blue-50 px-4">
      <div className="w-full max-w-md">
        <div className="card p-8 shadow-md">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <KeyRound className="h-7 w-7 text-brand-600" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-center text-gray-900 mb-1">Forgot password?</h1>
          <p className="text-sm text-gray-500 text-center mb-6">
            Enter your email and we'll send a reset OTP.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormInput label="Email" id="email" type="email" placeholder="you@example.com"
                       register={register} error={errors.email}
                       rules={rules.email} />

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3">
              {isSubmitting ? <Spinner size="sm" /> : 'Send Reset OTP'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            <Link to="/login" className="text-brand-600 hover:underline">Back to login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}