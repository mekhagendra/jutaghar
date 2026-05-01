import { logout as authLogout, loadAuthState, subscribe } from '@/features/auth';
import { loadWishlist } from '@/features/catalog';
import { loadCart } from '@/features/checkout';
import {
    AboutUsScreen,
    CartScreen,
    CheckoutScreen,
    ContactScreen,
    HomeScreen,
    LoginScreen,
    OrderDetailScreen,
    OrdersScreen,
    OutletsScreen,
    ProductDetailScreen,
    ProductsScreen,
    ProfileScreen,
    SellerAddProductScreen,
    SellerEditProductScreen,
    SellerHomeScreen,
    SellerOrdersScreen,
    SellerProductsScreen,
    UserRegistrationScreen,
    WishlistScreen
} from '@/screens';
import Footer, { type TabName } from '@/shared/components/Footer';
import SellerFooter, { type SellerTabName } from '@/shared/components/SellerFooter';
import { setHomeNavigationListener } from '@/shared/navigation/homeNavigation';
import type { Product } from '@/types';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

type ViewType = 'login' | 'register';
type Screen =
  | 'home'
  | 'seller-home'
  | 'product-detail'
  | 'cart'
  | 'checkout'
  | 'products'
  | 'outlets'
  | 'orders'
  | 'order-detail'
  | 'profile'
  | 'wishlist'
  | 'about'
  | 'contact'
  | 'seller-products'
  | 'seller-add-product'
  | 'seller-edit-product'
  | 'seller-orders'
  | 'seller-account';

