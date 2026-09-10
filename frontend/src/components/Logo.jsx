'use client';

import React from 'react';

export function Logo({ variant = 'full', height = 36, className = '' }) {
  if (variant === 'icon') {
    return (
      <img
        src="/icon.svg"
        alt="Smart Meeting Tracker Icon"
        style={{ height: `${height}px`, width: 'auto' }}
        className={`object-contain select-none ${className}`}
      />
    );
  }

  return (
    <img
      src="/logo.svg"
      alt="Smart Meeting Decision Tracker"
      style={{ height: `${height}px`, width: 'auto' }}
      className={`object-contain select-none ${className}`}
    />
  );
}
