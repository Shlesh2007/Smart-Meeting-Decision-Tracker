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
    return localStorage.getItem('smdt_sidebar_collapsed') === 'true';
  });

  const handleToggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev;
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col antialiased selection:bg-blue-500 selection:text-white w-full max-w-full overflow-x-hidden">
      <Navbar collapsed={collapsed} onToggleSidebar={handleToggleSidebar} />
      <div className={`flex-1 w-full max-w-full overflow-x-hidden transition-all duration-300 ${collapsed ? 'lg:pl-16' : 'lg:pl-64'}`}>
        <main className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4 pb-24 sm:pb-16 lg:pb-16 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
