'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext.jsx';
import { analyticsService } from '../../services/api.js';
import { LoadingSkeleton } from '../../components/LoadingSkeleton.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import {
  Card, Button, Alert, Tag, Progress, Tooltip
} from 'antd';
import {
  CalendarOutlined, CheckCircleOutlined, ExclamationCircleOutlined,
  FireOutlined, PlusOutlined, ArrowRightOutlined, SyncOutlined,
  SmileOutlined, BarChartOutlined, PieChartOutlined, ClockCircleOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { format } from 'date-fns';

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = () => {
    setLoading(true);
    setError(null);
    analyticsService.getDashboard()
      .then((res) => setData(res))
      .catch(() => setError('Unable to load dashboard data. Please make sure backend server is running.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) return <LoadingSkeleton type="card" count={6} />;

  if (error || !data) {
    return (
      <div className="py-10 max-w-xl mx-auto text-center">
        <Alert
          type="error"
          message="Dashboard Connection Error"
          description={error || 'Failed to fetch dashboard metrics.'}
          showIcon
          className="mb-4 text-left rounded-xl"
        />
        <Button type="primary" onClick={fetchDashboard} icon={<SyncOutlined />} className="rounded-lg font-medium">
          Retry Connection
        </Button>
      </div>
    );
  }

  const { metrics, status_distribution, priority_distribution, meeting_activity, overdue_list } = data;

  const totalActions = (metrics.open_actions || 0) + (metrics.completed_actions || 0);
  const completionRate = totalActions > 0 ? Math.round((metrics.completed_actions / totalActions) * 100) : 0;

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto p-1 sm:p-2">
      
      {/* Top Compact Header Bar (Grid Row) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-lg flex-shrink-0">
            ⚡
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white m-0 leading-tight">
                Welcome back, {user?.first_name || user?.username}!
              </h1>
              <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md hidden md:inline-block">
                Live Overview
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-0.5">
              Real-time meeting analytics & action item tracker grid
            </p>
          </div>
        </div>

        {/* Action Button Group */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/meetings/new" className="no-underline">
            <Button type="primary" size="medium" icon={<PlusOutlined />} className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg border-none shadow-xs text-xs sm:text-sm">
              Schedule Meeting
            </Button>
          </Link>
          <Link href="/my-actions" className="no-underline">
            <Button size="medium" className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-medium rounded-lg border-slate-200 dark:border-slate-700 text-xs sm:text-sm">
              My Actions
            </Button>
          </Link>
          <Button size="medium" icon={<SyncOutlined />} onClick={fetchDashboard} className="text-slate-500 rounded-lg border-slate-200 dark:border-slate-700 px-2.5" />
        </div>
      </div>

      {/* Overdue Alert Bar (Compact Grid Banner) */}
      {metrics.overdue_actions > 0 && (
        <Alert
          type="warning"
          showIcon
          icon={<ExclamationCircleOutlined className="text-rose-500 text-base" />}
          message={
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 w-full">
              <span className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                Attention: You have <strong className="text-rose-600 dark:text-rose-400">{metrics.overdue_actions} overdue action item(s)</strong> requiring completion!
              </span>
              <Link href="/my-actions?tab=OVERDUE" className="text-blue-600 dark:text-blue-400 font-bold hover:underline text-xs no-underline whitespace-nowrap">
                View Overdue <ArrowRightOutlined />
              </Link>
            </div>
          }
          className="border-rose-200 bg-rose-50/90 dark:bg-rose-950/40 dark:border-rose-900/60 rounded-xl py-2 px-3.5 shadow-xs"
        />
      )}

      {/* 6-Column High-Density KPI Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        
        {/* Metric 1 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-3 shadow-xs hover:border-blue-400 dark:hover:border-blue-600 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Meetings</span>
            <div className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs">
              <CalendarOutlined />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{metrics.total_meetings}</span>
            <span className="text-[10px] text-slate-400 font-medium">Logged</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-3 shadow-xs hover:border-cyan-400 dark:hover:border-cyan-600 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Upcoming</span>
            <div className="w-6 h-6 rounded-md bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center text-xs">
              <ClockCircleOutlined />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{metrics.upcoming_meetings}</span>
            <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-semibold">Scheduled</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-3 shadow-xs hover:border-amber-400 dark:hover:border-amber-600 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Open Actions</span>
            <div className="w-6 h-6 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs">
              <ThunderboltOutlined />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{metrics.open_actions}</span>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Active</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-3 shadow-xs hover:border-emerald-400 dark:hover:border-emerald-600 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Completed</span>
            <div className="w-6 h-6 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs">
              <CheckCircleOutlined />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{metrics.completed_actions}</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Done</span>
          </div>
        </div>

        {/* Metric 5 */}
        <div className="bg-rose-50/40 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-xl p-3 shadow-xs hover:border-rose-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-rose-600 dark:text-rose-400">Overdue</span>
            <div className="w-6 h-6 rounded-md bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xs font-bold">
              <ExclamationCircleOutlined />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">{metrics.overdue_actions}</span>
            <span className="text-[10px] text-rose-500 font-bold">Needs Action</span>
          </div>
        </div>

        {/* Metric 6 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-3 shadow-xs hover:border-red-400 dark:hover:border-red-600 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Critical Priority</span>
            <div className="w-6 h-6 rounded-md bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center text-xs">
              <FireOutlined />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{metrics.critical_actions}</span>
            <span className="text-[10px] text-red-500 font-bold">Urgent</span>
          </div>
        </div>

      </div>

      {/* Main 2x2 Tight Grid Dashboard Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch">
        
        {/* Widget 1: Action Status Breakdown (Col Span 6) */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <PieChartOutlined className="text-blue-600 dark:text-blue-400 text-sm" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 m-0">Action Item Status Breakdown</h3>
              </div>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                {completionRate}% Complete
              </span>
            </div>

            <div className="mt-3 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700/50">
              <Progress percent={completionRate} strokeColor="#10b981" size="small" showInfo={false} />
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { status: 'TODO', label: 'Todo', color: '#9ca3af', count: status_distribution.TODO || 0 },
                { status: 'IN_PROGRESS', label: 'In Progress', color: '#2563eb', count: status_distribution.IN_PROGRESS || 0 },
                { status: 'BLOCKED', label: 'Blocked', color: '#ef4444', count: status_distribution.BLOCKED || 0 },
                { status: 'COMPLETED', label: 'Completed', color: '#10b981', count: status_distribution.COMPLETED || 0 },
                { status: 'CANCELLED', label: 'Cancelled', color: '#6b7280', count: status_distribution.CANCELLED || 0 }
              ].map((item) => (
                <div key={item.status} className="flex items-center justify-between p-2 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{item.label}</span>
                  </div>
                  <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Widget 2: Priority Distribution (Col Span 6) */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <BarChartOutlined className="text-amber-500 text-sm" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 m-0">Priority Level Distribution</h3>
              </div>
              <span className="text-xs font-medium text-slate-400">Total: {totalActions}</span>
            </div>

            <div className="mt-3 space-y-2.5">
              {[
                { priority: 'CRITICAL', label: 'Critical Priority', color: 'bg-rose-500', count: priority_distribution.CRITICAL || 0 },
                { priority: 'HIGH', label: 'High Priority', color: 'bg-amber-500', count: priority_distribution.HIGH || 0 },
                { priority: 'MEDIUM', label: 'Medium Priority', color: 'bg-blue-600', count: priority_distribution.MEDIUM || 0 },
                { priority: 'LOW', label: 'Low Priority', color: 'bg-emerald-500', count: priority_distribution.LOW || 0 }
              ].map((p) => {
                const maxVal = Math.max(...Object.values(priority_distribution), 1);
                const percentage = Math.round((p.count / maxVal) * 100);
                return (
                  <div key={p.priority} className="p-2 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <span>{p.label}</span>
                      <span className="font-extrabold text-slate-900 dark:text-slate-100">{p.count} items</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div className={`${p.color} h-2 rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Widget 3: Meeting Activity Chart (Col Span 7) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <BarChartOutlined className="text-blue-600 dark:text-blue-400 text-sm" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 m-0">Meeting Activity & Frequency</h3>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Grouped by Date</span>
            </div>

            {meeting_activity.length === 0 ? (
              <p className="text-center text-slate-400 py-8 text-xs">No meeting activity logged yet.</p>
            ) : (
              <div className="pt-4">
                <div className="flex items-end space-x-4 sm:space-x-6 h-40 border-b border-slate-200 dark:border-slate-700 pb-1.5 px-2 overflow-x-auto">
                  {meeting_activity.map((act, idx) => {
                    const maxCount = Math.max(...meeting_activity.map(a => a.count), 1);
                    const heightPercent = Math.max(Math.round((act.count / maxCount) * 100), 18);

                    return (
                      <div key={idx} className="flex flex-col items-center w-14 group flex-shrink-0">
                        <Tooltip title={`${act.count} Meeting(s) on ${act.meeting_date}`}>
                          <div className="w-full flex flex-col justify-end items-center h-32">
                            <div
                              className="w-10 bg-gradient-to-t from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 rounded-t-md transition-all duration-300 flex items-center justify-center text-white text-[11px] font-black shadow-xs"
                              style={{ height: `${heightPercent}%` }}
                            >
                              {act.count}
                            </div>
                          </div>
                        </Tooltip>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-bold truncate w-full text-center">
                          {format(new Date(act.meeting_date), 'MMM dd')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Widget 4: Urgent Overdue Items Grid Widget (Col Span 5) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <ExclamationCircleOutlined className="text-rose-500 text-sm" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 m-0">Urgent Overdue Items</h3>
              </div>
              <Tag color={overdue_list.length > 0 ? 'volcano' : 'green'} className="font-bold rounded text-[10px] m-0">
                {overdue_list.length} Items
              </Tag>
            </div>

            {overdue_list.length === 0 ? (
              <div className="py-6 text-center space-y-1">
                <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto text-xl">
                  <SmileOutlined />
                </div>
                <p className="font-bold text-slate-800 dark:text-slate-200 text-xs m-0">All Actions On Track!</p>
                <p className="text-[11px] text-slate-400 m-0">No overdue items requiring immediate attention.</p>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {overdue_list.slice(0, 3).map((item) => (
                  <div key={item.id} className="p-2.5 bg-rose-50/70 dark:bg-rose-950/30 rounded-lg border border-rose-100 dark:border-rose-900/50 flex justify-between items-center">
                    <div className="space-y-0.5 min-w-0 pr-2">
                      <p className="font-bold text-xs text-slate-900 dark:text-slate-100 m-0 truncate">{item.title}</p>
                      <div className="flex items-center space-x-2 text-[10px] text-slate-500 dark:text-slate-400">
                        <span className="truncate">By: {item.assigned_to}</span>
                        <span>•</span>
                        <span className="text-rose-600 dark:text-rose-400 font-bold">Due: {format(new Date(item.due_date), 'MMM dd')}</span>
                      </div>
                    </div>
                    <StatusBadge type="priority" value={item.priority} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-2 text-right">
            <Link href="/my-actions?tab=OVERDUE" className="no-underline">
              <Button type="link" size="small" className="text-xs text-blue-600 dark:text-blue-400 font-bold p-0">
                View All Overdue →
              </Button>
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
}
