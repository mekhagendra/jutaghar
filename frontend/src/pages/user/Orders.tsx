import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ShoppingBag,
  Search,
  Clock,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  ListOrdered,
  ArrowRight,
  Calendar,
  Hash,
  Filter,
} from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';

interface Order {
  _id: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  total: number;
}

type StatusKey = 'all' | 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

const STATUS_OPTIONS: StatusKey[] = ['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'];

const STATUS_META: Record<Exclude<StatusKey, 'all'>, { Icon: React.ComponentType<{ className?: string }>; label: string }> = {
  pending: { Icon: Clock, label: 'Pending' },
  processing: { Icon: Package, label: 'Processing' },
  shipped: { Icon: Truck, label: 'Shipped' },
  delivered: { Icon: CheckCircle2, label: 'Delivered' },
  cancelled: { Icon: XCircle, label: 'Cancelled' },
};

const StatusPill: React.FC<{ status: string }> = ({ status }) => {
  const meta = STATUS_META[status as Exclude<StatusKey, 'all'>];
  const Icon = meta?.Icon ?? Clock;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(
        status
      )}`}
    >
      <Icon className="w-3 h-3" />
      {status}
    </span>
  );
};

const UserOrders: React.FC = () => {
  const [filter, setFilter] = useState<StatusKey>('all');
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['user-orders-full'],
    queryFn: async () => {
      const response = await api.get('/api/orders');
      return response.data.data;
    },
  });

  const allOrders: Order[] = useMemo(() => data?.orders || [], [data?.orders]);

  // Status counts for filter chip badges
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: allOrders.length };
    for (const s of STATUS_OPTIONS) if (s !== 'all') c[s] = 0;
    for (const o of allOrders) c[o.status] = (c[o.status] || 0) + 1;
    return c;
  }, [allOrders]);

  // Stats
  const stats = useMemo(() => {
    const totalSpent = allOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const active = allOrders.filter((o) => ['pending', 'processing', 'shipped'].includes(o.status)).length;
    const delivered = counts.delivered || 0;
    return {
      total: allOrders.length,
      active,
      delivered,
      totalSpent,
    };
  }, [allOrders, counts]);

  const orders = useMemo(() => {
    let list = filter === 'all' ? allOrders : allOrders.filter((o) => o.status === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((o) => o.orderNumber?.toLowerCase().includes(q));
    }
    return list;
  }, [allOrders, filter, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">My Orders</h1>
          <p className="text-gray-500 text-sm mt-1">Track and manage all your orders in one place</p>
        </div>
        <Link
          to="/products"
          className="inline-flex items-center gap-2 self-start sm:self-auto px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors shadow-sm"
        >
          Continue shopping
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Stats grid */}
      {!isLoading && allOrders.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            label="Total Orders"
            value={stats.total.toString()}
            icon={<ListOrdered className="w-5 h-5" />}
            tone="indigo"
          />
          <StatCard
            label="Active"
            value={stats.active.toString()}
            icon={<Truck className="w-5 h-5" />}
            tone="amber"
          />
          <StatCard
            label="Delivered"
            value={stats.delivered.toString()}
            icon={<CheckCircle2 className="w-5 h-5" />}
            tone="green"
          />
          <StatCard
            label="Total Spent"
            value={formatCurrency(stats.totalSpent)}
            icon={<ShoppingBag className="w-5 h-5" />}
            tone="primary"
          />
        </div>
      )}

      {/* Search + Filter row */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order number..."
            className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 placeholder:text-gray-400"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto -mx-1 px-1 pb-1 scrollbar-hide">
          <Filter className="w-4 h-4 text-gray-400 shrink-0 hidden sm:block" />
          {STATUS_OPTIONS.map((s) => {
            const active = filter === s;
            const count = counts[s] ?? 0;
            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium capitalize transition-all border ${
                  active
                    ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-primary-400 hover:text-primary-600'
                }`}
              >
                <span>{s}</span>
                <span
                  className={`text-[11px] font-semibold px-1.5 rounded-full ${
                    active ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Body states */}
      {isLoading ? (
        <SkeletonList />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : orders.length === 0 ? (
        <EmptyState
          isFiltered={filter !== 'all' || !!search.trim()}
          onClear={() => {
            setFilter('all');
            setSearch('');
          }}
        />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {orders.map((order) => (
              <Link
                key={order._id}
                to={`/orders/${order._id}`}
                className="block bg-white rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-sm transition-all p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                      <Hash className="w-3 h-3" />
                      <span className="truncate">{order.orderNumber}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5 text-gray-500 text-xs">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(order.createdAt)}</span>
                    </div>
                  </div>
                  <StatusPill status={order.status} />
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-lg font-bold text-gray-900">{formatCurrency(order.total)}</span>
                  <span className="inline-flex items-center gap-1 text-primary-600 text-sm font-medium">
                    View details
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-5 font-semibold text-gray-500 text-xs uppercase tracking-wider">
                      Order
                    </th>
                    <th className="text-left py-3 px-5 font-semibold text-gray-500 text-xs uppercase tracking-wider">
                      Date
                    </th>
                    <th className="text-left py-3 px-5 font-semibold text-gray-500 text-xs uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-right py-3 px-5 font-semibold text-gray-500 text-xs uppercase tracking-wider">
                      Total
                    </th>
                    <th className="text-right py-3 px-5 font-semibold text-gray-500 text-xs uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map((order) => (
                    <tr key={order._id} className="hover:bg-gray-50/70 transition-colors group">
                      <td className="py-4 px-5">
                        <Link
                          to={`/orders/${order._id}`}
                          className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors"
                        >
                          #{order.orderNumber}
                        </Link>
                      </td>
                      <td className="py-4 px-5 text-gray-600">{formatDate(order.createdAt)}</td>
                      <td className="py-4 px-5">
                        <StatusPill status={order.status} />
                      </td>
                      <td className="py-4 px-5 font-semibold text-gray-900 text-right">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="py-4 px-5 text-right">
                        <Link
                          to={`/orders/${order._id}`}
                          className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 font-medium"
                        >
                          View
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Footer summary */}
            <div className="flex items-center justify-between px-5 py-3 bg-gray-50/50 border-t border-gray-100 text-xs text-gray-500">
              <span>
                Showing <span className="font-semibold text-gray-700">{orders.length}</span> of{' '}
                <span className="font-semibold text-gray-700">{allOrders.length}</span> orders
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/* ---------------- helpers ---------------- */

const TONE_CLASSES: Record<string, { bg: string; text: string; ring: string }> = {
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', ring: 'ring-indigo-100' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', ring: 'ring-amber-100' },
  green: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-100' },
  primary: { bg: 'bg-primary-50', text: 'text-primary-600', ring: 'ring-primary-100' },
};

const StatCard: React.FC<{
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: keyof typeof TONE_CLASSES;
}> = ({ label, value, icon, tone }) => {
  const t = TONE_CLASSES[tone];
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${t.bg} ${t.text} ring-1 ${t.ring}`}>
          {icon}
        </span>
      </div>
      <p className="mt-2 text-xl sm:text-2xl font-bold text-gray-900 tracking-tight truncate">{value}</p>
    </div>
  );
};

