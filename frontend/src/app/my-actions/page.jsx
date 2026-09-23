import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { actionService } from '../../services/api.js';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import { LoadingSkeleton } from '../../components/LoadingSkeleton.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';
import {
  Card, Table, Select, Button, Tag, message, Alert, Input, Modal, Tooltip, Dropdown, Badge
} from 'antd';
import {
  CheckSquareOutlined, SearchOutlined, LockOutlined, ReloadOutlined, EllipsisOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

export default function MyActionsPage() {
  const { user, isAdmin, isOwner } = useAuth();
  const [searchParams] = useSearchParams();

  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'ALL');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    if (searchParams.has('search')) {
      setSearch(searchParams.get('search') || '');
    }
    if (searchParams.has('tab')) {
      setActiveTab(searchParams.get('tab') || 'ALL');
    }
  }, [searchParams]);

  const [completingItem, setCompletingItem] = useState(null);
  const [completionNotesInput, setCompletionNotesInput] = useState('');

  const fetchMyActions = useCallback(() => {
    setLoading(true);
    const fetcher = (isAdmin || isOwner) ? actionService.getActions() : actionService.getMyActions();
    fetcher
      .then((res) => {
        setActions(res.results || res);
      })
      .catch(() => message.error('Failed to load action items.'))
      .finally(() => setLoading(false));
  }, [isAdmin, isOwner]);

  useEffect(() => {
    fetchMyActions();
  }, [fetchMyActions]);


  const handleStatusChange = async (actionItem, newStatus) => {
    if (newStatus === 'COMPLETED') {
      setCompletingItem(actionItem);
      setCompletionNotesInput(actionItem.completion_notes || '');
      return;
    }
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

  const handleConfirmCompletion = async () => {
    if (!completingItem) return;
    setUpdatingId(completingItem.id);
    try {
      await actionService.updateActionStatus(completingItem.id, 'COMPLETED', {
        completion_notes: completionNotesInput
      });
      message.success('Action item marked as Completed!');
      setCompletingItem(null);
      setCompletionNotesInput('');
      fetchMyActions();
    } catch (err) {
      const errMsg = err.response?.data?.status?.[0] || err.response?.data?.detail || 'Failed to complete action.';
      message.error(errMsg);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredActions = (Array.isArray(actions) ? actions : []).filter((item) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query ||
      item.title.toLowerCase().includes(query) ||
      (item.description && item.description.toLowerCase().includes(query)) ||
      (item.completion_notes && item.completion_notes.toLowerCase().includes(query));

    if (!matchesSearch) return false;

    if (activeTab === 'OPEN') return ['TODO', 'IN_PROGRESS', 'BLOCKED'].includes(item.status);
    if (activeTab === 'OVERDUE') return item.is_overdue;
    if (activeTab === 'CRITICAL') return item.priority === 'CRITICAL' && item.status !== 'COMPLETED' && item.status !== 'CANCELLED';
    if (activeTab === 'ALL') return true;
    return item.status === activeTab;
  });

  const columns = [
    {
      title: 'Action Item & Delivered Outcome',
      key: 'title',
      render: (_, record) => (
        <div className="space-y-1">
          <span className="font-bold text-slate-900 dark:text-slate-100 block">{record.title}</span>
          {record.description && (
            <span className="text-xs text-slate-500 dark:text-slate-400 block line-clamp-1">{record.description}</span>
          )}
          {record.completion_notes && (
            <div className="mt-1 p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-900 dark:text-emerald-200">
              <strong className="font-bold block text-emerald-700 dark:text-emerald-300">✅ Work Done / Delivered Outcome:</strong>
              <span>{record.completion_notes}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Assignee',
      key: 'assigned_to_detail',
      render: (_, record) => (
        <div className="text-xs space-y-1">
          <span className="font-semibold text-slate-800 dark:text-slate-200 block">
            {record.assigned_to_detail?.full_name || record.assigned_to_detail?.username || '—'}
          </span>
          {record.assigned_to === user?.id ? (
            <Tag color="blue" className="text-[10px] m-0 font-bold">Assigned to You</Tag>
          ) : (
            <Tag color="purple" className="text-[10px] m-0 font-bold">Created by You</Tag>
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
      title: 'Deadline',
      key: 'due_date',
      render: (_, record) => (
        <div className="text-xs">
          <span className={`font-semibold ${record.is_overdue ? 'text-rose-600' : 'text-slate-700'}`}>
            {dayjs(record.due_date).format('MMM DD, YYYY')}
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
      render: (_, record) => {
        const hasIncompleteDeps = record.dependency_details?.some(d => !d.is_completed);
        const isTerminal = record.status === 'COMPLETED' || record.status === 'CANCELLED';
        const isMember = user?.role === 'MEMBER';
        const isDisabled = isTerminal && isMember;

        const selectNode = (
          <Select
            id={`action_app_status_select_${record.id}`}
            name={`action_app_status_select_${record.id}`}
            value={record.status}
            loading={updatingId === record.id}
            onChange={(val) => handleStatusChange(record, val)}
            disabled={isDisabled}
            className="w-36 font-medium text-xs"
            options={[
              { label: 'Todo', value: 'TODO' },
              { label: 'In Progress', value: 'IN_PROGRESS' },
              { label: 'Blocked', value: 'BLOCKED' },
              {
                label: hasIncompleteDeps ? '🔒 Completed (Locked)' : 'Completed',
                value: 'COMPLETED',
                disabled: hasIncompleteDeps
              },
              { label: 'Cancelled', value: 'CANCELLED' }
            ]}
          />
        );

        if (isDisabled) {
          return (
            <Tooltip title="Completed or Cancelled action items are locked for MEMBER role. Contact a Manager or Admin to modify.">
              <span>{selectNode}</span>
            </Tooltip>
          );
        }

        return selectNode;
      },
    },
  ];

  const actionsList = Array.isArray(actions) ? actions : [];
  const overdueCount = actionsList.filter(a => a.is_overdue).length;

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs transition-colors duration-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white m-0 flex items-center space-x-2">
            <CheckSquareOutlined className="text-blue-600 dark:text-blue-400" />
            <span>My Action Items</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 m-0">Track and update all follow-up action items assigned to you.</p>
        </div>
        <Button icon={<ReloadOutlined />} onClick={fetchMyActions} size="middle" className="h-9 px-3.5 text-xs font-bold rounded-xl w-full sm:w-auto">Refresh Board</Button>
      </div>

      {overdueCount > 0 && (
        <Alert
          type="error"
          showIcon
          message={`You have ${overdueCount} overdue action item(s). Please prioritize completing them.`}
          className="rounded-xl border-rose-200 dark:border-rose-900/50"
        />
      )}

      <Card className="shadow-xs rounded-xl dark:bg-slate-800 dark:border-slate-700" styles={{ body: { padding: '16px' } }}>
        <div className="flex items-center gap-2 mb-4">
          <Input
            id="my_actions_app_search"
            name="search"
            prefix={<SearchOutlined className="text-slate-400" />}
            placeholder="Search action items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-0"
            allowClear
          />

          {activeTab !== 'ALL' && (
            <Tag
              color={activeTab === 'OVERDUE' ? 'error' : activeTab === 'CRITICAL' ? 'red' : 'blue'}
              closable
              onClose={() => setActiveTab('ALL')}
              className="text-xs font-bold shrink-0 m-0 py-1 px-2 flex items-center gap-1 cursor-pointer"
            >
              Filter: {activeTab.replace('_', ' ')}
            </Tag>
          )}

          <Dropdown
            menu={{
              items: [
                { key: 'ALL', label: `All (${actionsList.length})` },
                { type: 'divider' },
                { key: 'OPEN', label: `Open (${actionsList.filter(a => ['TODO', 'IN_PROGRESS', 'BLOCKED'].includes(a.status)).length})` },
                { key: 'TODO', label: `Todo (${actionsList.filter(a => a.status === 'TODO').length})` },
                { key: 'IN_PROGRESS', label: `In Progress (${actionsList.filter(a => a.status === 'IN_PROGRESS').length})` },
                { key: 'BLOCKED', label: `Blocked (${actionsList.filter(a => a.status === 'BLOCKED').length})` },
                { key: 'COMPLETED', label: `Completed (${actionsList.filter(a => a.status === 'COMPLETED').length})` },
                { type: 'divider' },
                {
                  key: 'OVERDUE',
                  label: (
                    <span className={overdueCount > 0 ? 'text-rose-600 font-bold' : ''}>
                      Overdue ({overdueCount})
                    </span>
                  )
                },
                {
                  key: 'CRITICAL',
                  label: `Critical (${actionsList.filter(a => a.priority === 'CRITICAL' && a.status !== 'COMPLETED' && a.status !== 'CANCELLED').length})`
                },
              ],
              selectedKeys: [activeTab],
              onClick: ({ key }) => setActiveTab(key),
            }}
            trigger={['click']}
            placement="bottomRight"
          >
            <Button
              id="my_actions_app_filter_3dot_btn"
              name="filter_3dot_btn"
              className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-800 hover:border-blue-500 relative"
              icon={<EllipsisOutlined className="text-base text-slate-700 dark:text-slate-200" />}
            >
              {activeTab !== 'ALL' && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full" />
              )}
            </Button>
          </Dropdown>
        </div>

        {loading ? (
          <LoadingSkeleton type="table" />
        ) : filteredActions.length === 0 ? (
          <EmptyState
            title={
              activeTab !== 'ALL'
                ? `No ${activeTab.replace('_', ' ')} Action Items`
                : 'No Action Items Found'
            }
            description={
              activeTab !== 'ALL'
                ? `No action items matched the '${activeTab.replace('_', ' ')}' filter tab. Click below to view all action items.`
                : 'No action items match the selected filter or search query.'
            }
            actionText={activeTab !== 'ALL' ? 'Show All Action Items' : undefined}
            onAction={activeTab !== 'ALL' ? () => setActiveTab('ALL') : undefined}
          />
        ) : (
          <Table
            columns={columns}
            dataSource={filteredActions}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            scroll={{ x: 700 }}
            className="w-full overflow-x-auto"
          />
        )}
      </Card>

      {/* Action Completion Notes Modal */}
      <Modal
        title="Complete Action Item & Record Outcome"
        open={Boolean(completingItem)}
        onCancel={() => setCompletingItem(null)}
        onOk={handleConfirmCompletion}
        okText="Mark Completed"
        okButtonProps={{ className: 'bg-emerald-600 hover:bg-emerald-700 font-bold' }}
      >
        <div className="space-y-3 py-2">
          <p className="text-xs text-slate-600 dark:text-slate-400 m-0">
            Please enter the work outcome, results achieved, or links to completed deliverables so team members can see what work was done:
          </p>
          <Input.TextArea
            id="completion_notes_app_input"
            name="completion_notes"
            rows={3}
            value={completionNotesInput}
            onChange={(e) => setCompletionNotesInput(e.target.value)}
            placeholder="e.g. Completed API endpoint deployment, tested in staging. PR #104 merged."
          />
        </div>
      </Modal>
    </div>
  );
}