export default function Index() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [viewType, setViewType] = useState<ViewType>('login');
  const [userData, setUserData] = useState<any>(null);
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSearch, setSelectedSearch] = useState<string>('');
  const [selectedGender, setSelectedGender] = useState<string | null>(null);
  const [selectedSort, setSelectedSort] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  const [selectedCheckoutItemKeys, setSelectedCheckoutItemKeys] = useState<string[] | null>(null);
  const [screenHistory, setScreenHistory] = useState<Screen[]>([]);
  const [profileResetToken, setProfileResetToken] = useState(0);

  const navigateTo = (screen: Screen) => {
    setScreenHistory(prev => [...prev, currentScreen]);
    setCurrentScreen(screen);
  };

  const isSeller = userData?.role === 'seller';

  const goBack = () => {
    if (screenHistory.length > 0) {
      const prev = screenHistory[screenHistory.length - 1];
      setScreenHistory(h => h.slice(0, -1));
      setCurrentScreen(prev);
      setSelectedProduct(null);
      setSelectedOrderId(null);
    } else {
      setCurrentScreen(isSeller ? 'seller-home' : 'home');
      setSelectedProduct(null);
      setSelectedOrderId(null);
    }
  };

  // Load persisted auth state on mount
  useEffect(() => {
    const init = async () => {
      const state = await loadAuthState();
      if (state.isAuthenticated && state.user) {
        setUserData(state.user);
        setIsLoggedIn(true);
      }
      setIsLoading(false);

      // Restore persisted cart/wishlist without blocking first paint.
      void Promise.allSettled([loadCart(), loadWishlist()]);
    };
    init();
  }, []);

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = subscribe((state) => {
      if (!state.isAuthenticated) {
        setIsLoggedIn(false);
        setUserData(null);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    setHomeNavigationListener(() => {
      setShowLogin(false);
      setCurrentScreen(isLoggedIn && isSeller ? 'seller-home' : 'home');
      setScreenHistory([]);
      setSelectedProduct(null);
      setSelectedOrderId(null);
      setSelectedCategory(null);
      setSelectedGender(null);
      setSelectedSort(null);
      setSelectedBrand(null);
      setSelectedVendor(null);
    });

    return () => setHomeNavigationListener(null);
  }, [isLoggedIn, isSeller]);

  // Handle login success
  const handleLogin = (data: any) => {
    setUserData(data);
    setIsLoggedIn(true);
    setShowLogin(false);
    setCurrentScreen(data?.role === 'seller' ? 'seller-home' : 'home');
    setScreenHistory([]);
  };

  // Handle logout
  const handleLogout = async () => {
    await authLogout();
    setIsLoggedIn(false);
    setShowLogin(false);
    setUserData(null);
    setViewType('login');
    setCurrentScreen('home');
    setSelectedProduct(null);
    setSelectedOrderId(null);
    setScreenHistory([]);
  };

  // Handle registration success
  const handleRegistration = (data: any) => {
    setUserData(data);
    setIsLoggedIn(true);
    setShowLogin(false);
    setCurrentScreen('home');
    setScreenHistory([]);
  };

  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product);
    navigateTo('product-detail');
  };

  const handleViewCart = () => {
    navigateTo('cart');
  };

  const handleViewProducts = (options?: { category?: string; gender?: string; sort?: string; brand?: string; vendor?: string; search?: string }) => {
    setSelectedCategory(options?.category || null);
    setSelectedGender(options?.gender || null);
    setSelectedSort(options?.sort || null);
    setSelectedBrand(options?.brand || null);
    setSelectedVendor(options?.vendor || null);
    setSelectedSearch(options?.search || '');
    navigateTo('products');
  };

  const handleViewOutlets = () => {
    navigateTo('outlets');
  };

  const handleViewOrders = () => {
    navigateTo('orders');
  };

  const handleViewOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    navigateTo('order-detail');
  };

  const handleViewCheckout = (selectedItemKeys?: string[]) => {
    setSelectedCheckoutItemKeys(selectedItemKeys && selectedItemKeys.length > 0 ? selectedItemKeys : null);
    navigateTo('checkout');
  };

  const handleSellerTabPress = (tab: SellerTabName) => {
    if (tab === 'seller-account' && currentScreen === 'seller-account') {
      setProfileResetToken(prev => prev + 1);
      return;
    }

    setShowLogin(false);
    setCurrentScreen(tab as Screen);
    setScreenHistory([]);
    setSelectedProduct(null);
    setSelectedOrderId(null);
  };

  // Footer tab navigation
  const handleTabPress = (tab: TabName) => {
    if (tab === 'profile' && !isLoggedIn) {
      setShowLogin(true);
      return;
    }
    if (tab === 'profile' && currentScreen === 'profile') {
      setProfileResetToken(prev => prev + 1);
      return;
    }
    setShowLogin(false);
    setCurrentScreen(tab as Screen);
    setScreenHistory([]);
    setSelectedProduct(null);
    setSelectedOrderId(null);
    setSelectedCategory(null);
    setSelectedGender(null);
    setSelectedSort(null);
    setSelectedBrand(null);
    setSelectedVendor(null);
  };

  const getActiveTab = (): TabName => {
    if (showLogin) return 'profile';

    switch (currentScreen) {
      case 'products': return 'products';
      case 'cart': return 'cart';
      case 'wishlist': return 'wishlist';
      case 'profile': return 'profile';
      default: return 'home';
    }
  };

  // Show loading spinner while restoring auth
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  // Detail/transactional screens (with footer)
  const renderScreenContent = () => {
    if (showLogin) {
      if (viewType === 'register') {
        return (
          <UserRegistrationScreen
            onRegister={handleRegistration}
            onBackToLogin={() => setViewType('login')}
          />
        );
      }
      return (
        <LoginScreen
          onLogin={handleLogin}
          onGoToRegister={() => setViewType('register')}
        />
      );
    }

    if (isLoggedIn && currentScreen === 'seller-home') {
      return (
        <SellerHomeScreen
          onAddProduct={() => navigateTo('seller-add-product')}
          onManageProducts={() => navigateTo('seller-products')}
          onViewOrders={() => navigateTo('seller-orders')}
          userData={userData}
        />
      );
    }

    if (isLoggedIn && isSeller && currentScreen === 'seller-products') {
      return (
        <SellerProductsScreen
          onAddProduct={() => navigateTo('seller-add-product')}
          onEditProduct={(product) => {
            setSelectedProduct(product);
            navigateTo('seller-edit-product');
          }}
        />
      );
    }

    if (isLoggedIn && isSeller && currentScreen === 'seller-add-product') {
      return <SellerAddProductScreen onDone={() => setCurrentScreen('seller-products')} />;
    }

    if (
      isLoggedIn &&
      isSeller &&
      currentScreen === 'seller-edit-product' &&
      selectedProduct
    ) {
      return (
        <SellerEditProductScreen
          product={selectedProduct}
          onDone={() => {
            setSelectedProduct(null);
            setCurrentScreen('seller-products');
          }}
        />
      );
    }

    if (isLoggedIn && isSeller && currentScreen === 'seller-orders') {
      return <SellerOrdersScreen />;
    }

    if (isLoggedIn && isSeller && currentScreen === 'seller-account') {
      return (
        <ProfileScreen
          resetToken={profileResetToken}
          userData={userData}
          onLogout={handleLogout}
          onViewOrders={handleViewOrders}
        />
      );
    }

    if (currentScreen === 'product-detail' && selectedProduct) {
      return (
        <ProductDetailScreen
          product={selectedProduct}
          onBack={goBack}
          onViewCart={handleViewCart}
        />
      );
    }

    if (currentScreen === 'checkout') {
      return (
        <CheckoutScreen
          onBack={goBack}
          onOrderSuccess={(orderId) => handleViewOrder(orderId)}
          selectedItemKeys={selectedCheckoutItemKeys || undefined}
        />
      );
    }

    if (currentScreen === 'orders') {
      return (
        <OrdersScreen
          onBack={goBack}
          onViewOrder={handleViewOrder}
        />
      );
    }

    if (currentScreen === 'order-detail' && selectedOrderId) {
      return (
        <OrderDetailScreen
          orderId={selectedOrderId}
          onBack={goBack}
        />
      );
    }

    if (currentScreen === 'about') {
      return <AboutUsScreen onBack={goBack} />;
    }

    if (currentScreen === 'contact') {
      return <ContactScreen onBack={goBack} />;
    }

    // Tab screens
    switch (currentScreen) {
      case 'products':
        return (
          <ProductsScreen
            onViewProduct={handleViewProduct}
            initialCategory={selectedCategory}
            initialGender={selectedGender}
            initialSort={selectedSort}
            initialBrand={selectedBrand}
            initialVendor={selectedVendor}
            initialSearch={selectedSearch}
          />
        );
      case 'outlets':
        return <OutletsScreen onViewProducts={handleViewProducts} />;
      case 'cart':
        return (
          <CartScreen
            onBack={goBack}
            onCheckout={handleViewCheckout}
            onBrowseProducts={() => handleViewProducts()}
          />
        );
      case 'wishlist':
        return (
          <WishlistScreen
            onBack={goBack}
            onViewProduct={handleViewProduct}
            onBrowseProducts={() => handleViewProducts()}
          />
        );
      case 'profile':
        return (
          <ProfileScreen
            resetToken={profileResetToken}
            userData={userData}
            onLogout={handleLogout}
            onViewOrders={handleViewOrders}
          />
        );
      default:
        return (
          <HomeScreen
            onViewProduct={handleViewProduct}
            onViewProducts={handleViewProducts}
            onViewOutlets={handleViewOutlets}
          />
        );
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {renderScreenContent()}
      {isLoggedIn && isSeller ? (
        <SellerFooter
          activeTab={
            currentScreen === 'seller-products' ||
            currentScreen === 'seller-add-product' ||
            currentScreen === 'seller-edit-product' ||
            currentScreen === 'seller-orders' ||
            currentScreen === 'seller-account'
              ? (currentScreen as SellerTabName)
              : 'seller-home'
          }
          onNavigate={handleSellerTabPress}
        />
      ) : (
        <Footer
          activeTab={getActiveTab()}
          onNavigate={handleTabPress}
          isLoggedIn={isLoggedIn}
        />
      )}
    </View>
  );
}
