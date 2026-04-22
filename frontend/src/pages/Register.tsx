import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { GoogleLogin } from '@react-oauth/google';
import { useAuthStore } from '@/stores/authStore';
import { UserPlus } from 'lucide-react';

const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { requestSignupOtp, verifySignupOtp, googleLogin } = useAuthStore();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingPayload, setPendingPayload] = useState<Record<string, unknown> | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const payload = {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        password: data.password,
      };

      await requestSignupOtp(payload);
      setPendingPayload(payload);
      setPendingEmail(data.email);
      setSuccess('We sent a verification OTP to your email. Enter it below to activate your account.');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingEmail) return;

    try {
      setLoading(true);
      setError('');
      await verifySignupOtp(pendingEmail, otp);
      navigate('/');
    } catch (err: unknown) {
      const e2 = err as { response?: { data?: { message?: string } } };
      setError(e2.response?.data?.message || 'OTP verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!pendingPayload) return;

    try {
      setLoading(true);
      setError('');
      await requestSignupOtp(pendingPayload);
      setSuccess('A new OTP has been sent to your email.');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full card">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <UserPlus className="w-12 h-12 text-primary-600" />
          </div>
          <h2 className="text-3xl font-bold">Create Account</h2>
          <p className="text-gray-600 mt-2">Join Juta Ghar today</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-6 text-sm">
            {success}
          </div>
        )}

        {/* Google Sign-Up */}
        <div className="flex justify-center mb-4">
          <GoogleLogin
            onSuccess={async (credentialResponse) => {
              try {
                setLoading(true);
                setError('');
                if (credentialResponse.credential) {
                  await googleLogin(credentialResponse.credential);
                  navigate('/');
                }
              } catch (err: unknown) {
                const e = err as { response?: { data?: { message?: string } } };
                setError(e.response?.data?.message || 'Google sign-up failed. Please try again.');
              } finally {
                setLoading(false);
              }
            }}
            onError={() => {
              setError('Google sign-up failed. Please try again.');
            }}
            size="large"
            width="100%"
            text="signup_with"
          />
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-4 text-gray-500">Or register with email</span>
          </div>
        </div>

        {/* Registration form */}
        {!pendingEmail && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
            <input {...register('fullName')} className="input" placeholder="Your full name" />
            {errors.fullName && <p className="text-red-600 text-xs mt-1">{errors.fullName.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input {...register('email')} type="email" className="input" placeholder="you@example.com" />
            {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
            <input {...register('phone')} className="input" placeholder="Your phone number" />
            {errors.phone && <p className="text-red-600 text-xs mt-1">{errors.phone.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
            <input {...register('password')} type="password" className="input" placeholder="Min. 6 characters" />
            {errors.password && <p className="text-red-600 text-xs mt-1">{errors.password.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
            <input {...register('confirmPassword')} type="password" className="input" placeholder="Repeat password" />
            {errors.confirmPassword && <p className="text-red-600 text-xs mt-1">{errors.confirmPassword.message}</p>}
          </div>

          <button type="submit" disabled={loading} className="w-full btn btn-primary">
            {loading ? 'Sending OTP...' : 'Create Account'}
          </button>
        </form>
        )}

        {pendingEmail && (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Verification OTP</label>
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="input"
                placeholder="Enter 6-digit OTP"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Sent to {pendingEmail}</p>
            </div>

            <button type="submit" disabled={loading} className="w-full btn btn-primary">
              {loading ? 'Verifying...' : 'Verify & Create Account'}
            </button>

            <button
              type="button"
              onClick={handleResendOtp}
              disabled={loading}
              className="w-full btn border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Resend OTP
            </button>
          </form>
        )}

        <p className="mt-4 text-center text-xs text-gray-500">
          Want to sell on Juta Ghar? Register first, then request vendor access from your profile.
        </p>

        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:text-primary-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
