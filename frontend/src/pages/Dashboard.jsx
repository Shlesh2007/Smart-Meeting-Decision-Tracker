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
  RecentDecisionsCard,
  QuickActions,
  DashboardSkeleton,
} from '../components/Dashboard';

import dayjs from 'dayjs';

const getDateRangeForPeriod = (selectedPeriod, customStart = '', customEnd = '') => {
  const today = dayjs();
  if (selectedPeriod === 'today' || selectedPeriod === 'this_day') {
    const d = today.format('YYYY-MM-DD');
    return { start_date: d, end_date: d };
  }
  if (selectedPeriod === 'yesterday') {
    const y = today.subtract(1, 'day').format('YYYY-MM-DD');
    return { start_date: y, end_date: y };
  }
  if (selectedPeriod === 'last_7_days' || selectedPeriod === 'past_week') {
    return {
      start_date: today.subtract(7, 'day').format('YYYY-MM-DD'),
      end_date: today.format('YYYY-MM-DD'),
    };
  }
  if (selectedPeriod === 'last_30_days' || selectedPeriod === '30_days' || selectedPeriod === 'past_month') {
    return {
      start_date: today.subtract(30, 'day').format('YYYY-MM-DD'),
      end_date: today.format('YYYY-MM-DD'),
    };
  }
  if (selectedPeriod === 'last_week') {
    const startOfThisWeek = today.startOf('week');
    const startOfLastWeek = startOfThisWeek.subtract(1, 'week');
    const endOfLastWeek = startOfThisWeek.subtract(1, 'day');
    return {
      start_date: startOfLastWeek.format('YYYY-MM-DD'),
      end_date: endOfLastWeek.format('YYYY-MM-DD'),
    };
  }
  if (selectedPeriod === 'last_month') {
    const startOfLastMonth = today.subtract(1, 'month').startOf('month');
    const endOfLastMonth = today.subtract(1, 'month').endOf('month');
    return {
      start_date: startOfLastMonth.format('YYYY-MM-DD'),
      end_date: endOfLastMonth.format('YYYY-MM-DD'),
    };
  }
  if (selectedPeriod === 'last_year' || selectedPeriod === 'past_year') {
    const lastYear = today.subtract(1, 'year');
    return {
      start_date: lastYear.startOf('year').format('YYYY-MM-DD'),
      end_date: lastYear.endOf('year').format('YYYY-MM-DD'),
    };
  }
  if (selectedPeriod === 'custom' && customStart && customEnd) {
    return { start_date: customStart, end_date: customEnd };
  }
  return { start_date: null, end_date: null };
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState(() => {
    return sessionStorage.getItem('dashboard_period') || 'today';
  });
  const [activityPeriod, setActivityPeriod] = useState(() => {
    const savedPeriod = sessionStorage.getItem('dashboard_period');
    if (savedPeriod === 'today' || !savedPeriod) return 'today';
    if (savedPeriod === 'yesterday') return 'yesterday';
    if (savedPeriod === 'last_week') return 'last_week';
    if (savedPeriod === 'last_month') return 'last_month';
    if (savedPeriod === 'last_year') return 'last_year';
    return '30d';
  });
  const [startDate, setStartDate] = useState(() => {
    return sessionStorage.getItem('dashboard_start_date') || '';
  });
  const [endDate, setEndDate] = useState(() => {
    return sessionStorage.getItem('dashboard_end_date') || '';
  });
  const [search, setSearch] = useState('');

  const handlePeriodChange = (val) => {
    setPeriod(val);
    sessionStorage.setItem('dashboard_period', val);
    if (val === 'last_7_days') setActivityPeriod('7d');
    else if (val === 'last_week') setActivityPeriod('last_week');
    else if (val === 'last_30_days') setActivityPeriod('30d');
    else if (val === 'last_month') setActivityPeriod('last_month');
    else if (val === 'last_year') setActivityPeriod('last_year');
    else if (val === 'all_time') setActivityPeriod('all');
    else if (val === 'today') setActivityPeriod('today');
    else if (val === 'yesterday') setActivityPeriod('yesterday');
  };

  const fetchDashboard = useCallback((selectedPeriod = 'today', searchQuery = '', sDate = '', eDate = '', actPeriod = '30d') => {
    setLoading(true);
    setError(null);
    const params = {
      period: selectedPeriod,
      search: searchQuery || undefined,
      activity_period: actPeriod,
    };
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
    fetchDashboard(period, search, startDate, endDate, activityPeriod);
  }, [period, search, startDate, endDate, activityPeriod, fetchDashboard]);

  const handleCardClick = (basePath) => {
    const urlParams = new URLSearchParams();
    if (search && search.trim()) {
      urlParams.set('search', search.trim());
    }
    if (period !== 'all_time') {
      const { start_date, end_date } = getDateRangeForPeriod(period, startDate, endDate);
      if (start_date) urlParams.set('start_date', start_date);
      if (end_date) urlParams.set('end_date', end_date);
    }

    const existingQuery = basePath.includes('?') ? basePath.split('?')[1] : '';
    const pathWithoutQuery = basePath.split('?')[0];

    if (existingQuery) {
      const existingParams = new URLSearchParams(existingQuery);
      existingParams.forEach((v, k) => urlParams.set(k, v));
    }

    const queryString = urlParams.toString();
    navigate(queryString ? `${pathWithoutQuery}?${queryString}` : pathWithoutQuery);
  };

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
          onClick={() => fetchDashboard(period, search, startDate, endDate, activityPeriod)}
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
    urgent_list = [],
  } = data;

  return (
    <div className="space-y-4 w-full max-w-full overflow-x-hidden max-w-[1600px] mx-auto">
      
      {/* 1. Header Greeting & Quick CTAs Hero with Global Search & Period Selector */}
      <DashboardHeader
        user={user}
        onRefresh={() => fetchDashboard(period, search, startDate, endDate, activityPeriod)}
        loading={loading}
        period={period}
        onPeriodChange={handlePeriodChange}
        startDate={startDate}
        endDate={endDate}
        onCustomDateChange={(s, e) => {
          setStartDate(s || '');
          setEndDate(e || '');
          if (s) sessionStorage.setItem('dashboard_start_date', s);
          else sessionStorage.removeItem('dashboard_start_date');
          if (e) sessionStorage.setItem('dashboard_end_date', e);
          else sessionStorage.removeItem('dashboard_end_date');
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
        period={period}
        onCardClick={handleCardClick}
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
          <MeetingActivityChart
            meetingActivity={meeting_activity}
            activityPeriod={activityPeriod}
            onActivityPeriodChange={(val) => setActivityPeriod(val)}
            globalPeriod={period}
          />
        </div>
        <div className="lg:col-span-5">
          <RecentCompletedActions />
        </div>
      </div>

      {/* 5. ROW 4: Needs Attention Action Table (8 cols) | Recent Key Decisions Audit Feed (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <div className="lg:col-span-8">
          <NeedsAttention overdueList={overdue_list} urgentList={urgent_list} loading={loading} />
        </div>
        <div className="lg:col-span-4">
          <RecentDecisionsCard />
        </div>
      </div>

    </div>
  );
}