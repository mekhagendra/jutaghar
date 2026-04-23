import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { User, Phone, Mail, Save, ArrowLeft } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

const UpdateProfile: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();

  const [profileForm, setProfileForm] = useState({
    fullName: user?.fullName ?? '',
    phone: user?.phone ?? '',
  });

  const profileMutation = useMutation({
    mutationFn: async (data: { fullName: string; phone: string }) => {
      const response = await api.put('/api/auth/profile', data);
      return response.data.data;
    },
    onSuccess: (updatedUser) => {
      updateUser(updatedUser);
      toast.success('Profile updated successfully');
      navigate('/user/account');
    },
    onError: () => {
      toast.error('Failed to update profile');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.fullName.trim()) {
      toast.error('Full name is required');
      return;
    }
    profileMutation.mutate(profileForm);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-primary-600 hover:text-primary-700 mb-6 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">Update Profile</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-2" />
              Full Name
            </label>
            <input
              type="text"
              value={profileForm.fullName}
              onChange={(e) =>
                setProfileForm({ ...profileForm, fullName: e.target.value })
              }
              placeholder="Enter your full name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="w-4 h-4 inline mr-2" />
              Email (Read-only)
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
              <Phone className="w-4 h-4 inline mr-2" />
              Phone Number
            </label>
            <input
              type="tel"
              value={profileForm.phone}
              onChange={(e) =>
                setProfileForm({ ...profileForm, phone: e.target.value })
              }
              placeholder="Enter your phone number"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <button
            type="submit"
            disabled={profileMutation.isPending}
            className="w-full bg-primary-600 text-white py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {profileMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UpdateProfile;
