import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { User, Phone, Mail, Lock, Save, Store, Clock, CheckCircle, XCircle } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

const UserProfile: React.FC = () => {
  const { user, updateUser } = useAuthStore();

  const [profileForm, setProfileForm] = useState({
    fullName: user?.fullName ?? '',
    phone: user?.phone ?? '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    otp: '',
  });
  const [passwordOtpRequested, setPasswordOtpRequested] = useState(false);

  const profileMutation = useMutation({
    mutationFn: async (data: { fullName: string; phone: string }) => {
      const response = await api.put('/api/auth/profile', data);
      return response.data.data;
    },
    onSuccess: (updatedUser) => {
      updateUser(updatedUser);
      toast.success('Profile updated successfully');
    },
    onError: () => {
      toast.error('Failed to update profile');
    },
  });

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
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '', otp: '' });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || 'OTP verification failed.');
    },
  });

  // Vendor request state
  const [vendorForm, setVendorForm] = useState({
    businessName: '',
    businessAddress: '',
    taxId: '',
  });

  const vendorRequestMutation = useMutation({
    mutationFn: async (data: { businessName: string; businessAddress: string; taxId: string }) => {
      const response = await api.post('/api/auth/vendor-request', data);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Vendor request submitted!');
      if (data.data?.vendorRequest) {
        updateUser({ ...user!, vendorRequest: data.data.vendorRequest });
      }
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || 'Failed to submit vendor request');
    },
  });

  const handleVendorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorForm.businessName.trim()) {
      toast.error('Business name is required');
      return;
    }
    if (!vendorForm.taxId.trim()) {
      toast.error('Business Tax ID is required');
      return;
    }
    vendorRequestMutation.mutate(vendorForm);
  };

  const isRegularUser = user?.role === 'customer';
  const vendorRequestStatus = user?.vendorRequest?.status || 'none';

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    profileMutation.mutate(profileForm);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordOtpRequested) {
      if (!passwordForm.otp.trim()) {
        toast.error('Please enter OTP');
        return;
      }
      verifyPasswordMutation.mutate(passwordForm.otp);
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    passwordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">My Profile</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your personal information and password</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-lg">
              {user?.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-800">{user?.fullName}</p>
              <p className="text-sm text-gray-500 capitalize">{user?.role}</p>
            </div>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <User className="w-3.5 h-3.5 inline mr-1 mb-0.5" />
                Full Name
              </label>
              <input
                type="text"
                value={profileForm.fullName}
                onChange={(e) => setProfileForm((p) => ({ ...p, fullName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Mail className="w-3.5 h-3.5 inline mr-1 mb-0.5" />
                Email
              </label>
              <input
                type="email"
                value={user?.email ?? ''}
                disabled
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Phone className="w-3.5 h-3.5 inline mr-1 mb-0.5" />
                Phone
              </label>
              <input
                type="tel"
                value={profileForm.phone}
                onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

            <button
              type="submit"
              disabled={profileMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              {profileMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-5 flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Change Password
          </h2>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
                minLength={6}
              />
            </div>

            {passwordOtpRequested && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">OTP</label>
                <input
                  type="text"
                  value={passwordForm.otp}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, otp: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Enter the OTP sent to your email to confirm password change.</p>
              </div>
            )}

            <button
              type="submit"
              disabled={passwordMutation.isPending || verifyPasswordMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-60"
            >
              <Lock className="w-4 h-4" />
              {passwordMutation.isPending ? 'Sending OTP...' : verifyPasswordMutation.isPending ? 'Verifying...' : passwordOtpRequested ? 'Verify OTP & Update Password' : 'Request OTP for Password Change'}
            </button>
          </form>
        </div>
      </div>

      {/* Vendor Request Section — only for regular users */}
      {isRegularUser && (
        <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Store className="w-4 h-4" />
            Become an Outlet
          </h2>

          {vendorRequestStatus === 'pending' && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
              <Clock className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-amber-800">Request Pending</p>
                <p className="text-sm text-amber-700 mt-1">
                  Your outlet request is under review.
                  You'll be notified once it's approved.
                </p>
              </div>
            </div>
          )}

          {vendorRequestStatus === 'rejected' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
                <XCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-red-800">Request Rejected</p>
                  <p className="text-sm text-red-700 mt-1">
                    Your previous outlet request was rejected.
                    {user?.vendorRequest?.rejectionReason && (
                      <> Reason: <span className="font-medium">{user.vendorRequest.rejectionReason}</span></>
                    )}
                  </p>
                  <p className="text-sm text-red-600 mt-2">You can submit a new request below.</p>
                </div>
              </div>
            </div>
          )}

          {vendorRequestStatus === 'approved' && (
            <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg p-4">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-green-800">Request Approved!</p>
                <p className="text-sm text-green-700 mt-1">
                  Your outlet account has been approved. Please log out and log back in to access your outlet dashboard.
                </p>
              </div>
            </div>
          )}

          {(vendorRequestStatus === 'none' || vendorRequestStatus === 'rejected') && (
            <form onSubmit={handleVendorSubmit} className="space-y-4 mt-4">
              <p className="text-sm text-gray-600">
                Apply to become an outlet on Juta Ghar. Fill in your business details below.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
                <input
                  type="text"
                  value={vendorForm.businessName}
                  onChange={(e) => setVendorForm((f) => ({ ...f, businessName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Your company name"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Tax ID *</label>
                  <input
                    type="text"
                    value={vendorForm.taxId}
                    onChange={(e) => setVendorForm((f) => ({ ...f, taxId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="PAN / VAT number"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Address</label>
                <input
                  type="text"
                  value={vendorForm.businessAddress}
                  onChange={(e) => setVendorForm((f) => ({ ...f, businessAddress: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Street, City, Province"
                />
              </div>

              <button
                type="submit"
                disabled={vendorRequestMutation.isPending || !vendorForm.businessName.trim() || !vendorForm.taxId.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-60"
              >
                <Store className="w-4 h-4" />
                {vendorRequestMutation.isPending ? 'Submitting...' : 'Submit Outlet Request'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

export default UserProfile;
