import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, Phone, Calendar, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

interface User {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  createdAt: string;
  affiliatedBy?: {
    _id: string;
    fullName: string;
    businessName?: string;
  };
}

const ManageUsers: React.FC = () => {
  const queryClient = useQueryClient();
  const [filterRole, setFilterRole] = React.useState<'all' | 'user' | 'manufacturer' | 'importer' | 'seller' | 'outlet' | 'manager' | 'admin'>('all');
  const [filterStatus, setFilterStatus] = React.useState<'all' | 'active' | 'pending' | 'suspended'>('all');
  const [searchTerm, setSearchTerm] = React.useState('');

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users', filterRole, filterStatus, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterRole !== 'all') params.append('role', filterRole);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (searchTerm) params.append('search', searchTerm);
      
      const response = await api.get(`/api/admin/users?${params.toString()}`);
      return response.data.data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      await api.patch(`/api/admin/users/${userId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User status updated successfully');
    },
    onError: () => {
      toast.error('Failed to update user status');
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await api.patch(`/api/admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User role updated successfully');
    },
    onError: () => {
      toast.error('Failed to update user role');
    },
  });

  const users = usersData?.users || [];

  const getStatusBadge = (status: string) => {
    const badges = {
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      suspended: 'bg-red-100 text-red-800',
    };
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  const getRoleBadge = (role: string) => {
    const badges = {
      admin: 'bg-purple-100 text-purple-800',
      manager: 'bg-blue-100 text-blue-800',
      manufacturer: 'bg-indigo-100 text-indigo-800',
      importer: 'bg-cyan-100 text-cyan-800',
      seller: 'bg-orange-100 text-orange-800',
      outlet: 'bg-pink-100 text-pink-800',
      user: 'bg-gray-100 text-gray-800',
    };
    return badges[role as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Users</h1>
        <p className="text-gray-600">View and manage all user accounts</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Role Filter */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Role
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterRole('all')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filterRole === 'all'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterRole('user')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filterRole === 'user'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Users
              </button>
              <button
                onClick={() => setFilterRole('manufacturer')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filterRole === 'manufacturer'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Manufacturers
              </button>
              <button
                onClick={() => setFilterRole('importer')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filterRole === 'importer'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Importers
              </button>
              <button
                onClick={() => setFilterRole('seller')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filterRole === 'seller'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Sellers
              </button>
              <button
                onClick={() => setFilterRole('outlet')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filterRole === 'outlet'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Outlets
              </button>
              <button
                onClick={() => setFilterRole('manager')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filterRole === 'manager'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Managers
              </button>
              <button
                onClick={() => setFilterRole('admin')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filterRole === 'admin'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Admins
              </button>
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Status
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filterStatus === 'all'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterStatus('active')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filterStatus === 'active'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setFilterStatus('pending')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filterStatus === 'pending'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setFilterStatus('suspended')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filterStatus === 'suspended'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Suspended
              </button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search Users
          </label>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input w-full"
          />
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No users found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user: User) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.fullName}
                        </div>
                        {user.affiliatedBy && (
                          <div className="text-xs text-gray-500">
                            Referred by: {user.affiliatedBy.businessName || user.affiliatedBy.fullName}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="flex items-center text-gray-900 mb-1">
                          <Mail className="w-4 h-4 mr-2 text-gray-400" />
                          {user.email}
                        </div>
                        {user.phone && (
                          <div className="flex items-center text-gray-500">
                            <Phone className="w-4 h-4 mr-2 text-gray-400" />
                            {user.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={user.role}
                        onChange={(e) => updateRoleMutation.mutate({ userId: user._id, role: e.target.value })}
                        className={`px-3 py-1 text-xs font-medium rounded-full ${getRoleBadge(user.role)}`}
                        disabled={updateRoleMutation.isPending}
                      >
                        <option value="user">User</option>
                        <option value="manufacturer">Manufacturer</option>
                        <option value="importer">Importer</option>
                        <option value="seller">Seller</option>
                        <option value="outlet">Outlet</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={user.status}
                        onChange={(e) => updateStatusMutation.mutate({ userId: user._id, status: e.target.value })}
                        className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusBadge(user.status)}`}
                        disabled={updateStatusMutation.isPending}
                      >
                        <option value="active">Active</option>
                        <option value="pending">Pending</option>
                        <option value="suspended">Suspended</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2" />
                        {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {usersData?.pagination && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {users.length} of {usersData.pagination.total} users
          </div>
          <div className="flex gap-2">
            {usersData.pagination.page > 1 && (
              <button className="btn btn-secondary px-4 py-2">
                Previous
              </button>
            )}
            {usersData.pagination.page < usersData.pagination.pages && (
              <button className="btn btn-secondary px-4 py-2">
                Next
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageUsers;
