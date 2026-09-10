import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Navbar } from './Navbar.jsx';

export function MainLayout({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  const pathname = location.pathname;
  const isAuthPage = pathname === '/login' || pathname === '/register';
  const showSidebarPadding = user && !isAuthPage;

  return (
    <>
      <Navbar />
      <main
        className={`flex-1 transition-all w-full max-w-[1600px] mx-auto p-3 sm:p-6 overflow-x-hidden ${
          showSidebarPadding ? 'lg:pl-64' : 'lg:pl-0'
        }`}
      >
        {children}
      </main>
    </>
  );
}
