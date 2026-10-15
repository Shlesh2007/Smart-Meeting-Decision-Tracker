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

      // Global Live Sync: keep user profile, roles, and status synchronized across all tabs and windows
      const pollTimer = setInterval(() => {
        const currentToken = localStorage.getItem('access_token');
        if (currentToken) {
          authService.getProfile()
            .then((profile) => setUser(profile))
            .catch(() => {});
        }
      }, 10000);

      const handleFocus = () => {
        const currentToken = localStorage.getItem('access_token');
        if (currentToken) {
          authService.getProfile()
            .then((profile) => setUser(profile))
            .catch(() => {});
        }
      };

      window.addEventListener('focus', handleFocus);
      window.addEventListener('visibilitychange', handleFocus);

      return () => {
        clearInterval(pollTimer);
        window.removeEventListener('focus', handleFocus);
        window.removeEventListener('visibilitychange', handleFocus);
      };
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
      path.startsWith('/create-organization') ||
      path.startsWith('/oauth-callback') ||
      path.endsWith('.html') ||
      path.includes('file://')
    );
  };

  const hasOrganization = Boolean(user && user.has_organization !== false && user.role !== 'UNASSIGNED');

  const navigateByStatus = (profile) => {
    if (!profile) return;
    const unack = profile.unacknowledged_decision;
    if (unack) {
      if (unack.status === 'APPROVED') {
        navigate('/request-approved');
        return;
      } else if (unack.status === 'REJECTED') {
        navigate('/request-rejected');
        return;
      }
    }
    if (!profile.has_organization || profile.role === 'UNASSIGNED') {
      navigate('/onboarding');
    } else {
      navigate('/dashboard');
    }
  };

  // Global Auth & Onboarding Guard: Protect all non-public routes and check organization membership
  useEffect(() => {
    if (!loading) {
      if (!user && !isPublicRoute(pathname)) {
        navigate('/login');
      } else if (user) {
        const unack = user.unacknowledged_decision;
        if (unack) {
          if (unack.status === 'APPROVED' && pathname !== '/request-approved') {
            navigate('/request-approved');
          } else if (unack.status === 'REJECTED' && pathname !== '/request-rejected') {
            navigate('/request-rejected');
          }
        } else {
          if (pathname === '/request-approved' || pathname === '/request-rejected') {
            if (hasOrganization) {
              navigate('/dashboard');
            } else {
              navigate('/onboarding');
            }
          } else if (!hasOrganization) {
            if (pathname !== '/onboarding' && pathname !== '/create-organization') {
              navigate('/onboarding');
            }
          } else if (pathname === '/onboarding' || pathname === '/create-organization') {
            navigate('/dashboard');
          } else if (isPublicRoute(pathname) && pathname === '/') {
            navigate('/dashboard');
          }
        }
      }
    }
  }, [user, loading, pathname, navigate, hasOrganization]);


  const login = async (credentials) => {
    await authService.login(credentials);
    const profile = await refreshUser();
    navigateByStatus(profile);
    return profile;
  };

  const register = async (payload) => {
    await authService.register(payload);
    const profile = await refreshUser();
    navigateByStatus(profile);
  };

  const requestRegisterOTP = async (payload) => {
    return await authService.requestRegisterOTP(payload);
  };

  const confirmRegister = async (payload) => {
    const res = await authService.confirmRegister(payload);
    const profile = await refreshUser();
    navigateByStatus(profile);
    return res;
  };

  const createOrganization = async (payload) => {
    const res = await authService.createOrganization(payload);
    const updated = await refreshUser();
    if (updated) {
      setUser(updated);
    } else if (res.user) {
      setUser(res.user);
    }
    return res;
  };

  const joinOrganization = async (payload) => {
    const res = await authService.joinOrganization(payload);
    if (!res.pending) {
      const updated = await refreshUser();
      if (updated) {
        setUser(updated);
      } else if (res.user) {
        setUser(res.user);
      }
    }
    return res;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.setItem('smdt_theme', 'light');
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
      window.dispatchEvent(new Event('smdt-theme-reset'));
    }
    navigate('/login');
  };

  const isOwner = Boolean(user && user.role === 'OWNER');
  const isAdmin = Boolean(user && (user.role === 'OWNER' || user.role === 'ADMIN'));
  const isManager = Boolean(user && (user.role === 'OWNER' || user.role === 'ADMIN' || user.role === 'MANAGER'));
  const isMember = Boolean(user && hasOrganization);
  const hasRole = (roleArray) => Array.isArray(roleArray) && user && hasOrganization && roleArray.includes(user.role);

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
        <Spin size="large" tip="Redirecting to Login..."><div className="p-6" /></Spin>
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
        createOrganization,
        joinOrganization,
        logout,
        refreshUser,
        isOwner,
        isAdmin,
        isManager,
        isMember,
        hasRole,
        hasOrganization
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
