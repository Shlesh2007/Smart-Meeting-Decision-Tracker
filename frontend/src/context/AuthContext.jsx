'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api.js';
import { useRouter, usePathname } from 'next/navigation';
import { Spin } from 'antd';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const refreshUser = async () => {
    try {
      const profile = await authService.getProfile();
      setUser(profile);
    } catch (err) {
      setUser(null);
      authService.logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (token) {
      refreshUser();
    } else {
      setLoading(false);
    }
  }, []);

  // Global Auth Guard: Protect all non-public routes
  useEffect(() => {
    if (!loading) {
      const publicPaths = ['/login', '/register'];
      const isPublicPath = publicPaths.includes(pathname);

      if (!user && !isPublicPath) {
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      } else if (user && isPublicPath) {
        if (typeof window !== 'undefined') {
          window.location.href = '/dashboard';
        }
      }
    }
  }, [user, loading, pathname]);

  const login = async (credentials) => {
    setLoading(true);
    try {
      await authService.login(credentials);
      await refreshUser();
      if (typeof window !== 'undefined') {
        window.location.href = '/dashboard';
      }
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload) => {
    setLoading(true);
    try {
      await authService.register(payload);
      await refreshUser();
      if (typeof window !== 'undefined') {
        window.location.href = '/dashboard';
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  const isAdmin = Boolean(user && user.role === 'ADMIN');

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-slate-50">
        <Spin size="large" tip="Loading Smart Meeting Tracker..." />
      </div>
    );
  }

  // Prevent rendering protected content for unauthenticated users
  const publicPaths = ['/login', '/register'];
  const isPublicPath = publicPaths.includes(pathname);
  if (!user && !isPublicPath) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-slate-50 dark:bg-slate-900">
        <Spin size="large" tip="Redirecting to Sign In..." />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

