import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { BarChartOutlined } from '@ant-design/icons';

const PRIORITIES = [
  { key: 'CRITICAL', label: 'Critical Priority', color: '#ef4444' },
  { key: 'HIGH', label: 'High Priority', color: '#f97316' },
  { key: 'MEDIUM', label: 'Medium Priority', color: '#f59e0b' },
  { key: 'LOW', label: 'Low Priority', color: '#10b981' },
];

export const PriorityDistribution = ({ priorityDistribution = {} }) => {
  const total = PRIORITIES.reduce(
    (sum, p) => sum + (priorityDistribution[p.key] || 0),
    0
  );

  const rawChartData = PRIORITIES.map((p) => ({
    name: p.label,
    value: priorityDistribution[p.key] || 0,
    color: p.color,
    key: p.key,
  }));

  const chartData = rawChartData.filter((item) => item.value > 0);
  const zeroChartData = [{ name: 'No Priority Data', value: 1, color: '#e2e8f0' }];

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

      {/* Centered Pie Chart Container (No side legend / progress bars) */}
      <div className="my-2.5 relative w-full h-44 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={total > 0 ? chartData : zeroChartData}
              cx="50%"
              cy="50%"
              innerRadius={42}
              outerRadius={65}
              paddingAngle={total > 0 ? 3 : 0}
              dataKey="value"
              strokeWidth={0}
            >
              {(total > 0 ? chartData : zeroChartData).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            {total > 0 && (
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0];
                    const pct = Math.round((data.value / total) * 100);
                    return (
                      <div className="bg-slate-900 text-white text-[11px] px-3 py-1.5 rounded-lg shadow-lg border border-slate-700">
                        <p className="font-bold m-0">{data.name}</p>
                        <p className="m-0 text-slate-300 font-semibold">{data.value} items ({pct}%)</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            )}
          </PieChart>
        </ResponsiveContainer>

        {/* Center Total Count Label inside Donut */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
            {total}
          </span>
          <span className="text-[9px] uppercase font-bold text-slate-400 mt-0.5">Total Items</span>
        </div>
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
