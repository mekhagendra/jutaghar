import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';

const STATUS_OPTIONS = ['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'];

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
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
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
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600"></th>
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
                      <Link
                        to={`/orders/${order._id}`}
                        className="text-primary-600 hover:text-primary-700 hover:underline text-sm font-medium"
                      >
                        View
                      </Link>
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
