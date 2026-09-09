'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ConfigProvider, theme as antdTheme, message } from 'antd';

const ThemeContext = createContext({
  themeMode: 'light',
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeMode] = useState('light');

  // Configure global message popups to auto-dismiss in 1 second
  useEffect(() => {
    message.config({
      duration: 1,
      maxCount: 3,
    });
  }, []);

  const applyTheme = (mode) => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    const body = document.body;
    let styleTag = document.getElementById('smdt-dark-theme-styles');

    if (mode === 'dark') {
      root.classList.add('dark');
      body.classList.add('dark');
      root.style.colorScheme = 'dark';

      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'smdt-dark-theme-styles';
        document.head.appendChild(styleTag);
      }
      styleTag.innerHTML = `
        html, body, main {
          background-color: #0f172a !important;
          color: #f1f5f9 !important;
        }
        header, .bg-white, .ant-card, .ant-drawer-content, .ant-modal-content, .ant-dropdown-menu {
          background-color: #1e293b !important;
          border-color: #334155 !important;
          color: #f8fafc !important;
        }
        .bg-slate-50 {
          background-color: #0f172a !important;
        }
        .bg-slate-100 {
          background-color: #334155 !important;
        }
        .text-slate-900, .text-slate-800 {
          color: #f8fafc !important;
        }
        .text-slate-700, .text-slate-600 {
          color: #cbd5e1 !important;
        }
        .text-slate-500 {
          color: #94a3b8 !important;
        }
        .border-slate-100, .border-slate-200 {
          border-color: #334155 !important;
        }
        .ant-card-head {
          border-bottom-color: #334155 !important;
        }
        .ant-card-head-title, .ant-statistic-title, .ant-statistic-content {
          color: #f8fafc !important;
        }
        .ant-dropdown-menu-item:hover, .ant-dropdown-menu-item-active {
          background-color: #334155 !important;
          color: #f8fafc !important;
        }
      `;
    } else {
      root.classList.remove('dark');
      body.classList.remove('dark');
      root.style.colorScheme = 'light';
      if (styleTag) {
        styleTag.remove();
      }
    }
  };

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('smdt_theme') : null;
    const initial = saved === 'dark' ? 'dark' : 'light';
    setThemeMode(initial);
    applyTheme(initial);
  }, []);

  const toggleTheme = () => {
    setThemeMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      if (typeof window !== 'undefined') {
        localStorage.setItem('smdt_theme', next);
        applyTheme(next);
      }
      return next;
    });
  };

  const algorithm = themeMode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm;

  return (
    <ThemeContext.Provider value={{ themeMode, toggleTheme }}>
      <ConfigProvider
        theme={{
          algorithm,
          token: {
            colorPrimary: '#2563eb',
            borderRadius: 8,
          },
        }}
      >
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
