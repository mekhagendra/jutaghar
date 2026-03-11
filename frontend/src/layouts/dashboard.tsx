import React, { useState } from 'react';
import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Package,
  Tag,
  Bookmark,
  Image,
  Truck,
  ShoppingBag,
  Heart,
  User,
  PlusCircle,
  Boxes,
  ClipboardList,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Home,
  Receipt,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import type { UserRole } from '@/types';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
}

const adminNav: NavItem[] = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/categories', label: 'Categories', icon: Tag },
  { to: '/admin/brands', label: 'Brands', icon: Bookmark },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/hero-slides', label: 'Hero Slides', icon: Image },
  { to: '/admin/delivery-settings', label: 'Delivery Settings', icon: Truck },
];

const vendorNav: NavItem[] = [
  { to: '/vendor/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/products/new', label: 'Add Product', icon: PlusCircle, end: true },
  { to: '/products/manage', label: 'Manage Products', icon: Package, end: true },
  { to: '/inventory/manage', label: 'Manage Inventory', icon: Boxes, end: true },
  { to: '/vendor/orders', label: 'Orders', icon: ClipboardList, end: true },
  { to: '/vendor/tax', label: 'Tax Settings', icon: Receipt, end: true },
];

const customerNav: NavItem[] = [
  { to: '/user/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/user/orders', label: 'My Orders', icon: ShoppingBag, end: true },
  { to: '/user/wishlist', label: 'Wishlist', icon: Heart, end: true },
  { to: '/user/profile', label: 'Profile', icon: User, end: true },
];

type PortalType = 'admin' | 'vendor' | 'customer';

const getPortalType = (role: UserRole | undefined): PortalType => {
  if (role === 'admin' || role === 'manager') return 'admin';
  if (role === 'user' || !role) return 'customer';
  return 'vendor'; // manufacturer, importer, seller
};

interface PortalConfig {
  title: string;
  dark: boolean;
  sidebarClass: string;
  divider: string;
  avatarBg: string;
  avatarText: string;
  subText: string;
  activeLink: string;
  inactiveLink: string;
  inactiveHover: string;
  logoutHover: string;
  navItems: NavItem[];
}

const configs: Record<PortalType, PortalConfig> = {
  admin: {
    title: 'Admin Panel',
    dark: true,
    sidebarClass: 'bg-gray-900',
    divider: 'border-gray-700',
    avatarBg: 'bg-blue-700',
    avatarText: 'text-white',
    subText: 'text-gray-400',
    activeLink: 'bg-blue-600 text-white',
    inactiveLink: 'text-gray-300',
    inactiveHover: 'hover:bg-gray-700 hover:text-white',
    logoutHover: 'hover:bg-red-600 hover:text-white',
    navItems: adminNav,
  },
  vendor: {
    title: 'Vendor Panel',
    dark: true,
    sidebarClass: 'bg-gray-800',
    divider: 'border-gray-700',
    avatarBg: 'bg-green-700',
    avatarText: 'text-white',
    subText: 'text-gray-400',
    activeLink: 'bg-green-600 text-white',
    inactiveLink: 'text-gray-300',
    inactiveHover: 'hover:bg-gray-700 hover:text-white',
    logoutHover: 'hover:bg-red-600 hover:text-white',
    navItems: vendorNav,
  },
  customer: {
    title: 'My Account',
    dark: false,
    sidebarClass: 'bg-white border-r border-gray-200',
    divider: 'border-gray-100',
    avatarBg: 'bg-primary-100',
    avatarText: 'text-primary-700',
    subText: 'text-gray-500',
    activeLink: 'bg-primary-50 text-primary-700',
    inactiveLink: 'text-gray-600',
    inactiveHover: 'hover:bg-gray-100 hover:text-gray-900',
    logoutHover: 'hover:bg-red-50 hover:text-red-600',
    navItems: customerNav,
  },
};

const DashboardLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const portalType = getPortalType(user?.role);
  const cfg = configs[portalType];

  const displayName =
    portalType === 'vendor'
      ? (user?.businessName ?? user?.fullName ?? 'Vendor')
      : (user?.fullName ?? 'User');

  const displaySub =
    portalType === 'vendor'
      ? (user?.businessType ?? user?.role ?? '')
      : portalType === 'admin'
      ? (user?.role ?? '')
      : (user?.email ?? '');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Shared nav item renderer — accepts optional click handler (for drawer close)
  const renderNavItems = (onItemClick?: () => void) =>
    cfg.navItems.map(({ to, label, icon: Icon, end }) => (
      <li key={to}>
        <NavLink
          to={to}
          end={end}
          onClick={onItemClick}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive ? cfg.activeLink : `${cfg.inactiveLink} ${cfg.inactiveHover}`
            }`
          }
        >
          <Icon className="w-5 h-5 shrink-0" />
          <span>{label}</span>
          <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-40" />
        </NavLink>
      </li>
    ));

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {/* ── Mobile top navbar (hidden on md+) ─────────────────────────── */}
      <nav
        className={`md:hidden flex items-center justify-between px-4 py-3 shrink-0 ${cfg.sidebarClass} border-b ${cfg.divider}`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-full ${cfg.avatarBg} ${cfg.avatarText} flex items-center justify-center font-semibold text-sm shrink-0`}
          >
            {(user?.fullName ?? 'U').charAt(0).toUpperCase()}
          </div>
          <span
            className={`text-sm font-bold truncate ${
              cfg.dark ? 'text-white' : 'text-gray-800'
            }`}
          >
            {cfg.title}
          </span>
        </div>
        <button
          onClick={() => setMobileOpen((p) => !p)}
          className={`p-1.5 rounded-md transition-colors ${
            cfg.dark
              ? 'text-gray-300 hover:text-white hover:bg-gray-700'
              : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
          }`}
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
      </nav>

      {/* ── Mobile drawer overlay (hidden on md+) ──────────────────────── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer panel */}
          <div
            className={`relative z-10 flex flex-col w-72 max-w-[85vw] ${cfg.sidebarClass} shadow-2xl`}
          >
            {/* Drawer header */}
            <div
              className={`flex items-center justify-between px-4 py-4 border-b ${cfg.divider}`}
            >
              <span
                className={`text-base font-bold ${
                  cfg.dark ? 'text-white' : 'text-gray-800'
                }`}
              >
                {cfg.title}
              </span>
              <button
                onClick={() => setMobileOpen(false)}
                className={`p-1.5 rounded-md transition-colors ${
                  cfg.dark
                    ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                }`}
                aria-label="Close navigation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User info */}
            {user && (
              <div className={`px-4 py-3 border-b ${cfg.divider}`}>
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-full ${cfg.avatarBg} ${cfg.avatarText} flex items-center justify-center font-semibold text-sm shrink-0`}
                  >
                    {(user.fullName ?? 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-semibold truncate ${
                        cfg.dark ? 'text-white' : 'text-gray-800'
                      }`}
                    >
                      {displayName}
                    </p>
                    <p className={`text-xs capitalize truncate ${cfg.subText}`}>
                      {displaySub}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4">
              <ul className="space-y-1 px-2">
                {renderNavItems(() => setMobileOpen(false))}
              </ul>
            </nav>

            {/* Go to Store + Logout */}
            <div className={`px-2 py-4 border-t ${cfg.divider} space-y-1`}>
              <Link
                to="/"
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium ${cfg.inactiveLink} ${cfg.inactiveHover} transition-colors`}
              >
                <Home className="w-5 h-5 shrink-0" />
                <span>Go to Store</span>
              </Link>
              <button
                onClick={handleLogout}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium ${cfg.inactiveLink} ${cfg.logoutHover} transition-colors`}
              >
                <LogOut className="w-5 h-5 shrink-0" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Desktop layout (sidebar + content) ─────────────────────────── */}
      <div className="flex flex-1 min-h-0">
        {/* Desktop sidebar (hidden on mobile) */}
        <aside
          className={`hidden md:flex flex-col ${cfg.sidebarClass} transition-all duration-300 ${
            collapsed ? 'w-16' : 'w-64'
          } shrink-0`}
        >
          {/* Sidebar header */}
          <div
            className={`flex items-center justify-between px-4 py-4 border-b ${cfg.divider}`}
          >
            {!collapsed && (
              <span
                className={`text-base font-bold truncate ${
                  cfg.dark ? 'text-white' : 'text-gray-800'
                }`}
              >
                {cfg.title}
              </span>
            )}
            <button
              onClick={() => setCollapsed((p) => !p)}
              className={`p-1.5 rounded-md transition-colors ml-auto ${
                cfg.dark
                  ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
              }`}
              aria-label="Toggle sidebar"
            >
              {collapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
            </button>
          </div>

          {/* User info */}
          {!collapsed && user && (
            <div className={`px-4 py-3 border-b ${cfg.divider}`}>
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-full ${cfg.avatarBg} ${cfg.avatarText} flex items-center justify-center font-semibold text-sm shrink-0`}
                >
                  {(user.fullName ?? 'U').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p
                    className={`text-sm font-semibold truncate ${
                      cfg.dark ? 'text-white' : 'text-gray-800'
                    }`}
                  >
                    {displayName}
                  </p>
                  <p className={`text-xs capitalize truncate ${cfg.subText}`}>{displaySub}</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 py-4 overflow-y-auto">
            <ul className="space-y-1 px-2">
              {cfg.navItems.map(({ to, label, icon: Icon, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? cfg.activeLink
                          : `${cfg.inactiveLink} ${cfg.inactiveHover}`
                      } ${collapsed ? 'justify-center' : ''}`
                    }
                    title={collapsed ? label : undefined}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    {!collapsed && (
                      <>
                        <span>{label}</span>
                        <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-40" />
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          {/* Go to Store + Logout */}
          <div className={`px-2 py-4 border-t ${cfg.divider} space-y-1`}>
            <Link
              to="/"
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium ${cfg.inactiveLink} ${cfg.inactiveHover} transition-colors ${
                collapsed ? 'justify-center' : ''
              }`}
              title={collapsed ? 'Go to Store' : undefined}
            >
              <Home className="w-5 h-5 shrink-0" />
              {!collapsed && <span>Go to Store</span>}
            </Link>
            <button
              onClick={handleLogout}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium ${cfg.inactiveLink} ${cfg.logoutHover} transition-colors ${
                collapsed ? 'justify-center' : ''
              }`}
              title={collapsed ? 'Logout' : undefined}
            >
              <LogOut className="w-5 h-5 shrink-0" />
              {!collapsed && <span>Logout</span>}
            </button>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Desktop header (hidden on mobile) */}
          <header className="hidden md:flex bg-white border-b border-gray-200 px-6 py-3 items-center justify-between shrink-0">
            <p className="text-sm text-gray-500">
              Welcome{portalType !== 'vendor' ? ' back' : ''},{' '}
              <span className="font-semibold text-gray-800">{displayName}</span>
            </p>
            <Link
              to="/"
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <Home className="w-4 h-4" />
              <span>Go to Store</span>
            </Link>
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;

