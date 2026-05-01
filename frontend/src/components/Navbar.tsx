import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ShoppingCart, User, ChevronDown, Package, Heart, Trash2, Search } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useCartStore } from '@/stores/cartStore';
import { useWishlistStore } from '@/stores/wishlistStore';
import api from '@/lib/api';
import { useLocation, useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/lib/utils';
import { getAccountActions } from '@/lib/accountActions';
import logo from '@/assets/logo.png';
import { toast } from 'react-hot-toast';
import {
  ACCOUNT_DROPDOWN_DANGER_ITEM_CLASS,
  ACCOUNT_DROPDOWN_ITEM_CLASS,
} from '@/lib/accountDropdownStyles';

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
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openMobileDropdown, setOpenMobileDropdown] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [menCategories, setMenCategories] = useState<Category[]>([]);
  const [womenCategories, setWomenCategories] = useState<Category[]>([]);
  const [kidsCategories, setKidsCategories] = useState<Category[]>([]);
  const { user, isAuthenticated, logout } = useAuthStore();
  const { getTotalItems, addItem: addToCart } = useCartStore();
  const { items: wishlistItems, removeItem: removeFromWishlist, getTotalItems: getWishlistCount } = useWishlistStore();

  const isStaffRole = isAuthenticated && (user?.role === 'admin' || user?.role === 'seller' || user?.role === 'manager');

  // Wishlist drawer state
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [selectedWishlistIds, setSelectedWishlistIds] = useState<Set<string>>(new Set());

  const accountMenuRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLFormElement>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setOpenMobileDropdown(null);
    setWishlistOpen(false);
    setAccountMenuOpen(false);
  }, [location.pathname, location.search]);

  // Ensure mobile search input does not retain stale browser-restored values.
  useEffect(() => {
    setSearchQuery('');
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAccountMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    const handleOutsideSearchClick = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (mobileSearchRef.current && !mobileSearchRef.current.contains(target)) {
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleOutsideSearchClick);
    document.addEventListener('touchstart', handleOutsideSearchClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideSearchClick);
      document.removeEventListener('touchstart', handleOutsideSearchClick);
    };
  }, []);

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
    const variantProducts = toAdd.filter((p) => p.variants && p.variants.length > 0);
    const simpleProducts = toAdd.filter((p) => !p.variants || p.variants.length === 0);

    if (variantProducts.length > 0) {
      toast('Some items require size/color selection. Open product detail to add them.');
    }

    simpleProducts.forEach((p) => {
      addToCart(p, 1);
      removeFromWishlist(p._id);
    });
    setSelectedWishlistIds(new Set());
  };

  // Handle mobile navigation with scroll reset
  const handleMobileNavigation = () => {
    window.scrollTo(0, 0);
    setOpenMobileDropdown(null);
    setMobileMenuOpen(false);
  };

  const handleMobileSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    navigate(`/products?search=${encodeURIComponent(q)}`);
    setMobileMenuOpen(false);
  };

  // Fetch categories with inventory
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        // Fetch categories for each gender with inventory
        const [allRes, menRes, womenRes, kidsRes] = await Promise.all([
          api.get('/api/catalog/categories?withInventory=true'),
          api.get('/api/catalog/categories?withInventory=true&gender=men'),
          api.get('/api/catalog/categories?withInventory=true&gender=women'),
          api.get('/api/catalog/categories?withInventory=true&gender=kids'),
        ]);

        // Extract categories that have productCount > 0
        const allCats = (allRes.data.data || []).filter((cat: Category) => cat.productCount && cat.productCount > 0);
        const menCats = (menRes.data.data || []).filter((cat: Category) => cat.productCount && cat.productCount > 0);
        const womenCats = (womenRes.data.data || []).filter((cat: Category) => cat.productCount && cat.productCount > 0);
        const kidsCats = (kidsRes.data.data || []).filter((cat: Category) => cat.productCount && cat.productCount > 0);

        setAllCategories(allCats);
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
            path: `/products?gender=${gender}&category=${cat.name}`
          });
        });
      }
      
      return items;
    };

    return [
      {
        label: 'Products',
        path: '/products',
        submenu: [
          { label: 'All Products', path: '/products' },
          ...allCategories.map(cat => ({
            label: cat.name,
            path: `/products?category=${cat.name}`
          })),
        ],
      },
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
      { label: 'Sale', path: '/sale' },
      { label: 'Outlets', path: '/outlets' },
    ];
  }, [allCategories, menCategories, womenCategories, kidsCategories]);

  const accountActions = useMemo(
    () =>
      getAccountActions({
        isAuthenticated,
        user,
        logout,
        isHomePage: location.pathname === '/',
      }),
    [isAuthenticated, location.pathname, logout, user]
  );

  return (
    <nav className="bg-white shadow-md sticky top-0 pt-[calc(env(safe-area-inset-top)+4px)] lg:pt-0 z-[90]">
      {/* Main Navbar */}
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Mobile Logo */}
          <Link to="/" onClick={() => window.scrollTo(0, 0)} className="lg:hidden flex-shrink-0">
            <img
              src={logo}
              alt="JutaGhar"
              className="h-8 w-auto object-contain hover:opacity-90 transition-opacity"
            />
          </Link>

          {/* Mobile Search (moved from Brandbar) */}
          <form ref={mobileSearchRef} onSubmit={handleMobileSearch} className="lg:hidden flex-1 min-w-0 mx-2 sm:mx-3">
            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-full overflow-hidden focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100 transition-[border-color,box-shadow]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search items..."
                autoComplete="off"
                className="flex-1 bg-transparent px-3 py-1.5 text-base text-gray-800 placeholder-gray-400 focus:outline-none min-w-0"
              />
              <button
                type="submit"
                className="flex items-center justify-center px-2.5 py-1.5 text-gray-500 hover:text-primary-600 transition-colors"
                aria-label="Search"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => (
              <div
                key={item.label}
                className="relative group"
              >
                <Link
                  to={item.path}
                  className={`px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1 ${
                    item.label === 'Sale'
                      ? 'text-red-600 hover:text-red-700 font-bold'
                      : 'text-gray-700 hover:text-primary-600'
                  }`}
                  onClick={() => window.scrollTo(0, 0)}
                >
                  {item.label}
                  {item.submenu && item.submenu.length > 0 && (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Link>

                {/* Dropdown Menu */}
                {item.submenu && item.submenu.length > 0 && (
                  <div className="absolute left-0 top-full w-56 z-[100] opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200">
                    <div className="mt-2 bg-white rounded-md shadow-lg py-2 border border-gray-100">
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
          <div className="flex items-center gap-2 sm:gap-4 ml-auto lg:ml-0">
            {/* Cart — hidden for staff roles */}
            {!isStaffRole && (
              <Link to="/cart" className="relative hover:text-primary-600 transition-colors">
                <ShoppingCart className="w-6 h-6" />
                {getTotalItems() > 0 && (
                  <span className="absolute -top-2 -right-2 bg-primary-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {getTotalItems()}
                  </span>
                )}
              </Link>
            )}

            {/* Wishlist — hidden for staff roles */}
            {!isStaffRole && (
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
            )}

            {/* User Menu */}
            {isAuthenticated ? (
              <div className="relative" ref={accountMenuRef}>
                <button
                  onClick={() => setAccountMenuOpen((prev) => !prev)}
                  className="flex items-center gap-2 hover:text-primary-600 transition-colors"
                  aria-expanded={accountMenuOpen}
                  aria-haspopup="menu"
                >
                  <User className="w-6 h-6" />
                  <span className="hidden md:block text-sm font-medium">{user?.fullName}</span>
                  <ChevronDown className={`w-4 h-4 hidden md:block transition-transform ${accountMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {accountMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-2 border border-gray-100 z-[120]">
                    {accountActions.map((action) => {
                      if (action.to) {
                        return (
                          <Link
                            key={action.label}
                            to={action.to}
                            onClick={() => setAccountMenuOpen(false)}
                            className={`block px-4 py-2 text-sm transition-colors ${action.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-primary-50 hover:text-primary-600'}`}
                          >
                            {action.label}
                          </Link>
                        );
                      }

                      return (
                        <button
                          key={action.label}
                          onClick={() => {
                            action.onClick?.();
                            setAccountMenuOpen(false);
                          }}
                          className={`w-full text-left ${
                            action.danger
                              ? ACCOUNT_DROPDOWN_DANGER_ITEM_CLASS
                              : ACCOUNT_DROPDOWN_ITEM_CLASS
                          }`}
                        >
                          {action.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors"
                >
                  Login
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
                    className={`block py-2 font-medium flex-1 ${
                      item.label === 'Sale'
                        ? 'text-red-600 hover:text-red-700 font-bold'
                        : 'text-gray-700 hover:text-primary-600'
                    }`}
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

            {isAuthenticated ? (
              <div className="pt-3 mt-2 border-t border-gray-200 space-y-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Account</p>
                {accountActions.map((action) => {
                  if (action.to) {
                    return (
                      <Link
                        key={action.label}
                        to={action.to}
                        className={`block py-2 text-sm font-medium transition-colors ${action.danger ? 'text-red-600 hover:text-red-700' : 'text-gray-700 hover:text-primary-600'}`}
                        onClick={() => handleMobileNavigation()}
                      >
                        {action.label}
                      </Link>
                    );
                  }

                  return (
                    <button
                      key={action.label}
                      onClick={() => {
                        action.onClick?.();
                        handleMobileNavigation();
                      }}
                      className={`block w-full text-left py-2 text-sm font-medium transition-colors ${action.danger ? 'text-red-600 hover:text-red-700' : 'text-gray-700 hover:text-primary-600'}`}
                    >
                      {action.label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="pt-3 mt-2 border-t border-gray-200">
                <Link
                  to="/login"
                  className="block py-2 text-sm font-medium text-gray-700 hover:text-primary-600"
                  onClick={() => handleMobileNavigation()}
                >
                  Login
                </Link>
              </div>
            )}
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
    </nav>
  );
};

export default Navbar;
