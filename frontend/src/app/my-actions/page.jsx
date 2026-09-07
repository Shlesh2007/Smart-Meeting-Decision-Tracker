'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { actionService } from '../../services/api.js';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import { LoadingSkeleton } from '../../components/LoadingSkeleton.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';
import {
  Tabs, Card, Table, Select, Button, Tag, message, Alert, Input
} from 'antd';
import {
  CheckSquareOutlined, SearchOutlined, LockOutlined, ReloadOutlined
} from '@ant-design/icons';
import { format } from 'date-fns';

export default function MyActionsPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'ALL';

  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const fetchMyActions = useCallback(() => {
    setLoading(true);
    actionService.getMyActions()
      .then((res) => {
        setActions(res.results || res);
      })
      .catch(() => message.error('Failed to load action items.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchMyActions();
  }, [fetchMyActions]);

  const handleStatusChange = async (actionItem, newStatus) => {
    setUpdatingId(actionItem.id);
    try {
      await actionService.updateActionStatus(actionItem.id, newStatus);
      message.success(`Status updated to ${newStatus}`);
      fetchMyActions();
    } catch (err) {
      const errMsg = err.response?.data?.status?.[0] || err.response?.data?.detail || 'Failed to update action status.';
      message.error({
        content: (
          <div className="text-left font-sans">
            <p className="font-bold text-red-600 m-0 mb-1">Dependency Lock Error (Rule 2)</p>
            <p className="m-0 text-xs">{errMsg}</p>
          </div>
        ),
        duration: 5
      });
    } finally {
      setUpdatingId(null);
    }
  };

  // Filter actions based on tab & search
  const filteredActions = actions.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (activeTab === 'OVERDUE') return item.is_overdue;
    if (activeTab === 'ALL') return true;
    return item.status === activeTab;
  });

  const columns = [
    {
      title: 'Action Item',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => (
        <div>
          <span className="font-semibold text-slate-900 dark:text-slate-100 block">{text}</span>
          {record.description && (
            <span className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{record.description}</span>
          )}
        </div>
      ),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      render: (val) => <StatusBadge type="priority" value={val} />,
    },
    {
      title: 'Due Date',
      key: 'due_date',
      render: (_, record) => (
        <div className="text-xs">
          <span className={`font-semibold ${record.is_overdue ? 'text-rose-600' : 'text-slate-700'}`}>
            {format(new Date(record.due_date), 'MMM dd, yyyy')}
          </span>
          {record.is_overdue && (
            <span className="block text-[10px] text-rose-500 font-bold uppercase">Overdue</span>
          )}
        </div>
      ),
    },
    {
      title: 'Prerequisite Dependencies',
      key: 'dependencies',
      render: (_, record) => {
        const deps = record.dependency_details || [];
        if (deps.length === 0) return <span className="text-xs text-slate-400">None</span>;

        const hasIncomplete = deps.some(d => !d.is_completed);

        return (
          <div className="space-y-1">
            {deps.map((dep) => (
              <Tag key={dep.id} color={dep.is_completed ? 'success' : 'error'} className="text-[11px]">
                {dep.is_completed ? '✓ ' : '🔒 '}{dep.title} ({dep.status})
              </Tag>
            ))}
            {hasIncomplete && (
              <p className="text-[10px] text-amber-600 font-medium m-0 flex items-center">
                <LockOutlined className="mr-1" /> Completion locked until prerequisites finish
              </p>
            )}
          </div>
        );
      },
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => (
        <div className="flex items-center space-x-2">
          <StatusBadge type="actionStatus" value={record.status} />
        </div>
      ),
    },
    {
      title: 'Update Status',
      key: 'action',
      render: (_, record) => (
        <Select
          value={record.status}
          loading={updatingId === record.id}
          onChange={(val) => handleStatusChange(record, val)}
          className="w-36"
          options={[
            { label: 'Todo', value: 'TODO' },
            { label: 'In Progress', value: 'IN_PROGRESS' },
            { label: 'Blocked', value: 'BLOCKED' },
            { label: 'Completed', value: 'COMPLETED' },
            { label: 'Cancelled', value: 'CANCELLED' }
          ]}
        />
      ),
    },
  ];

  const overdueCount = actions.filter(a => a.is_overdue).length;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs transition-colors duration-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white m-0 flex items-center space-x-2">
            <CheckSquareOutlined className="text-blue-600 dark:text-blue-400" />
            <span>My Action Items</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 m-0">Track and update all follow-up action items assigned to you.</p>
        </div>
        <Button icon={<ReloadOutlined />} onClick={fetchMyActions} className="rounded-xl">Refresh Board</Button>
      </div>

      {overdueCount > 0 && (
        <Alert
          type="error"
          showIcon
          message={`You have ${overdueCount} overdue action item(s). Please prioritize completing them.`}
          className="rounded-xl border-rose-200 dark:border-rose-900/50"
        />
      )}

      {/* Tabs & Filters */}
      <Card className="shadow-xs rounded-xl dark:bg-slate-800 dark:border-slate-700">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            className="w-full md:w-auto"
            items={[
              { key: 'ALL', label: `All (${actions.length})` },
              { key: 'TODO', label: `Todo (${actions.filter(a => a.status === 'TODO').length})` },
              { key: 'IN_PROGRESS', label: `In Progress (${actions.filter(a => a.status === 'IN_PROGRESS').length})` },
              { key: 'BLOCKED', label: `Blocked (${actions.filter(a => a.status === 'BLOCKED').length})` },
              { key: 'COMPLETED', label: `Completed (${actions.filter(a => a.status === 'COMPLETED').length})` },
              {
                key: 'OVERDUE',
                label: (
                  <span className={overdueCount > 0 ? 'text-rose-600 font-bold' : ''}>
                    Overdue ({overdueCount})
                  </span>
                )
              },
            ]}
          />

          <Input
            prefix={<SearchOutlined className="text-slate-400" />}
            placeholder="Search action items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:w-64"
            allowClear
          />
        </div>

        {loading ? (
          <LoadingSkeleton type="table" />
        ) : filteredActions.length === 0 ? (
          <EmptyState
            title="No Action Items Found"
            description="No actions match the selected status tab or search query."
          />
        ) : (
          <Table
            columns={columns}
            dataSource={filteredActions}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            className="w-full"
          />
        )}
      </Card>
    </div>
  );
}
