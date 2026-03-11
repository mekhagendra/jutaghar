import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ShoppingCart, User, ChevronDown, Search, Package, Truck, CheckCircle, Clock, XCircle, Heart, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useCartStore } from '@/stores/cartStore';
import { useWishlistStore } from '@/stores/wishlistStore';
import api from '@/lib/api';
import logo from '@/assets/logo1.png';
import { useLocation } from 'react-router-dom';
import { formatCurrency } from '@/lib/utils';

interface TrackResult {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string;
  shippedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  trackingNumber?: string;
  itemCount: number;
  shippingCity?: string;
  shippingCountry?: string;
}

interface NavItem {
  label: string;
  path: string;
  submenu?: { label: string; path: string }[];
}

interface Category {
  _id: string;
  name: string;
  slug: string;
  productCount?: number;
}

const Navbar: React.FC = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openMobileDropdown, setOpenMobileDropdown] = useState<string | null>(null);
  const [menCategories, setMenCategories] = useState<Category[]>([]);
  const [womenCategories, setWomenCategories] = useState<Category[]>([]);
  const [kidsCategories, setKidsCategories] = useState<Category[]>([]);
  const { user, isAuthenticated, logout } = useAuthStore();
  const { getTotalItems, addItem: addToCart } = useCartStore();
  const { items: wishlistItems, removeItem: removeFromWishlist, getTotalItems: getWishlistCount } = useWishlistStore();

  // Wishlist drawer state
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [selectedWishlistIds, setSelectedWishlistIds] = useState<Set<string>>(new Set());

  // Track order modal state
  const [trackModalOpen, setTrackModalOpen] = useState(false);
  const [trackInput, setTrackInput] = useState('');
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackResult, setTrackResult] = useState<TrackResult | null>(null);
  const [trackError, setTrackError] = useState('');
  const trackInputRef = useRef<HTMLInputElement>(null);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setOpenMobileDropdown(null);
    setWishlistOpen(false);
  }, [location.pathname, location.search]);

  // Reset selection when drawer opens/closes
  useEffect(() => {
    setSelectedWishlistIds(new Set());
  }, [wishlistOpen]);

  const inStockWishlistItems = wishlistItems.filter((p) => p.stock > 0);
  const allInStockSelected =
    inStockWishlistItems.length > 0 &&
    inStockWishlistItems.every((p) => selectedWishlistIds.has(p._id));

  const toggleSelectAll = () => {
    if (allInStockSelected) {
      setSelectedWishlistIds(new Set());
    } else {
      setSelectedWishlistIds(new Set(inStockWishlistItems.map((p) => p._id)));
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedWishlistIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddSelectedToCart = () => {
    const toAdd = wishlistItems.filter((p) => selectedWishlistIds.has(p._id) && p.stock > 0);
    toAdd.forEach((p) => {
      addToCart(p, 1);
      removeFromWishlist(p._id);
    });
    setSelectedWishlistIds(new Set());
  };

  // Focus input when track modal opens
  useEffect(() => {
    if (trackModalOpen) {
      setTimeout(() => trackInputRef.current?.focus(), 50);
    } else {
      setTrackInput('');
      setTrackResult(null);
      setTrackError('');
    }
  }, [trackModalOpen]);

  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = trackInput.trim();
    if (!num) return;
    setTrackLoading(true);
    setTrackResult(null);
    setTrackError('');
    try {
      const res = await api.get(`/api/orders/track/${encodeURIComponent(num)}`);
      setTrackResult(res.data.data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setTrackError(e.response?.data?.message || 'Order not found. Please check the order number.');
    } finally {
      setTrackLoading(false);
    }
  };

  // Handle mobile navigation with scroll reset
  const handleMobileNavigation = () => {
    window.scrollTo(0, 0);
    setOpenMobileDropdown(null);
    setMobileMenuOpen(false);
  };

  // Fetch categories with inventory
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        // Fetch categories for each gender with inventory
        const [menRes, womenRes, kidsRes] = await Promise.all([
          api.get('/api/catalog/categories?withInventory=true&gender=men'),
          api.get('/api/catalog/categories?withInventory=true&gender=women'),
          api.get('/api/catalog/categories?withInventory=true&gender=kids'),
        ]);

        // Extract categories that have productCount > 0
        const menCats = (menRes.data.data || []).filter((cat: Category) => cat.productCount && cat.productCount > 0);
        const womenCats = (womenRes.data.data || []).filter((cat: Category) => cat.productCount && cat.productCount > 0);
        const kidsCats = (kidsRes.data.data || []).filter((cat: Category) => cat.productCount && cat.productCount > 0);

        console.log('📦 Categories with inventory loaded:', {
          men: menCats.length,
          women: womenCats.length,
          kids: kidsCats.length
        });

        setMenCategories(menCats);
        setWomenCategories(womenCats);
        setKidsCategories(kidsCats);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };

    fetchCategories();
  }, []);

  const navItems: NavItem[] = useMemo(() => {
    const createSubmenu = (gender: string, categories: Category[]) => {
      const items = [{ label: `All ${gender}`, path: `/products?gender=${gender}` }];
      
      // Only add categories that have inventory for this gender
      const categoriesWithInventory = categories.filter(cat => 
        cat.productCount && cat.productCount > 0
      );
      
      if (categoriesWithInventory.length > 0) {
        categoriesWithInventory.forEach(cat => {
          items.push({
            label: cat.name,
            path: `/products?gender=${gender}&category=${cat.slug}`
          });
        });
      }
      
      return items;
    };

    return [
      {
        label: 'Men',
        path: '/products?gender=Men',
        submenu: createSubmenu('Men', menCategories),
      },
      {
        label: 'Women',
        path: '/products?gender=Women',
        submenu: createSubmenu('Women', womenCategories),
      },
      {
        label: 'Kids',
        path: '/products?gender=Kids',
        submenu: createSubmenu('Kids', kidsCategories),
      },
      { label: 'New Arrival', path: '/products?sort=new' },
      { label: 'Best Seller', path: '/products?sort=popular' },
      { label: 'Outlets', path: '/outlets' },
    ];
  }, [menCategories, womenCategories, kidsCategories]);

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (['admin', 'manager'].includes(user.role)) return '/admin/dashboard';
    if (['manufacturer', 'importer', 'seller', 'outlet'].includes(user.role)) return '/vendor/dashboard';
    return '/dashboard';
  };

  const trackStatusSteps = [
    { key: 'pending', label: 'Placed', icon: Clock },
    { key: 'processing', label: 'Processing', icon: Package },
    { key: 'shipped', label: 'Shipped', icon: Truck },
    { key: 'delivered', label: 'Delivered', icon: CheckCircle },
  ] as const;
  const trackStatusOrder = ['pending', 'processing', 'shipped', 'delivered'] as const;

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      {/* Top Bar */}
      <div className="bg-gray-900 text-white text-sm">
        <div className="container mx-auto px-4 py-2 flex justify-between items-center">
          <div className="hidden md:block">
            <span>Free Shipping on Orders Over Rs. 5000</span>
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <button
              onClick={() => setTrackModalOpen(true)}
              className="hover:text-primary-400 transition-colors"
            >
              Track Order
            </button>
            <Link to="/contact" className="hover:text-primary-400 transition-colors">
              Help
            </Link>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0" onClick={() => window.scrollTo(0, 0)}>
            <img 
              src={logo} 
              alt="JutaGhar" 
              className="h-10 w-auto object-contain hover:opacity-90 transition-opacity"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => (
              <div
                key={item.label}
                className="relative group"
              >
                <Link
                  to={item.path}
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors flex items-center gap-1"
                  onClick={() => window.scrollTo(0, 0)}
                >
                  {item.label}
                  {item.submenu && item.submenu.length > 0 && (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Link>

                {/* Dropdown Menu */}
                {item.submenu && item.submenu.length > 0 && (
                  <div className="absolute left-0 top-full pt-2 w-56 z-[100]">
                    <div className="bg-white rounded-md shadow-lg py-2 border border-gray-100 opacity-0 scale-95 invisible group-hover:opacity-100 group-hover:scale-100 group-hover:visible transition-all duration-200">
                      {item.submenu.map((subItem) => (
                        <Link
                          key={subItem.label}
                          to={subItem.path}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                        >
                          {subItem.label}
                        </Link>
                      ))}  
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            {/* Cart */}
            <Link to="/cart" className="relative hover:text-primary-600 transition-colors">
              <ShoppingCart className="w-6 h-6" />
              {getTotalItems() > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {getTotalItems()}
                </span>
              )}
            </Link>

            {/* Wishlist */}
            <button
              onClick={() => setWishlistOpen(true)}
              className="relative hover:text-primary-600 transition-colors"
              aria-label="Wishlist"
            >
              <Heart className="w-6 h-6" />
              {getWishlistCount() > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {getWishlistCount()}
                </span>
              )}
            </button>

            {/* User Menu */}
            {isAuthenticated ? (
              <div className="relative group">
                <button className="flex items-center gap-2 hover:text-primary-600 transition-colors">
                  <User className="w-6 h-6" />
                  <span className="hidden md:block text-sm font-medium">{user?.fullName}</span>
                  <ChevronDown className="w-4 h-4 hidden md:block" />
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <Link
                    to={getDashboardPath()}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600"
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/orders"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600"
                  >
                    My Orders
                  </Link>
                  <Link
                    to="/profile"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600"
                  >
                    Profile
                  </Link>
                  <button
                    onClick={logout}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-md transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-200 bg-white">
          <div className="container mx-auto px-4 py-4 space-y-2">
            {navItems.map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between">
                  <Link
                    to={item.path}
                    className="block py-2 text-gray-700 hover:text-primary-600 font-medium flex-1"
                    onClick={() => handleMobileNavigation()}
                  >
                    {item.label}
                  </Link>
                  {item.submenu && item.submenu.length > 0 && (
                    <button
                      onClick={() => setOpenMobileDropdown(openMobileDropdown === item.label ? null : item.label)}
                      className="p-2 hover:bg-gray-100 rounded-md"
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform ${openMobileDropdown === item.label ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                </div>
                {item.submenu && item.submenu.length > 0 && openMobileDropdown === item.label && (
                  <div className="pl-4 space-y-1 mt-1">
                    {item.submenu.map((subItem) => (
                      <Link
                        key={subItem.label}
                        to={subItem.path}
                        className="block py-1 text-sm text-gray-600 hover:text-primary-600"
                        onClick={() => handleMobileNavigation()}
                      >
                        {subItem.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Wishlist Drawer */}
      {wishlistOpen && (
        <div className="fixed inset-0 z-[200] flex">
          {/* Backdrop */}
          <div
            className="flex-1 bg-black/40"
            onClick={() => setWishlistOpen(false)}
          />
          {/* Drawer panel */}
          <div className="w-full max-w-sm bg-white shadow-2xl flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-500" />
                <h2 className="text-lg font-bold">Wishlist</h2>
                {getWishlistCount() > 0 && (
                  <span className="text-sm text-gray-500">({getWishlistCount()} items)</span>
                )}
              </div>
              <button
                onClick={() => setWishlistOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Select-all bar */}
            {wishlistItems.length > 0 && inStockWishlistItems.length > 0 && (
              <div className="flex items-center gap-2 px-5 py-2.5 bg-gray-50 border-b">
                <input
                  id="wishlist-select-all"
                  type="checkbox"
                  checked={allInStockSelected}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 accent-primary-600 cursor-pointer"
                />
                <label htmlFor="wishlist-select-all" className="text-xs text-gray-600 cursor-pointer select-none">
                  {allInStockSelected ? 'Deselect all' : 'Select all in-stock'}
                </label>
                {selectedWishlistIds.size > 0 && (
                  <span className="ml-auto text-xs text-primary-600 font-medium">
                    {selectedWishlistIds.size} selected
                  </span>
                )}
              </div>
            )}

            {/* Items */}
            <div className="flex-1 overflow-y-auto">
              {wishlistItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 py-16">
                  <Heart className="w-14 h-14 opacity-20" />
                  <p className="text-base font-medium">Your wishlist is empty</p>
                  <Link
                    to="/products"
                    onClick={() => setWishlistOpen(false)}
                    className="text-sm text-primary-600 hover:underline"
                  >
                    Browse products
                  </Link>
                </div>
              ) : (
                <ul className="divide-y">
                  {wishlistItems.map((product) => {
                    const img = product.mainImage || product.images?.[0];
                    const isChecked = selectedWishlistIds.has(product._id);
                    const outOfStock = product.stock === 0;
                    return (
                      <li
                        key={product._id}
                        className={`flex gap-3 p-4 transition ${
                          isChecked ? 'bg-primary-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        {/* Checkbox */}
                        <div className="flex items-center shrink-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={outOfStock}
                            onChange={() => toggleSelectItem(product._id)}
                            className="w-4 h-4 accent-primary-600 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            aria-label={`Select ${product.name}`}
                          />
                        </div>

                        {/* Image */}
                        <Link
                          to={`/products/${product._id}`}
                          onClick={() => setWishlistOpen(false)}
                          className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-100"
                        >
                          {img ? (
                            <img
                              src={img}
                              alt={product.name}
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

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <Link
                            to={`/products/${product._id}`}
                            onClick={() => setWishlistOpen(false)}
                            className="text-sm font-medium line-clamp-2 hover:text-primary-600 transition-colors"
                          >
                            {product.name}
                          </Link>
                          <p className="text-sm font-bold text-gray-900 mt-1">
                            {formatCurrency(product.price)}
                          </p>
                          {outOfStock && (
                            <p className="text-xs text-red-500 mt-0.5">Out of stock</p>
                          )}
                        </div>

                        {/* Remove */}
                        <button
                          onClick={() => removeFromWishlist(product._id)}
                          className="shrink-0 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors self-start mt-0.5"
                          aria-label="Remove from wishlist"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Footer */}
            {wishlistItems.length > 0 && (
              <div className="px-5 py-4 border-t space-y-2">
                <button
                  onClick={handleAddSelectedToCart}
                  disabled={selectedWishlistIds.size === 0}
                  className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ShoppingCart className="w-4 h-4" />
                  {selectedWishlistIds.size > 0
                    ? `Add ${selectedWishlistIds.size} item${selectedWishlistIds.size > 1 ? 's' : ''} to Cart`
                    : 'Select items to add to Cart'}
                </button>
                <Link
                  to="/products"
                  onClick={() => setWishlistOpen(false)}
                  className="block w-full text-center text-sm text-gray-500 hover:text-primary-600 transition-colors py-1"
                >
                  Continue Shopping
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Track Order Modal */}
      {trackModalOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50"
          onClick={(e) => { if (e.target === e.currentTarget) setTrackModalOpen(false); }}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold">Track Your Order</h2>
              <button
                onClick={() => setTrackModalOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5">
              <form onSubmit={handleTrackOrder} className="flex gap-2">
                <input
                  ref={trackInputRef}
                  type="text"
                  value={trackInput}
                  onChange={(e) => setTrackInput(e.target.value)}
                  placeholder="Enter order number (e.g. JG2026...)"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  disabled={trackLoading}
                />
                <button
                  type="submit"
                  disabled={trackLoading || !trackInput.trim()}
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {trackLoading ? (
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  Track
                </button>
              </form>

              {/* Error */}
              {trackError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                  <XCircle className="w-4 h-4 shrink-0" />
                  {trackError}
                </div>
              )}

              {/* Result */}
              {trackResult && (
                <div className="mt-5 space-y-4">
                  {/* Status tracker */}
                  {!['cancelled', 'refunded'].includes(trackResult.status) ? (
                    <div className="relative flex items-start justify-between">
                      <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-200" aria-hidden />
                      <div
                        className="absolute top-4 left-4 h-0.5 bg-primary-600 transition-all duration-500"
                        style={{
                          width: (() => {
                            const idx = trackStatusOrder.indexOf(trackResult.status as typeof trackStatusOrder[number]);
                            return idx <= 0 ? '0%' : `${(idx / (trackStatusSteps.length - 1)) * 100}%`;
                          })(),
                        }}
                        aria-hidden
                      />
                      {trackStatusSteps.map((step, index) => {
                        const Icon = step.icon;
                        const activeIdx = trackStatusOrder.indexOf(trackResult.status as typeof trackStatusOrder[number]);
                        const isDone = index < activeIdx;
                        const isActive = index === activeIdx;
                        return (
                          <div key={step.key} className="relative flex flex-col items-center gap-1.5 z-10">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                              isDone ? 'bg-primary-600 border-primary-600 text-white'
                              : isActive ? 'bg-white border-primary-600 text-primary-600'
                              : 'bg-white border-gray-300 text-gray-400'
                            }`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <span className={`text-[10px] font-medium text-center max-w-[52px] ${
                              isDone || isActive ? 'text-primary-700' : 'text-gray-400'
                            }`}>{step.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                      <XCircle className="w-4 h-4 shrink-0" />
                      This order has been <span className="font-semibold capitalize">{trackResult.status}</span>.
                    </div>
                  )}

                  {/* Details */}
                  <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Order #</span>
                      <span className="font-semibold">{trackResult.orderNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Status</span>
                      <span className="font-medium capitalize">{trackResult.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Payment</span>
                      <span className="font-medium capitalize">{trackResult.paymentStatus}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Items</span>
                      <span className="font-medium">{trackResult.itemCount}</span>
                    </div>
                    {(trackResult.shippingCity || trackResult.shippingCountry) && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Ship to</span>
                        <span className="font-medium">{[trackResult.shippingCity, trackResult.shippingCountry].filter(Boolean).join(', ')}</span>
                      </div>
                    )}
                    {trackResult.trackingNumber && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Tracking #</span>
                        <span className="font-mono font-semibold">{trackResult.trackingNumber}</span>
                      </div>
                    )}
                    {trackResult.shippedAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Shipped</span>
                        <span>{new Date(trackResult.shippedAt).toLocaleDateString()}</span>
                      </div>
                    )}
                    {trackResult.deliveredAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Delivered</span>
                        <span>{new Date(trackResult.deliveredAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
