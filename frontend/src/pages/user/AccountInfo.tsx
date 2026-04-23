import React from 'react';
import { BadgeCheck, CalendarDays, Mail, Phone, UserCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

const AccountInfo: React.FC = () => {
  const { user } = useAuthStore();

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : 'N/A';

  const statusClass =
    user?.status === 'active'
      ? 'text-green-600 bg-green-50 border-green-200'
      : 'text-amber-700 bg-amber-50 border-amber-200';

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Account Info</h1>
        <p className="text-gray-500 text-sm mt-1">Basic account details</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-lg">
            {(user?.fullName ?? 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-800">{user?.fullName ?? 'User'}</p>
            <p className="text-sm text-gray-500 capitalize">{user?.role ?? 'customer'}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between border border-gray-100 rounded-lg px-4 py-3">
            <div className="flex items-center gap-2 text-gray-600">
              <UserCircle className="w-4 h-4" />
              <span className="text-sm">Account Type</span>
            </div>
            <span className="text-sm font-medium capitalize text-gray-800">{user?.role ?? 'customer'}</span>
          </div>

          <div className="flex items-center justify-between border border-gray-100 rounded-lg px-4 py-3">
            <div className="flex items-center gap-2 text-gray-600">
              <BadgeCheck className="w-4 h-4" />
              <span className="text-sm">Status</span>
            </div>
            <span className={`text-xs font-semibold capitalize px-2.5 py-1 rounded-full border ${statusClass}`}>
              {user?.status ?? 'active'}
            </span>
          </div>

          <div className="flex items-center justify-between border border-gray-100 rounded-lg px-4 py-3">
            <div className="flex items-center gap-2 text-gray-600">
              <CalendarDays className="w-4 h-4" />
              <span className="text-sm">Member Since</span>
            </div>
            <span className="text-sm font-medium text-gray-800">{memberSince}</span>
          </div>

          <div className="flex items-center justify-between border border-gray-100 rounded-lg px-4 py-3">
            <div className="flex items-center gap-2 text-gray-600">
              <Mail className="w-4 h-4" />
              <span className="text-sm">Email</span>
            </div>
            <span className="text-sm font-medium text-gray-800">{user?.email ?? 'N/A'}</span>
          </div>

          <div className="flex items-center justify-between border border-gray-100 rounded-lg px-4 py-3">
            <div className="flex items-center gap-2 text-gray-600">
              <Phone className="w-4 h-4" />
              <span className="text-sm">Phone</span>
            </div>
            <span className="text-sm font-medium text-gray-800">{user?.phone || 'Not provided'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountInfo;
