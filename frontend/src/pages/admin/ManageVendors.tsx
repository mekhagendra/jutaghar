import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CheckCircle, XCircle, Eye, Mail, Phone, Building, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

interface Vendor {
  _id: string;
  businessName: string;
  email: string;
  phone: string;
  businessAddress?: string;
  businessLicense?: string;
  taxId?: string;
  isApproved: boolean;
  isActive: boolean;
  createdAt: string;
  productCount?: number;
}

const ManageVendors: React.FC = () => {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = React.useState<'all' | 'pending' | 'approved' | 'inactive'>('all');

  const { data: vendorsData, isLoading } = useQuery({
    queryKey: ['vendors', filterStatus],
    queryFn: async () => {
      let endpoint = '/api/admin/vendors';
      if (filterStatus === 'pending') {
        endpoint = '/api/admin/vendors/pending';
      } else if (filterStatus === 'approved') {
        endpoint = '/api/admin/vendors?isApproved=true&isActive=true';
      } else if (filterStatus === 'inactive') {
        endpoint = '/api/admin/vendors?isActive=false';
      }
      const response = await api.get(endpoint);
      return response.data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (vendorId: string) => {
      await api.patch(`/api/admin/vendors/${vendorId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast.success('Vendor approved successfully');
    },
    onError: () => {
      toast.error('Failed to approve vendor');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ vendorId, isActive }: { vendorId: string; isActive: boolean }) => {
      await api.patch(`/api/admin/vendors/${vendorId}/status`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast.success('Vendor status updated successfully');
    },
    onError: () => {
      toast.error('Failed to update vendor status');
    },
  });

  const vendors = vendorsData?.data?.vendors || vendorsData?.data || [];

  const getStatusBadge = (vendor: Vendor) => {
    if (!vendor.isApproved) {
      return (
        <span className="px-3 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
          Pending
        </span>
      );
    }
    if (!vendor.isActive) {
      return (
        <span className="px-3 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
          Inactive
        </span>
      );
    }
    return (
      <span className="px-3 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
        Active
      </span>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Vendors</h1>
        <p className="text-gray-600">Approve and manage vendor accounts</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filterStatus === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Vendors
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filterStatus === 'pending'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Pending Approval
          </button>
          <button
            onClick={() => setFilterStatus('approved')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filterStatus === 'approved'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Approved
          </button>
          <button
            onClick={() => setFilterStatus('inactive')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filterStatus === 'inactive'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Inactive
          </button>
        </div>
      </div>

      {/* Vendors List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : vendors.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No vendors found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Business Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registration
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
                {vendors.map((vendor: Vendor) => (
                  <tr key={vendor._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Building className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {vendor.businessName}
                          </div>
                          {vendor.productCount !== undefined && (
                            <div className="text-xs text-gray-500">
                              {vendor.productCount} products
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="flex items-center text-gray-900 mb-1">
                          <Mail className="w-4 h-4 mr-2 text-gray-400" />
                          {vendor.email}
                        </div>
                        {vendor.phone && (
                          <div className="flex items-center text-gray-500">
                            <Phone className="w-4 h-4 mr-2 text-gray-400" />
                            {vendor.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {vendor.businessLicense || 'N/A'}
                      </div>
                      {vendor.taxId && (
                        <div className="text-xs text-gray-500">
                          Tax: {vendor.taxId}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(vendor)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2" />
                        {new Date(vendor.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {!vendor.isApproved && (
                          <button
                            onClick={() => approveMutation.mutate(vendor._id)}
                            className="inline-flex items-center px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                            disabled={approveMutation.isPending}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </button>
                        )}
                        {vendor.isApproved && (
                          <button
                            onClick={() =>
                              toggleActiveMutation.mutate({
                                vendorId: vendor._id,
                                isActive: !vendor.isActive,
                              })
                            }
                            className={`inline-flex items-center px-3 py-1 rounded-lg transition ${
                              vendor.isActive
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                            disabled={toggleActiveMutation.isPending}
                          >
                            {vendor.isActive ? (
                              <>
                                <XCircle className="w-4 h-4 mr-1" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Activate
                              </>
                            )}
                          </button>
                        )}
                        <Link
                          to={`/admin/vendors/${vendor._id}`}
                          className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageVendors;
