import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Input, Select, AutoComplete, Tag, Spin, DatePicker } from 'antd';
import { PlusOutlined, SyncOutlined, CalendarOutlined, ThunderboltOutlined, SearchOutlined, FilterOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { Logo } from '../Logo.jsx';
import { meetingService, actionService } from '../../services/api.js';

const { RangePicker } = DatePicker;

export const DashboardHeader = ({
  user,
  onRefresh,
  loading,
  period,
  onPeriodChange,
  search,
  onSearchChange,
  startDate,
  endDate,
  onCustomDateChange,
}) => {
  const navigate = useNavigate();

  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState({ meetings: [], actions: [] });

  useEffect(() => {
    if (!search || search.trim().length === 0) {
      setSearchResults({ meetings: [], actions: [] });
      return;
    }

    const timer = setTimeout(() => {
      setSearching(true);
      Promise.all([
        meetingService.getMeetings({ search: search.trim() }),
        actionService.getActions({ search: search.trim() })
      ])
        .then(([mRes, aRes]) => {
          setSearchResults({
            meetings: (mRes.results || mRes || []).slice(0, 5),
            actions: (aRes.results || aRes || []).slice(0, 5)
          });
        })
        .catch(() => setSearchResults({ meetings: [], actions: [] }))
        .finally(() => setSearching(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const hour = new Date().getHours();
  let greetingTime = 'Good morning';
  if (hour >= 12 && hour < 17) greetingTime = 'Good afternoon';
  if (hour >= 17) greetingTime = 'Good evening';

  const userName = user?.first_name || user?.username || 'User';

  const renderCategoryHeader = (title, count) => (
    <div className="flex items-center justify-between text-xs font-bold text-slate-500 py-1 border-b border-slate-100">
      <span>{title}</span>
      <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded-full text-slate-600 font-semibold">{count}</span>
    </div>
  );

  const handleSelectOption = (val, option) => {
    if (option && option.targetUrl) {
      navigate(option.targetUrl);
    }
  };

  const options = [];
  if (search && search.trim().length > 0) {
    if (searchResults.meetings.length > 0) {
      options.push({
        label: renderCategoryHeader('📅 Meetings', searchResults.meetings.length),
        options: searchResults.meetings.map((m) => ({
          key: `m_${m.id}`,
          value: m.title,
          targetUrl: `/meetings/${m.id}`,
          label: (
            <div
              key={`meeting_${m.id}`}
              className="flex items-center justify-between py-1 cursor-pointer hover:text-blue-600"
            >
              <div className="flex items-center space-x-2 truncate max-w-[200px] sm:max-w-[240px]">
                <CalendarOutlined className="text-blue-500 text-xs shrink-0" />
                <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate">{m.title}</span>
              </div>
              <Tag color="blue" className="text-[9px] m-0 shrink-0 font-bold">{m.meeting_date}</Tag>
            </div>
          )
        }))
      });
    }

    if (searchResults.actions.length > 0) {
      options.push({
        label: renderCategoryHeader('⚡ Action Items', searchResults.actions.length),
        options: searchResults.actions.map((a) => ({
          key: `a_${a.id}`,
          value: a.title,
          targetUrl: a.meeting_id ? `/meetings/${a.meeting_id}` : '/my-actions',
          label: (
            <div
              key={`action_${a.id}`}
              className="flex items-center justify-between py-1 cursor-pointer hover:text-blue-600"
            >
              <div className="flex items-center space-x-2 truncate max-w-[200px] sm:max-w-[240px]">
                <ThunderboltOutlined className="text-amber-500 text-xs shrink-0" />
                <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate">{a.title}</span>
              </div>
              <Tag color={a.status === 'COMPLETED' ? 'success' : a.status === 'BLOCKED' ? 'error' : 'warning'} className="text-[9px] m-0 shrink-0 font-bold">
                {a.status}
              </Tag>
            </div>
          )
        }))
      });
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs transition-all space-y-3">
      
      <div className="flex flex-row items-start sm:items-center justify-between gap-3">
        {/* Greeting & Date Info */}
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div className="space-y-0.5">
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white m-0 tracking-tight leading-snug">
              {greetingTime}, {userName}! 👋
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 m-0">
              {user?.role === 'ADMIN' || user?.role === 'OWNER'
                ? "Here's the organization-wide meeting & employee action item performance dashboard."
                : "Here's your personal meeting & action item workspace overview."}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Link to="/meetings/new" className="hidden sm:inline-flex no-underline">
            <Button
              type="primary"
              size="middle"
              icon={<PlusOutlined />}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold !rounded-full border-none shadow-xs text-xs h-9 px-3 sm:px-4 flex items-center justify-center truncate"
            >
              <span>Schedule Meeting</span>
            </Button>
          </Link>
          
          <Link to="/my-actions" className="hidden sm:inline-flex no-underline">
            <Button
              size="middle"
              icon={<ThunderboltOutlined />}
              className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold !rounded-full border-slate-200 dark:border-slate-700 text-xs h-9 px-3 sm:px-4 flex items-center justify-center truncate"
            >
              <span>View My Actions</span>
            </Button>
          </Link>

          {onRefresh && (
            <Button
              size="middle"
              icon={<SyncOutlined spin={loading} />}
              onClick={onRefresh}
              title="Refresh Dashboard"
              className="bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-600 dark:text-slate-300 !rounded-full border-slate-200 dark:border-slate-700 h-9 w-9 flex items-center justify-center p-0 shrink-0"
            />
          )}
        </div>
      </div>

      {/* Global Search & Time Period Filter Bar */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
        <div className="flex flex-row items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <AutoComplete
              popupMatchSelectWidth={false}
              styles={{ popup: { root: { minWidth: 280 } } }}
              options={options}
              value={search}
              onChange={(val) => onSearchChange(val)}
              onSelect={handleSelectOption}
              filterOption={false}
              className="w-full"
            >
              <Input
                id="header_global_search"
                name="header_search"
                size="middle"
                prefix={<SearchOutlined className="text-slate-400 text-xs" />}
                suffix={searching ? <Spin size="small" /> : null}
                placeholder="Search meetings & actions..."
                allowClear
                className="!rounded-full text-xs h-9"
              />
            </AutoComplete>
          </div>

          <div className="flex items-center shrink-0">
            <Select
              id="header_time_period"
              name="time_period"
              value={period || 'all_time'}
              onChange={onPeriodChange}
              className="w-28 xs:w-32 sm:w-36 font-semibold text-xs h-9 !rounded-full"
              size="middle"
              popupMatchSelectWidth={false}
              options={[
                { label: 'All Time', value: 'all_time' },
                { label: 'Yesterday', value: 'yesterday' },
                { label: 'Last 7 Days', value: 'last_7_days' },
                { label: '30 Days', value: 'last_30_days' },
                { label: 'Last Week', value: 'last_week' },
                { label: 'Last Month', value: 'last_month' },
                { label: 'Last Year', value: 'last_year' },
                { label: 'Custom Range', value: 'custom' },
              ]}
            />
          </div>
        </div>

        {period === 'custom' && (
          <div className="animate-fadeIn pt-1 flex justify-end">
            <RangePicker
              size="middle"
              format="YYYY-MM-DD"
              placeholder={['From Date', 'To Date']}
              placement="bottomRight"
              value={
                startDate && endDate
                  ? [dayjs(startDate), dayjs(endDate)]
                  : startDate
                  ? [dayjs(startDate), null]
                  : endDate
                  ? [null, dayjs(endDate)]
                  : null
              }
              onChange={(dates, dateStrings) => {
                if (dates && dates[0] && dates[1]) {
                  onCustomDateChange && onCustomDateChange(dateStrings[0], dateStrings[1]);
                } else {
                  onCustomDateChange && onCustomDateChange('', '');
                }
              }}
              className="w-full sm:w-auto rounded-xl h-9 text-xs font-medium"
            />
          </div>
        )}
      </div>

    </div>
  );
};
