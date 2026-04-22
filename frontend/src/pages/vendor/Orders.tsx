import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';

const STATUS_OPTIONS = ['all', 'pending', 'processing', 'shipped', 'delivered', 'returned', 'cancelled'];
const ACTIVE_VENDOR_STAGES = ['pending', 'processing', 'shipped', 'delivered', 'returned'];

interface VendorOrderItem {
  product: { _id: string; name: string; images?: string[] };
  quantity: number;
  price: number;
}

interface VendorOrder {
  _id: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  total: number;
  subtotal: number;
  user?: { fullName: string; email: string; phone?: string };
  items: VendorOrderItem[];
  shippingAddress?: { address?: string; city?: string };
}

const VendorOrders: React.FC = () => {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<Record<string, string>>({});
  const limit = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['vendor-orders-full', status, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (status !== 'all') params.set('status', status);
      const res = await api.get(`/api/vendors/orders?${params}`);
      return res.data.data as { orders: VendorOrder[]; pagination: { page: number; pages: number; total: number } };
    },
  });

  const orders = data?.orders ?? [];
  const pagination = data?.pagination;

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, nextStatus, cancelReason }: { orderId: string; nextStatus: string; cancelReason?: string }) => {
      await api.patch(`/api/orders/${orderId}/status`, {
        status: nextStatus,
        cancelReason,
      });
    },
    onSuccess: () => {
      toast.success('Order status updated');
      queryClient.invalidateQueries({ queryKey: ['vendor-orders-full'] });
    },
    onError: (error: unknown) => {
      const message = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : 'Failed to update order status';
      toast.error(message || 'Failed to update order status');
    },
  });

  const handleApplyStatus = (order: VendorOrder) => {
    const nextStatus = selectedStatus[order._id] || order.status;
    if (nextStatus === order.status) {
      toast('Order is already at this stage');
      return;
    }

    if (!ACTIVE_VENDOR_STAGES.includes(nextStatus)) {
      toast.error('Invalid stage selected');
      return;
    }

    updateStatusMutation.mutate({ orderId: order._id, nextStatus });
  };

  const handleCancelOrder = (order: VendorOrder) => {
    const reason = window.prompt(`Cancel order ${order.orderNumber}. Enter cancellation reason:`);
    if (!reason || !reason.trim()) {
      toast.error('Cancel reason is required');
      return;
    }
    updateStatusMutation.mutate({ orderId: order._id, nextStatus: 'cancelled', cancelReason: reason.trim() });
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Orders</h1>
        <p className="text-gray-500 text-sm mt-1">View orders containing your products</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => { setStatus(s); setPage(1); }}
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
      ) : orders.length === 0 ? (
        <div className="card text-center py-16">
          <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No orders found</p>
          <p className="text-gray-400 text-sm mt-1">Orders containing your products will appear here</p>
        </div>
      ) : (
        <>
          <div className="card overflow-x-auto p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Order #</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Customer</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Items</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Total</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Manage</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order._id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 font-medium text-gray-800">{order.orderNumber}</td>
                    <td className="py-3 px-4 text-gray-600 text-sm">{formatDate(order.createdAt)}</td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-sm text-gray-800">{order.user?.fullName ?? '—'}</p>
                      <p className="text-xs text-gray-500">{order.user?.email}</p>
                    </td>
                    <td className="py-3 px-4 text-gray-700 text-sm">
                      {order.items.map((item) => (
                        <div key={item.product._id} className="text-xs">
                          {item.product.name} × {item.quantity}
                        </div>
                      ))}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-800">{formatCurrency(order.total)}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-2 min-w-[200px]">
                        <Link
                          to={`/orders/${order._id}`}
                          className="text-primary-600 hover:text-primary-700 hover:underline text-sm font-medium"
                        >
                          View
                        </Link>

                        {order.status !== 'cancelled' && order.status !== 'refunded' ? (
                          <>
                            <div className="flex items-center gap-2">
                              <select
                                value={selectedStatus[order._id] || order.status}
                                onChange={(e) => setSelectedStatus((prev) => ({ ...prev, [order._id]: e.target.value }))}
                                className="px-2 py-1 text-xs rounded border border-gray-300 bg-white"
                              >
                                {ACTIVE_VENDOR_STAGES.map((stage) => (
                                  <option key={stage} value={stage}>
                                    {stage}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleApplyStatus(order)}
                                disabled={updateStatusMutation.isPending}
                                className="px-2.5 py-1 text-xs rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
                              >
                                Update
                              </button>
                            </div>

                            <button
                              onClick={() => handleCancelOrder(order)}
                              disabled={updateStatusMutation.isPending}
                              className="w-fit px-2.5 py-1 text-xs rounded bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 disabled:opacity-50"
                            >
                              Cancel (Reason Required)
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-gray-500">
                            {order.status === 'cancelled' ? 'Cancelled order' : 'No further updates'}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">
                Page {pagination.page} of {pagination.pages} ({pagination.total} orders)
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

export default VendorOrders;
