'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Tag } from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  UserOutlined,
  VideoCameraOutlined,
  EnvironmentOutlined,
  ArrowRightOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { meetingService } from '../../services/api.js';

export const UpcomingMeetings = ({ meetings: initialMeetings }) => {
  const [meetings, setMeetings] = useState(initialMeetings || []);
  const [loading, setLoading] = useState(!initialMeetings);

  useEffect(() => {
    if (!initialMeetings) {
      setLoading(true);
      meetingService
        .getMeetings()
        .then((res) => {
          const list = res.results || res || [];
          const upcomingList = list.filter((m) => m.status !== 'COMPLETED' && m.status !== 'CANCELLED');
          setMeetings(upcomingList);
        })
        .catch(() => setMeetings([]))
        .finally(() => setLoading(false));
    }
  }, [initialMeetings]);

  const groupedMeetings = React.useMemo(() => {
    const todayList = [];
    const tomorrowList = [];
    const futureList = [];

    meetings.forEach((m) => {
      if (!m.meeting_date) return;
      try {
        const d = parseISO(m.meeting_date);
        if (isToday(d)) {
          todayList.push(m);
        } else if (isTomorrow(d)) {
          tomorrowList.push(m);
        } else {
          futureList.push(m);
        }
      } catch (err) {
        futureList.push(m);
      }
    });

    return { today: todayList, tomorrow: tomorrowList, future: futureList };
  }, [meetings]);

  const renderMeetingRow = (m) => {
    const timeStr = m.start_time ? m.start_time.slice(0, 5) : '09:00';
    const dateStr = m.meeting_date ? format(parseISO(m.meeting_date), 'MMM d') : '';
    const isOnline = m.location && (m.location.toLowerCase().includes('http') || m.location.toLowerCase().includes('zoom') || m.location.toLowerCase().includes('meet') || m.location.toLowerCase().includes('teams'));

    return (
      <div
        key={m.id}
        className="p-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800 transition-all flex items-center justify-between gap-2 group"
      >
        <div className="flex items-center space-x-2.5 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/60 flex flex-col items-center justify-center shrink-0 font-bold text-[10px]">
            <span>{timeStr}</span>
          </div>

          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center space-x-1.5 flex-wrap">
              <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 m-0 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {m.title}
              </h4>
              {m.meeting_type && (
                <Tag color="blue" className="text-[9px] uppercase font-bold rounded m-0 border-none px-1 py-0">
                  {m.meeting_type}
                </Tag>
              )}
            </div>

            <div className="flex items-center space-x-2 text-[10px] text-slate-500 dark:text-slate-400 flex-wrap">
              <span className="flex items-center space-x-1">
                <CalendarOutlined className="text-slate-400 text-[9px]" />
                <span>{dateStr}</span>
              </span>

              {m.location && (
                <span className="flex items-center space-x-1 truncate max-w-[120px]">
                  {isOnline ? <VideoCameraOutlined className="text-blue-500 text-[9px]" /> : <EnvironmentOutlined className="text-rose-500 text-[9px]" />}
                  <span className="truncate">{m.location}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="shrink-0 flex items-center justify-end">
          <Link href={`/meetings/${m.id}`} className="no-underline">
            <Button
              type="primary"
              size="small"
              className="bg-blue-600 hover:bg-blue-700 font-semibold rounded-md text-[10px] border-none px-2 py-0.5 h-6 flex items-center gap-1"
            >
              <span>View</span>
              <ArrowRightOutlined className="text-[8px]" />
            </Button>
          </Link>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-xs transition-all h-full flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="w-6.5 h-6.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs">
            <ClockCircleOutlined />
          </div>
          <div>
            <h3 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 m-0">
              Upcoming Meetings
            </h3>
          </div>
        </div>

        <Link href="/meetings" className="no-underline">
          <Button type="link" size="small" className="text-[11px] text-blue-600 dark:text-blue-400 font-bold p-0">
            View All ({meetings.length}) →
          </Button>
        </Link>
      </div>

      {/* Content / Empty State */}
      <div className="my-2.5 space-y-2 max-h-[220px] overflow-y-auto pr-0.5 flex-1 flex flex-col justify-center">
        {loading ? (
          <p className="text-center text-slate-400 py-4 text-xs font-semibold">Loading meetings...</p>
        ) : meetings.length === 0 ? (
          <div className="py-3 px-3 text-center space-y-2 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 my-auto">
            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto text-sm">
              <CalendarOutlined />
            </div>
            <div className="space-y-0.5">
              <p className="font-bold text-slate-800 dark:text-slate-200 text-xs m-0">No Upcoming Meetings</p>
              <p className="text-[10px] text-slate-400 m-0 max-w-xs mx-auto leading-tight">
                Schedule your next meeting to start capturing discussions and action items.
              </p>
            </div>
            <Link href="/meetings/new" className="no-underline inline-block pt-1">
              <Button type="primary" size="small" icon={<PlusOutlined />} className="bg-blue-600 text-[10px] font-bold rounded-lg border-none h-6 px-2.5">
                Schedule Meeting
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2 w-full">
            {groupedMeetings.today.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-600 dark:text-emerald-400">
                    Today ({groupedMeetings.today.length})
                  </span>
                </div>
                {groupedMeetings.today.map(renderMeetingRow)}
              </div>
            )}

            {groupedMeetings.tomorrow.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-blue-600 dark:text-blue-400">
                    Tomorrow ({groupedMeetings.tomorrow.length})
                  </span>
                </div>
                {groupedMeetings.tomorrow.map(renderMeetingRow)}
              </div>
            )}

            {groupedMeetings.future.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500">
                    Upcoming ({groupedMeetings.future.length})
                  </span>
                </div>
                {groupedMeetings.future.map(renderMeetingRow)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
        <span>Schedule</span>
        <span className="font-semibold text-slate-700 dark:text-slate-300">
          {meetings.length} Total Upcoming
        </span>
      </div>
    </div>
  );
};
