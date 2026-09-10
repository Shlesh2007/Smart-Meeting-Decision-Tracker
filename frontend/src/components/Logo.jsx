'use client';

import React from 'react';

export function Logo({ variant = 'full', height = 36, className = '' }) {
  if (variant === 'icon') {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 100 100"
        style={{ height: `${height}px`, width: 'auto' }}
        className={`select-none shrink-0 ${className}`}
      >
        <defs>
          <linearGradient id="logoIconBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
          <linearGradient id="logoIconBadgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#16a34a" />
          </linearGradient>
        </defs>

        <rect x="5" y="5" width="90" height="90" rx="24" fill="url(#logoIconBgGrad)" />

        <rect x="20" y="24" width="60" height="48" rx="8" fill="none" stroke="#ffffff" strokeWidth="4.5" />
        <line x1="20" y1="36" x2="80" y2="36" stroke="#ffffff" strokeWidth="3" />

        <rect x="34" y="17" width="5" height="10" rx="2.5" fill="#ffffff" />
        <rect x="61" y="17" width="5" height="10" rx="2.5" fill="#ffffff" />

        <circle cx="37" cy="46" r="4.5" fill="#ffffff" />
        <path d="M 29 57 C 29 51, 45 51, 45 57" fill="#ffffff" />

        <circle cx="63" cy="46" r="4.5" fill="#ffffff" />
        <path d="M 55 57 C 55 51, 71 51, 71 57" fill="#ffffff" />

        <circle cx="50" cy="44" r="6" fill="#ffffff" />
        <path d="M 40 58 C 40 51, 60 51, 60 58" fill="#ffffff" />

        <circle cx="73" cy="69" r="15" fill="url(#logoIconBadgeGrad)" stroke="#ffffff" strokeWidth="3.5" />
        <path d="M 66 69 L 71 74 L 80 63" fill="none" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  // Full Logo with Typography
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 380 90"
      style={{ height: `${height}px`, width: 'auto' }}
      className={`select-none shrink-0 ${className}`}
    >
      <defs>
        <linearGradient id="logoFullBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="50%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="logoFullBadgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#16a34a" />
        </linearGradient>
      </defs>

      <g transform="translate(0, 0)">
        <rect x="5" y="5" width="80" height="80" rx="20" fill="url(#logoFullBgGrad)" />

        <rect x="18" y="22" width="54" height="43" rx="7" fill="none" stroke="#ffffff" strokeWidth="4" />
        <line x1="18" y1="33" x2="72" y2="33" stroke="#ffffff" strokeWidth="2.5" />

        <rect x="30" y="16" width="4.5" height="9" rx="2" fill="#ffffff" />
        <rect x="55.5" y="16" width="4.5" height="9" rx="2" fill="#ffffff" />

        <circle cx="33" cy="42" r="4" fill="#ffffff" />
        <path d="M 26 52 C 26 47, 40 47, 40 52" fill="#ffffff" />

        <circle cx="57" cy="42" r="4" fill="#ffffff" />
        <path d="M 50 52 C 50 47, 64 47, 64 52" fill="#ffffff" />

        <circle cx="45" cy="40" r="5.5" fill="#ffffff" />
        <path d="M 36 53 C 36 47, 54 47, 54 53" fill="#ffffff" />

        <circle cx="66" cy="62" r="13" fill="url(#logoFullBadgeGrad)" stroke="#ffffff" strokeWidth="3" />
        <path d="M 60 62 L 64 66 L 72 57" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      <g transform="translate(100, 0)">
        <text x="0" y="46" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" fontWeight="800" fontSize="36" letterSpacing="-0.5">
          <tspan fill="#0f172a">Smart </tspan>
          <tspan fill="#2563eb">Meeting</tspan>
        </text>

        <text x="2" y="68" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" fontWeight="700" fontSize="14" fill="#64748b" letterSpacing="4">
          DECISION TRACKER
        </text>
      </g>
    </svg>
  );
}
