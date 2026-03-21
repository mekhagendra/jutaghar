import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';
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
const UserOrders = lazy(() => import('@/pages/user/Orders'));
const UserWishlist = lazy(() => import('@/pages/user/Wishlist'));
const UserProfile = lazy(() => import('@/pages/user/Profile'));

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
const VendorTaxSettings = lazy(() => import('@/pages/vendor/TaxSettings'));
const VendorOrders = lazy(() => import('@/pages/vendor/Orders'));

// Layout
import MainLayout from '@/layouts/MainLayout';
import DashboardLayout from '@/layouts/dashboard';


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

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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



          </Route>

          {/* Admin routes */}
          <Route
            element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<ManageUsers />} />
            <Route path="/admin/categories" element={<ManageCategories />} />
            <Route path="/admin/brands" element={<ManageBrands />} />
            <Route path="/admin/products" element={<AdminManageProducts />} />
            <Route path="/admin/hero-slides" element={<ManageHeroSlides />} />
            <Route path="/admin/delivery-settings" element={<AdminDeliverySettings />} />
          </Route>

          {/* Vendor routes */}
          <Route
            element={
              <ProtectedRoute allowedRoles={['manufacturer', 'importer', 'seller', 'outlet', 'admin', 'manager']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/vendor/dashboard" element={<VendorDashboard />} />
            <Route path="/vendor/orders" element={<VendorOrders />} />
            <Route path="/products/new" element={<NewProduct />} />
            <Route path="/products/manage" element={<ManageProducts />} />
            <Route path="/products/:id/edit" element={<EditProduct />} />
            <Route path="/inventory/manage" element={<ManageInventory />} />
            <Route path="/vendor/tax" element={<VendorTaxSettings />} />
          </Route>

          {/* Customer / User routes */}
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<UserDashboard />} />
            <Route path="/user/dashboard" element={<UserDashboard />} />
            <Route path="/user/orders" element={<UserOrders />} />
            <Route path="/user/wishlist" element={<UserWishlist />} />
            <Route path="/user/profile" element={<UserProfile />} />
            <Route path="/orders/:id" element={<OrderDetail />} />
          </Route>
        </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
