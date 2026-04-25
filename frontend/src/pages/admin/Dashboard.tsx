import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Users, Package, ShoppingCart, DollarSign, Truck, Star } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

const AdminDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const response = await api.get('/api/admin/stats');
      return response.data.data;
    },
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">Manage your e-commerce platform</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Users</p>
              <p className="text-3xl font-bold mt-1">{stats?.users.total || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Active: {stats?.users.active || 0}</p>
            </div>
            <Users className="w-12 h-12 text-blue-600 opacity-20" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Products</p>
              <p className="text-3xl font-bold mt-1">{stats?.products.total || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Active: {stats?.products.active || 0}</p>
            </div>
            <Package className="w-12 h-12 text-green-600 opacity-20" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Orders</p>
              <p className="text-3xl font-bold mt-1">{stats?.orders.total || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Pending: {stats?.orders.pending || 0}</p>
            </div>
            <ShoppingCart className="w-12 h-12 text-orange-600 opacity-20" />
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

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <Link to="/admin/users" className="card hover:shadow-lg transition text-center py-8">
          <Users className="w-12 h-12 text-primary-600 mx-auto mb-3" />
          <h3 className="text-xl font-semibold">Manage Users</h3>
        </Link>
        <Link to="/admin/products" className="card hover:shadow-lg transition text-center py-8">
          <Package className="w-12 h-12 text-primary-600 mx-auto mb-3" />
          <h3 className="text-xl font-semibold">Manage Products</h3>
        </Link>
        {isAdmin && (
          <Link to="/admin/featured-products" className="card hover:shadow-lg transition text-center py-8">
            <Star className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
            <h3 className="text-xl font-semibold">Featured Products</h3>
          </Link>
        )}
        <Link to="/admin/categories" className="card hover:shadow-lg transition text-center py-8">
          <Package className="w-12 h-12 text-primary-600 mx-auto mb-3" />
          <h3 className="text-xl font-semibold">Categories</h3>
        </Link>
        <Link to="/admin/brands" className="card hover:shadow-lg transition text-center py-8">
          <Package className="w-12 h-12 text-primary-600 mx-auto mb-3" />
          <h3 className="text-xl font-semibold">Brands</h3>
        </Link>
        <Link to="/admin/hero-slides" className="card hover:shadow-lg transition text-center py-8">
          <Package className="w-12 h-12 text-primary-600 mx-auto mb-3" />
          <h3 className="text-xl font-semibold">Hero Slides</h3>
        </Link>
        <Link to="/admin/delivery-settings" className="card hover:shadow-lg transition text-center py-8">
          <Truck className="w-12 h-12 text-primary-600 mx-auto mb-3" />
          <h3 className="text-xl font-semibold">Delivery Settings</h3>
        </Link>
      </div>
    </div>
  );
};

export default AdminDashboard;