const SkeletonList: React.FC = () => (
  <div className="space-y-3">
    {/* Mobile skeletons */}
    <div className="md:hidden space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
          <div className="flex justify-between gap-3">
            <div className="space-y-2 flex-1">
              <div className="h-3 bg-gray-200 rounded w-1/3" />
              <div className="h-3 bg-gray-100 rounded w-1/4" />
            </div>
            <div className="h-6 w-20 bg-gray-200 rounded-full" />
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between">
            <div className="h-5 bg-gray-200 rounded w-24" />
            <div className="h-4 bg-gray-100 rounded w-20" />
          </div>
        </div>
      ))}
    </div>
    {/* Desktop skeleton */}
    <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 h-11 border-b border-gray-200" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-gray-100 last:border-b-0 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-32" />
          <div className="h-4 bg-gray-100 rounded w-24" />
          <div className="h-6 bg-gray-200 rounded-full w-20" />
          <div className="ml-auto h-4 bg-gray-200 rounded w-20" />
          <div className="h-4 bg-gray-100 rounded w-12" />
        </div>
      ))}
    </div>
  </div>
);

const EmptyState: React.FC<{ isFiltered: boolean; onClear: () => void }> = ({ isFiltered, onClear }) => (
  <div className="bg-white rounded-xl border border-dashed border-gray-300 flex flex-col items-center justify-center py-16 sm:py-20 text-center px-6">
    <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
      <ShoppingBag className="w-7 h-7 text-gray-400" />
    </div>
    <h3 className="text-base font-semibold text-gray-900">
      {isFiltered ? 'No orders match your filters' : "You haven't placed any orders yet"}
    </h3>
    <p className="text-sm text-gray-500 mt-1 max-w-sm">
      {isFiltered
        ? 'Try adjusting your search or filter criteria to find what you are looking for.'
        : 'When you place an order, it will show up here so you can track its progress.'}
    </p>
    {isFiltered ? (
      <button
        onClick={onClear}
        className="mt-5 px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition-colors"
      >
        Clear filters
      </button>
    ) : (
      <Link
        to="/products"
        className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors"
      >
        Browse products
        <ArrowRight className="w-4 h-4" />
      </Link>
    )}
  </div>
);

const ErrorState: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <div className="bg-white rounded-xl border border-red-200 flex flex-col items-center justify-center py-16 text-center px-6">
    <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
      <XCircle className="w-7 h-7 text-red-500" />
    </div>
    <h3 className="text-base font-semibold text-gray-900">Couldn&apos;t load your orders</h3>
    <p className="text-sm text-gray-500 mt-1">Please check your connection and try again.</p>
    <button
      onClick={onRetry}
      className="mt-5 px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition-colors"
    >
      Retry
    </button>
  </div>
);

export default UserOrders;
