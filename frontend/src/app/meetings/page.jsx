'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { meetingService } from '../../services/api.js';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import { LoadingSkeleton } from '../../components/LoadingSkeleton.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';
import {
  Input, Select, DatePicker, Button, Table, Card, Tag, Avatar, Tooltip, Pagination
} from 'antd';
import {
  SearchOutlined, PlusOutlined, UserOutlined, ReloadOutlined, CalendarOutlined
} from '@ant-design/icons';
import { format } from 'date-fns';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

export default function MeetingsPage() {
  const router = useRouter();
  const [meetings, setMeetings] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [meetingType, setMeetingType] = useState('');
  const [status, setStatus] = useState('');
  const [dateRange, setDateRange] = useState(null);
  const [page, setPage] = useState(1);

  const fetchMeetings = useCallback(() => {
    setLoading(true);
    setError(false);

    const params = {
      page,
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
  }, [page, search, meetingType, status, dateRange]);

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
          <span className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 block transition-colors">
            {text}
          </span>
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
        <Avatar.Group maxCount={3} maxStyle={{ color: '#f56a00', backgroundColor: '#fde3cf' }}>
          {record.participants_detail?.map((p) => (
            <Tooltip key={p.id} title={p.full_name}>
              <Avatar icon={<UserOutlined />} className="bg-blue-600" />
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
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs transition-colors duration-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white m-0">Meetings Directory</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 m-0">View, search, and manage team meetings across your organization.</p>
        </div>
        <Link href="/meetings/new" className="no-underline">
          <Button type="primary" icon={<PlusOutlined />} size="large" className="bg-blue-600 hover:bg-blue-700 font-semibold rounded-xl border-none shadow-xs">
            Create Meeting
          </Button>
        </Link>
      </div>

      {/* Filter Control Bar */}
      <Card className="shadow-xs rounded-2xl dark:bg-slate-800 dark:border-slate-700/80">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
          
          <Input
            prefix={<SearchOutlined className="text-slate-400" />}
            placeholder="Search meeting title or location..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            allowClear
          />

          <Select
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

        <div className="flex justify-between items-center pt-2 text-xs text-slate-500 dark:text-slate-400">
          <span>Found <strong>{total}</strong> meeting(s) matching filter criteria.</span>
          <Button type="text" size="small" icon={<ReloadOutlined />} onClick={handleResetFilters} className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium">
            Reset Filters
          </Button>
        </div>
      </Card>

      {/* Main Content State Rendering */}
      {loading ? (
        <LoadingSkeleton type="table" />
      ) : error ? (
        <div className="py-12 bg-white dark:bg-slate-800 rounded-xl border border-red-200 dark:border-red-900/50 text-center">
          <p className="text-red-500 font-semibold text-lg m-0">Unable to load meetings.</p>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">Please verify backend connection and try again.</p>
          <Button type="primary" onClick={fetchMeetings}>Retry</Button>
        </div>
      ) : meetings.length === 0 ? (
        <EmptyState
          title="No Meetings Found"
          description="Try adjusting your search filters or schedule a new meeting."
          icon={<CalendarOutlined />}
          actionText="Create Meeting"
          onAction={() => router.push('/meetings/new')}
        />
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
          <Table
            columns={columns}
            dataSource={meetings}
            rowKey="id"
            pagination={false}
            scroll={{ x: 'max-content' }}
            className="w-full"
            onRow={(record) => ({
              onClick: () => router.push(`/meetings/${record.id}`),
              className: 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors',
            })}
          />
          <div className="p-4 flex justify-end border-t border-slate-100 dark:border-slate-700">
            <Pagination
              current={page}
              total={total}
              pageSize={10}
              onChange={(p) => setPage(p)}
              showSizeChanger={false}
            />
          </div>
        </div>
      )}

    </div>
  );
}
