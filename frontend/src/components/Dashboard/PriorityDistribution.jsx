'use client';

import React from 'react';
import { BarChartOutlined } from '@ant-design/icons';

const PRIORITIES = [
  {
    key: 'CRITICAL',
    label: 'Critical Priority',
    colorBg: 'bg-red-500',
    colorText: 'text-red-600 dark:text-red-400',
    barColor: '#ef4444',
  },
  {
    key: 'HIGH',
    label: 'High Priority',
    colorBg: 'bg-orange-500',
    colorText: 'text-orange-600 dark:text-orange-400',
    barColor: '#f97316',
  },
  {
    key: 'MEDIUM',
    label: 'Medium Priority',
    colorBg: 'bg-amber-500',
    colorText: 'text-amber-600 dark:text-amber-400',
    barColor: '#f59e0b',
  },
  {
    key: 'LOW',
    label: 'Low Priority',
    colorBg: 'bg-emerald-500',
    colorText: 'text-emerald-600 dark:text-emerald-400',
    barColor: '#10b981',
  },
];

export const PriorityDistribution = ({ priorityDistribution = {} }) => {
  const total = PRIORITIES.reduce(
    (sum, p) => sum + (priorityDistribution[p.key] || 0),
    0
  );

  const maxVal = Math.max(...PRIORITIES.map((p) => priorityDistribution[p.key] || 0), 1);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-xs transition-all h-full flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="w-6.5 h-6.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs">
            <BarChartOutlined />
          </div>
          <div>
            <h3 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 m-0">
              Priority Distribution
            </h3>
          </div>
        </div>
        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
          Total: <strong className="text-slate-900 dark:text-white font-bold">{total}</strong>
        </span>
      </div>

      {/* Priority Progress Bars */}
      <div className="my-2.5 space-y-2">
        {PRIORITIES.map((p) => {
          const count = priorityDistribution[p.key] || 0;
          const percentage = Math.round((count / maxVal) * 100);

          return (
            <div key={p.key} className="space-y-1">
              <div className="flex justify-between items-center text-[11px]">
                <div className="flex items-center space-x-2">
                  <span className={`w-2 h-2 rounded-full ${p.colorBg}`} />
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {p.label}
                  </span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">
                  {count}
                </span>
              </div>

              {/* Progress Bar Container */}
              <div className="w-full bg-slate-100 dark:bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${p.colorBg}`}
                  style={{ width: count > 0 ? `${Math.max(percentage, 5)}%` : '0%' }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Summary */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
        <span>Urgent Priority</span>
        <span className="font-bold text-red-600 dark:text-red-400">
          {(priorityDistribution.CRITICAL || 0) + (priorityDistribution.HIGH || 0)} Items
        </span>
      </div>
    </div>
  );
};
