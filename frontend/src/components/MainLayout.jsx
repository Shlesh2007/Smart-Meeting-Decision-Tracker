import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Navbar } from './Navbar.jsx';
import { usePalmDragScroll } from '../utils/dragScroll.js';

export function MainLayout({ children }) {
  usePalmDragScroll();
  const { user } = useAuth();
  const location = useLocation();
  const pathname = location.pathname;
  const isAuthPage = pathname === '/login' || pathname === '/register';
  const showSidebar = user && !isAuthPage;

  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('smdt_sidebar_user_toggled') === 'true';
  });

  const handleToggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('smdt_sidebar_user_toggled', String(next));
      localStorage.setItem('smdt_sidebar_collapsed', String(next));
      return next;
    });
  };

  if (!showSidebar) {
    return (
      <main className="min-h-screen w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
        {children}
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col antialiased selection:bg-blue-500 selection:text-white w-full max-w-full">
      <Navbar collapsed={collapsed} onToggleSidebar={handleToggleSidebar} />
      <div className={`flex-1 w-full max-w-full pt-16 transition-[padding-left] duration-300 ease-in-out ${collapsed ? 'lg:pl-16' : 'lg:pl-64'}`}>
        <main className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 lg:pt-6 pb-28 sm:pb-28 lg:pb-6 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
