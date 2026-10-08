import React, { createContext, useContext, useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { ConfigProvider, theme as antdTheme, message } from 'antd';

const ThemeContext = createContext({
  themeMode: 'light',
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('smdt_theme');
      if (saved === 'dark') return 'dark';
      if (saved === 'light') return 'light';
    }
    return 'light';
  });

  // Synchronize document classes on initial mount & mode change
  useEffect(() => {
    message.config({
      duration: 1,
      maxCount: 3,
    });

    const root = document.documentElement;
    const body = document.body;
    if (themeMode === 'dark') {
      root.classList.add('dark');
      body.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      body.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  }, [themeMode]);

  // Radial Theme Reveal Transition
  const toggleTheme = (event) => {
    const nextTheme = themeMode === 'dark' ? 'light' : 'dark';

    // Inject temporary style tag to freeze CSS transitions so snapshot captures instant theme values without white flash or component delay
    const disableTransitionsStyle = document.createElement('style');
    disableTransitionsStyle.appendChild(
      document.createTextNode(
        `*, *::before, *::after { transition: none !important; animation-duration: 0s !important; }`
      )
    );

    const applyThemeDOM = () => {
      const root = document.documentElement;
      const body = document.body;
      if (nextTheme === 'dark') {
        root.classList.add('dark');
        body.classList.add('dark');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        body.classList.remove('dark');
        root.style.colorScheme = 'light';
      }
      localStorage.setItem('smdt_theme', nextTheme);
      setThemeMode(nextTheme);
    };

    const isAppearanceTransition =
      typeof document !== 'undefined' &&
      'startViewTransition' in document &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!isAppearanceTransition) {
      document.head.appendChild(disableTransitionsStyle);
      applyThemeDOM();
      setTimeout(() => {
        if (disableTransitionsStyle.parentNode) {
          disableTransitionsStyle.parentNode.removeChild(disableTransitionsStyle);
        }
      }, 50);
      return;
    }

    // Extract click position or fallback to button center
    let x = window.innerWidth / 2;
    let y = 0;
    if (event) {
      if (event.clientX !== undefined && event.clientY !== undefined && (event.clientX !== 0 || event.clientY !== 0)) {
        x = event.clientX;
        y = event.clientY;
      } else if (event.currentTarget) {
        const rect = event.currentTarget.getBoundingClientRect();
        x = rect.left + rect.width / 2;
        y = rect.top + rect.height / 2;
      }
    }

    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    document.head.appendChild(disableTransitionsStyle);

    // Capture View Transition snapshot with synchronous DOM state update
    const transition = document.startViewTransition(() => {
      flushSync(() => {
        applyThemeDOM();
      });
    });

    transition.ready.then(() => {
      const clipPath = [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${endRadius}px at ${x}px ${y}px)`
      ];

      const animation = document.documentElement.animate(
        {
          clipPath: clipPath,
        },
        {
          duration: 500,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          pseudoElement: '::view-transition-new(root)',
        }
      );

      animation.onfinish = () => {
        if (disableTransitionsStyle.parentNode) {
          disableTransitionsStyle.parentNode.removeChild(disableTransitionsStyle);
        }
      };
    }).catch(() => {
      if (disableTransitionsStyle.parentNode) {
        disableTransitionsStyle.parentNode.removeChild(disableTransitionsStyle);
      }
    });
  };

  const isDark = themeMode === 'dark';

  return (
    <ThemeContext.Provider value={{ themeMode, toggleTheme }}>
      <ConfigProvider
        wave={{ disabled: true }}
        theme={{
          algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
          token: {
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            colorPrimary: isDark ? '#38bdf8' : '#2563eb',
            colorInfo: isDark ? '#38bdf8' : '#2563eb',
            colorBgBase: isDark ? '#0b0f19' : '#f8fafc',
            colorBgContainer: isDark ? '#131c2e' : '#ffffff',
            colorBgElevated: isDark ? '#1a263d' : '#ffffff',
            colorBorder: isDark ? '#233044' : '#cbd5e1',
            colorBorderSecondary: isDark ? '#1a2436' : '#e2e8f0',
            colorText: isDark ? '#f1f5f9' : '#0f172a',
            colorTextHeading: isDark ? '#ffffff' : '#0f172a',
            colorTextSecondary: isDark ? '#94a3b8' : '#64748b',
            colorTextDescription: isDark ? '#64748b' : '#94a3b8',
            borderRadius: 14,
            controlHeight: 40,
            marginLG: 14,
            marginMD: 10,
            paddingLG: 20,
            paddingMD: 16,
          },
          components: {
            Button: {
              colorPrimary: isDark ? '#38bdf8' : '#2563eb',
              colorPrimaryHover: isDark ? '#60a5fa' : '#1d4ed8',
              colorPrimaryActive: isDark ? '#2563eb' : '#1e40af',
              defaultColor: isDark ? '#f1f5f9' : '#334155',
              defaultBg: isDark ? '#1e293b' : '#ffffff',
              defaultBorderColor: isDark ? '#334155' : '#cbd5e1',
              defaultHoverColor: isDark ? '#ffffff' : '#0f172a',
              defaultHoverBorderColor: isDark ? '#64748b' : '#94a3b8',
              defaultHoverBg: isDark ? '#334155' : '#f8fafc',
              defaultActiveColor: isDark ? '#ffffff' : '#0f172a',
              defaultActiveBorderColor: isDark ? '#94a3b8' : '#64748b',
              defaultActiveBg: isDark ? '#475569' : '#f1f5f9',
              algorithm: true,
            },
            Card: {
              paddingLG: 20,
              colorBgContainer: isDark ? '#131c2e' : '#ffffff',
              colorBorderSecondary: isDark ? '#233044' : '#f1f5f9',
            },
            Form: {
              algorithm: true,
              itemMarginBottom: 16,
              verticalLabelPadding: '0 0 6px',
              verticalLabelMargin: '0 0 6px',
              labelFontSize: 13,
              labelColor: isDark ? '#cbd5e1' : '#334155',
              labelRequiredMarkColor: '#ef4444',
            },
            Modal: {
              paddingContentHorizontalLG: 20,
              colorBgElevated: isDark ? '#162032' : '#ffffff',
            },
            Table: {
              cellPaddingBlock: 12,
              cellPaddingInline: 14,
              colorBgContainer: isDark ? '#131c2e' : '#ffffff',
              headerBg: isDark ? '#1a263d' : '#f8fafc',
              headerColor: isDark ? '#f8fafc' : '#0f172a',
              rowHoverBg: isDark ? '#1a263d' : '#f1f5f9',
            },
            Input: {
              colorBgContainer: isDark ? '#1a263d' : '#ffffff',
              colorBorder: isDark ? '#2b394e' : '#cbd5e1',
              colorText: isDark ? '#f1f5f9' : '#0f172a',
            },
            Select: {
              colorBgContainer: isDark ? '#1a263d' : '#ffffff',
              colorBgElevated: isDark ? '#1a263d' : '#ffffff',
              colorBorder: isDark ? '#2b394e' : '#cbd5e1',
              colorText: isDark ? '#f1f5f9' : '#0f172a',
              optionSelectedBg: isDark ? '#23324d' : '#eff6ff',
              optionSelectedColor: isDark ? '#38bdf8' : '#2563eb',
              optionActiveBg: isDark ? '#1e2c45' : '#f8fafc',
            },
            DatePicker: {
              colorBgContainer: isDark ? '#1a263d' : '#ffffff',
              colorBgElevated: isDark ? '#1a263d' : '#ffffff',
              colorBorder: isDark ? '#2b394e' : '#cbd5e1',
              colorText: isDark ? '#f1f5f9' : '#0f172a',
              cellActiveWithRangeBg: isDark ? '#1e3a8a' : '#dbeafe',
              cellHoverWithRangeBg: isDark ? '#1d4ed8' : '#eff6ff',
            },
            Dropdown: {
              colorBgElevated: isDark ? '#162032' : '#ffffff',
              controlItemBgHover: isDark ? '#1e2c45' : '#f8fafc',
            },
            Popover: {
              colorBgElevated: isDark ? '#162032' : '#ffffff',
              colorText: isDark ? '#f1f5f9' : '#0f172a',
            },
            Checkbox: {
              colorPrimary: isDark ? '#3b82f6' : '#2563eb',
              colorPrimaryHover: isDark ? '#60a5fa' : '#1d4ed8',
              colorBorder: isDark ? '#475569' : '#94a3b8',
            },
            Calendar: {
              colorBgContainer: isDark ? '#131c2e' : '#ffffff',
              fullBg: isDark ? '#131c2e' : '#ffffff',
              itemActiveBg: isDark ? '#23324d' : '#eff6ff',
            },
            Menu: {
              algorithm: true,
              itemBg: 'transparent',
              itemColor: isDark ? '#94a3b8' : '#475569',
              itemHoverColor: isDark ? '#ffffff' : '#0f172a',
              itemHoverBg: isDark ? '#1e293b' : '#f1f5f9',
              itemSelectedColor: isDark ? '#ffffff' : '#1d4ed8',
              itemSelectedBg: isDark ? '#1d4ed8' : '#e2e8f0',
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
