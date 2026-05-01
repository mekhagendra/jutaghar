import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';

const RETURN_STATUSES = ['all', 'requested', 'initiated', 'returned', 'completed', 'rejected'] as const;
const MANAGEABLE_STATUSES = ['requested', 'initiated', 'returned', 'completed', 'rejected'] as const;

type ReturnStatus = (typeof MANAGEABLE_STATUSES)[number];

interface ReturnItem {
  product?: { _id: string; name: string; images?: string[] };
  quantity: number;
  variant?: { color?: string; size?: string; sku?: string };
}

interface VendorReturnRow {
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  customer?: { fullName?: string; email?: string; phone?: string };
  returnRequest: {
    _id: string;
    reason: string;
    description?: string;
    images?: string[];
    status: ReturnStatus;
    requestedAt?: string;
    reviewedAt?: string;
    reviewNote?: string;
    items: ReturnItem[];
  };
}

interface ReturnsResponse {
  returns: VendorReturnRow[];
  pagination: { page: number; pages: number; total: number; limit: number };
}

const statusBadgeClass = (status: string) => {
  if (status === 'requested') return 'bg-amber-100 text-amber-800';
  if (status === 'initiated') return 'bg-blue-100 text-blue-800';
  if (status === 'returned') return 'bg-indigo-100 text-indigo-800';
  if (status === 'completed') return 'bg-emerald-100 text-emerald-800';
  if (status === 'rejected') return 'bg-rose-100 text-rose-800';
  return 'bg-gray-100 text-gray-700';
};

const VendorReturns: React.FC = () => {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<(typeof RETURN_STATUSES)[number]>('all');
  const [page, setPage] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<Record<string, ReturnStatus>>({});

  const limit = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['vendor-returns', status, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (status !== 'all') params.set('status', status);
      const res = await api.get(`/api/vendors/returns?${params.toString()}`);
      return res.data.data as ReturnsResponse;
    },
  });

  const rows = data?.returns ?? [];
  const pagination = data?.pagination;

  const updateMutation = useMutation({
    mutationFn: async ({ orderId, returnRequestId, nextStatus }: { orderId: string; returnRequestId: string; nextStatus: ReturnStatus }) => {
      await api.patch(`/api/vendors/returns/${orderId}/${returnRequestId}/status`, {
        status: nextStatus,
      });
    },
    onSuccess: () => {
      toast.success('Return status updated');
      queryClient.invalidateQueries({ queryKey: ['vendor-returns'] });
    },
    onError: (error: unknown) => {
      const message = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : 'Failed to update return status';
      toast.error(message || 'Failed to update return status');
    },
  });

  const applyStatusUpdate = (row: VendorReturnRow) => {
    const selected = selectedStatus[row.returnRequest._id] || row.returnRequest.status;
    if (selected === row.returnRequest.status) {
      toast('Return request is already at this status');
      return;
    }
    updateMutation.mutate({
      orderId: row.orderId,
      returnRequestId: row.returnRequest._id,
      nextStatus: selected,
    });
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Returns</h1>
        <p className="text-gray-500 text-sm mt-1">Manage customer return requests for your products</p>
      </div>

      <div className="flex gap-2 flex-wrap mb-6">
        {RETURN_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors border ${
              status === s
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400 hover:text-primary-600'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="card flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : rows.length === 0 ? (
        <div className="card text-center py-16">
          <RotateCcw className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No return requests found</p>
          <p className="text-gray-400 text-sm mt-1">When customers request a return, it will appear here</p>
        </div>
      ) : (
        <>
          <div className="card overflow-x-auto p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Order #</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Customer</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Requested</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Reason</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Items</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Manage</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.returnRequest._id} className="border-b hover:bg-gray-50 transition-colors align-top">
                    <td className="py-3 px-4 font-medium text-gray-800">
                      <div>{row.orderNumber}</div>
                      <div className="text-xs text-gray-500 capitalize">Order: {row.orderStatus}</div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      <div className="font-medium text-gray-800">{row.customer?.fullName || '—'}</div>
                      <div className="text-xs text-gray-500">{row.customer?.email}</div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{formatDate(row.returnRequest.requestedAt || '')}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      <div className="font-medium">{row.returnRequest.reason}</div>
                      {row.returnRequest.description ? (
                        <div className="text-xs text-gray-500 mt-1 line-clamp-2">{row.returnRequest.description}</div>
                      ) : null}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700 min-w-[220px]">
                      {row.returnRequest.items.map((item, idx) => (
                        <div key={`${row.returnRequest._id}-${idx}`} className="text-xs mb-1.5">
                          <span className="font-medium">{item.product?.name || 'Product'}</span> x {item.quantity}
                          {(item.variant?.color || item.variant?.size) && (
                            <span className="text-gray-500"> ({[item.variant?.color, item.variant?.size].filter(Boolean).join(' / ')})</span>
                          )}
                        </div>
                      ))}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadgeClass(row.returnRequest.status)}`}>
                        {row.returnRequest.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 min-w-[220px]">
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedStatus[row.returnRequest._id] || row.returnRequest.status}
                          onChange={(e) =>
                            setSelectedStatus((prev) => ({
                              ...prev,
                              [row.returnRequest._id]: e.target.value as ReturnStatus,
                            }))
                          }
                          className="px-2 py-1.5 text-xs rounded border border-gray-300 bg-white"
                        >
                          {MANAGEABLE_STATUSES.map((state) => (
                            <option key={state} value={state}>
                              {state}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => applyStatusUpdate(row)}
                          disabled={updateMutation.isPending}
                          className="px-3 py-1.5 text-xs rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
                        >
                          Update
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">
                Page {pagination.page} of {pagination.pages} ({pagination.total} return requests)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                  className="p-1.5 rounded border border-gray-300 hover:border-primary-400 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page === pagination.pages}
                  className="p-1.5 rounded border border-gray-300 hover:border-primary-400 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default VendorReturns;
