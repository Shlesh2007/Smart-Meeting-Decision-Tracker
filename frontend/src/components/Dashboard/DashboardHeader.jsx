import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from 'antd';
import { PlusOutlined, SyncOutlined, CalendarOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { format } from 'date-fns';
import { Logo } from '../Logo.jsx';

export const DashboardHeader = ({ user, onRefresh, loading }) => {
  const formattedDate = format(new Date(), 'EEEE, MMM d, yyyy');

  const hour = new Date().getHours();
  let greetingTime = 'Good morning';
  if (hour >= 12 && hour < 17) greetingTime = 'Good afternoon';
  if (hour >= 17) greetingTime = 'Good evening';

  const userName = user?.first_name || user?.username || 'User';

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-3">
      
      {/* Greeting & Date Info */}
      <div className="flex items-center space-x-3">
        <Logo variant="icon" height={40} className="shrink-0" />
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2.5 flex-wrap">
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white m-0 tracking-tight leading-snug">
              {greetingTime}, {userName}! 👋
            </h1>
            <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-md border border-slate-200/80 dark:border-slate-700/80">
              <CalendarOutlined className="text-blue-500 text-[10px]" />
              <span>{formattedDate}</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 m-0">
            Here&apos;s what&apos;s happening with your meetings and action items today.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
        <Link to="/meetings/new" className="no-underline">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg border-none shadow-xs text-xs h-8.5 px-3.5 flex items-center"
          >
            Schedule Meeting
          </Button>
        </Link>
        
        <Link to="/my-actions" className="no-underline">
          <Button
            icon={<ThunderboltOutlined />}
            className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-lg border-slate-200 dark:border-slate-700 text-xs h-8.5 px-3.5 flex items-center"
          >
            View My Actions
          </Button>
        </Link>

        {onRefresh && (
          <Button
            icon={<SyncOutlined spin={loading} />}
            onClick={onRefresh}
            title="Refresh Dashboard"
            className="bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-600 dark:text-slate-300 rounded-lg border-slate-200 dark:border-slate-700 h-8.5 w-8.5 flex items-center justify-center p-0"
          />
        )}
      </div>

    </div>
  );
};
