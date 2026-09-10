'use client';

import React from 'react';

const themes = {
  blue: {
    iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    hoverBorder: 'hover:border-blue-500/50',
    accentDot: 'bg-blue-500',
    badge: 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900',
  },
  indigo: {
    iconBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    hoverBorder: 'hover:border-indigo-500/50',
    accentDot: 'bg-indigo-500',
    badge: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900',
  },
  amber: {
    iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    hoverBorder: 'hover:border-amber-500/50',
    accentDot: 'bg-amber-500',
    badge: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900',
  },
  green: {
    iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    hoverBorder: 'hover:border-emerald-500/50',
    accentDot: 'bg-emerald-500',
    badge: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900',
  },
  rose: {
    iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    hoverBorder: 'hover:border-rose-500/50',
    accentDot: 'bg-rose-500',
    badge: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900',
  },
  red: {
    iconBg: 'bg-red-500/10 text-red-600 dark:text-red-400',
    hoverBorder: 'hover:border-red-500/50',
    accentDot: 'bg-red-500',
    badge: 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900',
  },
};

export const MetricCard = ({
  title,
  value = 0,
  subtitle,
  icon,
  theme = 'blue',
  trend,
  onClick,
}) => {
  const currentTheme = themes[theme] || themes.blue;

  return (
    <div
      onClick={onClick}
      className={`relative group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-3.5 shadow-xs transition-all duration-200 hover:shadow-sm ${currentTheme.hoverBorder} ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-1.5">
        <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400 truncate">
          {title}
        </span>
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0 transition-transform duration-200 group-hover:scale-105 ${currentTheme.iconBg}`}
        >
          {icon}
        </div>
      </div>

      <div className="mt-2 flex items-baseline justify-between gap-1.5">
        <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
          {value}
        </span>
        {subtitle && (
          <span
            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${currentTheme.badge}`}
          >
            {subtitle}
          </span>
        )}
      </div>

      {trend && (
        <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
          <span className="truncate">{trend}</span>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${currentTheme.accentDot}`} />
        </div>
      )}
    </div>
  );
};
