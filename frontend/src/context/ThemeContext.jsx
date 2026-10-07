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
        theme={{
          algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
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
              colorPrimary: isDark ? '#3b82f6' : '#0f172a',
              colorPrimaryHover: isDark ? '#60a5fa' : '#1e293b',
              colorPrimaryActive: isDark ? '#2563eb' : '#020617',
              algorithm: true,
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
              colorPrimary: isDark ? '#3b82f6' : '#0f172a',
              colorPrimaryHover: isDark ? '#60a5fa' : '#1e293b',
              colorBorder: isDark ? '#64748b' : '#475569',
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
