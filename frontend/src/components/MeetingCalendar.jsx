import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Badge, Tag, Popover, Button, Empty } from 'antd';
import {
  ClockCircleOutlined,
  EnvironmentOutlined,
  UserOutlined,
  PlusOutlined,
  RightOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const getStatusBadgeType = (status) => {
  switch (status) {
    case 'SCHEDULED':
      return 'processing';
    case 'IN_PROGRESS':
      return 'warning';
    case 'COMPLETED':
      return 'success';
    case 'CANCELLED':
      return 'error';
    default:
      return 'default';
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case 'SCHEDULED':
      return 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200';
    case 'IN_PROGRESS':
      return 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200';
    case 'COMPLETED':
      return 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'CANCELLED':
      return 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200';
    default:
      return 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200';
  }
};

export function MeetingCalendar({ meetings = [], loading = false }) {
  const navigate = useNavigate();

  // Group meetings by date string (YYYY-MM-DD)
  const meetingsByDate = useMemo(() => {
    const map = {};
    meetings.forEach((m) => {
      if (!m.meeting_date) return;
      const dateKey = dayjs(m.meeting_date).format('YYYY-MM-DD');
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(m);
    });
    return map;
  }, [meetings]);

  const renderPopoverContent = (dateStr, dayMeetings) => (
    <div className="w-72 max-w-sm space-y-2">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <span className="font-extrabold text-xs text-slate-800">
          {dayjs(dateStr).format('MMMM D, YYYY')}
        </span>
        <Tag color="blue" className="m-0 text-[10px] font-bold rounded-full">
          {dayMeetings.length} Meeting(s)
        </Tag>
      </div>

      <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
        {dayMeetings.map((m) => (
          <div
            key={m.id}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/meetings/${m.id}`);
            }}
            className="p-2.5 rounded-xl border border-slate-200/80 bg-white hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer space-y-1.5 group"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">
                {m.title}
              </span>
              <Badge status={getStatusBadgeType(m.status)} />
            </div>

            <div className="flex items-center space-x-3 text-[11px] text-slate-500">
              <span className="flex items-center space-x-1">
                <ClockCircleOutlined className="text-blue-500 text-[10px]" />
                <span>{m.start_time?.slice(0, 5)} - {m.end_time?.slice(0, 5)}</span>
              </span>
              {m.location && (
                <span className="flex items-center space-x-1 truncate max-w-[110px]">
                  <EnvironmentOutlined className="text-slate-400 text-[10px]" />
                  <span className="truncate">{m.location}</span>
                </span>
              )}
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
              <span className="text-slate-400">
                <UserOutlined className="mr-1" />
                {m.participants_detail?.length || 0} Participants
              </span>
              <span className="text-blue-600 font-bold group-hover:translate-x-0.5 transition-transform inline-flex items-center">
                View <RightOutlined className="text-[8px] ml-0.5" />
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-2 border-t border-slate-100 flex justify-end">
        <Button
          type="primary"
          ghost
          size="small"
          icon={<PlusOutlined />}
          className="text-[11px] font-bold rounded-lg"
          onClick={() => navigate(`/meetings/new?date=${dateStr}`)}
        >
          Schedule Meeting
        </Button>
      </div>
    </div>
  );

  const dateCellRender = (value) => {
    const dateStr = value.format('YYYY-MM-DD');
    const dayMeetings = meetingsByDate[dateStr] || [];

    if (dayMeetings.length === 0) return null;

    return (
      <Popover
        content={renderPopoverContent(dateStr, dayMeetings)}
        trigger={['hover', 'click']}
        placement="right"
        arrow={false}
      >
        <div className="mt-1 space-y-1 overflow-hidden max-h-[72px]">
          {dayMeetings.slice(0, 2).map((m) => (
            <div
              key={m.id}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/meetings/${m.id}`);
              }}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border truncate transition-all cursor-pointer flex items-center justify-between ${getStatusColor(
                m.status
              )}`}
              title={`${m.title} (${m.start_time?.slice(0, 5)} - ${m.end_time?.slice(0, 5)})`}
            >
              <span className="truncate">{m.title}</span>
              <span className="ml-1 text-[9px] opacity-75 shrink-0">
                {m.start_time?.slice(0, 5)}
              </span>
            </div>
          ))}
          {dayMeetings.length > 2 && (
            <div className="text-[10px] font-bold text-blue-600 px-1 py-0.5 rounded bg-blue-50 text-center hover:bg-blue-100 transition-colors">
              +{dayMeetings.length - 2} more
            </div>
          )}
        </div>
      </Popover>
    );
  };

  const handleSelectDate = (date) => {
    // Optional click handler on calendar cell
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs">
      <Calendar
        dateCellRender={dateCellRender}
        onSelect={handleSelectDate}
        className="meeting-calendar-custom"
      />
    </div>
  );
}
