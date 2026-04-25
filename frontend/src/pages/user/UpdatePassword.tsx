import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Lock, Mail, ArrowLeft } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

const UpdatePassword: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [passwordOtpRequested, setPasswordOtpRequested] = useState(false);
  const [changePasswordOtp, setChangePasswordOtp] = useState('');

  const passwordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await api.post('/api/auth/change-password/request-otp', data);
      return response.data;
    },
    onSuccess: () => {
      setPasswordOtpRequested(true);
      toast.success('OTP sent to your email. Enter OTP to confirm password change.');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || 'Failed to request password change OTP.');
    },
  });

  const verifyPasswordMutation = useMutation({
    mutationFn: async (otp: string) => {
      const response = await api.post('/api/auth/change-password/verify-otp', { otp });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Password changed successfully');
      setPasswordOtpRequested(false);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setChangePasswordOtp('');
      setTimeout(() => navigate('/user/account'), 1500);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || 'OTP verification failed.');
    },
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordForm.currentPassword.trim()) {
      toast.error('Current password is required');
      return;
    }
    if (!passwordForm.newPassword.trim()) {
      toast.error('New password is required');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    passwordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  };

  const handleOtpVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!changePasswordOtp.trim()) {
      toast.error('OTP is required');
      return;
    }
    verifyPasswordMutation.mutate(changePasswordOtp);
  };

  return (
    <div className="bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-primary-600 hover:text-primary-700 mb-6 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">Update Password</h1>

        {!passwordOtpRequested ? (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="w-4 h-4 inline mr-2" />
                Email
              </label>
              <input
                type="email"
                value={user?.email ?? ''}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Lock className="w-4 h-4 inline mr-2" />
                Current Password
              </label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                }
                placeholder="Enter your current password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Lock className="w-4 h-4 inline mr-2" />
                New Password
              </label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                }
                placeholder="Enter your new password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum 8 characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Lock className="w-4 h-4 inline mr-2" />
                Confirm New Password
              </label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                }
                placeholder="Confirm your new password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={passwordMutation.isPending}
              className="w-full bg-primary-600 text-white py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-60"
            >
              {passwordMutation.isPending ? 'Sending OTP...' : 'Continue'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpVerify} className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800">
                We've sent an OTP to your email address. Enter it below to confirm password change.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter OTP
              </label>
              <input
                type="text"
                value={changePasswordOtp}
                onChange={(e) => setChangePasswordOtp(e.target.value.toUpperCase())}
                placeholder="6-digit OTP"
                maxLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-center text-lg tracking-widest"
                required
              />
            </div>

            <button
              type="submit"
              disabled={verifyPasswordMutation.isPending}
              className="w-full bg-primary-600 text-white py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-60"
            >
              {verifyPasswordMutation.isPending ? 'Verifying...' : 'Verify OTP'}
            </button>

            <button
              type="button"
              onClick={() => {
                setPasswordOtpRequested(false);
                setChangePasswordOtp('');
              }}
              className="w-full text-gray-600 hover:text-gray-800 font-medium py-2"
            >
              Back to Password Entry
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default UpdatePassword;
