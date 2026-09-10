'use client';

import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { BarChartOutlined } from '@ant-design/icons';
import { format, subDays, isAfter } from 'date-fns';

export const MeetingActivityChart = ({ meetingActivity = [] }) => {
  const [filterDays, setFilterDays] = useState(30);

  const filteredData = React.useMemo(() => {
    if (!meetingActivity || meetingActivity.length === 0) return [];
    if (filterDays === 0) return meetingActivity;

    const cutoffDate = subDays(new Date(), filterDays);
    return meetingActivity.filter((item) => {
      if (!item.meeting_date) return false;
      const d = new Date(item.meeting_date);
      return isAfter(d, cutoffDate);
    });
  }, [meetingActivity, filterDays]);

  const chartFormattedData = filteredData.map((item) => ({
    date: item.meeting_date ? format(new Date(item.meeting_date), 'MMM dd') : 'N/A',
    count: item.count || 0,
    fullDate: item.meeting_date,
  }));

  const totalMeetingsInPeriod = chartFormattedData.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-xs transition-all h-full flex flex-col justify-between">
      {/* Top Header & Range Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="w-6.5 h-6.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs">
            <BarChartOutlined />
          </div>
          <div>
            <h3 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 m-0">
              Meeting Activity
            </h3>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50 text-[10px]">
          {[
            { label: '7D', value: 7 },
            { label: '14D', value: 14 },
            { label: '30D', value: 30 },
            { label: 'All', value: 0 },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFilterDays(tab.value)}
              className={`px-2 py-0.5 rounded font-bold border-0 cursor-pointer transition-all ${
                filterDays === tab.value
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 bg-transparent hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Body */}
      <div className="my-2 h-40 w-full flex items-center justify-center">
        {chartFormattedData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartFormattedData} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="meetingGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                allowDecimals={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white text-[10px] px-2.5 py-1 rounded shadow-md">
                        <p className="font-bold m-0">{data.date}</p>
                        <p className="m-0 text-blue-400 font-semibold">{data.count} Meeting(s)</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#2563eb"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#meetingGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-center p-3 bg-slate-50/50 dark:bg-slate-800/30">
            <p className="text-slate-600 dark:text-slate-300 font-bold text-xs m-0">No activity yet</p>
            <p className="text-[10px] text-slate-400 m-0 mt-0.5">
              Your meeting activity over time will appear here once meetings are created.
            </p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
        <span>Activity Log</span>
        <span className="font-semibold text-blue-600 dark:text-blue-400">
          {totalMeetingsInPeriod} Meetings in Period
        </span>
      </div>
    </div>
  );
};
