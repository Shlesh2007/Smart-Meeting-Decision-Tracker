import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { analyticsService } from '../services/api.js';
import { Alert, Button } from 'antd';
import { SyncOutlined, ExclamationCircleOutlined, ArrowRightOutlined } from '@ant-design/icons';

import {
  DashboardHeader,
  DashboardMetrics,
  ActionStatusChart,
  PriorityDistribution,
  MeetingActivityChart,
  UpcomingMeetings,
  RecentCompletedActions,
  NeedsAttention,
  QuickActions,
  DashboardSkeleton,
} from '../components/Dashboard';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('all_time');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');

  const fetchDashboard = useCallback((selectedPeriod = 'all_time', searchQuery = '', sDate = '', eDate = '') => {
    setLoading(true);
    setError(null);
    const params = { period: selectedPeriod, search: searchQuery || undefined };
    if (selectedPeriod === 'custom') {
      if (sDate) params.start_date = sDate;
      if (eDate) params.end_date = eDate;
    }
    analyticsService
      .getDashboard(params)
      .then((res) => setData(res))
      .catch((err) =>
        setError(
          err.response?.data?.detail ||
          'Unable to load dashboard metrics. Please ensure your backend API server is running.'
        )
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchDashboard(period, search, startDate, endDate);
  }, [period, search, startDate, endDate, fetchDashboard]);

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
          onClick={() => fetchDashboard(period, search, startDate, endDate)}
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
    <div className="space-y-4 w-full max-w-full overflow-x-hidden max-w-[1600px] mx-auto pb-8">
      
      {/* 1. Header Greeting & Quick CTAs Hero with Global Search & Period Selector */}
      <DashboardHeader
        user={user}
        onRefresh={() => fetchDashboard(period, search, startDate, endDate)}
        loading={loading}
        period={period}
        onPeriodChange={(val) => setPeriod(val)}
        startDate={startDate}
        endDate={endDate}
        onCustomDateChange={(s, e) => {
          setStartDate(s || '');
          setEndDate(e || '');
        }}
        search={search}
        onSearchChange={(val) => setSearch(val)}
      />

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
                to="/my-actions?tab=OVERDUE"
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
        onCardClick={(path) => {
          if (search && search.trim()) {
            const sep = path.includes('?') ? '&' : '?';
            navigate(`${path}${sep}search=${encodeURIComponent(search.trim())}`);
          } else {
            navigate(path);
          }
        }}
      />

      {/* 3. ROW 2: Upcoming Meetings & 2 Pie Charts (Side-by-Side on Tablet md:grid-cols-2) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        <div className="lg:col-span-1">
          <UpcomingMeetings />
        </div>
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
          <ActionStatusChart statusDistribution={status_distribution} />
          <PriorityDistribution priorityDistribution={priority_distribution} />
        </div>
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

