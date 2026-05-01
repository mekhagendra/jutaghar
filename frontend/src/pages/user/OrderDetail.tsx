import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  MapPin,
  CreditCard,
} from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';

interface OrderItem {
  _id: string;
  product: { _id: string; name: string; images: string[] };
  vendor: { businessName?: string; fullName: string };
  quantity: number;
  price: number;
  variant?: { color?: string; size?: string; sku?: string };
}

interface Order {
  _id: string;
  orderNumber: string;
  createdAt: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  paymentStatus: string;
  paymentMethod: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shippingCost: number;
  total: number;
  shippingAddress: {
    fullName?: string;
    phone?: string;
    street?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  notes?: string;
  trackingNumber?: string;
  shippedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
}

const STEPS = [
  { key: 'pending', label: 'Order Placed', icon: Clock },
  { key: 'processing', label: 'Processing', icon: Package },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle },
] as const;

const STATUS_ORDER = ['pending', 'processing', 'shipped', 'delivered'];

function OrderTracker({ status }: { status: Order['status'] }) {
  const isCancelled = status === 'cancelled' || status === 'refunded';
  const activeIndex = STATUS_ORDER.indexOf(status);

  if (isCancelled) {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
        <XCircle className="w-6 h-6 text-red-500 shrink-0" />
        <div>
          <p className="font-semibold text-red-700 capitalize">{status}</p>
          <p className="text-sm text-red-500">This order has been {status}.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex items-start justify-between">
      {/* connecting line */}
      <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-200" aria-hidden />
      <div
        className="absolute top-5 left-5 h-0.5 bg-primary-600 transition-all duration-500"
        style={{ width: activeIndex <= 0 ? '0%' : `${(activeIndex / (STEPS.length - 1)) * 100}%` }}
        aria-hidden
      />

      {STEPS.map((step, index) => {
        const Icon = step.icon;
        const isDone = index < activeIndex;
        const isActive = index === activeIndex;
        return (
          <div key={step.key} className="relative flex flex-col items-center gap-2 z-10">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                isDone
                  ? 'bg-primary-600 border-primary-600 text-white'
                  : isActive
                  ? 'bg-white border-primary-600 text-primary-600'
                  : 'bg-white border-gray-300 text-gray-400'
              }`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <span
              className={`text-xs font-medium text-center max-w-[70px] ${
                isDone || isActive ? 'text-primary-700' : 'text-gray-400'
              }`}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const OrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const res = await api.get(`/api/orders/${id}`);
      return res.data.data as Order;
    },
    enabled: !!id,
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await api.patch(`/api/orders/${id}/cancel`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Order cancelled successfully');
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['user-orders'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || 'Failed to cancel order');
    },
  });

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel this order?')) {
      cancelMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-gray-600 mb-4">Order not found.</p>
        <Link to="/dashboard" className="text-primary-600 hover:underline">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const order = data;
  const canCancel = ['pending', 'processing'].includes(order.status);
  const addr = order.shippingAddress;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">Order #{order.orderNumber}</h1>
          <p className="text-gray-500 text-sm mt-1">Placed on {formatDate(order.createdAt)}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`badge text-sm px-3 py-1 rounded-full font-medium capitalize ${getStatusColor(order.status)}`}>
            {order.status}
          </span>
        </div>
      </div>

      {/* Tracker */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-6">Order Status</h2>
        <OrderTracker status={order.status} />

        {/* Timestamps */}
        <div className="mt-6 flex flex-wrap gap-4 text-sm text-gray-500">
          {order.shippedAt && (
            <span>Shipped: <span className="font-medium text-gray-700">{formatDate(order.shippedAt)}</span></span>
          )}
          {order.deliveredAt && (
            <span>Delivered: <span className="font-medium text-gray-700">{formatDate(order.deliveredAt)}</span></span>
          )}
          {order.cancelledAt && (
            <span>Cancelled: <span className="font-medium text-gray-700">{formatDate(order.cancelledAt)}</span></span>
          )}
        </div>

        {/* Tracking number */}
        {order.trackingNumber && (
          <div className="mt-4 flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
            <Truck className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="text-blue-700">
              Tracking number: <span className="font-mono font-semibold">{order.trackingNumber}</span>
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — items */}
        <div className="lg:col-span-2 space-y-4">
          {/* Items */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Items Ordered</h2>
            <div className="divide-y">
              {order.items.map((item) => {
                const img = item.product?.images?.[0];
                return (
                  <div key={item._id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                      {img ? (
                        <img
                          src={img}
                          alt={item.product?.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/products/${item.product?._id}`}
                        className="font-medium hover:text-primary-600 line-clamp-2"
                      >
                        {item.product?.name}
                      </Link>
                      {item.variant && (
                        <p className="text-sm text-gray-500 mt-0.5">
                          {[item.variant.color, item.variant.size].filter(Boolean).join(' / ')}
                        </p>
                      )}
                      <p className="text-sm text-gray-500">
                        Qty: {item.quantity} × {formatCurrency(item.price)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold">{formatCurrency(item.price * item.quantity)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="card">
              <h2 className="text-base font-semibold mb-2">Order Notes</h2>
              <p className="text-gray-600 text-sm">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Right column — summary + shipping */}
        <div className="space-y-4">
          {/* Price breakdown */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Price Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax</span>
                <span>{formatCurrency(order.tax)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span>{formatCurrency(order.shippingCost)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold text-base">
                <span>Total</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>

            {/* Payment method */}
            <div className="mt-4 pt-4 border-t flex items-center gap-2 text-sm text-gray-500">
              <CreditCard className="w-4 h-4 shrink-0" />
              <span className="capitalize">{order.paymentMethod?.replace(/_/g, ' ')}</span>
            </div>
          </div>

          {/* Shipping address */}
          <div className="card">
            <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Shipping Address
            </h2>
            <div className="text-sm text-gray-600 space-y-0.5">
              {addr.fullName && <p className="font-medium text-gray-800">{addr.fullName}</p>}
              {addr.phone && <p>{addr.phone}</p>}
              {(addr.street || addr.address) && <p>{addr.street || addr.address}</p>}
              {(addr.city || addr.state) && (
                <p>{[addr.city, addr.state].filter(Boolean).join(', ')}</p>
              )}
              {addr.zipCode && <p>{addr.zipCode}</p>}
              {addr.country && <p>{addr.country}</p>}
            </div>
          </div>

          {/* Cancel button */}
          {canCancel && (
            <button
              onClick={handleCancel}
              disabled={cancelMutation.isPending}
              className="w-full flex items-center justify-center gap-2 border border-red-300 text-red-600 hover:bg-red-50 rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {cancelMutation.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              Cancel Order
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
