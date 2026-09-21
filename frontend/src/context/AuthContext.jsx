import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api.js';
import { useNavigate, useLocation } from 'react-router-dom';
import { Spin } from 'antd';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

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

  const isPublicRoute = (path) => {
    if (!path) return true;
    return (
      path === '/' ||
      path.startsWith('/login') ||
      path.startsWith('/register') ||
      path.startsWith('/oauth-callback') ||
      path.endsWith('.html') ||
      path.includes('file://')
    );
  };

  // Global Auth Guard: Protect all non-public routes
  useEffect(() => {
    if (!loading) {
      if (!user && !isPublicRoute(pathname)) {
        navigate('/login');
      } else if (user && isPublicRoute(pathname) && pathname === '/') {
        navigate('/dashboard');
      }
    }
  }, [user, loading, pathname, navigate]);


  const login = async (credentials) => {
    await authService.login(credentials);
    return await refreshUser();
  };

  const register = async (payload) => {
    await authService.register(payload);
    await refreshUser();
    navigate('/dashboard');
  };

  const requestRegisterOTP = async (payload) => {
    return await authService.requestRegisterOTP(payload);
  };

  const confirmRegister = async (payload) => {
    const res = await authService.confirmRegister(payload);
    await refreshUser();
    navigate('/dashboard');
    return res;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    navigate('/login');
  };

  const isOwner = Boolean(user && user.role === 'OWNER');
  const isAdmin = Boolean(user && (user.role === 'OWNER' || user.role === 'ADMIN'));
  const isManager = Boolean(user && (user.role === 'OWNER' || user.role === 'ADMIN' || user.role === 'MANAGER'));
  const isMember = Boolean(user);
  const hasRole = (roleArray) => Array.isArray(roleArray) && user && roleArray.includes(user.role);

  if (loading) {
    return (
      <AuthContext.Provider
        value={{
          user: null,
          loading: true,
          login,
          register,
          requestRegisterOTP,
          confirmRegister,
          logout,
          refreshUser,
          isOwner: false,
          isAdmin: false,
          isManager: false,
          isMember: false,
          hasRole: () => false
        }}
      >
        {children}
      </AuthContext.Provider>
    );
  }

  // Prevent rendering protected content for unauthenticated users
  if (!user && !isPublicRoute(pathname)) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-slate-50 dark:bg-slate-900">
        <Spin size="large" tip="Redirecting to Sign In..."><div className="p-6" /></Spin>
      </div>
    );
  }


  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        requestRegisterOTP,
        confirmRegister,
        logout,
        refreshUser,
        isOwner,
        isAdmin,
        isManager,
        isMember,
        hasRole
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
