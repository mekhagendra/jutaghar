import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';

// Pages
const Home = lazy(() => import('@/pages/Home'));
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const Products = lazy(() => import('@/pages/Products'));
const ProductDetail = lazy(() => import('@/pages/ProductDetail'));
const Cart = lazy(() => import('@/pages/Cart'));
const Checkout = lazy(() => import('@/pages/Checkout'));
const Outlets = lazy(() => import('@/pages/Outlets'));

// Payment callback pages
const EsewaSuccess = lazy(() => import('@/pages/payment/EsewaSuccess'));
const EsewaFailure = lazy(() => import('@/pages/payment/EsewaFailure'));
const KhaltiCallback = lazy(() => import('@/pages/payment/KhaltiCallback'));

// Dashboard pages
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'));
const VendorDashboard = lazy(() => import('@/pages/vendor/Dashboard'));
const UserDashboard = lazy(() => import('@/pages/user/Dashboard'));
const OrderDetail = lazy(() => import('@/pages/user/OrderDetail'));

// Admin pages
const ManageCategories = lazy(() => import('@/pages/admin/ManageCategories'));
const ManageBrands = lazy(() => import('@/pages/admin/ManageBrands'));
const AdminManageProducts = lazy(() => import('@/pages/admin/ManageProducts'));
const ManageUsers = lazy(() => import('@/pages/admin/ManageUsers'));
const ManageHeroSlides = lazy(() => import('@/pages/admin/ManageHeroSlides'));
const AdminDeliverySettings = lazy(() => import('@/pages/admin/DeliverySettings'));

// Vendor pages
const NewProduct = lazy(() => import('@/pages/vendor/NewProduct'));
const EditProduct = lazy(() => import('@/pages/vendor/EditProduct'));
const ManageProducts = lazy(() => import('@/pages/vendor/ManageProducts'));
const ManageInventory = lazy(() => import('@/pages/vendor/ManageInventory'));

// Layout
import MainLayout from '@/layouts/MainLayout';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// Wrapper to force Products re-render on URL change
const ProductsWrapper: React.FC = () => {
  const location = useLocation();
  
  // Scroll to top when URL changes
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.search]);
  
  return <Products key={location.search} />;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900" /></div>}>
        <Routes>
          <Route element={<MainLayout />}>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/products" element={<ProductsWrapper />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/outlets" element={<Outlets />} />
            
            {/* Payment callback routes */}
            <Route path="/payment/esewa/success" element={<EsewaSuccess />} />
            <Route path="/payment/esewa/failure" element={<EsewaFailure />} />
            <Route path="/payment/khalti/callback" element={<KhaltiCallback />} />
            
            {/* Protected routes */}
            <Route
              path="/cart"
              element={
                <ProtectedRoute>
                  <Cart />
                </ProtectedRoute>
              }
            />
            <Route
              path="/checkout"
              element={
                <ProtectedRoute>
                  <Checkout />
                </ProtectedRoute>
              }
            />

            {/* Admin routes */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                  <ManageUsers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/categories"
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                  <ManageCategories />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/brands"
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                  <ManageBrands />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/products"
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                  <AdminManageProducts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/hero-slides"
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                  <ManageHeroSlides />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/delivery-settings"
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                  <AdminDeliverySettings />
                </ProtectedRoute>
              }
            />

            {/* Vendor routes */}
            <Route
              path="/vendor/dashboard"
              element={
                <ProtectedRoute allowedRoles={['manufacturer', 'importer', 'seller', 'outlet', 'admin', 'manager']}>
                  <VendorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/products/new"
              element={
                <ProtectedRoute allowedRoles={['manufacturer', 'importer', 'seller', 'outlet', 'admin', 'manager']}>
                  <NewProduct />
                </ProtectedRoute>
              }
            />
            <Route
              path="/products/manage"
              element={
                <ProtectedRoute allowedRoles={['manufacturer', 'importer', 'seller', 'outlet', 'admin', 'manager']}>
                  <ManageProducts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/products/:id/edit"
              element={
                <ProtectedRoute allowedRoles={['manufacturer', 'importer', 'seller', 'outlet', 'admin', 'manager']}>
                  <EditProduct />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/manage"
              element={
                <ProtectedRoute allowedRoles={['manufacturer', 'importer', 'seller', 'outlet', 'admin', 'manager']}>
                  <ManageInventory />
                </ProtectedRoute>
              }
            />

            {/* User routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <UserDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/user/dashboard"
              element={
                <ProtectedRoute>
                  <UserDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders/:id"
              element={
                <ProtectedRoute>
                  <OrderDetail />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
