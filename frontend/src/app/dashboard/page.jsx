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
  SmileOutlined, BarChartOutlined, PieChartOutlined
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
      <div className="py-12 max-w-2xl mx-auto text-center">
        <Alert
          type="error"
          message="Dashboard Error"
          description={error || 'Failed to fetch dashboard data.'}
          showIcon
          className="mb-4 text-left"
        />
        <Button type="primary" onClick={fetchDashboard} icon={<SyncOutlined />}>
          Retry Connection
        </Button>
      </div>
    );
  }

  const { metrics, status_distribution, priority_distribution, meeting_activity, overdue_list } = data;

  const totalActions = (metrics.open_actions || 0) + (metrics.completed_actions || 0);
  const completionRate = totalActions > 0 ? Math.round((metrics.completed_actions / totalActions) * 100) : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Executive Welcome Hero Banner */}
      <div className="relative overflow-hidden bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-5 sm:p-7 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-5 transition-all">
        <div className="space-y-1.5 z-10">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40">
              Overview
            </span>
            <span className="text-xs text-slate-400 font-medium">Updated just now</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight m-0 flex items-center gap-2">
            <span>Welcome back, {user?.first_name || user?.username}!</span>
            <span className="inline-block animate-bounce">👋</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm m-0 max-w-xl">
            Track meeting productivity, monitor action item dependencies, and analyze team decision velocity.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto z-10">
          <Link href="/meetings/new" className="no-underline w-full sm:w-auto">
            <Button type="primary" size="large" icon={<PlusOutlined />} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl border-none shadow-md flex items-center justify-center">
              Schedule Meeting
            </Button>
          </Link>
          <Link href="/my-actions" className="no-underline w-full sm:w-auto">
            <Button size="large" className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-100 font-semibold rounded-xl border-slate-200 dark:border-slate-600 flex items-center justify-center">
              My Action Items
            </Button>
          </Link>
        </div>
      </div>

      {/* Overdue Alert Bar */}
      {metrics.overdue_actions > 0 && (
        <Alert
          type="warning"
          showIcon
          icon={<ExclamationCircleOutlined className="text-rose-500 text-lg" />}
          message={
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 w-full">
              <span className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                ⚠️ Attention: You have <strong className="text-rose-600 dark:text-rose-400">{metrics.overdue_actions} overdue action item(s)</strong> requiring immediate attention!
              </span>
              <Link href="/my-actions?tab=OVERDUE" className="text-blue-600 dark:text-blue-400 font-bold hover:underline text-xs sm:text-sm no-underline whitespace-nowrap">
                View Overdue Actions <ArrowRightOutlined />
              </Link>
            </div>
          }
          className="border-rose-200 bg-rose-50/80 dark:bg-rose-950/40 dark:border-rose-900/50 rounded-2xl p-3 sm:p-4 shadow-xs"
        />
      )}

      {/* Top Metric Cards (KPI Executive Grid) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        
        <Card styles={{ body: { padding: '16px' } }} className="border border-slate-200/80 dark:border-slate-700/80 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 dark:bg-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400">Total Meetings</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <CalendarOutlined className="text-sm" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{metrics.total_meetings}</span>
            <span className="text-[11px] text-slate-400 font-medium">Logged</span>
          </div>
        </Card>

        <Card styles={{ body: { padding: '16px' } }} className="border border-slate-200/80 dark:border-slate-700/80 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 dark:bg-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400">Upcoming</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold">
              <SyncOutlined className="text-sm" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{metrics.upcoming_meetings}</span>
            <span className="text-[11px] text-cyan-600 dark:text-cyan-400 font-semibold">Scheduled</span>
          </div>
        </Card>

        <Card styles={{ body: { padding: '16px' } }} className="border border-slate-200/80 dark:border-slate-700/80 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 dark:bg-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400">Open Actions</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <SyncOutlined className="text-sm" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{metrics.open_actions}</span>
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">In Progress</span>
          </div>
        </Card>

        <Card styles={{ body: { padding: '16px' } }} className="border border-slate-200/80 dark:border-slate-700/80 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 dark:bg-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400">Completed</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <CheckCircleOutlined className="text-sm" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{metrics.completed_actions}</span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Done</span>
          </div>
        </Card>

        <Card styles={{ body: { padding: '16px' } }} className="border border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/30 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider font-extrabold text-rose-600 dark:text-rose-400">Overdue</span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <ExclamationCircleOutlined className="text-sm" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-rose-600 dark:text-rose-400 tracking-tight">{metrics.overdue_actions}</span>
            <span className="text-[11px] text-rose-500 font-bold">Action Needed</span>
          </div>
        </Card>

        <Card styles={{ body: { padding: '16px' } }} className="border border-slate-200/80 dark:border-slate-700/80 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 dark:bg-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400">Critical Priority</span>
            <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center font-bold">
              <FireOutlined className="text-sm" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{metrics.critical_actions}</span>
            <span className="text-[11px] text-red-500 font-bold">Urgent</span>
          </div>
        </Card>

      </div>

      {/* Main Analytics Breakdown (3 equal-height widgets on laptop) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        
        {/* Widget 1: Action Status Breakdown */}
        <Card
          styles={{ body: { display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' } }}
          title={
            <div className="flex items-center space-x-2 py-1">
              <PieChartOutlined className="text-blue-600 dark:text-blue-400" />
              <span className="font-bold text-slate-900 dark:text-slate-100">Action Status Breakdown</span>
            </div>
          }
          className="shadow-xs rounded-2xl border border-slate-200/80 dark:border-slate-700/80 dark:bg-slate-800 flex flex-col h-full"
        >
          <div className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-700/60">
              <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                <span>Overall Completion Rate</span>
                <span className="text-emerald-600 dark:text-emerald-400">{completionRate}%</span>
              </div>
              <Progress percent={completionRate} strokeColor="#10b981" showInfo={false} />
            </div>

            <div className="space-y-2.5">
              {[
                { status: 'TODO', label: 'Todo', color: '#9ca3af', count: status_distribution.TODO || 0 },
                { status: 'IN_PROGRESS', label: 'In Progress', color: '#2563eb', count: status_distribution.IN_PROGRESS || 0 },
                { status: 'BLOCKED', label: 'Blocked', color: '#ef4444', count: status_distribution.BLOCKED || 0 },
                { status: 'COMPLETED', label: 'Completed', color: '#10b981', count: status_distribution.COMPLETED || 0 },
                { status: 'CANCELLED', label: 'Cancelled', color: '#6b7280', count: status_distribution.CANCELLED || 0 }
              ].map((item) => (
                <div key={item.status} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                  <div className="flex items-center space-x-2.5">
                    <span className="w-3 h-3 rounded-full shadow-xs" style={{ backgroundColor: item.color }} />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{item.label}</span>
                  </div>
                  <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-md">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Widget 2: Priority Distribution */}
        <Card
          styles={{ body: { display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' } }}
          title={
            <div className="flex items-center space-x-2 py-1">
              <BarChartOutlined className="text-amber-500" />
              <span className="font-bold text-slate-900 dark:text-slate-100">Priority Level Distribution</span>
            </div>
          }
          className="shadow-xs rounded-2xl border border-slate-200/80 dark:border-slate-700/80 dark:bg-slate-800 flex flex-col h-full"
        >
          <div className="space-y-4 py-1">
            {[
              { priority: 'CRITICAL', label: 'Critical Priority', color: 'bg-rose-500', count: priority_distribution.CRITICAL || 0 },
              { priority: 'HIGH', label: 'High Priority', color: 'bg-amber-500', count: priority_distribution.HIGH || 0 },
              { priority: 'MEDIUM', label: 'Medium Priority', color: 'bg-blue-600', count: priority_distribution.MEDIUM || 0 },
              { priority: 'LOW', label: 'Low Priority', color: 'bg-emerald-500', count: priority_distribution.LOW || 0 }
            ].map((p) => {
              const maxVal = Math.max(...Object.values(priority_distribution), 1);
              const percentage = Math.round((p.count / maxVal) * 100);
              return (
                <div key={p.priority} className="space-y-1.5 p-2 rounded-lg bg-slate-50/70 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-700/40">
                  <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>{p.label}</span>
                    <span className="font-extrabold text-slate-900 dark:text-slate-100">{p.count} items</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                    <div className={`${p.color} h-2.5 rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Widget 3: Urgent Overdue Items Quick Widget */}
        <Card
          styles={{ body: { display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' } }}
          title={
            <div className="flex justify-between items-center py-1">
              <div className="flex items-center space-x-2">
                <ExclamationCircleOutlined className="text-rose-500" />
                <span className="font-bold text-slate-900 dark:text-slate-100">Urgent Overdue Items</span>
              </div>
              <Tag color={overdue_list.length > 0 ? 'volcano' : 'green'} className="font-bold rounded-md">
                {overdue_list.length} Items
              </Tag>
            </div>
          }
          className="shadow-xs rounded-2xl border border-slate-200/80 dark:border-slate-700/80 dark:bg-slate-800 flex flex-col h-full"
        >
          {overdue_list.length === 0 ? (
            <div className="my-auto py-8 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto text-2xl">
                <SmileOutlined />
              </div>
              <p className="font-bold text-slate-800 dark:text-slate-200 text-sm m-0">All Action Items On Track!</p>
              <p className="text-xs text-slate-400 m-0 max-w-xs mx-auto">🎉 Great job! No overdue action items requiring attention right now.</p>
            </div>
          ) : (
            <div className="space-y-3 flex-1">
              {overdue_list.slice(0, 4).map((item) => (
                <div key={item.id} className="p-3 bg-rose-50/60 dark:bg-rose-950/40 rounded-xl border border-rose-100 dark:border-rose-900/50 flex justify-between items-center">
                  <div className="space-y-1">
                    <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 m-0 line-clamp-1">{item.title}</p>
                    <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>Owner: {item.assigned_to}</span>
                      <span>•</span>
                      <span className="text-rose-600 dark:text-rose-400 font-semibold">Due: {format(new Date(item.due_date), 'MMM dd')}</span>
                    </div>
                  </div>
                  <StatusBadge type="priority" value={item.priority} />
                </div>
              ))}
              <div className="pt-2 text-center mt-auto">
                <Link href="/my-actions?tab=OVERDUE" className="no-underline">
                  <Button type="link" className="text-xs text-blue-600 dark:text-blue-400 font-semibold p-0">
                    View All Overdue Actions →
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </Card>

      </div>

      {/* Meeting Activity Timeline Analytics Chart */}
      <Card
        title={
          <div className="flex items-center space-x-2 py-1">
            <BarChartOutlined className="text-blue-600 dark:text-blue-400" />
            <span className="font-bold text-slate-900 dark:text-slate-100">Meeting Activity & Frequency Timeline</span>
          </div>
        }
        className="shadow-xs rounded-2xl border border-slate-200/80 dark:border-slate-700/80 dark:bg-slate-800"
      >
        {meeting_activity.length === 0 ? (
          <p className="text-center text-slate-400 py-8 text-sm">No meeting activity logged yet.</p>
        ) : (
          <div className="pt-4 pb-2 px-2">
            <div className="flex items-end space-x-6 h-48 border-b border-slate-200 dark:border-slate-700 pb-2 px-4 overflow-x-auto">
              {meeting_activity.map((act, idx) => {
                const maxCount = Math.max(...meeting_activity.map(a => a.count), 1);
                const heightPercent = Math.max(Math.round((act.count / maxCount) * 100), 20);

                return (
                  <div key={idx} className="flex flex-col items-center w-16 group flex-shrink-0">
                    <Tooltip title={`${act.count} Meeting(s) on ${act.meeting_date}`}>
                      <div className="w-full flex flex-col justify-end items-center h-40">
                        <div
                          className="w-12 bg-gradient-to-t from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 rounded-t-lg transition-all duration-300 flex items-center justify-center text-white text-xs font-extrabold shadow-sm"
                          style={{ height: `${heightPercent}%` }}
                        >
                          {act.count}
                        </div>
                      </div>
                    </Tooltip>
                    <span className="text-xs text-slate-600 dark:text-slate-400 mt-2.5 font-bold truncate w-full text-center">
                      {format(new Date(act.meeting_date), 'MMM dd')}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 text-center text-xs text-slate-400 font-medium">
              Meeting Frequency (Grouped by Date)
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
