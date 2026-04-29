import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Store, Clock, CheckCircle, XCircle } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

const UserProfile: React.FC = () => {
  const { user, updateUser } = useAuthStore();

  const [vendorForm, setVendorForm] = useState({
    businessName: '',
    businessAddress: '',
    taxId: '',
    sellerImage: '',
  });
  const [sellerImageFile, setSellerImageFile] = useState<File | null>(null);

  const vendorRequestMutation = useMutation({
    mutationFn: async (data: { businessName: string; businessAddress: string; taxId: string; sellerImage: string }) => {
      const response = await api.post('/api/auth/vendor-request', data);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Seller request submitted!');
      if (data.data?.vendorRequest) {
        updateUser({ ...user!, vendorRequest: data.data.vendorRequest });
      }
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || 'Failed to submit seller request');
    },
  });

  const handleVendorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorForm.businessName.trim()) {
      toast.error('Business name is required');
      return;
    }
    if (!vendorForm.taxId.trim()) {
      toast.error('Tax ID is required');
      return;
    }
    const run = async () => {
      let sellerImage = vendorForm.sellerImage;
      if (sellerImageFile) {
        const formData = new FormData();
        formData.append('image', sellerImageFile);
        const uploadRes = await api.post('/api/uploads/seller-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        sellerImage = uploadRes.data?.data?.url || sellerImage;
      }

      vendorRequestMutation.mutate({
        ...vendorForm,
        sellerImage,
      });
    };

    run().catch(() => {
      toast.error('Failed to upload seller image');
    });
  };

  const vendorRequestStatus = user?.vendorRequest?.status || 'none';

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-800">Become a Seller</h1>
        <p className="text-gray-500 text-sm mt-1">Apply to sell your products on Juta Ghar</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 w-full max-w-lg">
        <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Store className="w-4 h-4" />
          Become a Seller
        </h2>

        {vendorRequestStatus === 'pending' && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <Clock className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-amber-800">Request Pending</p>
              <p className="text-sm text-amber-700 mt-1">
                Your seller request is under review. You'll be notified once it's approved.
              </p>
            </div>
          </div>
        )}

        {vendorRequestStatus === 'rejected' && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <XCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-red-800">Request Rejected</p>
              <p className="text-sm text-red-700 mt-1">
                Your previous request was rejected.
                {user?.vendorRequest?.rejectionReason && (
                  <> Reason: <span className="font-medium">{user.vendorRequest.rejectionReason}</span></>
                )}
              </p>
              <p className="text-sm text-red-600 mt-2">You can submit a new request below.</p>
            </div>
          </div>
        )}

        {vendorRequestStatus === 'approved' && (
          <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg p-4">
            <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-green-800">Approved!</p>
              <p className="text-sm text-green-700 mt-1">
                Your seller account has been approved. Please log out and log back in to access your seller dashboard.
              </p>
            </div>
          </div>
        )}

        {(vendorRequestStatus === 'none' || vendorRequestStatus === 'rejected') && (
          <form onSubmit={handleVendorSubmit} className="space-y-4">
            <p className="text-sm text-gray-500">
              Fill in your business details to apply as a seller on Juta Ghar.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
              <input
                type="text"
                value={vendorForm.businessName}
                onChange={(e) => setVendorForm((f) => ({ ...f, businessName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Your business name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID (PAN / VAT) *</label>
              <input
                type="text"
                value={vendorForm.taxId}
                onChange={(e) => setVendorForm((f) => ({ ...f, taxId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="PAN / VAT number"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Seller Image File (16:9)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setSellerImageFile(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Upload image file in 16:9 ratio (e.g. 1600x900).</p>
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
              {vendorRequestMutation.isPending ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
