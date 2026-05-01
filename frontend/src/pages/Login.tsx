import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { GoogleLogin } from '@react-oauth/google';
import { useAuthStore, MfaRequiredError } from '@/stores/authStore';
import { LogIn, Clock, Mail } from 'lucide-react';
import api from '@/lib/api';

const getDashboardPath = (role?: string) => {
  if (role === 'admin' || role === 'manager') return '/admin/dashboard';
  if (role === 'seller') return '/seller/dashboard';
  return '/';
};

const PASSWORD_POLICY = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .regex(
    /(?=.*\d)(?=.*[a-zA-Z])(?=.*[^a-zA-Z0-9])/,
    'Password must include a letter, a digit, and a symbol'
  );

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: PASSWORD_POLICY,
});

type LoginForm = z.infer<typeof loginSchema>;

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, googleLogin, mfaLoginVerify, isAuthenticated, user } = useAuthStore();

  // Redirect already-authenticated users to their dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate(getDashboardPath(user?.role), { replace: true });
    }
  }, [isAuthenticated, navigate, user?.role]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotStep, setForgotStep] = useState<'request' | 'verify'>('request');

  // MFA second-step state
  const [mfaPending, setMfaPending] = useState<{ mfaToken: string } | null>(null);
  const [mfaCode, setMfaCode] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      await login(data.email, data.password);
      const { user: loggedInUser } = useAuthStore.getState();
      navigate(getDashboardPath(loggedInUser?.role));
    } catch (err: unknown) {
      if (err instanceof MfaRequiredError) {
        setMfaPending({ mfaToken: err.mfaToken });
        return;
      }
      const e = err as { response?: { data?: { message?: string } } };
      const msg = e.response?.data?.message || '';
      if (msg === 'Account is pending approval') {
        setPendingEmail(data.email);
      } else {
        setError(msg || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaPending) return;
    try {
      setLoading(true);
      setError('');
      await mfaLoginVerify(mfaPending.mfaToken, mfaCode);
      const { user: loggedInUser } = useAuthStore.getState();
      navigate(getDashboardPath(loggedInUser?.role));
    } catch (err: unknown) {
      const e2 = err as { response?: { data?: { message?: string } } };
      setError(e2.response?.data?.message || 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError('');
      setSuccess('');
      await api.post('/api/auth/forgot-password/request-otp', { email: forgotEmail });
      setForgotStep('verify');
      setSuccess('If this email is registered, an OTP has been sent.');
    } catch (err: unknown) {
      const e2 = err as { response?: { data?: { message?: string } } };
      setError(e2.response?.data?.message || 'Failed to request OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (forgotNewPassword !== forgotConfirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');
      await api.post('/api/auth/forgot-password/verify-otp', {
        email: forgotEmail,
        otp: forgotOtp,
        newPassword: forgotNewPassword,
      });
      setSuccess('Password reset successful. You can now sign in with your new password.');
      setShowForgotPassword(false);
      setForgotStep('request');
      setForgotOtp('');
      setForgotNewPassword('');
      setForgotConfirmPassword('');
    } catch (err: unknown) {
      const e2 = err as { response?: { data?: { message?: string } } };
      setError(e2.response?.data?.message || 'Failed to verify OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (mfaPending) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full card">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Two-Factor Authentication</h2>
          <p className="text-gray-500 mb-6 text-center">Enter the 6-digit code from your authenticator app.</p>
          <form onSubmit={handleMfaVerify} className="space-y-4">
            {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 text-sm">{error}</div>}
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={8}
              placeholder="6-digit code or recovery code"
              value={mfaCode}
              onChange={e => setMfaCode(e.target.value.replace(/\s/g, ''))}
              className="input-field w-full text-center text-2xl tracking-widest"
              autoFocus
            />
            <button type="submit" disabled={loading || mfaCode.length < 6} className="btn-primary w-full">
              {loading ? 'Verifying…' : 'Verify'}
            </button>
            <button type="button" onClick={() => { setMfaPending(null); setMfaCode(''); setError(''); }} className="btn-secondary w-full">
              Back to Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (pendingEmail) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full card text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center">
              <Clock className="w-10 h-10 text-amber-500" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Pending Approval</h2>
          <p className="text-gray-500 mb-6">
            Your vendor account is currently under review. Our team will verify your details and activate your account shortly.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3 text-left">
            <Mail className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">Check your email</p>
              <p className="text-sm text-amber-700">
                You'll receive a confirmation at <span className="font-semibold">{pendingEmail}</span> once your account is activated.
              </p>
            </div>
          </div>
          <button
            onClick={() => setPendingEmail(null)}
            className="w-full btn btn-primary"
          >
            Back to Login
          </button>
          <p className="mt-4 text-sm text-gray-500">
            Need help?{' '}
            <Link to="/" className="text-primary-600 hover:text-primary-700 font-medium">Contact support</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full card">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <LogIn className="w-12 h-12 text-primary-600" />
          </div>
          <h2 className="text-3xl font-bold">Welcome Back</h2>
          <p className="text-gray-600 mt-2">Sign in to your account</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-6 text-sm">
            {success}
          </div>
        )}

        {showForgotPassword ? (
          <div className="mb-6 border border-gray-200 rounded-lg p-4 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Reset Your Password</h3>

            {forgotStep === 'request' ? (
              <form onSubmit={handleForgotRequest} className="space-y-3">
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="input"
                  placeholder="Enter your email"
                  required
                />
                <button type="submit" disabled={loading} className="w-full btn btn-primary">
                  {loading ? 'Sending OTP...' : 'Confirm'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleForgotVerify} className="space-y-3">
                <input
                  type="text"
                  value={forgotOtp}
                  onChange={(e) => setForgotOtp(e.target.value)}
                  className="input"
                  placeholder="Enter OTP"
                  required
                />
                <input
                  type="password"
                  value={forgotNewPassword}
                  onChange={(e) => setForgotNewPassword(e.target.value)}
                  className="input"
                  placeholder="New password"
                  minLength={6}
                  required
                />
                <input
                  type="password"
                  value={forgotConfirmPassword}
                  onChange={(e) => setForgotConfirmPassword(e.target.value)}
                  className="input"
                  placeholder="Confirm new password"
                  minLength={6}
                  required
                />
                <button type="submit" disabled={loading} className="w-full btn btn-primary">
                  {loading ? 'Resetting...' : 'Verify OTP & Reset'}
                </button>
                <button
                  type="button"
                  onClick={() => setForgotStep('request')}
                  className="w-full text-sm text-primary-700 hover:underline"
                >
                  Request new OTP
                </button>
              </form>
            )}

            <button
              type="button"
              onClick={() => {
                setShowForgotPassword(false);
                setForgotStep('request');
              }}
              className="w-full text-sm text-gray-600 hover:text-gray-800 mt-3"
            >
              Back to login
            </button>
          </div>
        ) : null}

        {!showForgotPassword && (
        <>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              {...register('email')}
              type="email"
              className="input"
              placeholder="you@example.com"
            />
            {errors.email && (
              <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              {...register('password')}
              type="password"
              className="input"
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>
            )}
            <div className="mt-2 text-right">
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(true);
                  setError('');
                  setSuccess('');
                  setForgotEmail((prev) => prev || '');
                }}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Forgot password?
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn btn-primary"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-4 text-gray-500">Or continue with</span>
          </div>
        </div>

        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={async (credentialResponse) => {
              try {
                setLoading(true);
                setError('');
                if (credentialResponse.credential) {
                  await googleLogin(credentialResponse.credential);
                  const { user: loggedInUser } = useAuthStore.getState();
                  navigate(getDashboardPath(loggedInUser?.role));
                }
              } catch (err: unknown) {
                const e = err as { response?: { data?: { message?: string } } };
                const msg = e.response?.data?.message || '';
                if (msg === 'Account is pending approval') {
                  setPendingEmail('your Google account');
                } else {
                  setError(msg || 'Google sign-in failed. Please try again.');
                }
              } finally {
                setLoading(false);
              }
            }}
            onError={() => {
              setError('Google sign-in failed. Please try again.');
            }}
            size="large"
            text="signin_with"
          />
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-600 font-medium hover:text-primary-700">
              Sign up
            </Link>
          </p>
        </div>
        </>
        )}
      </div>
    </div>
  );
};

export default Login;
