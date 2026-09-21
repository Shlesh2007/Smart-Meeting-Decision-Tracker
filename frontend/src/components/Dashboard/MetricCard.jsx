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
      className={`relative group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2 sm:p-2.5 shadow-xs transition-all duration-200 ease-out hover:scale-105 hover:-translate-y-0.5 hover:shadow-md text-center flex flex-col justify-between ${currentTheme.hoverBorder} ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-center justify-center space-x-1 mb-0.5">
        <div
          className={`w-4 h-4 sm:w-5 sm:h-5 rounded-md flex items-center justify-center text-[9px] sm:text-[11px] shrink-0 transition-transform duration-200 group-hover:scale-110 ${currentTheme.iconBg}`}
        >
          {icon}
        </div>
        <span className="text-[9px] sm:text-[10px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400 truncate">
          {title}
        </span>
      </div>

      <div className="my-0.5 flex items-center justify-center">
        <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
          {value}
        </span>
      </div>

      {(subtitle || trend) && (
        <div className="mt-1 pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-center space-x-1 text-[8px] sm:text-[9px] text-slate-500 dark:text-slate-400 min-w-0">
          {subtitle && (
            <span
              className={`font-bold px-1.5 py-0.5 rounded-md border shrink-0 leading-none ${currentTheme.badge}`}
            >
              {subtitle}
            </span>
          )}
          {trend && (
            <span className="hidden xl:inline-block truncate leading-none text-slate-400 dark:text-slate-500">
              {trend}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
