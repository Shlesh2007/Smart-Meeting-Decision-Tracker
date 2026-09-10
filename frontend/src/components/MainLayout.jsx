import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Navbar } from './Navbar.jsx';

export function MainLayout({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  const pathname = location.pathname;
  const isAuthPage = pathname === '/login' || pathname === '/register';
  const showSidebar = user && !isAuthPage;

  if (!showSidebar) {
    return (
      <main className="min-h-screen w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
        {children}
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col antialiased selection:bg-blue-500 selection:text-white">
      <Navbar />
      <div className="flex-1 w-full lg:pl-64 transition-all">
        <main className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
