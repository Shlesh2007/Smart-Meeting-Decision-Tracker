'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext.jsx';
import { analyticsService } from '../../services/api.js';
import { Alert, Button } from 'antd';
import { SyncOutlined, ExclamationCircleOutlined, ArrowRightOutlined } from '@ant-design/icons';

import { DashboardHeader } from '../../components/Dashboard/DashboardHeader.jsx';
import { DashboardMetrics } from '../../components/Dashboard/DashboardMetrics.jsx';
import { ActionStatusChart } from '../../components/Dashboard/ActionStatusChart.jsx';
import { PriorityDistribution } from '../../components/Dashboard/PriorityDistribution.jsx';
import { MeetingActivityChart } from '../../components/Dashboard/MeetingActivityChart.jsx';
import { UpcomingMeetings } from '../../components/Dashboard/UpcomingMeetings.jsx';
import { RecentCompletedActions } from '../../components/Dashboard/RecentCompletedActions.jsx';
import { NeedsAttention } from '../../components/Dashboard/NeedsAttention.jsx';
import { QuickActions } from '../../components/Dashboard/QuickActions.jsx';
import { DashboardSkeleton } from '../../components/Dashboard/DashboardSkeleton.jsx';

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = () => {
    setLoading(true);
    setError(null);
    analyticsService
      .getDashboard()
      .then((res) => setData(res))
      .catch(() =>
        setError(
          'Unable to load dashboard metrics. Please ensure your backend API server is running.'
        )
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading && !data) return <DashboardSkeleton />;

  if (error || !data) {
    return (
      <div className="py-12 max-w-xl mx-auto text-center space-y-3">
        <Alert
          type="error"
          message="Dashboard Connection Error"
          description={error || 'Failed to fetch dashboard metrics from API.'}
          showIcon
          className="text-left rounded-xl p-3.5 shadow-xs"
        />
        <Button
          type="primary"
          onClick={fetchDashboard}
          icon={<SyncOutlined />}
          className="bg-blue-600 font-bold rounded-lg h-9 px-5 text-xs"
        >
          Retry Connection
        </Button>
      </div>
    );
  }

  const {
    metrics = {},
    status_distribution = {},
    priority_distribution = {},
    meeting_activity = [],
    overdue_list = [],
  } = data;

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto pb-8">
      
      {/* 1. Header Greeting & Quick CTAs Hero */}
      <DashboardHeader user={user} onRefresh={fetchDashboard} loading={loading} />

      {/* Overdue Action Banner */}
      {metrics.overdue_actions > 0 && (
        <Alert
          type="warning"
          showIcon
          icon={<ExclamationCircleOutlined className="text-rose-500 text-base" />}
          message={
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 w-full">
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                Attention: You have{' '}
                <strong className="text-rose-600 dark:text-rose-400">
                  {metrics.overdue_actions} overdue action item(s)
                </strong>{' '}
                requiring immediate resolution!
              </span>
              <Link
                href="/my-actions?tab=OVERDUE"
                className="text-blue-600 dark:text-blue-400 font-bold hover:underline text-xs no-underline whitespace-nowrap flex items-center gap-1"
              >
                <span>View Overdue Items</span>
                <ArrowRightOutlined className="text-[9px]" />
              </Link>
            </div>
          }
          className="border-rose-200 bg-rose-50/90 dark:bg-rose-950/40 dark:border-rose-900/60 rounded-xl py-2 px-3.5 shadow-xs"
        />
      )}

      {/* 2. ROW 1: 6-Column Compact KPI Metrics Grid */}
      <DashboardMetrics
        metrics={metrics}
        onCardClick={(path) => router.push(path)}
      />

      {/* 3. ROW 2: Balanced 3-Column Equal-Height Grid (Upcoming Meetings | Action Status Donut | Priority Distribution) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        <UpcomingMeetings />
        <ActionStatusChart statusDistribution={status_distribution} />
        <PriorityDistribution priorityDistribution={priority_distribution} />
      </div>

      {/* 4. ROW 3: Meeting Activity Area Chart (7 cols) | Recent Completed Actions (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <div className="lg:col-span-7">
          <MeetingActivityChart meetingActivity={meeting_activity} />
        </div>
        <div className="lg:col-span-5">
          <RecentCompletedActions />
        </div>
      </div>

      {/* 5. ROW 4: Needs Attention Action Table (8 cols) | Quick Actions (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <div className="lg:col-span-8">
          <NeedsAttention overdueList={overdue_list} />
        </div>
        <div className="lg:col-span-4">
          <QuickActions />
        </div>
      </div>

    </div>
  );
}
