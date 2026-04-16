import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Footer, { type TabName } from '../components/Footer';
import { logout as authLogout, loadAuthState, subscribe } from '../lib/authStore';
import { loadCart } from '../lib/cartStore';
import type { Product } from '../lib/types';
import { loadWishlist } from '../lib/wishlistStore';
import AboutUsScreen from './about';
import CartScreen from './cart';
import CheckoutScreen from './checkout';
import ContactScreen from './contact';
import HomeScreen from './home';
import LoginScreen from './login';
import OrderDetailScreen from './order-detail';
import OrdersScreen from './orders';
import ProductDetailScreen from './product-detail';
import ProductsScreen from './products';
import ProfileScreen from './profile';
import SellerHomeScreen from './seller-home';
import UserRegistrationScreen from './user-registration';
import WishlistScreen from './wishlist';

type ViewType = 'login' | 'register';
type Screen =
  | 'home'
  | 'seller-home'
  | 'product-detail'
  | 'cart'
  | 'checkout'
  | 'products'
  | 'orders'
  | 'order-detail'
  | 'profile'
  | 'wishlist'
  | 'about'
  | 'contact';

const TAB_SCREENS: Screen[] = ['home', 'products', 'cart', 'wishlist', 'profile'];

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
  const [screenHistory, setScreenHistory] = useState<Screen[]>([]);

  const navigateTo = (screen: Screen) => {
    setScreenHistory(prev => [...prev, currentScreen]);
    setCurrentScreen(screen);
  };

  const goBack = () => {
    if (screenHistory.length > 0) {
      const prev = screenHistory[screenHistory.length - 1];
      setScreenHistory(h => h.slice(0, -1));
      setCurrentScreen(prev);
      setSelectedProduct(null);
      setSelectedOrderId(null);
    } else {
      setCurrentScreen(userData?.userType === 'seller' ? 'seller-home' : 'home');
      setSelectedProduct(null);
      setSelectedOrderId(null);
    }
  };

  // Load persisted auth state on mount
  useEffect(() => {
    const init = async () => {
      const state = await loadAuthState();
      await loadCart();
      await loadWishlist();
      if (state.isAuthenticated && state.user) {
        setUserData({
          ...state.user,
          userType: state.user.role === 'outlet' ? 'seller' : 'user',
        });
        setIsLoggedIn(true);
      }
      setIsLoading(false);
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

  // Handle login success
  const handleLogin = (data: any) => {
    setUserData(data);
    setIsLoggedIn(true);
    setShowLogin(false);
    setCurrentScreen(data.userType === 'seller' ? 'seller-home' : 'home');
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

  const handleViewProducts = (categoryId?: string) => {
    setSelectedCategory(categoryId || null);
    navigateTo('products');
  };

  const handleViewOrders = () => {
    navigateTo('orders');
  };

  const handleViewOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    navigateTo('order-detail');
  };

  const handleViewCheckout = () => {
    navigateTo('checkout');
  };

  // Footer tab navigation
  const handleTabPress = (tab: TabName) => {
    if (tab === 'profile' && !isLoggedIn) {
      setShowLogin(true);
      return;
    }
    setCurrentScreen(tab as Screen);
    setScreenHistory([]);
    setSelectedProduct(null);
    setSelectedOrderId(null);
    setSelectedCategory(null);
  };

  const getActiveTab = (): TabName => {
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

  // Login/Register screens (no footer)
  if (showLogin) {
    if (viewType === 'register') {
      return (
        <UserRegistrationScreen
          onRegister={handleRegistration}
          onBackToLogin={() => setViewType('login')}
          showBackButton={true}
          onBack={() => setShowLogin(false)}
        />
      );
    }
    return (
      <LoginScreen
        onLogin={handleLogin}
        showBackButton={true}
        onBack={() => setShowLogin(false)}
        onBackToHome={() => setShowLogin(false)}
        onGoToRegister={() => setViewType('register')}
      />
    );
  }

  // Seller Home (no footer - sellers have their own dashboard)
  if (isLoggedIn && (currentScreen === 'seller-home' || userData?.userType === 'seller')) {
    return (
      <SellerHomeScreen
        onLogout={handleLogout}
        onGoToLogin={() => setShowLogin(true)}
        userData={userData}
      />
    );
  }

  // Detail/transactional screens (no footer)
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

  // Tab screens with footer
  const renderTabContent = () => {
    switch (currentScreen) {
      case 'products':
        return (
          <ProductsScreen
            onViewProduct={handleViewProduct}
            initialCategory={selectedCategory}
          />
        );
      case 'cart':
        return (
          <CartScreen
            onCheckout={handleViewCheckout}
          />
        );
      case 'wishlist':
        return (
          <WishlistScreen
            onViewProduct={handleViewProduct}
          />
        );
      case 'profile':
        return (
          <ProfileScreen
            userData={userData}
            onLogout={handleLogout}
            onViewOrders={handleViewOrders}
          />
        );
      default:
        return (
          <HomeScreen
            userData={userData}
            onViewProduct={handleViewProduct}
            onViewProducts={handleViewProducts}
          />
        );
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {renderTabContent()}
      <Footer
        activeTab={getActiveTab()}
        onNavigate={handleTabPress}
        isLoggedIn={isLoggedIn}
      />
    </View>
  );
}
