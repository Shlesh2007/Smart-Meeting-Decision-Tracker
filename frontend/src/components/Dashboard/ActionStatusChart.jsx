'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChartOutlined } from '@ant-design/icons';

const STATUS_CONFIG = [
  { key: 'TODO', label: 'Todo', color: '#9ca3af', bgClass: 'bg-slate-400' },
  { key: 'IN_PROGRESS', label: 'In Progress', color: '#2563eb', bgClass: 'bg-blue-600' },
  { key: 'BLOCKED', label: 'Blocked', color: '#ef4444', bgClass: 'bg-red-500' },
  { key: 'COMPLETED', label: 'Completed', color: '#10b981', bgClass: 'bg-emerald-500' },
  { key: 'CANCELLED', label: 'Cancelled', color: '#6b7280', bgClass: 'bg-gray-500' },
];

export const ActionStatusChart = ({ statusDistribution = {} }) => {
  const rawChartData = STATUS_CONFIG.map((status) => ({
    name: status.label,
    value: statusDistribution[status.key] || 0,
    color: status.color,
    key: status.key,
  }));

  const chartData = rawChartData.filter((item) => item.value > 0);

  const totalActions = STATUS_CONFIG.reduce(
    (sum, status) => sum + (statusDistribution[status.key] || 0),
    0
  );

  const completionCount = statusDistribution.COMPLETED || 0;
  const completionRate = totalActions > 0 ? Math.round((completionCount / totalActions) * 100) : 0;

  // Placeholder ring data for zero actions
  const zeroChartData = [{ name: 'No Actions', value: 1, color: '#e2e8f0' }];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-xs transition-all h-full flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="w-6.5 h-6.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs">
            <PieChartOutlined />
          </div>
          <div>
            <h3 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 m-0">
              Action Status Breakdown
            </h3>
          </div>
        </div>
        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200/80 dark:border-emerald-900/80">
          {completionRate}% Done
        </span>
      </div>

      {/* Chart & Legend Container */}
      <div className="my-2.5 flex items-center gap-3">
        {/* Compact Donut Chart with Centered Total */}
        <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={totalActions > 0 ? chartData : zeroChartData}
                cx="50%"
                cy="50%"
                innerRadius={32}
                outerRadius={44}
                paddingAngle={totalActions > 0 ? 3 : 0}
                dataKey="value"
                strokeWidth={0}
              >
                {(totalActions > 0 ? chartData : zeroChartData).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              {totalActions > 0 && (
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0];
                      const pct = totalActions > 0 ? Math.round((data.value / totalActions) * 100) : 0;
                      return (
                        <div className="bg-slate-900 text-white text-[10px] px-2 py-1 rounded shadow-md">
                          <p className="font-bold m-0">{data.name}</p>
                          <p className="m-0 text-slate-300">{data.value} ({pct}%)</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              )}
            </PieChart>
          </ResponsiveContainer>

          {/* Center Label inside Donut */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-none">
              {totalActions}
            </span>
            <span className="text-[8px] uppercase font-bold text-slate-400 mt-0.5">Actions</span>
          </div>
        </div>

        {/* Compact Status List Legend */}
        <div className="flex-1 w-full space-y-1">
          {STATUS_CONFIG.map((status) => {
            const count = statusDistribution[status.key] || 0;
            const pct = totalActions > 0 ? Math.round((count / totalActions) * 100) : 0;

            return (
              <div
                key={status.key}
                className="flex items-center justify-between px-2 py-1 rounded-md bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-[11px]"
              >
                <div className="flex items-center space-x-2 min-w-0 pr-1">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${status.bgClass}`} />
                  <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                    {status.label}
                  </span>
                </div>
                <div className="flex items-center space-x-1.5 shrink-0">
                  <span className="font-bold text-slate-900 dark:text-slate-100">{count}</span>
                  <span className="text-[9px] text-slate-400 w-7 text-right font-semibold">
                    {pct}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress Footer */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
        <span>Completed</span>
        <span className="font-bold text-slate-700 dark:text-slate-300">
          {completionCount} / {totalActions} Tasks
        </span>
      </div>
    </div>
  );
};
