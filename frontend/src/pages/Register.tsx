import React, { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { GoogleLogin } from '@react-oauth/google';
import { useAuthStore } from '@/stores/authStore';
import {
  UserPlus,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Check,
  X,
  ShieldCheck,
} from 'lucide-react';

const PASSWORD_MESSAGE =
  'Password must be at least 10 characters and include a letter, digit, and symbol';
const PASSWORD_COMPLEXITY = /^(?=.*\d)(?=.*[a-zA-Z])(?=.*[^a-zA-Z0-9]).{10,}$/;

const registerSchema = z
  .object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().regex(PASSWORD_COMPLEXITY, PASSWORD_MESSAGE),
    confirmPassword: z.string(),
    phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

type StrengthLevel = {
  score: number;
  label: string;
  barColor: string;
  textColor: string;
  width: string;
};

const PASSWORD_RULES = [
  { key: 'minLength', label: 'At least 10 characters', test: (p: string) => p.length >= 10 },
  { key: 'hasLetter', label: 'Contains a letter', test: (p: string) => /[a-zA-Z]/.test(p) },
  { key: 'hasDigit', label: 'Contains a number', test: (p: string) => /\d/.test(p) },
  { key: 'hasSymbol', label: 'Contains a symbol', test: (p: string) => /[^a-zA-Z0-9]/.test(p) },
] as const;

const evaluateStrength = (password: string): StrengthLevel => {
  if (!password) {
    return {
      score: 0,
      label: 'Empty',
      barColor: 'bg-gray-200',
      textColor: 'text-gray-400',
      width: 'w-0',
    };
  }

  const passed = PASSWORD_RULES.filter((rule) => rule.test(password)).length;
  const lengthBonus = password.length >= 14 ? 1 : 0;
  const score = passed + lengthBonus;

  if (score <= 1) {
    return { score, label: 'Weak', barColor: 'bg-red-500', textColor: 'text-red-600', width: 'w-1/4' };
  }
  if (score <= 3) {
    return { score, label: 'Fair', barColor: 'bg-amber-500', textColor: 'text-amber-600', width: 'w-2/4' };
  }
  if (score === 4) {
    return { score, label: 'Good', barColor: 'bg-sky-500', textColor: 'text-sky-600', width: 'w-3/4' };
  }
  return { score, label: 'Strong', barColor: 'bg-green-500', textColor: 'text-green-600', width: 'w-full' };
};

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { requestSignupOtp, verifySignupOtp, googleLogin } = useAuthStore();

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingPayload, setPendingPayload] = useState<Record<string, unknown> | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
  });

  const passwordValue = watch('password') ?? '';
  const strength = useMemo(() => evaluateStrength(passwordValue), [passwordValue]);
  const ruleResults = useMemo(
    () => PASSWORD_RULES.map((rule) => ({ ...rule, passed: rule.test(passwordValue) })),
    [passwordValue]
  );

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

  const inputBase =
    'w-full rounded-lg border bg-white pl-10 pr-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500';
  const inputNormal = 'border-gray-300';
  const inputError = 'border-red-400 focus:border-red-500 focus:ring-red-400';

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-10 px-4 bg-gradient-to-b from-gray-50 to-white">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary-50 text-primary-600 mb-3">
              <UserPlus className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900">Create your account</h2>
            <p className="text-sm text-gray-500 mt-1">Join Juta Ghar in less than a minute</p>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 text-red-700 px-3 py-2 rounded-lg mb-4 text-sm">
              <X className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-start gap-2 bg-green-50 border border-green-100 text-green-700 px-3 py-2 rounded-lg mb-4 text-sm">
              <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {!pendingEmail && (
            <>
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
                  onError={() => setError('Google sign-up failed. Please try again.')}
                  size="large"
                  width="100%"
                  text="signup_with"
                />
              </div>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-gray-400 uppercase tracking-wider">or with email</span>
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      {...register('fullName')}
                      autoComplete="name"
                      className={`${inputBase} ${errors.fullName ? inputError : inputNormal}`}
                      placeholder="Your full name"
                    />
                  </div>
                  {errors.fullName && (
                    <p className="text-red-600 text-xs mt-1">{errors.fullName.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      {...register('email')}
                      type="email"
                      autoComplete="email"
                      className={`${inputBase} ${errors.email ? inputError : inputNormal}`}
                      placeholder="you@example.com"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-red-600 text-xs mt-1">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      {...register('phone')}
                      type="tel"
                      autoComplete="tel"
                      className={`${inputBase} ${errors.phone ? inputError : inputNormal}`}
                      placeholder="98XXXXXXXX"
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-red-600 text-xs mt-1">{errors.phone.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      className={`${inputBase} pr-10 ${errors.password ? inputError : inputNormal}`}
                      placeholder="Create a strong password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Strength meter — only after the user starts typing */}
                  {passwordValue.length > 0 && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-500">Password strength</span>
                        <span className={`font-medium ${strength.textColor}`}>{strength.label}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ease-out ${strength.barColor} ${strength.width}`}
                        />
                      </div>

                      <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                        {ruleResults.map((rule) => (
                          <li
                            key={rule.key}
                            className={`flex items-center gap-1.5 ${
                              rule.passed ? 'text-green-600' : 'text-gray-500'
                            }`}
                          >
                            {rule.passed ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : (
                              <X className="w-3.5 h-3.5 text-gray-300" />
                            )}
                            <span>{rule.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {errors.password && (
                    <p className="text-red-600 text-xs mt-2">{errors.password.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      {...register('confirmPassword')}
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      className={`${inputBase} pr-10 ${errors.confirmPassword ? inputError : inputNormal}`}
                      placeholder="Repeat your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-red-600 text-xs mt-1">{errors.confirmPassword.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || isSubmitting}
                  className="w-full inline-flex items-center justify-center rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2.5 transition shadow-sm"
                >
                  {loading ? 'Sending OTP…' : 'Create account'}
                </button>

                <p className="text-[11px] text-gray-400 text-center leading-relaxed">
                  By creating an account, you agree to our Terms of Service and Privacy Policy.
                </p>
              </form>
            </>
          )}

          {pendingEmail && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Verification code</label>
                <input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-center font-mono tracking-[0.4em] text-gray-900 placeholder-gray-300 transition focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="••••••"
                  inputMode="numeric"
                  maxLength={8}
                  required
                />
                <p className="text-xs text-gray-500 mt-1.5">Sent to {pendingEmail}</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2.5 transition shadow-sm"
              >
                {loading ? 'Verifying…' : 'Verify & create account'}
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={loading}
                className="w-full rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 py-2.5 text-sm font-medium transition"
              >
                Resend OTP
              </button>
            </form>
          )}

          <p className="mt-5 text-center text-[11px] text-gray-400">
            Want to sell on Juta Ghar? Register first, then request vendor access from your profile.
          </p>

          <div className="mt-4 text-center">
            <p className="text-gray-600 text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-600 font-medium hover:text-primary-700">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
