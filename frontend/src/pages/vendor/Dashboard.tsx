import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Package, DollarSign, ShoppingCart, TrendingUp } from 'lucide-react';

const VendorDashboard: React.FC = () => {
  const { data: stats } = useQuery({
    queryKey: ['vendor-stats'],
    queryFn: async () => {
      const response = await api.get('/api/vendors/stats');
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: ordersData } = useQuery({
    queryKey: ['vendor-orders'],
    queryFn: async () => {
      const response = await api.get('/api/vendors/orders');
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const orders = ordersData?.orders || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Vendor Dashboard</h1>
        <p className="text-gray-600 mt-2">Manage your products and orders</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Products</p>
              <p className="text-3xl font-bold mt-1">{stats?.products.total || 0}</p>
            </div>
            <Package className="w-12 h-12 text-blue-600 opacity-20" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Active Products</p>
              <p className="text-3xl font-bold mt-1">{stats?.products.active || 0}</p>
            </div>
            <TrendingUp className="w-12 h-12 text-green-600 opacity-20" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Orders</p>
              <p className="text-3xl font-bold mt-1">{stats?.orders.total || 0}</p>
            </div>
            <ShoppingCart className="w-12 h-12 text-purple-600 opacity-20" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Revenue</p>
              <p className="text-3xl font-bold mt-1">{formatCurrency(stats?.revenue.total || 0)}</p>
            </div>
            <DollarSign className="w-12 h-12 text-green-600 opacity-20" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link to="/products/new" className="card hover:shadow-lg transition text-center py-8">
          <Package className="w-12 h-12 text-primary-600 mx-auto mb-3" />
          <h3 className="text-xl font-semibold">Add New Product</h3>
          <p className="text-gray-600 mt-2">List a new product for sale</p>
        </Link>
        <Link to="/products/manage" className="card hover:shadow-lg transition text-center py-8">
          <ShoppingCart className="w-12 h-12 text-primary-600 mx-auto mb-3" />
          <h3 className="text-xl font-semibold">Manage Products</h3>
          <p className="text-gray-600 mt-2">Update your product listings</p>
        </Link>
        <Link to="/inventory/manage" className="card hover:shadow-lg transition text-center py-8">
          <Package className="w-12 h-12 text-blue-600 mx-auto mb-3" />
          <h3 className="text-xl font-semibold">Manage Inventory</h3>
          <p className="text-gray-600 mt-2">Add color, size & stock variants</p>
        </Link>
      </div>

      {/* Recent Orders */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Recent Orders</h2>
        {orders.length === 0 ? (
          <div className="text-center py-8 text-gray-600">
            No orders yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Order #</th>
                  <th className="text-left py-3 px-4">Customer</th>
                  <th className="text-left py-3 px-4">Items</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 5).map((order: { _id: string; orderNumber: string; user?: { fullName: string }; items?: unknown[]; status: string; total: number }) => (
                  <tr key={order._id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{order.orderNumber}</td>
                    <td className="py-3 px-4">{order.user?.fullName}</td>
                    <td className="py-3 px-4">{order.items?.length} items</td>
                    <td className="py-3 px-4">
                      <span className="badge bg-blue-100 text-blue-800">{order.status}</span>
                    </td>
                    <td className="py-3 px-4">{formatCurrency(order.total ?? 0)}</td>
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

export default VendorDashboard;
