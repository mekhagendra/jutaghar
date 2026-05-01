import React, { useEffect, useMemo, useState } from 'react';
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
  Upload,
  Copy,
  Check,
  RotateCcw,
  X,
  AlertCircle,
  Image as ImageIcon,
} from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';

/* -------------------- types -------------------- */

interface OrderItem {
  _id?: string;
  product: { _id: string; name: string; images: string[] };
  vendor: { businessName?: string; fullName: string };
  quantity: number;
  price: number;
  variant?: { color?: string; size?: string; sku?: string };
}

interface ReturnRequest {
  _id: string;
  items?: Array<{
    product: { _id: string };
    quantity: number;
    variant?: { color?: string; size?: string; sku?: string };
  }>;
  reason: string;
  description?: string;
  images?: string[];
  status: 'requested' | 'approved' | 'rejected' | 'completed';
  requestedAt: string;
}

interface Order {
  _id: string;
  orderNumber: string;
  createdAt: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'returned' | 'cancelled' | 'refunded';
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
  returnRequests?: ReturnRequest[];
}

const STEPS = [
  { key: 'pending', label: 'Order Placed', icon: Clock },
  { key: 'processing', label: 'Processing', icon: Package },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle },
] as const;

const STATUS_ORDER = ['pending', 'processing', 'shipped', 'delivered'];

const RETURN_REASONS = [
  'Wrong item delivered',
  'Damaged or defective product',
  'Size/fit issue',
  'Product not as described',
  'Other',
];

const buildItemKey = (item: {
  product?: { _id?: string };
  variant?: { color?: string; size?: string; sku?: string };
}) => {
  const productId = item.product?._id || '';
  const sku = item.variant?.sku || '';
  const color = item.variant?.color || '';
  const size = item.variant?.size || '';
  return `${productId}|${sku}|${color}|${size}`;
};

/* -------------------- tracker -------------------- */

