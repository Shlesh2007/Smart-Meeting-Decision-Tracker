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
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            colorPrimary: '#2563eb',
            colorInfo: '#2563eb',
            borderRadius: 12,
            controlHeight: 40,
            marginLG: 14,
            marginMD: 10,
            paddingLG: 20,
            paddingMD: 16,
          },
          components: {
            Button: {
              colorPrimary: '#0f172a',
              colorPrimaryHover: '#1e293b',
              colorPrimaryActive: '#020617',
              algorithm: true,
            },
            Form: {
              algorithm: true,
              itemMarginBottom: 16,
              verticalLabelPadding: '0 0 6px',
              verticalLabelMargin: '0 0 6px',
              labelFontSize: 13,
              labelColor: '#334155',
              labelRequiredMarkColor: '#ef4444',
            },
            Space: {
              algorithm: true,
            },
            Card: {
              paddingLG: 20,
            },
            Modal: {
              paddingContentHorizontalLG: 20,
            },
            Table: {
              cellPaddingBlock: 12,
              cellPaddingInline: 14,
            },
            Checkbox: {
              colorPrimary: '#0f172a',
              colorPrimaryHover: '#1e293b',
              colorBorder: '#475569',
            },
            Calendar: {
              algorithm: true,
            },
          },
        }}
      >
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
