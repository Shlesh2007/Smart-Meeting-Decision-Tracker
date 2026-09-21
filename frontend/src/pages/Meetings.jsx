import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { meetingService } from '../services/api.js';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { LoadingSkeleton } from '../components/LoadingSkeleton.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { MeetingCalendar } from '../components/MeetingCalendar.jsx';
import {
  Input, Select, DatePicker, Button, Table, Card, Tag, Avatar, Tooltip, Pagination, Segmented
} from 'antd';
import {
  SearchOutlined, PlusOutlined, UserOutlined, ReloadOutlined, CalendarOutlined, UnorderedListOutlined
} from '@ant-design/icons';
import { format } from 'date-fns';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

export default function Meetings() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState('table');

  const [meetings, setMeetings] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [meetingType, setMeetingType] = useState(searchParams.get('meeting_type') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [dateRange, setDateRange] = useState(null);
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

    if (dateRange && dateRange[0] && dateRange[1]) {
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

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

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
            <span className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 block transition-colors">
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
      title: 'Date & Time',
      key: 'date',
      render: (_, record) => (
        <div className="text-xs">
          <p className="font-medium text-slate-900 dark:text-slate-100 m-0">{format(new Date(record.meeting_date), 'PPP')}</p>
          <p className="text-slate-500 dark:text-slate-400 m-0">{record.start_time} - {record.end_time}</p>
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'meeting_type',
      key: 'meeting_type',
      render: (val) => <StatusBadge type="meetingType" value={val} />,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (val) => <StatusBadge type="meetingStatus" value={val} />,
    },
    {
      title: 'Participants',
      key: 'participants',
      render: (_, record) => (
        <Avatar.Group max={{ count: 3, style: { color: '#f56a00', backgroundColor: '#fde3cf' } }}>
          {record.participants_detail?.map((p) => (
            <Tooltip key={p.id} title={p.full_name}>
              <Avatar className="bg-blue-600 font-extrabold text-xs text-white">
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
            value={viewMode}
            onChange={(val) => setViewMode(val)}
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
            className="p-1 rounded-xl bg-slate-100 dark:bg-slate-700 font-bold w-fit shrink-0"
          />

          <Link to="/meetings/new" className="no-underline w-full sm:w-auto">
            <Button type="primary" icon={<PlusOutlined />} size="middle" className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl border-none shadow-xs text-xs h-9 px-3.5 flex items-center justify-center">
              Create Meeting
            </Button>
          </Link>
        </div>
      </div>

      <Card className="shadow-xs rounded-2xl dark:bg-slate-800 dark:border-slate-700/80">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <Input
            id="meetings_search"
            name="search"
            prefix={<SearchOutlined className="text-slate-400" />}
            placeholder="Search meeting title or location..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            allowClear
          />

          <Select
            id="meetings_filter_type"
            name="meeting_type"
            placeholder="Filter by Meeting Type"
            value={meetingType || undefined}
            onChange={(val) => { setMeetingType(val); setPage(1); }}
            allowClear
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
            options={[
              { label: 'Scheduled', value: 'SCHEDULED' },
              { label: 'In Progress', value: 'IN_PROGRESS' },
              { label: 'Completed', value: 'COMPLETED' },
              { label: 'Cancelled', value: 'CANCELLED' }
            ]}
          />

          <RangePicker
            id="meetings_date_range"
            name="date_range"
            format="YYYY-MM-DD"
            placeholder={['Start Date', 'End Date']}
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
          />
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

          {total > pageSize && viewMode !== 'calendar' && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-semibold text-slate-400">Page {page} of {Math.ceil(total / pageSize)}</span>
              <Pagination
                current={page}
                total={total}
                pageSize={pageSize}
                onChange={(p) => setPage(p)}
                showSizeChanger={false}
                size="small"
                simple
              />
            </div>
          )}
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
          description="Try adjusting your search filters or schedule a new meeting."
          icon={<CalendarOutlined />}
          actionText="Create Meeting"
          onAction={() => navigate('/meetings/new')}
        />
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs mb-12">
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
          <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Showing {meetings.length > 0 ? (page - 1) * pageSize + 1 : 0} - {Math.min(page * pageSize, total)} of <strong>{total}</strong> meeting(s)
            </span>
            <Pagination
              current={page}
              total={total}
              pageSize={pageSize}
              onChange={(p, size) => {
                setPage(p);
                if (size && size !== pageSize) {
                  setPageSize(size);
                }
              }}
              showSizeChanger
              pageSizeOptions={['6', '10', '20', '50']}
              size="small"
              className="text-xs font-semibold"
            />
          </div>
        </div>
      )}
    </div>
  );
}