function OrderTracker({ status }: { status: Order['status'] }) {
  const isCancelled = status === 'cancelled' || status === 'refunded';
  const activeIndex = STATUS_ORDER.indexOf(status);

  if (isCancelled) {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
          <XCircle className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <p className="font-semibold text-red-700 capitalize">{status}</p>
          <p className="text-sm text-red-500">This order has been {status}.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Horizontal tracker — sm and up */}
      <div className="hidden sm:block relative">
        <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-200" aria-hidden />
        <div
          className="absolute top-5 left-5 h-0.5 bg-primary-600 transition-all duration-700"
          style={{
            width:
              activeIndex <= 0
                ? '0%'
                : `calc(${(activeIndex / (STEPS.length - 1)) * 100}% - ${(activeIndex / (STEPS.length - 1)) * 40}px)`,
          }}
          aria-hidden
        />
        <div className="flex items-start justify-between relative">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isDone = index < activeIndex;
            const isActive = index === activeIndex;
            return (
              <div key={step.key} className="flex flex-col items-center gap-2 z-10">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    isDone
                      ? 'bg-primary-600 border-primary-600 text-white shadow-sm'
                      : isActive
                      ? 'bg-white border-primary-600 text-primary-600 ring-4 ring-primary-100'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span
                  className={`text-xs font-medium text-center max-w-[80px] ${
                    isDone || isActive ? 'text-gray-900' : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Vertical tracker — mobile only */}
      <div className="sm:hidden space-y-0">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isDone = index < activeIndex;
          const isActive = index === activeIndex;
          const isLast = index === STEPS.length - 1;
          return (
            <div key={step.key} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                    isDone
                      ? 'bg-primary-600 border-primary-600 text-white'
                      : isActive
                      ? 'bg-white border-primary-600 text-primary-600 ring-4 ring-primary-100'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                {!isLast && (
                  <div
                    className={`w-0.5 flex-1 my-1 min-h-[22px] ${
                      isDone ? 'bg-primary-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
              <div className={`pt-1.5 pb-4 ${isLast ? 'pb-0' : ''}`}>
                <p className={`text-sm font-medium ${isDone || isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                  {step.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* -------------------- modal shell -------------------- */

const Modal: React.FC<{ open: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({
  open,
  onClose,
  title,
  children,
}) => {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm animate-in fade-in"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full sm:max-w-lg bg-white sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-4 sm:zoom-in-95">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4 flex-1">{children}</div>
      </div>
    </div>
  );
};

/* -------------------- main -------------------- */

const OrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [returnReason, setReturnReason] = useState('');
  const [returnDescription, setReturnDescription] = useState('');
  const [returnImages, setReturnImages] = useState<File[]>([]);
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [trackingCopied, setTrackingCopied] = useState(false);

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
      setCancelModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['user-orders'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || 'Failed to cancel order');
    },
  });

  const itemKeys = useMemo(() => {
    if (!data?.items) return [] as string[];
    return data.items.map((item, index) => {
      const sku = item.variant?.sku || '';
      const color = item.variant?.color || '';
      const size = item.variant?.size || '';
      return `${item.product?._id}-${sku}-${color}-${size}-${index}`;
    });
  }, [data?.items]);

  const allItemsReturnCompleted = useMemo(() => {
    if (!data?.items?.length) return false;

    const orderedQtyByKey = new Map<string, number>();
    data.items.forEach((item) => {
      const key = buildItemKey(item);
      orderedQtyByKey.set(key, (orderedQtyByKey.get(key) || 0) + Number(item.quantity || 0));
    });

    const completedQtyByKey = new Map<string, number>();
    (data.returnRequests || [])
      .filter((request) => request.status === 'completed')
      .forEach((request) => {
        (request.items || []).forEach((item) => {
          const key = buildItemKey(item);
          completedQtyByKey.set(key, (completedQtyByKey.get(key) || 0) + Number(item.quantity || 0));
        });
      });

    return Array.from(orderedQtyByKey.entries()).every(
      ([key, orderedQty]) => (completedQtyByKey.get(key) || 0) >= orderedQty
    );
  }, [data?.items, data?.returnRequests]);

  // Initialize return form whenever modal opens
  useEffect(() => {
    if (!returnModalOpen || !data?.items?.length) return;
    const nextSelected: Record<string, boolean> = {};
    const nextQty: Record<string, number> = {};
    data.items.forEach((item, index) => {
      const key = itemKeys[index];
      nextSelected[key] = true;
      nextQty[key] = item.quantity;
    });
    setSelectedItems(nextSelected);
    setSelectedQuantities(nextQty);
    setReturnReason('');
    setReturnDescription('');
    setReturnImages([]);
  }, [returnModalOpen, data?.items, itemKeys]);

  const returnMutation = useMutation({
    mutationFn: async () => {
      if (!id || !data) throw new Error('Order not found');
      const payloadItems = data.items
        .map((item, index) => ({ item, key: itemKeys[index] }))
        .filter(({ key }) => selectedItems[key])
        .map(({ item, key }) => ({
          product: item.product._id,
          quantity: Math.max(1, Math.min(item.quantity, Number(selectedQuantities[key] || 1))),
          variant: item.variant,
        }));

      if (payloadItems.length === 0) {
        throw new Error('Please select at least one item to return');
      }

      let imageUrls: string[] = [];
      if (returnImages.length > 0) {
        const formData = new FormData();
        returnImages.forEach((file) => formData.append('images', file));
        const uploadRes = await api.post('/api/uploads/returns', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        imageUrls = uploadRes?.data?.data?.urls || [];
      }

      const response = await api.post(`/api/orders/${id}/return-request`, {
        reason: returnReason,
        description: returnDescription,
        images: imageUrls,
        items: payloadItems,
      });

      return response.data;
    },
    onSuccess: () => {
      toast.success('Return request submitted successfully');
      setReturnModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['user-orders'] });
    },
    onError: (err: { message?: string; response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to submit return request');
    },
  });

  const copyTracking = async (val: string) => {
    try {
      await navigator.clipboard.writeText(val);
      setTrackingCopied(true);
      toast.success('Tracking number copied');
      setTimeout(() => setTrackingCopied(false), 1600);
    } catch {
      toast.error('Failed to copy');
    }
  };

  /* -------------------- loading/error -------------------- */

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <SkeletonDetail />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="container mx-auto px-4 py-20 text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Order not found</h2>
        <p className="text-gray-500 mt-1 text-sm">We couldn&apos;t find the order you&apos;re looking for.</p>
        <Link
          to="/dashboard"
          className="inline-flex mt-5 items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const order = data;
  const canCancel = ['pending', 'processing'].includes(order.status);
  const canRequestReturn = order.status === 'delivered' && !allItemsReturnCompleted;
  const hasPendingReturn = (order.returnRequests || []).some((r) => r.status === 'requested');
  const addr = order.shippingAddress;
  const totalItems = order.items.reduce((s, i) => s + i.quantity, 0);

  /* -------------------- render -------------------- */

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8 max-w-5xl">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                Order #{order.orderNumber}
              </h1>
              <span
                className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${getStatusColor(
                  order.status
                )}`}
              >
                {order.status}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Placed on {formatDate(order.createdAt)} · {totalItems} item{totalItems !== 1 ? 's' : ''} ·{' '}
              {formatCurrency(order.total)}
            </p>
          </div>
        </div>
      </div>

      {/* Tracker */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 mb-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900">Order Status</h2>
          {order.trackingNumber && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-gray-500">
              <Truck className="w-3.5 h-3.5" /> Trackable
            </span>
          )}
        </div>

        <OrderTracker status={order.status} />

        {/* Timeline pills */}
        {(order.shippedAt || order.deliveredAt || order.cancelledAt) && (
          <div className="mt-6 pt-5 border-t border-gray-100 flex flex-wrap gap-2 text-xs">
            {order.shippedAt && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 text-gray-600">
                <Truck className="w-3 h-3" />
                Shipped {formatDate(order.shippedAt)}
              </span>
            )}
            {order.deliveredAt && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
                <CheckCircle className="w-3 h-3" />
                Delivered {formatDate(order.deliveredAt)}
              </span>
            )}
            {order.cancelledAt && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700">
                <XCircle className="w-3 h-3" />
                Cancelled {formatDate(order.cancelledAt)}
              </span>
            )}
          </div>
        )}

        {/* Tracking number */}
        {order.trackingNumber && (
          <div className="mt-4 flex items-center justify-between gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
            <div className="flex items-center gap-2 min-w-0">
              <Truck className="w-4 h-4 text-blue-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-blue-700/70 font-semibold">Tracking</p>
                <p className="font-mono text-sm font-semibold text-blue-900 truncate">{order.trackingNumber}</p>
              </div>
            </div>
            <button
              onClick={() => copyTracking(order.trackingNumber!)}
              className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-white text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
            >
              {trackingCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {trackingCopied ? 'Copied' : 'Copy'}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Items */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Items Ordered</h2>
              <span className="text-xs text-gray-500">{totalItems} item{totalItems !== 1 ? 's' : ''}</span>
            </div>
            <div className="divide-y divide-gray-100">
              {order.items.map((item) => {
                const img = item.product?.images?.[0];
                return (
                  <div key={item._id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                    <Link
                      to={`/products/${item.product?._id}`}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-gray-100 shrink-0 ring-1 ring-gray-100"
                    >
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
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/products/${item.product?._id}`}
                        className="font-medium text-gray-900 hover:text-primary-600 line-clamp-2 transition-colors"
                      >
                        {item.product?.name}
                      </Link>
                      {item.vendor && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          by {item.vendor.businessName || item.vendor.fullName}
                        </p>
                      )}
                      {item.variant && (item.variant.color || item.variant.size) && (
                        <div className="flex gap-1.5 mt-1.5 flex-wrap">
                          {item.variant.color && (
                            <span className="inline-flex px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-xs">
                              {item.variant.color}
                            </span>
                          )}
                          {item.variant.size && (
                            <span className="inline-flex px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-xs">
                              Size {item.variant.size}
                            </span>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-1.5">
                        {item.quantity} × {formatCurrency(item.price)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-2">Order Notes</h2>
              <p className="text-gray-600 text-sm leading-relaxed">{order.notes}</p>
            </div>
          )}

          {/* Return Requests history */}
          {!!order.returnRequests?.length && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Return Requests</h2>
              <div className="space-y-3">
                {order.returnRequests.map((request) => (
                  <div key={request._id} className="border border-gray-100 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 text-sm">{request.reason}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Requested {formatDate(request.requestedAt)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 px-2 py-0.5 rounded-full text-xs capitalize font-medium ${
                          request.status === 'approved' || request.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700'
                            : request.status === 'rejected'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {request.status}
                      </span>
                    </div>
                    {request.description && (
                      <p className="mt-2 text-sm text-gray-700">{request.description}</p>
                    )}
                    {!!request.images?.length && (
                      <div className="flex gap-2 flex-wrap mt-3">
                        {request.images.map((url, idx) => (
                          <a
                            key={`${request._id}-${idx}`}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 ring-1 ring-gray-200 hover:ring-primary-300 transition-all"
                          >
                            <img src={url} alt={`Return ${idx + 1}`} className="w-full h-full object-cover" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Price summary */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Price Summary</h2>
            <div className="space-y-2.5 text-sm">
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
                <span>{order.shippingCost === 0 ? 'Free' : formatCurrency(order.shippingCost)}</span>
              </div>
              <div className="border-t border-gray-100 pt-3 mt-3 flex justify-between items-baseline">
                <span className="text-sm font-semibold text-gray-900">Total</span>
                <span className="text-lg font-bold text-gray-900">{formatCurrency(order.total)}</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-sm text-gray-600">
              <CreditCard className="w-4 h-4 shrink-0 text-gray-400" />
              <span className="capitalize">{order.paymentMethod?.replace(/_/g, ' ')}</span>
            </div>
          </div>

          {/* Shipping address */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              Shipping Address
            </h2>
            <div className="text-sm text-gray-600 space-y-1 leading-relaxed">
              {addr.fullName && <p className="font-semibold text-gray-900">{addr.fullName}</p>}
              {addr.phone && <p>{addr.phone}</p>}
              {(addr.street || addr.address) && <p>{addr.street || addr.address}</p>}
              {(addr.city || addr.state) && <p>{[addr.city, addr.state].filter(Boolean).join(', ')}</p>}
              {addr.zipCode && <p>{addr.zipCode}</p>}
              {addr.country && <p>{addr.country}</p>}
            </div>
          </div>

          {/* Actions */}
          {(canCancel || canRequestReturn) && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-3">Actions</h2>
              <div className="space-y-2">
                {canRequestReturn && (
                  <>
                    {hasPendingReturn ? (
                      <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-amber-700">A return request is already pending review.</p>
                      </div>
                    ) : (
                      <button
                        onClick={() => setReturnModalOpen(true)}
                        className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Request Return
                      </button>
                    )}
                  </>
                )}
                {canCancel && (
                  <button
                    onClick={() => setCancelModalOpen(true)}
                    className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg py-2.5 text-sm font-medium transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    Cancel Order
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cancel confirmation modal */}
      <Modal open={cancelModalOpen} onClose={() => setCancelModalOpen(false)} title="Cancel order?">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-700">
                Are you sure you want to cancel <span className="font-semibold">order #{order.orderNumber}</span>?
                This action can&apos;t be undone.
              </p>
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button
              onClick={() => setCancelModalOpen(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Keep Order
            </button>
            <button
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 inline-flex items-center gap-2"
            >
              {cancelMutation.isPending && <RefreshCw className="w-4 h-4 animate-spin" />}
              Yes, Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Return request modal */}
      <Modal open={returnModalOpen} onClose={() => setReturnModalOpen(false)} title="Request a return">
        <div className="space-y-5">
          {/* Items */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Select items to return</label>
            <div className="space-y-1 border border-gray-200 rounded-xl p-1.5 max-h-56 overflow-y-auto">
              {order.items.map((item, index) => {
                const key = itemKeys[index];
                const checked = !!selectedItems[key];
                const img = item.product?.images?.[0];
                return (
                  <label
                    key={key}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      checked ? 'bg-primary-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setSelectedItems((prev) => ({ ...prev, [key]: e.target.checked }))
                      }
                      className="rounded text-primary-600 focus:ring-primary-500"
                    />
                    <div className="w-10 h-10 rounded-md overflow-hidden bg-gray-100 shrink-0">
                      {img ? (
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.product.name}</p>
                      <p className="text-xs text-gray-500">Ordered: {item.quantity}</p>
                    </div>
                    <input
                      type="number"
                      min={1}
                      max={item.quantity}
                      value={selectedQuantities[key] || item.quantity}
                      onChange={(e) => {
                        const next = Number(e.target.value || 1);
                        setSelectedQuantities((prev) => ({
                          ...prev,
                          [key]: Math.max(1, Math.min(item.quantity, next)),
                        }));
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-14 border border-gray-200 rounded-md px-2 py-1 text-xs text-center disabled:bg-gray-50 disabled:text-gray-400"
                      disabled={!checked}
                    />
                  </label>
                );
              })}
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Reason <span className="text-red-500">*</span>
            </label>
            <select
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
            >
              <option value="">Select a reason</option>
              {RETURN_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Additional details</label>
            <textarea
              value={returnDescription}
              onChange={(e) => setReturnDescription(e.target.value)}
              placeholder="Tell us more (optional)..."
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 resize-none"
            />
          </div>

          {/* Images */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Photos (optional)</label>
            <label className="flex flex-col items-center justify-center gap-1.5 w-full border-2 border-dashed border-gray-200 rounded-xl py-6 cursor-pointer hover:border-primary-400 hover:bg-primary-50/40 transition-colors">
              <ImageIcon className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-600">
                {returnImages.length > 0
                  ? `${returnImages.length} image${returnImages.length > 1 ? 's' : ''} selected`
                  : 'Click to upload photos'}
              </span>
              <span className="text-xs text-gray-400">Up to 5 images</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []).slice(0, 5);
                  setReturnImages(files);
                }}
                className="hidden"
              />
            </label>
            {returnImages.length > 0 && (
              <div className="flex gap-2 flex-wrap mt-3">
                {returnImages.map((file, idx) => (
                  <div
                    key={idx}
                    className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-100 ring-1 ring-gray-200"
                  >
                    <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() =>
                        setReturnImages((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-gray-900/70 text-white flex items-center justify-center"
                      type="button"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
            <button
              onClick={() => setReturnModalOpen(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => returnMutation.mutate()}
              disabled={returnMutation.isPending || !returnReason.trim()}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 inline-flex items-center gap-2"
            >
              {returnMutation.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Submit Request
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

/* -------------------- skeleton -------------------- */

const SkeletonDetail: React.FC = () => (
  <div className="space-y-5 animate-pulse">
    <div className="h-4 w-20 bg-gray-200 rounded" />
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
      <div className="h-6 w-1/3 bg-gray-200 rounded" />
      <div className="h-3 w-1/2 bg-gray-100 rounded" />
    </div>
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="h-4 w-24 bg-gray-200 rounded mb-6" />
      <div className="flex justify-between">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gray-200" />
            <div className="h-2 w-12 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="w-16 h-16 bg-gray-200 rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 h-40" />
        <div className="bg-white rounded-2xl border border-gray-200 p-6 h-32" />
      </div>
    </div>
  </div>
);

export default OrderDetail;
