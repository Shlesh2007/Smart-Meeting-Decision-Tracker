'use client';

import React from 'react';
import { Skeleton } from 'antd';

export const DashboardSkeleton = () => {
  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-2 sm:p-4">
      {/* Header Hero Skeleton */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <Skeleton active avatar paragraph={{ rows: 1 }} />
      </div>

      {/* 6 KPI Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3"
          >
            <div className="flex justify-between items-center">
              <Skeleton.Input active size="small" style={{ width: 70 }} />
              <Skeleton.Avatar active size="small" shape="square" />
            </div>
            <Skeleton.Input active size="large" style={{ width: 90 }} />
          </div>
        ))}
      </div>

      {/* Grid Row 2 Skeletons */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <Skeleton active paragraph={{ rows: 5 }} />
        </div>
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <Skeleton active paragraph={{ rows: 5 }} />
        </div>
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <Skeleton active paragraph={{ rows: 5 }} />
        </div>
      </div>

      {/* Grid Row 3 Skeletons */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <Skeleton active paragraph={{ rows: 6 }} />
        </div>
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <Skeleton active paragraph={{ rows: 6 }} />
        </div>
      </div>
    </div>
  );
};
