import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { BarChartOutlined } from '@ant-design/icons';
import { useScrollAnimation } from '../../hooks/useScrollAnimation.js';

const PRIORITIES = [
  { key: 'CRITICAL', label: 'Critical Priority', color: '#ef4444' },
  { key: 'HIGH', label: 'High Priority', color: '#f97316' },
  { key: 'MEDIUM', label: 'Medium Priority', color: '#f59e0b' },
  { key: 'LOW', label: 'Low Priority', color: '#10b981' },
];

export const PriorityDistribution = ({ priorityDistribution = {} }) => {
  const [containerRef, isInView] = useScrollAnimation();
  const [activeIndex, setActiveIndex] = React.useState(null);

  // Auto-dismiss timer after 4 seconds
  React.useEffect(() => {
    if (activeIndex !== null) {
      const timer = setTimeout(() => {
        setActiveIndex(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [activeIndex]);

  // Tap anywhere on screen to dismiss active popup
  React.useEffect(() => {
    if (activeIndex !== null) {
      const handlePointerDown = () => {
        setActiveIndex(null);
      };
      const timer = setTimeout(() => {
        document.addEventListener('pointerdown', handlePointerDown);
      }, 10);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('pointerdown', handlePointerDown);
      };
    }
  }, [activeIndex]);

  const handleCloseTooltip = (e) => {
    if (e) {
      e.stopPropagation();
      if (e.preventDefault) e.preventDefault();
      if (e.nativeEvent && e.nativeEvent.stopImmediatePropagation) {
        e.nativeEvent.stopImmediatePropagation();
      }
    }
    setActiveIndex(null);
  };

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
    <div
      ref={containerRef}
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-xs transition-all duration-700 transform h-full flex flex-col justify-between ${
        isInView ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-6 scale-95'
      }`}
    >
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
          <PieChart key={isInView ? 'prio-active' : 'prio-idle'} style={{ outline: 'none' }}>
            <Pie
              data={total > 0 ? chartData : zeroChartData}
              cx="50%"
              cy="50%"
              innerRadius={42}
              outerRadius={65}
              paddingAngle={total > 0 ? 3 : 0}
              dataKey="value"
              strokeWidth={0}
              isAnimationActive={isInView}
              animationBegin={0}
              animationDuration={850}
              activeIndex={activeIndex !== null ? activeIndex : undefined}
              activeShape={{ outerRadius: 69 }}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              onClick={(e, index) => {
                e?.stopPropagation?.();
                setActiveIndex((prev) => (prev === index ? null : index));
              }}
              style={{ outline: 'none', cursor: 'pointer' }}
            >
              {(total > 0 ? chartData : zeroChartData).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} style={{ outline: 'none' }} tabIndex={-1} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center Total Count Label inside Donut */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
            {total}
          </span>
          <span className="text-[9px] uppercase font-bold text-slate-400 mt-0.5">Total Items</span>
        </div>

        {/* Controlled HTML Popover (Direct React DOM overlay - 100% working close button) */}
        {total > 0 && activeIndex !== null && chartData[activeIndex] && (
          <div
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setActiveIndex(null);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setActiveIndex(null);
            }}
            className="absolute top-1 left-1/2 -translate-x-1/2 z-30 bg-slate-900/95 backdrop-blur-md text-white text-[11px] px-3 py-1.5 rounded-lg shadow-xl border border-slate-700/80 cursor-pointer transition-all duration-200 flex items-center justify-between gap-2.5 max-w-[90%]"
          >
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <span
                  className="w-2 h-2 rounded-full inline-block flex-shrink-0"
                  style={{ backgroundColor: chartData[activeIndex].color || '#3b82f6' }}
                />
                <p className="font-bold m-0 text-white leading-tight truncate">
                  {chartData[activeIndex].name}
                </p>
              </div>
              <p className="m-0 text-slate-300 font-semibold mt-0.5 truncate">
                {chartData[activeIndex].value} items ({Math.round((chartData[activeIndex].value / total) * 100)}%)
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveIndex(null);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveIndex(null);
              }}
              className="md:hidden text-slate-400 hover:text-white text-xs font-bold px-1.5 py-0.5 rounded bg-slate-800/90 hover:bg-slate-700 border border-slate-700 cursor-pointer shrink-0 leading-none"
              title="Close"
            >
              ✕
            </button>
          </div>
        )}
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
