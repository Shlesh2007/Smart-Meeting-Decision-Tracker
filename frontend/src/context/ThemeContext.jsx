'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { ConfigProvider, theme as antdTheme, message } from 'antd';

const ThemeContext = createContext({
  themeMode: 'light',
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }) => {
  // Configure global message popups to auto-dismiss in 1 second
  useEffect(() => {
    message.config({
      duration: 1,
      maxCount: 3,
    });

    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      const body = document.body;
      root.classList.remove('dark');
      body.classList.remove('dark');
      root.style.colorScheme = 'light';
      localStorage.removeItem('smdt_theme');
      const styleTag = document.getElementById('smdt-dark-theme-styles');
      if (styleTag) styleTag.remove();
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ themeMode: 'light', toggleTheme: () => {} }}>
      <ConfigProvider
        theme={{
          algorithm: antdTheme.defaultAlgorithm,
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
