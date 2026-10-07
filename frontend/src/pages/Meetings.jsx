import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { meetingService } from '../services/api.js';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { LoadingSkeleton } from '../components/LoadingSkeleton.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { MeetingCalendar } from '../components/MeetingCalendar.jsx';
import { ParticipantProfileModal } from '../components/ParticipantProfileModal.jsx';
import {
  Input, Select, DatePicker, Button, Table, Card, Tag, Avatar, Tooltip, Pagination, Segmented
} from 'antd';
import {
  SearchOutlined, PlusOutlined, UserOutlined, ReloadOutlined, CalendarOutlined, UnorderedListOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

export default function Meetings() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState(() => searchParams.get('view') || 'table');
  const [selectedParticipantUser, setSelectedParticipantUser] = useState(null);

  const [meetings, setMeetings] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [meetingType, setMeetingType] = useState(searchParams.get('meeting_type') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [dateRange, setDateRange] = useState(() => {
    const s = searchParams.get('start_date');
    const e = searchParams.get('end_date');
    return (s && e) ? [s, e] : null;
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      return 6;
    }
    return 10;
  });

  useEffect(() => {
    if (searchParams.has('search')) setSearch(searchParams.get('search') || '');
    if (searchParams.has('status')) setStatus(searchParams.get('status') || '');
    if (searchParams.has('meeting_type')) setMeetingType(searchParams.get('meeting_type') || '');
    if (searchParams.has('view')) setViewMode(searchParams.get('view') || 'table');
    if (searchParams.has('start_date') && searchParams.has('end_date')) {
      setDateRange([searchParams.get('start_date'), searchParams.get('end_date')]);
    }
  }, [searchParams]);

  const fetchMeetings = useCallback(() => {
    setLoading(true);
    setError(false);

    const params = {
      page: viewMode === 'calendar' ? 1 : page,
      page_size: viewMode === 'calendar' ? 100 : pageSize,
      search: search || undefined,
      meeting_type: meetingType || undefined,
      status: status || undefined,
    };

    if (viewMode !== 'calendar' && dateRange && dateRange[0] && dateRange[1]) {
      params.start_date = dateRange[0];
      params.end_date = dateRange[1];
    }

    meetingService.getMeetings(params)
      .then((res) => {
        setMeetings(res.results || []);
        setTotal(res.count || 0);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [page, pageSize, search, meetingType, status, dateRange, viewMode]);

  const prevParamsRef = useRef('');

  useEffect(() => {
    const currentParamsKey = `${page}-${pageSize}-${search}-${meetingType}-${status}-${dateRange ? dateRange.join(',') : ''}-${viewMode}`;
    if (prevParamsRef.current !== currentParamsKey) {
      prevParamsRef.current = currentParamsKey;
      fetchMeetings();
    }
  }, [page, pageSize, search, meetingType, status, dateRange, viewMode, fetchMeetings]);

  const handleResetFilters = () => {
    setSearch('');
    setMeetingType('');
    setStatus('');
    setDateRange(null);
    setPage(1);
  };

  const columns = [
    {
      title: 'Meeting Title',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => (
        <div className="group">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-slate-900 dark:text-slate-900 group-hover:text-slate-900 dark:group-hover:text-slate-900 block transition-colors">
              {text}
            </span>
            {record.is_recurring && (
              <Tag color="purple" className="text-[10px] py-0 px-1.5 rounded-full border-0 bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-medium">
                🔁 {record.recurrence_pattern === 'DAILY' ? 'Daily' : record.recurrence_pattern === 'WEEKDAYS' ? 'Weekdays' : record.recurrence_pattern === 'WEEKLY' ? 'Weekly' : 'Recurring'}
              </Tag>
            )}
          </div>
          {record.description && (
            <span className="block text-xs font-normal text-slate-500 dark:text-slate-400 truncate max-w-md">
              {record.description}
            </span>
          )}
        </div>
      ),
    },
    {
      title: 'Scheduled Date & Time',
      key: 'date',
      render: (_, record) => (
        <div className="text-xs">
          <p className="font-medium text-slate-900 dark:text-slate-100 m-0">{dayjs(record.meeting_date).format('MMM D, YYYY')}</p>
          <p className="text-slate-500 dark:text-slate-400 m-0">{record.start_time} - {record.end_time}</p>
        </div>
      ),
    },
    {
      title: 'Created Time',
      key: 'created_at',
      render: (_, record) => (
        <div className="text-xs">
          <p className="font-medium text-slate-800 dark:text-slate-200 m-0">
            {record.created_at ? dayjs(record.created_at).format('MMM D, YYYY') : '—'}
          </p>
          <p className="text-slate-400 text-[11px] m-0">
            {record.created_at ? dayjs(record.created_at).format('h:mm A') : ''}
          </p>
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'meeting_type',
      key: 'meeting_type',
      width: 120,
      render: (val) => <StatusBadge type="meetingType" value={val} />,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (val) => <StatusBadge type="meetingStatus" value={val} />,
    },
    {
      title: 'Participants',
      key: 'participants',
      render: (_, record) => (
        <Avatar.Group max={{ count: 3, style: { color: '#f56a00', backgroundColor: '#fde3cf' } }}>
          {record.participants_detail?.map((p) => (
            <Tooltip key={p.id} open={selectedParticipantUser ? false : undefined} title={`${p.full_name || p.username} (${p.role || 'Member'}) • Click to view profile`}>
              <Avatar
                key={p.id}
                onClick={(e) => {
                  e.stopPropagation();
                  e.currentTarget.blur();
                  setSelectedParticipantUser(p);
                }}
                className="bg-slate-600 font-extrabold text-xs text-white cursor-pointer hover:opacity-85 hover:scale-110 transition-all"
              >
                {(p.first_name || p.full_name || p.username || 'U')[0].toUpperCase()}
              </Avatar>
            </Tooltip>
          ))}
        </Avatar.Group>
      ),
    },
    {
      title: 'Discussions',
      dataIndex: 'discussions_count',
      key: 'discussions_count',
      render: (count) => <Tag color="blue">{count || 0} Points</Tag>,
    },
  ];

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs transition-colors duration-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white m-0">
            {viewMode === 'calendar' ? 'Meetings Calendar' : 'Meetings Directory'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 m-0">
            {viewMode === 'calendar'
              ? 'Visual monthly schedule of team meetings and scheduled sessions.'
              : 'View, search, and manage team meetings across your organization.'}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
          <Segmented
            size="middle"
            value={viewMode}
            onChange={(val) => {
              setViewMode(val);
              const params = new URLSearchParams(searchParams);
              if (val === 'calendar') {
                params.set('view', 'calendar');
              } else {
                params.delete('view');
              }
              navigate(`?${params.toString()}`, { replace: true });
            }}
            options={[
              {
                label: 'List View',
                value: 'table',
                icon: <UnorderedListOutlined />,
              },
              {
                label: 'Calendar View',
                value: 'calendar',
                icon: <CalendarOutlined />,
              },
            ]}
            className="rounded-xl bg-slate-100 dark:bg-slate-700 font-bold w-fit shrink-0 text-xs h-9 flex items-center"
          />

          <Link to="/meetings/new" className="no-underline w-full sm:w-auto">
            <Button type="primary" icon={<PlusOutlined />} size="middle" className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl border-none shadow-xs text-xs h-9 px-4 flex items-center justify-center">
              Create Meeting
            </Button>
          </Link>
        </div>
      </div>

      <Card className="shadow-xs rounded-2xl dark:bg-slate-800 dark:border-slate-700/80">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3 items-center w-full">
          <Input
            id="meetings_search"
            name="search"
            prefix={<SearchOutlined className="text-slate-400" />}
            placeholder="Search meeting title or location..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            allowClear
            className="w-full"
            style={{ width: '100%' }}
          />

          <Select
            id="meetings_filter_type"
            name="meeting_type"
            placeholder="Filter by Meeting Type"
            value={meetingType || undefined}
            onChange={(val) => { setMeetingType(val); setPage(1); }}
            allowClear
            className="w-full"
            style={{ width: '100%' }}
            options={[
              { label: 'Internal', value: 'INTERNAL' },
              { label: 'Client', value: 'CLIENT' },
              { label: 'Project', value: 'PROJECT' },
              { label: 'Review', value: 'REVIEW' },
              { label: 'Planning', value: 'PLANNING' },
              { label: 'Other', value: 'OTHER' }
            ]}
          />

          <Select
            id="meetings_filter_status"
            name="status"
            placeholder="Filter by Status"
            value={status || undefined}
            onChange={(val) => { setStatus(val); setPage(1); }}
            allowClear
            className="w-full"
            style={{ width: '100%' }}
            options={[
              { label: 'Scheduled', value: 'SCHEDULED' },
              { label: 'In Progress', value: 'IN_PROGRESS' },
              { label: 'Completed', value: 'COMPLETED' },
              { label: 'Cancelled', value: 'CANCELLED' }
            ]}
          />

          <Tooltip title={viewMode === 'calendar' ? 'Date range filter is disabled in Calendar View' : ''}>
            <div className="w-full">
              <RangePicker
                id="meetings_date_range"
                name="date_range"
                format="YYYY-MM-DD"
                placeholder={['Start Date', 'End Date']}
                disabled={viewMode === 'calendar'}
                value={
                  dateRange && dateRange[0] && dateRange[1]
                    ? [dayjs(dateRange[0]), dayjs(dateRange[1])]
                    : null
                }
                onChange={(dates, dateStrings) => {
                  if (dates && dates[0] && dates[1]) {
                    setDateRange([dateStrings[0], dateStrings[1]]);
                  } else {
                    setDateRange(null);
                  }
                  setPage(1);
                }}
                className="w-full"
                style={{ width: '100%' }}
              />
            </div>
          </Tooltip>

        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2 flex-wrap">
            <span>
              {search || meetingType || status || (dateRange && dateRange[0] && dateRange[1]) ? (
                <>Found <strong>{total}</strong> meeting(s) matching filter criteria.</>
              ) : (
                <>Showing <strong>{total}</strong> total meeting(s).</>
              )}
            </span>
            {(search || meetingType || status || (dateRange && dateRange[0] && dateRange[1])) && (
              <Button type="text" size="small" icon={<ReloadOutlined />} onClick={handleResetFilters} className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium">
                Reset Filters
              </Button>
            )}
          </div>
        </div>
      </Card>

      {loading ? (
        <LoadingSkeleton type="table" />
      ) : error ? (
        <div className="py-12 bg-white dark:bg-slate-800 rounded-xl border border-red-200 dark:border-red-900/50 text-center">
          <p className="text-red-500 font-semibold text-lg m-0">Unable to load meetings.</p>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">Please verify backend connection and try again.</p>
          <Button type="primary" onClick={fetchMeetings}>Retry</Button>
        </div>
      ) : viewMode === 'calendar' ? (
        <MeetingCalendar meetings={meetings} loading={loading} />
      ) : meetings.length === 0 ? (
        <EmptyState
          title="No Meetings Found"
          description={search || meetingType || status || (dateRange && dateRange[0] && dateRange[1]) ? "No meetings matched your current filter criteria." : "Try adjusting your search filters or schedule a new meeting."}
          icon={<CalendarOutlined />}
          actionText={search || meetingType || status || (dateRange && dateRange[0] && dateRange[1]) ? "Reset Filters" : "Create Meeting"}
          onAction={search || meetingType || status || (dateRange && dateRange[0] && dateRange[1]) ? handleResetFilters : () => navigate('/meetings/new')}
        />
      ) : (
        <div className="space-y-4 mb-12">
          {/* Table View for Laptop / Desktop screens (lg breakpoint: >= 1024px) */}
          <div className="hidden lg:block bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
            <Table
              columns={columns}
              dataSource={meetings}
              rowKey="id"
              pagination={false}
              scroll={{ x: 700 }}
              className="w-full"
              onRow={(record) => ({
                onClick: () => navigate(`/meetings/${record.id}`),
                className: 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors',
              })}
            />
          </div>

          {/* Card Grid View for Responsive / Mobile screens (< 1024px) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 block lg:hidden">
            {meetings.map((record) => (
              <Card
                key={record.id}
                onClick={() => navigate(`/meetings/${record.id}`)}
                className="item-card-zoom shadow-xs rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 hover:border-blue-400 hover:shadow-md flex flex-col justify-between cursor-pointer"
                styles={{ body: { padding: '16px', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' } }}
              >
                <div className="space-y-3">
                  {/* Header Badges & Type */}
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge type="meetingType" value={record.meeting_type} />
                      <StatusBadge type="meetingStatus" value={record.status} />
                      {record.is_recurring && (
                        <Tag color="purple" className="text-[10px] py-0 px-1.5 rounded-full border-0 bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-medium">
                          🔁 {record.recurrence_pattern === 'DAILY' ? 'Daily' : record.recurrence_pattern === 'WEEKDAYS' ? 'Weekdays' : record.recurrence_pattern === 'WEEKLY' ? 'Weekly' : 'Recurring'}
                        </Tag>
                      )}
                    </div>
                    <Tag color="blue" className="text-[10px] font-bold m-0">
                      {record.discussions_count || 0} Points
                    </Tag>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white m-0 leading-snug hover:text-blue-600 transition-colors">
                      {record.title}
                    </h3>
                    {record.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 m-0 line-clamp-2 mt-1 leading-relaxed">
                        {record.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer Meta & Participants */}
                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-2">
                  <div className="flex items-start justify-between text-xs text-slate-600 dark:text-slate-300 gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Scheduled</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                        {dayjs(record.meeting_date).format('MMM D, YYYY')}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                        {record.start_time} - {record.end_time}
                      </span>
                    </div>

                    {record.participants_detail && record.participants_detail.length > 0 && (
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Participants</span>
                        <Avatar.Group max={{ count: 3, style: { color: '#f56a00', backgroundColor: '#fde3cf' } }}>
                          {record.participants_detail.map((p) => (
                            <Tooltip key={p.id} title={`${p.full_name || p.username} (${p.role || 'Member'})`}>
                              <Avatar
                                key={p.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.currentTarget.blur();
                                  setSelectedParticipantUser(p);
                                }}
                                className="bg-slate-600 font-extrabold text-xs text-white cursor-pointer hover:scale-110 transition-all"
                              >
                                {(p.first_name || p.full_name || p.username || 'U')[0].toUpperCase()}
                              </Avatar>
                            </Tooltip>
                          ))}
                        </Avatar.Group>
                      </div>
                    )}
                  </div>

                  <div className="pt-1.5 text-[11px] text-slate-400 dark:text-slate-400 flex items-center justify-between border-t border-slate-100/60 dark:border-slate-700/40">
                    <span>CREATED AT: 
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                     <span></span> {record.created_at ? dayjs(record.created_at).format('MMM D, YYYY [at] h:mm A') : '—'}
                    </span>
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {total > pageSize && viewMode !== 'calendar' && (
            <div className="px-4 py-3.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 flex flex-col sm:flex-row justify-between items-center gap-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Showing Page {page} of {Math.ceil(total / pageSize)} ({total} total meetings)
              </span>
              <Pagination
                current={page}
                total={total}
                pageSize={pageSize}
                onChange={(p) => setPage(p)}
                showSizeChanger={false}
                size="small"
                responsive
              />
            </div>
          )}
        </div>
      )}

      <ParticipantProfileModal
        open={Boolean(selectedParticipantUser)}
        onClose={() => setSelectedParticipantUser(null)}
        user={selectedParticipantUser}
      />
    </div>
  );
}
