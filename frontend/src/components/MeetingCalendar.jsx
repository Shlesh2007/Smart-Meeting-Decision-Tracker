import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Tag, Popover, Button, ConfigProvider, Select, Segmented } from 'antd';
import {
  ClockCircleOutlined,
  EnvironmentOutlined,
  UserOutlined,
  RightOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const getCategoryStyle = (m) => {
  const type = (m.meeting_type || '').toUpperCase();
  const status = (m.status || '').toUpperCase();
  const title = (m.title || '').toLowerCase();

  // Red / Rose: Bug Fix / Critical / Cancelled
  if (title.includes('bug') || title.includes('fix') || status === 'CANCELLED' || type === 'CRITICAL' || type === 'BUG') {
    return {
      bg: 'bg-rose-600 text-white',
      badgeBg: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
      badgeColor: 'rose',
      tag: 'Bug Fix',
    };
  }

  // Green / Emerald: Design Review / Planning / Completed
  if (title.includes('design') || title.includes('review') || status === 'COMPLETED' || type === 'REVIEW' || type === 'PLANNING') {
    return {
      bg: 'bg-emerald-600 text-white',
      badgeBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
      badgeColor: 'emerald',
      tag: 'Design Review',
    };
  }

  // Amber / Orange: Maintenance / Project / In Progress
  if (title.includes('maint') || title.includes('project') || title.includes('standup') || status === 'IN_PROGRESS' || type === 'PROJECT' || type === 'MAINTENANCE') {
    return {
      bg: 'bg-amber-500 text-white',
      badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
      badgeColor: 'amber',
      tag: 'Maintenance',
    };
  }

  // Blue: Release Window / Scheduled / Default / Internal
  return {
    bg: 'bg-blue-600 text-white',
    badgeBg: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    badgeColor: 'blue',
    tag: 'Release Window',
  };
};

export function MeetingCalendar({ meetings = [], loading = false }) {
  const navigate = useNavigate();
  const [viewLevel, setViewLevel] = useState('date'); // 'date' | 'month' | 'year'
  const [selectedDate, setSelectedDate] = useState(dayjs());

  // Compute normalized spans for all meetings
  const spans = useMemo(() => {
    return meetings
      .map((m) => {
        const sDate = m.meeting_date ? dayjs(m.meeting_date).startOf('day') : null;
        let eDate = sDate;
        if (m.recurrence_end_date && dayjs(m.recurrence_end_date).isValid()) {
          eDate = dayjs(m.recurrence_end_date).startOf('day');
        } else if (m.end_date && dayjs(m.end_date).isValid()) {
          const parsed = dayjs(m.end_date).startOf('day');
          if (parsed.isAfter(sDate)) {
            eDate = parsed;
          }
        }

        if (sDate && eDate && eDate.isBefore(sDate)) {
          eDate = sDate;
        }

        return {
          meeting: m,
          startDate: sDate,
          endDate: eDate,
          daysCount: sDate && eDate ? eDate.diff(sDate, 'day') + 1 : 1,
        };
      })
      .filter((s) => s.startDate !== null);
  }, [meetings]);

  // Assign horizontal track indices to multi-day meeting spans
  const spansWithTracks = useMemo(() => {
    const sorted = [...spans].sort((a, b) => {
      const diff = a.startDate.valueOf() - b.startDate.valueOf();
      if (diff !== 0) return diff;
      return b.daysCount - a.daysCount;
    });

    const tracks = [];

    return sorted.map((span) => {
      let assignedTrack = -1;
      for (let i = 0; i < tracks.length; i++) {
        if (tracks[i].isBefore(span.startDate, 'day')) {
          assignedTrack = i;
          tracks[i] = span.endDate;
          break;
        }
      }
      if (assignedTrack === -1) {
        assignedTrack = tracks.length;
        tracks.push(span.endDate);
      }
      return { ...span, trackIndex: assignedTrack };
    });
  }, [spans]);

  const renderPopoverContent = (m, spanInfo) => {
    const catStyle = getCategoryStyle(m);
    return (
      <div className="w-72 p-1 space-y-2">
        <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-700">
          <div>
            <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100 leading-snug block">
              {m.title}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              {spanInfo.startDate.format('MMM D')} - {spanInfo.endDate.format('MMM D, YYYY')} ({spanInfo.daysCount} {spanInfo.daysCount === 1 ? 'day' : 'days'})
            </span>
          </div>
          <Tag color={catStyle.badgeColor} className="m-0 text-[10px] font-bold rounded-full border-0">
            {m.meeting_type || catStyle.tag}
          </Tag>
        </div>

        <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
          <div className="flex items-center space-x-2">
            <ClockCircleOutlined className="text-blue-500 text-[11px]" />
            <span>{m.start_time?.slice(0, 5) || '09:00'} - {m.end_time?.slice(0, 5) || '10:00'}</span>
          </div>
          {m.location && (
            <div className="flex items-center space-x-2 truncate">
              <EnvironmentOutlined className="text-slate-400 text-[11px]" />
              <span className="truncate">{m.location}</span>
            </div>
          )}
          <div className="flex items-center space-x-2">
            <UserOutlined className="text-slate-400 text-[11px]" />
            <span>{m.participants_detail?.length || m.participants?.length || 0} Participants</span>
          </div>
        </div>

        {m.description && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 pt-1 border-t border-slate-100 dark:border-slate-800">
            {m.description}
          </p>
        )}

        <div className="pt-2 flex justify-end">
          <Button
            type="primary"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/meetings/${m.id}`);
            }}
            className="rounded-lg text-xs font-semibold h-7 px-3 bg-blue-600 hover:bg-blue-700"
          >
            View Details <RightOutlined className="text-[9px] ml-1" />
          </Button>
        </div>
      </div>
    );
  };

  const renderMorePopoverContent = (currentDate, activeSpans) => {
    const sortedSpans = [...activeSpans].sort((a, b) => {
      const timeA = a.meeting.start_time || '00:00';
      const timeB = b.meeting.start_time || '00:00';
      return timeA.localeCompare(timeB);
    });

    return (
      <div className="w-80 max-h-[380px] flex flex-col p-1">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-700">
          <div>
            <div className="font-extrabold text-xs text-slate-900 dark:text-slate-100">
              Meetings on {currentDate.format('MMM D, YYYY')}
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              {activeSpans.length} {activeSpans.length === 1 ? 'meeting' : 'meetings'} total on this day
            </div>
          </div>
          <Tag color="blue" className="m-0 text-[10px] font-bold rounded-full border-0 px-2">
            {currentDate.format('dddd')}
          </Tag>
        </div>

        <div className="overflow-y-auto space-y-1.5 pr-1 max-h-[300px]">
          {sortedSpans.map((span) => {
            const m = span.meeting;
            const catStyle = getCategoryStyle(m);
            const isMultiDay = span.daysCount > 1;

            return (
              <div
                key={`more-m-${m.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/meetings/${m.id}`);
                }}
                className="group p-2 rounded-xl border border-slate-100 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/60 hover:bg-blue-50/80 dark:hover:bg-blue-950/40 hover:border-blue-300 dark:hover:border-blue-700 cursor-pointer transition-all duration-150 flex items-center justify-between gap-2.5 shadow-2xs"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${catStyle.bg} shadow-2xs`} />
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate block">
                      {m.title}
                    </span>
                  </div>

                  <div className="flex items-center flex-wrap gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <ClockCircleOutlined className="text-blue-500 text-[10px]" />
                      {m.start_time?.slice(0, 5) || '09:00'} - {m.end_time?.slice(0, 5) || '10:00'}
                    </span>
                    {isMultiDay && (
                      <span className="text-[9px] font-semibold text-purple-600 dark:text-purple-300 bg-purple-100/70 dark:bg-purple-900/50 px-1.5 py-0.2 rounded-full">
                        {span.daysCount} days span
                      </span>
                    )}
                    {m.location && (
                      <span className="flex items-center gap-1 truncate max-w-[120px]">
                        <EnvironmentOutlined className="text-slate-400 text-[9px]" />
                        <span className="truncate">{m.location}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end justify-between gap-1.5 shrink-0 self-stretch">
                  <Tag color={catStyle.badgeColor} className="m-0 text-[9px] font-bold rounded-full border-0 px-2 py-0.5">
                    {m.meeting_type || catStyle.tag}
                  </Tag>
                  <div className="flex items-center text-[10px] font-semibold text-blue-600 dark:text-blue-400 opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
                    <span>Open</span>
                    <RightOutlined className="text-[8px] ml-1" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMoreMonthPopoverContent = (monthObj, monthMeetings) => {
    return (
      <div className="w-80 max-h-[380px] flex flex-col p-1">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-700">
          <div>
            <div className="font-extrabold text-xs text-slate-900 dark:text-slate-100">
              Meetings in {monthObj.format('MMMM YYYY')}
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              {monthMeetings.length} meetings scheduled
            </div>
          </div>
        </div>

        <div className="overflow-y-auto space-y-1.5 pr-1 max-h-[300px]">
          {monthMeetings.map((m) => {
            const catStyle = getCategoryStyle(m);
            return (
              <div
                key={`month-m-${m.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/meetings/${m.id}`);
                }}
                className="group p-2 rounded-xl border border-slate-100 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/60 hover:bg-blue-50/80 dark:hover:bg-blue-950/40 hover:border-blue-300 dark:hover:border-blue-700 cursor-pointer transition-all duration-150 flex items-center justify-between gap-2.5 shadow-2xs"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${catStyle.bg} shadow-2xs`} />
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate block">
                      {m.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                      {dayjs(m.meeting_date).format('MMM D')}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <ClockCircleOutlined className="text-blue-500 text-[10px]" />
                      {m.start_time?.slice(0, 5) || '09:00'} - {m.end_time?.slice(0, 5) || '10:00'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end justify-between gap-1.5 shrink-0 self-stretch">
                  <Tag color={catStyle.badgeColor} className="m-0 text-[9px] font-bold rounded-full border-0 px-2 py-0.5">
                    {m.meeting_type || catStyle.tag}
                  </Tag>
                  <div className="flex items-center text-[10px] font-semibold text-blue-600 dark:text-blue-400 opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
                    <span>Open</span>
                    <RightOutlined className="text-[8px] ml-1" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const dateCellRender = (value) => {
    const currentDate = value.startOf('day');

    const activeSpans = spansWithTracks.filter((s) => {
      return (
        (currentDate.isAfter(s.startDate) || currentDate.isSame(s.startDate, 'day')) &&
        (currentDate.isBefore(s.endDate) || currentDate.isSame(s.endDate, 'day'))
      );
    });

    if (activeSpans.length === 0) return null;

    const visibleTrackLimit = 2;
    const visibleSpans = activeSpans.slice(0, visibleTrackLimit);
    const hiddenCount = Math.max(0, activeSpans.length - visibleTrackLimit);

    const trackElements = visibleSpans.map((span, idx) => {
      const m = span.meeting;
      const catStyle = getCategoryStyle(m);

      const isSpanStart = currentDate.isSame(span.startDate, 'day');
      const isSpanEnd = currentDate.isSame(span.endDate, 'day');
      const isWeekStart = currentDate.day() === 0;
      const isWeekEnd = currentDate.day() === 6;

      const isLeft = isSpanStart || isWeekStart;
      const isRight = isSpanEnd || isWeekEnd;

      let shapeClasses = '';
      if (isLeft && isRight) {
        shapeClasses = 'rounded-full mx-1';
      } else if (isLeft && !isRight) {
        shapeClasses = 'rounded-l-full -mr-3.5 ml-0.5';
      } else if (!isLeft && isRight) {
        shapeClasses = 'rounded-r-full -ml-3.5 mr-0.5';
      } else {
        shapeClasses = 'rounded-none -mx-3.5';
      }

      const showText = isLeft;

      return (
        <Popover
          key={`track-${idx}-${m.id}`}
          content={renderPopoverContent(m, span)}
          trigger={['hover', 'click']}
          placement="top"
          arrow={false}
        >
          <div
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/meetings/${m.id}`);
            }}
            className={`h-5 my-0.5 flex items-center px-1.5 text-[10px] font-bold cursor-pointer transition-all z-10 ${shapeClasses} ${catStyle.bg} hover:brightness-110 shadow-xs leading-none select-none`}
            title={`${m.title} (${span.startDate.format('MMM D')} - ${span.endDate.format('MMM D')})`}
          >
            {showText ? (
              <span className="truncate drop-shadow-xs font-semibold">
                {m.title}
              </span>
            ) : (
              <span className="opacity-0 select-none">.</span>
            )}
          </div>
        </Popover>
      );
    });

    return (
      <div className="relative mt-1 space-y-0.5 overflow-visible">
        {trackElements}
        {hiddenCount > 0 && (
          <Popover
            content={renderMorePopoverContent(currentDate, activeSpans)}
            trigger={['hover', 'click']}
            placement="bottom"
            arrow={false}
            mouseEnterDelay={0.05}
            mouseLeaveDelay={0.15}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="mt-1 text-[9px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50/90 dark:bg-blue-950/60 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white px-2 py-0.5 text-center truncate rounded-md cursor-pointer transition-all duration-150 shadow-2xs select-none border border-blue-200/60 dark:border-blue-800/60 hover:border-blue-600"
            >
              +{hiddenCount} more
            </div>
          </Popover>
        )}
      </div>
    );
  };

  const cellRender = (current, info) => {
    if (info.type === 'date') {
      return dateCellRender(current);
    }
    return info.originNode;
  };

  const currentYear = selectedDate.year();
  const currentMonth = selectedDate.month();

  const yearOptions = [];
  for (let i = currentYear - 5; i <= currentYear + 5; i += 1) {
    yearOptions.push({ label: `${i}`, value: i });
  }

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    label: dayjs().month(i).format('MMMM'),
    value: i,
  }));

  // Render 12-Months Grid (Jan to Dec) for Month View
  const renderMonthsView = () => {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 my-2">
        {Array.from({ length: 12 }, (_, i) => {
          const monthObj = selectedDate.month(i);
          const monthKey = monthObj.format('YYYY-MM');

          const monthMeetings = meetings.filter((m) => {
            if (!m.meeting_date) return false;
            return dayjs(m.meeting_date).format('YYYY-MM') === monthKey;
          });

          const isCurrentMonth = monthObj.isSame(dayjs(), 'month');

          return (
            <div
              key={monthKey}
              onClick={() => {
                setSelectedDate(monthObj);
                setViewLevel('date');
              }}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                isCurrentMonth
                  ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 shadow-xs'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-400 hover:shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                  {monthObj.format('MMMM')}
                </span>
                <Tag
                  color={monthMeetings.length > 0 ? 'blue' : 'default'}
                  className="m-0 text-[10px] font-bold rounded-full border-0 px-2"
                >
                  {monthMeetings.length} Meeting(s)
                </Tag>
              </div>

              <div className="space-y-1.5 min-h-[44px]">
                {monthMeetings.length > 0 ? (
                  monthMeetings.slice(0, 2).map((m) => {
                    const cat = getCategoryStyle(m);
                    return (
                      <div
                        key={m.id}
                        className={`text-[10px] font-bold px-2 py-1 rounded-md truncate ${cat.badgeBg}`}
                      >
                        {m.title}
                      </div>
                    );
                  })
                ) : (
                  <span className="text-xs text-slate-400 dark:text-slate-500 italic block pt-1">
                    No meetings scheduled
                  </span>
                )}
                {monthMeetings.length > 2 && (
                  <Popover
                    content={renderMoreMonthPopoverContent(monthObj, monthMeetings)}
                    trigger={['hover', 'click']}
                    placement="bottom"
                    arrow={false}
                    mouseEnterDelay={0.05}
                    mouseLeaveDelay={0.15}
                  >
                    <span
                      onClick={(e) => e.stopPropagation()}
                      className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline cursor-pointer block pt-0.5"
                    >
                      +{monthMeetings.length - 2} more meetings...
                    </span>
                  </Popover>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                <span>View Date Grid</span>
                <RightOutlined className="text-[9px]" />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render Multi-Year Grid (2021, 2022, 2023, 2024...) for Year View
  const renderYearsView = () => {
    const startYr = currentYear - 3;
    const endYr = currentYear + 4;
    const yearList = [];
    for (let y = startYr; y <= endYr; y++) {
      yearList.push(y);
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-2">
        {yearList.map((y) => {
          const yearMeetings = meetings.filter((m) => {
            if (!m.meeting_date) return false;
            return dayjs(m.meeting_date).year() === y;
          });

          const isCurrentYr = y === dayjs().year();

          return (
            <div
              key={y}
              onClick={() => {
                setSelectedDate(selectedDate.year(y));
                setViewLevel('month');
              }}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                isCurrentYr
                  ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 shadow-xs'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-400 hover:shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-base text-slate-800 dark:text-slate-100">
                  {y}
                </span>
                <Tag
                  color={yearMeetings.length > 0 ? 'purple' : 'default'}
                  className="m-0 text-[10px] font-bold rounded-full border-0 px-2"
                >
                  {yearMeetings.length} Meeting(s)
                </Tag>
              </div>

              <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400 min-h-[44px]">
                {yearMeetings.length > 0 ? (
                  <div className="space-y-1">
                    <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Total: {yearMeetings.length} meeting(s) recorded
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Tag className="m-0 text-[9px] bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border-0 rounded-full font-bold">
                        {yearMeetings.filter((m) => m.status === 'SCHEDULED').length} Scheduled
                      </Tag>
                      <Tag className="m-0 text-[9px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 border-0 rounded-full font-bold">
                        {yearMeetings.filter((m) => m.status === 'COMPLETED').length} Completed
                      </Tag>
                    </div>
                  </div>
                ) : (
                  <span className="italic block pt-1">No meetings recorded in {y}</span>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                <span>View Months (Jan - Dec)</span>
                <RightOutlined className="text-[9px]" />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs">
      {/* Category Legend Bar (shown in Date view) */}
      {viewLevel === 'date' && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 mb-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
              Categories:
            </span>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-600 shrink-0 shadow-xs" />
              <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">Release window</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-600 shrink-0 shadow-xs" />
              <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">Design review</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0 shadow-xs" />
              <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">Maintenance</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-600 shrink-0 shadow-xs" />
              <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">Bug fix</span>
            </div>
          </div>
          <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
            Continuous Spans for Recurring & Multi-day Events
          </div>
        </div>
      )}

      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 mb-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700">
        <div className="flex items-center justify-between sm:justify-start space-x-3">
          <Button
            size="small"
            onClick={() => {
              setSelectedDate(dayjs());
              setViewLevel('date');
            }}
            className="font-semibold text-xs rounded-lg border-slate-300 dark:border-slate-600"
          >
            Today
          </Button>
          <span className="font-extrabold text-sm sm:text-base text-slate-800 dark:text-slate-100">
            {viewLevel === 'date' && selectedDate.format('MMMM YYYY')}
            {viewLevel === 'month' && `Months View (${selectedDate.format('YYYY')})`}
            {viewLevel === 'year' && `Years Overview (${currentYear - 3} - ${currentYear + 4})`}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
          {viewLevel === 'date' && (
            <div className="flex items-center gap-2">
              <Select
                size="small"
                value={currentYear}
                onChange={(y) => setSelectedDate(selectedDate.year(y))}
                options={yearOptions}
                className="w-24 min-w-[76px]"
              />
              <Select
                size="small"
                value={currentMonth}
                onChange={(m) => setSelectedDate(selectedDate.month(m))}
                options={monthOptions}
                className="w-32 min-w-[100px]"
              />
            </div>
          )}

          {viewLevel === 'month' && (
            <Select
              size="small"
              value={currentYear}
              onChange={(y) => setSelectedDate(selectedDate.year(y))}
              options={yearOptions}
              className="w-28"
            />
          )}

          <Segmented
            size="small"
            value={viewLevel}
            onChange={(val) => setViewLevel(val)}
            options={[
              { label: 'Date', value: 'date' },
              { label: 'Month', value: 'month' },
              { label: 'Year', value: 'year' },
            ]}
            className="shrink-0"
          />
        </div>
      </div>

      {/* View Content based on viewLevel */}
      {viewLevel === 'date' && (
        <ConfigProvider
          theme={{
            components: {
              Calendar: {
                algorithm: true,
              },
            },
          }}
        >
          <div className="w-full overflow-x-auto min-w-0">
            <Calendar
              mode="month"
              value={selectedDate}
              onChange={(d) => setSelectedDate(d)}
              headerRender={() => null}
              cellRender={cellRender}
              className="meeting-calendar-custom"
            />
          </div>
        </ConfigProvider>
      )}

      {viewLevel === 'month' && renderMonthsView()}

      {viewLevel === 'year' && renderYearsView()}
    </div>
  );
}

export default MeetingCalendar;
