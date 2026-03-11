import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

/**
 * MainLayout Component
 * 
 * Provides the main application layout structure with:
 * - Navbar with topbar (Free shipping, Track Order, Help)
 * - Main navigation (Logo, Menu items, Cart, User menu)
 * - Main content area (rendered via React Router's Outlet)
 * - Footer with company info, links, and social media
 * 
 * This layout is used for all public and protected routes
 */
const MainLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* 
        Navbar Component includes:
        - Topbar: Free shipping message, Track Order, Help links
        - Main Nav: Logo, Menu (Men/Women/Kids/New/Best), Cart, User menu
        - Sticky positioning for persistent navigation
      */}
      <Navbar />
      
      {/* Main Content Area - Flex-1 ensures it fills available space */}
      <main className="flex-1 w-full">
        <Outlet />
      </main>
      
      {/* Footer Component - Company info, links, social media */}
      <Footer />
    </div>
  );
};

export default MainLayout;