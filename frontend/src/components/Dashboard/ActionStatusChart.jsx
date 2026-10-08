import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChartOutlined } from '@ant-design/icons';
import { useScrollAnimation } from '../../hooks/useScrollAnimation.js';

const STATUS_CONFIG = [
  { key: 'TODO', label: 'Todo', color: '#64748b' },
  { key: 'IN_PROGRESS', label: 'In Progress', color: '#6366f1' },
  { key: 'BLOCKED', label: 'Blocked', color: '#f43f5e' },
  { key: 'COMPLETED', label: 'Completed', color: '#10b981' },
  { key: 'CANCELLED', label: 'Cancelled', color: '#a1a1aa' },
];

export const ActionStatusChart = ({ statusDistribution = {} }) => {
  const [containerRef, isInView] = useScrollAnimation();
  const [activeIndex, setActiveIndex] = React.useState(null);

  // Auto-dismiss timer after 5 seconds
  React.useEffect(() => {
    if (activeIndex !== null) {
      const timer = setTimeout(() => {
        setActiveIndex(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [activeIndex]);

  // Tap outside container to dismiss active popup
  React.useEffect(() => {
    if (activeIndex !== null) {
      const handlePointerDown = (e) => {
        if (containerRef.current && !containerRef.current.contains(e.target)) {
          setActiveIndex(null);
        }
      };
      const timer = setTimeout(() => {
        document.addEventListener('pointerdown', handlePointerDown);
      }, 50);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('pointerdown', handlePointerDown);
      };
    }
  }, [activeIndex]);

  const handleCloseTooltip = (e) => {
    if (e) {
      e.stopPropagation();
    }
    setActiveIndex(null);
  };

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

  const zeroChartData = [{ name: 'No Actions', value: 1, color: '#e2e8f0' }];

  return (
    <div
      ref={containerRef}
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-xs transition-all duration-700 transform h-full flex flex-col justify-between ${
        isInView ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-6 scale-95'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
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

      {/* Centered Pie Chart Container & Side Vertical Legend */}
      <div className="my-1.5 flex flex-row items-center justify-between gap-2 sm:gap-3 min-h-[130px] sm:min-h-[185px]">
        {/* Pie Chart */}
        <div className="relative w-32 sm:w-1/2 h-32 sm:h-44 flex items-center justify-center shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart key={isInView ? 'pie-active' : 'pie-idle'} style={{ outline: 'none' }}>
              <Pie
                data={totalActions > 0 ? chartData : zeroChartData}
                cx="50%"
                cy="50%"
                innerRadius={typeof window !== 'undefined' && window.innerWidth < 640 ? 26 : 38}
                outerRadius={typeof window !== 'undefined' && window.innerWidth < 640 ? 44 : 60}
                paddingAngle={totalActions > 0 ? 3 : 0}
                dataKey="value"
                strokeWidth={0}
                isAnimationActive={isInView}
                animationBegin={0}
                animationDuration={850}
                activeIndex={activeIndex !== null ? activeIndex : undefined}
                activeShape={{ outerRadius: typeof window !== 'undefined' && window.innerWidth < 640 ? 48 : 64 }}
                onMouseEnter={(_, index) => {
                  if (typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches) {
                    setActiveIndex(index);
                  }
                }}
                onMouseLeave={() => {
                  if (typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches) {
                    setActiveIndex(null);
                  }
                }}
                onClick={(e, index) => {
                  e?.stopPropagation?.();
                  setActiveIndex((prev) => (prev === index ? null : index));
                }}
                style={{ outline: 'none', cursor: 'pointer' }}
              >
                {(totalActions > 0 ? chartData : zeroChartData).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} style={{ outline: 'none' }} tabIndex={-1} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Center Label inside Donut */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-none">
              {totalActions}
            </span>
            <span className="text-[7px] sm:text-[8px] uppercase font-bold text-slate-500 dark:text-slate-300 mt-0.5">Total Actions</span>
          </div>

          {/* Controlled HTML Popover */}
          {totalActions > 0 && activeIndex !== null && chartData[activeIndex] && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute top-1 left-1/2 -translate-x-1/2 z-30 bg-slate-900/95 backdrop-blur-md text-white text-[11px] px-3 py-1.5 rounded-lg shadow-xl border border-slate-700/80 transition-all duration-200 flex items-center justify-between gap-2.5 max-w-[95%] pointer-events-auto"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-xs"
                    style={{ backgroundColor: chartData[activeIndex].color || '#3b82f6' }}
                  />
                  <p className="font-bold m-0 text-white leading-tight truncate">
                    {chartData[activeIndex].name}
                  </p>
                </div>
                <p className="m-0 text-slate-300 font-semibold mt-0.5 truncate text-[10px]">
                  {chartData[activeIndex].value} items ({Math.round((chartData[activeIndex].value / totalActions) * 100)}%)
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseTooltip}
                className="text-slate-400 hover:text-white text-xs font-extrabold px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 cursor-pointer shrink-0 leading-none"
                title="Close details"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Vertical Legend Column */}
        <div className="w-1/2 sm:w-1/2 flex flex-col justify-center space-y-0.5 sm:space-y-1 pl-1.5 sm:pl-3 border-l border-slate-100 dark:border-slate-800/80">
          {STATUS_CONFIG.map((status) => {
            const count = statusDistribution[status.key] || 0;
            const chartDataIndex = chartData.findIndex((item) => item.key === status.key);
            const isSelected = activeIndex !== null && activeIndex === chartDataIndex;
            const hasItems = count > 0;
            const percentage = totalActions > 0 ? Math.round((count / totalActions) * 100) : 0;

            return (
              <button
                key={status.key}
                type="button"
                onMouseEnter={() => {
                  if (chartDataIndex !== -1) setActiveIndex(chartDataIndex);
                }}
                onMouseLeave={() => {
                  if (chartDataIndex !== -1) setActiveIndex(null);
                }}
                onClick={() => {
                  if (chartDataIndex !== -1) {
                    setActiveIndex((prev) => (prev === chartDataIndex ? null : chartDataIndex));
                  }
                }}
                className={`w-full flex items-center justify-between px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md border text-left text-[10px] sm:text-[11px] transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 shadow-xs font-bold'
                    : hasItems
                    ? 'bg-slate-50/60 dark:bg-slate-800/30 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-medium'
                    : 'bg-transparent border-transparent text-slate-400 dark:text-slate-600 opacity-50 font-normal'
                }`}
              >
                <div className="flex items-center space-x-1.5 min-w-0">
                  <span
                    className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full inline-block shrink-0"
                    style={{ backgroundColor: status.color }}
                  />
                  <span className="truncate">{status.label}</span>
                </div>
                <div className="flex items-center space-x-0.5 sm:space-x-1 text-[9px] sm:text-[10px] shrink-0 ml-1">
                  <span className="font-bold text-slate-900 dark:text-slate-100">{count}</span>
                  <span className="text-slate-600 dark:text-slate-300 font-semibold">({percentage}%)</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Progress Footer */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] flex items-center justify-between">
        <span className="font-semibold text-slate-600 dark:text-slate-300">Completed</span>
        <span className="font-extrabold text-slate-900 dark:text-slate-100">
          {completionCount} / {totalActions} Tasks
        </span>
      </div>
    </div>
  );
};
