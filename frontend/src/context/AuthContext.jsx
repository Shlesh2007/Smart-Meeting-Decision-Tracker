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
      return profile;
    } catch (err) {
      setUser(null);
      authService.logout();
      throw err;
    }
  };

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (token) {
      refreshUser()
        .catch(() => {})
        .finally(() => setLoading(false));
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
        router.push('/login');
      } else if (user && isPublicPath) {
        router.push('/dashboard');
      }
    }
  }, [user, loading, pathname, router]);

  const login = async (credentials) => {
    await authService.login(credentials);
    await refreshUser();
    router.push('/dashboard');
  };

  const register = async (payload) => {
    await authService.register(payload);
    await refreshUser();
    router.push('/dashboard');
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    router.push('/login');
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

