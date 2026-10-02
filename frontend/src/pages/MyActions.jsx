import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { actionService } from '../services/api.js';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { LoadingSkeleton } from '../components/LoadingSkeleton.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { ActionDetailModal } from '../components/ActionDetailModal.jsx';
import {
  Card, Table, Select, Button, Tag, message, Alert, Input, Modal, Tooltip, Dropdown, Badge, DatePicker
} from 'antd';
import {
  CheckSquareOutlined, SearchOutlined, LockOutlined, ReloadOutlined, EllipsisOutlined, EyeOutlined, RightOutlined, CalendarOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

export default function MyActions() {
  const { user, isAdmin, isOwner } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'ALL');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [updatingId, setUpdatingId] = useState(null);
  const [viewDetailActionItem, setViewDetailActionItem] = useState(null);

  const handleCloseDetailModal = () => {
    setViewDetailActionItem(null);
    if (searchParams.has('action_id')) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('action_id');
      setSearchParams(newParams, { replace: true });
    }
  };

  const [dateRange, setDateRange] = useState(() => {
    const s = searchParams.get('start_date');
    const e = searchParams.get('end_date');
    return (s && e) ? [s, e] : null;
  });

  const handleDateRangeChange = (dates, dateStrings) => {
    if (dates && dates[0] && dates[1]) {
      setDateRange([dateStrings[0], dateStrings[1]]);
      const newParams = new URLSearchParams(searchParams);
      newParams.set('start_date', dateStrings[0]);
      newParams.set('end_date', dateStrings[1]);
      setSearchParams(newParams, { replace: true });
    } else {
      setDateRange(null);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('start_date');
      newParams.delete('end_date');
      setSearchParams(newParams, { replace: true });
    }
  };

  useEffect(() => {
    if (searchParams.has('search')) {
      setSearch(searchParams.get('search') || '');
    }
    if (searchParams.has('tab')) {
      setActiveTab(searchParams.get('tab') || 'ALL');
    }
    if (searchParams.has('start_date') && searchParams.has('end_date')) {
      setDateRange([searchParams.get('start_date'), searchParams.get('end_date')]);
    }
  }, [searchParams]);

  const [completingItem, setCompletingItem] = useState(null);
  const [completionNotesInput, setCompletionNotesInput] = useState('');

  const fetchMyActions = useCallback(() => {
    setLoading(true);
    const params = { page_size: 1000 };

    if (search && search.trim()) {
      params.search = search.trim();
    }
    if (dateRange && dateRange[0] && dateRange[1]) {
      params.due_date_gte = dateRange[0];
      params.due_date_lte = dateRange[1];
    }

    const fetcher = (isAdmin || isOwner) ? actionService.getActions(params) : actionService.getMyActions(params);
    fetcher
      .then((res) => {
        const list = res.results || res || [];
        setActions(list);
        const targetActionId = searchParams.get('action_id');
        if (targetActionId) {
          const match = list.find((a) => String(a.id) === String(targetActionId));
          if (match) {
            setViewDetailActionItem(match);
          } else {
            const fetcherAll = (isAdmin || isOwner) ? actionService.getActions({ page_size: 1000 }) : actionService.getMyActions({ page_size: 1000 });
            fetcherAll
              .then((resAll) => {
                const allList = resAll.results || resAll || [];
                const found = allList.find((a) => String(a.id) === String(targetActionId));
                if (found) setViewDetailActionItem(found);
              })
              .catch(() => {});
          }
        }
      })
      .catch(() => message.error('Failed to load action items.'))
      .finally(() => setLoading(false));
  }, [isAdmin, isOwner, search, dateRange, searchParams]);

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
    if (!item) return false;
    const query = search.trim().toLowerCase();
    const matchesSearch = !query ||
      (item.title && item.title.toLowerCase().includes(query)) ||
      (item.description && item.description.toLowerCase().includes(query)) ||
      (item.completion_notes && item.completion_notes.toLowerCase().includes(query));

    if (!matchesSearch) return false;

    if (dateRange && dateRange[0] && dateRange[1]) {
      const s = dateRange[0];
      const e = dateRange[1];
      const dueDateStr = item.due_date ? dayjs(item.due_date).format('YYYY-MM-DD') : null;
      const createdAtStr = item.created_at ? dayjs(item.created_at).format('YYYY-MM-DD') : null;
      const dateMatches = (dueDateStr && dueDateStr >= s && dueDateStr <= e) || (createdAtStr && createdAtStr >= s && createdAtStr <= e);
      if (!dateMatches) return false;
    }

    const itemStatus = (item.status || '').toUpperCase();
    const itemPriority = (item.priority || '').toUpperCase();
    const today = dayjs().format('YYYY-MM-DD');
    const dueDateStr = item.due_date ? dayjs(item.due_date).format('YYYY-MM-DD') : null;
    const isOverdueItem = Boolean(item.is_overdue || (dueDateStr && dueDateStr < today && !['COMPLETED', 'CANCELLED'].includes(itemStatus)));

    if (activeTab === 'OPEN') return ['TODO', 'IN_PROGRESS', 'BLOCKED'].includes(itemStatus);
    if (activeTab === 'OVERDUE') return isOverdueItem;
    if (activeTab === 'CRITICAL') return itemPriority === 'CRITICAL' && !['COMPLETED', 'CANCELLED'].includes(itemStatus);
    if (activeTab === 'ALL') return true;
    return itemStatus === activeTab;
  });

  const columns = [
    {
      title: 'Action Item & Delivered Outcome',
      key: 'title',
      width: 380,
      render: (_, record) => (
        <div
          onClick={() => setViewDetailActionItem(record)}
          className="space-y-1 min-w-0 cursor-pointer group"
        >
          <span className="font-bold text-slate-900 dark:text-slate-100 block text-xs sm:text-sm leading-snug">
            {record.title}
          </span>
          {record.description && (
            <span className="text-xs text-slate-500 dark:text-slate-400 block leading-relaxed">
              {record.description}
            </span>
          )}
          {record.completion_notes && (
            <div className="mt-1 p-1.5 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 text-xs text-emerald-900 dark:text-emerald-200">
              <strong className="font-bold block text-emerald-700 dark:text-emerald-300 mb-0.5">✅ Work Done / Delivered Outcome:</strong>
              <span className="leading-relaxed">{record.completion_notes}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Assignee(s)',
      key: 'assigned_to_detail',
      width: 180,
      render: (_, record) => {
        const assignees = Array.isArray(record.assigned_to_detail)
          ? record.assigned_to_detail
          : (record.assigned_to_detail ? [record.assigned_to_detail] : []);
        
        const assignedIds = Array.isArray(record.assigned_to)
          ? record.assigned_to.map(u => typeof u === 'object' ? u.id : u)
          : (record.assigned_to ? [typeof record.assigned_to === 'object' ? record.assigned_to.id : record.assigned_to] : []);

        const isAssignedToUser = user?.id && assignedIds.includes(user.id);
        const isCreatedByUser = record.created_by === user?.id || record.created_by_detail?.id === user?.id;

        return (
          <div className="text-xs space-y-1 max-w-[170px]">
            {assignees.length === 0 ? (
              <span className="text-slate-400 font-medium">—</span>
            ) : (
              <div className="flex flex-wrap gap-1 items-center">
                {assignees.map(u => (
                  <Tag key={u.id} color="blue" className="text-[10px] font-bold m-0 px-1.5 py-0 truncate max-w-[160px]" title={u.full_name || u.username}>
                    {u.full_name || u.username}
                  </Tag>
                ))}
              </div>
            )}
            {isAssignedToUser && (
              <Tag color="cyan" className="text-[9.5px] m-0 px-1 font-bold inline-block">Assigned to You</Tag>
            )}
            {!isAssignedToUser && isCreatedByUser && (
              <Tag color="purple" className="text-[9.5px] m-0 px-1 font-bold inline-block">Created by You</Tag>
            )}
          </div>
        );
      },
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (val) => <StatusBadge type="priority" value={val} />,
    },
    {
      title: 'Deadline',
      key: 'due_date',
      width: 110,
      render: (_, record) => (
        <div className="text-xs">
          <span className={`font-semibold ${record.is_overdue ? 'text-rose-600' : 'text-slate-700 dark:text-slate-300'}`}>
            {dayjs(record.due_date).format('MMM DD, YYYY')}
          </span>
          {record.is_overdue && (
            <span className="block text-[9.5px] text-rose-500 font-bold uppercase">Overdue</span>
          )}
        </div>
      ),
    },
    {
      title: 'Prerequisite Dependencies',
      key: 'dependencies',
      width: 180,
      render: (_, record) => {
        const deps = record.dependency_details || [];
        if (deps.length === 0) return <span className="text-xs text-slate-400 font-medium">None</span>;

        const hasIncomplete = deps.some(d => !d.is_completed);

        return (
          <div className="space-y-0.5 max-w-[170px]">
            <div className="flex flex-wrap gap-1">
              {deps.map((dep) => (
                <Tag key={dep.id} color={dep.is_completed ? 'success' : 'error'} className="text-[10px] font-bold m-0 px-1 py-0 truncate max-w-[160px]" title={dep.title}>
                  {dep.is_completed ? '✓ ' : '🔒 '}{dep.title}
                </Tag>
              ))}
            </div>
            {hasIncomplete && (
              <p className="text-[9.5px] text-amber-600 dark:text-amber-400 font-medium m-0 flex items-center leading-tight">
                <LockOutlined className="mr-0.5 text-[9px]" /> Locked until prerequisites finish
              </p>
            )}
          </div>
        );
      },
    },
    {
      title: 'Status & Action',
      key: 'status_action',
      width: 150,
      render: (_, record) => {
        const hasIncompleteDeps = record.dependency_details?.some(d => !d.is_completed);
        const isTerminal = record.status === 'COMPLETED' || record.status === 'CANCELLED';

        const selectNode = (
          <Select
            id={`action_status_select_${record.id}`}
            name={`action_status_select_${record.id}`}
            value={record.status}
            loading={updatingId === record.id}
            onChange={(val) => handleStatusChange(record, val)}
            disabled={isTerminal}
            size="small"
            className="w-34 font-semibold text-xs rounded-lg"
            options={[
              { label: hasIncompleteDeps ? '🔒 Todo (Locked)' : 'Todo', value: 'TODO', disabled: hasIncompleteDeps },
              { label: hasIncompleteDeps ? '🔒 In Progress (Locked)' : 'In Progress', value: 'IN_PROGRESS', disabled: hasIncompleteDeps },
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

        if (isTerminal) {
          return (
            <Tooltip title="Completed or Cancelled action items are locked.">
              <span>{selectNode}</span>
            </Tooltip>
          );
        }

        return selectNode;
      },
    },
  ];

  const actionsList = Array.isArray(actions) ? actions : [];

  const counts = React.useMemo(() => {
    const today = dayjs().format('YYYY-MM-DD');
    let open = 0, todo = 0, inProgress = 0, blocked = 0, completed = 0, cancelled = 0, overdue = 0, critical = 0;

    actionsList.forEach((a) => {
      if (!a) return;
      const status = (a.status || '').toUpperCase();
      const priority = (a.priority || '').toUpperCase();
      const dueDateStr = a.due_date ? dayjs(a.due_date).format('YYYY-MM-DD') : null;
      const isOverdue = Boolean(a.is_overdue || (dueDateStr && dueDateStr < today && !['COMPLETED', 'CANCELLED'].includes(status)));

      if (['TODO', 'IN_PROGRESS', 'BLOCKED'].includes(status)) open++;
      if (status === 'TODO') todo++;
      if (status === 'IN_PROGRESS') inProgress++;
      if (status === 'BLOCKED') blocked++;
      if (status === 'COMPLETED') completed++;
      if (status === 'CANCELLED') cancelled++;
      if (isOverdue) overdue++;
      if (priority === 'CRITICAL' && !['COMPLETED', 'CANCELLED'].includes(status)) critical++;
    });

    return { open, todo, inProgress, blocked, completed, cancelled, overdue, critical, total: actionsList.length };
  }, [actionsList]);

  const overdueCount = counts.overdue;

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
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchMyActions}
            size="middle"
            className="h-9 px-3.5 text-xs font-bold rounded-xl shrink-0 flex items-center justify-center border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            Refresh Board
          </Button>
        </div>
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
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4">
          <Input
            id="my_actions_search"
            name="search"
            prefix={<SearchOutlined className="text-slate-400" />}
            placeholder="Search action items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-0"
            allowClear
          />

          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
            <RangePicker
              size="middle"
              format="YYYY-MM-DD"
              placeholder={['Due From', 'Due To']}
              value={
                dateRange && dateRange[0] && dateRange[1]
                  ? [dayjs(dateRange[0]), dayjs(dateRange[1])]
                  : null
              }
              onChange={handleDateRangeChange}
              className="w-full sm:w-[230px] rounded-xl text-xs"
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

            {dateRange && dateRange[0] && dateRange[1] && (
              <Tag
                color="purple"
                closable
                onClose={() => handleDateRangeChange(null, ['', ''])}
                className="text-xs font-bold shrink-0 m-0 py-1 px-2 flex items-center gap-1 cursor-pointer"
              >
                Date: {dateRange[0]} to {dateRange[1]}
              </Tag>
            )}

            <Dropdown
              menu={{
                items: [
                  { key: 'ALL', label: `All (${counts.total})` },
                  { type: 'divider' },
                  { key: 'OPEN', label: `Open (${counts.open})` },
                  { key: 'TODO', label: `Todo (${counts.todo})` },
                  { key: 'IN_PROGRESS', label: `In Progress (${counts.inProgress})` },
                  { key: 'BLOCKED', label: `Blocked (${counts.blocked})` },
                  { key: 'COMPLETED', label: `Completed (${counts.completed})` },
                  { key: 'CANCELLED', label: `Cancelled (${counts.cancelled})` },
                  { type: 'divider' },
                  {
                    key: 'OVERDUE',
                    label: (
                      <span className={counts.overdue > 0 ? 'text-rose-600 font-bold' : ''}>
                        Overdue ({counts.overdue})
                      </span>
                    )
                  },
                  {
                    key: 'CRITICAL',
                    label: `Critical (${counts.critical})`
                  },
                ],
                selectedKeys: [activeTab],
                onClick: ({ key }) => setActiveTab(key),
              }}
              trigger={['click']}
              placement="bottomRight"
            >
              <Button
                id="my_actions_filter_3dot_btn"
                name="filter_3dot_btn"
                className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-800 hover:border-blue-500 relative"
                icon={<EllipsisOutlined className="text-base text-slate-700 dark:text-slate-200" />}
              >
                {(activeTab !== 'ALL' || dateRange) && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full" />
                )}
              </Button>
            </Dropdown>
          </div>
        </div>

        {loading ? (
          <>
            <div className="hidden lg:block">
              <LoadingSkeleton type="table" />
            </div>
            <div className="block lg:hidden">
              <LoadingSkeleton type="card" />
            </div>
          </>
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
          <>
            {/* Table View for Laptop / Desktop screens (lg breakpoint: >= 1024px) */}
            <div className="hidden lg:block w-full overflow-x-auto">
              <Table
                size="middle"
                columns={columns}
                dataSource={filteredActions}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                scroll={{ x: 1050 }}
                className="w-full"
              />
            </div>

            {/* Card Grid View for Responsive / Mobile screens (< 1024px) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 block lg:hidden">
              {filteredActions.map((record) => {
                const assignees = Array.isArray(record.assigned_to_detail)
                  ? record.assigned_to_detail
                  : (record.assigned_to_detail ? [record.assigned_to_detail] : []);

                const hasIncompleteDeps = record.dependency_details?.some(d => !d.is_completed);

                return (
                  <Card
                    key={record.id}
                    onClick={() => setViewDetailActionItem(record)}
                    className="item-card-zoom shadow-xs rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 hover:border-blue-400 hover:shadow-md flex flex-col justify-between cursor-pointer"
                    styles={{ body: { padding: '16px', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' } }}
                  >
                    <div className="space-y-3">
                      {/* Header Badges & Meeting Title */}
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <StatusBadge type="priority" value={record.priority} />
                          <StatusBadge type="actionStatus" value={record.status} />
                          {record.is_overdue && <StatusBadge type="overdue" value={true} />}
                        </div>
                        {record.meeting_title && (
                          <Tag color="purple" className="text-[10px] m-0 font-semibold truncate max-w-[140px]">
                            {record.meeting_title}
                          </Tag>
                        )}
                      </div>

                      {/* Title & Description Preview */}
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white m-0 leading-snug">
                          {record.title}
                        </h3>
                        {record.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 m-0 line-clamp-2 mt-1 leading-relaxed">
                            {record.description}
                          </p>
                        )}
                      </div>

                      {/* Work Done / Delivered Outcome Box */}
                      {record.completion_notes && (
                        <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-900 dark:text-emerald-200">
                          <strong className="font-bold block text-emerald-800 dark:text-emerald-300 text-[11px] mb-0.5">
                            ✅ Delivered Outcome:
                          </strong>
                          <span className="line-clamp-3 text-xs">{record.completion_notes}</span>
                        </div>
                      )}

                      {/* Prerequisite Dependencies Tags */}
                      {record.dependency_details && record.dependency_details.length > 0 && (
                        <div className="space-y-1 pt-0.5 min-w-0 max-w-full overflow-hidden">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Prerequisites ({record.dependency_details.length})
                          </span>
                          <div className="flex flex-wrap gap-1 max-w-full overflow-hidden">
                            {record.dependency_details.map((dep) => (
                              <Tag
                                key={dep.id}
                                color={dep.is_completed ? 'success' : 'error'}
                                className="text-[10px] m-0 max-w-full whitespace-normal break-words py-0.5 px-2 rounded-md leading-tight"
                              >
                                {dep.is_completed ? '✓ ' : '🔒 '}{dep.title}
                              </Tag>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer Info & Actions */}
                    <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-2">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium pb-1.5 border-b border-slate-100/80 dark:border-slate-700/40">
                        <span>Created: <strong className="text-slate-700 dark:text-slate-300">{record.created_at ? dayjs(record.created_at).format('MMM DD, YYYY [at] h:mm A') : '—'}</strong></span>
                        {record.created_by_detail && (
                          <span className="truncate max-w-[140px]">By: <strong>{record.created_by_detail.full_name || record.created_by_detail.username}</strong></span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 pt-0.5">
                        <div className="min-w-0 flex-1 pr-2">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Assignee(s)</span>
                          {assignees.length === 0 ? (
                            <span className="font-semibold text-slate-400 text-xs">
                              {record.created_by_detail ? (record.created_by_detail.full_name || record.created_by_detail.username) : 'Unassigned'}
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1 items-center">
                              {assignees.map(u => (
                                <Tag key={u.id} color="blue" className="text-[10px] font-bold m-0 px-1.5 py-0">
                                  {u.full_name || u.username}
                                </Tag>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Deadline</span>
                          <span className={`font-semibold text-xs ${record.is_overdue ? 'text-rose-600 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                            {dayjs(record.due_date).format('MMM DD, YYYY')}
                          </span>
                        </div>
                      </div>

                      {/* Quick Status Update Select (Stops propagation so changing dropdown doesn't trigger modal) */}
                      <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                        <Select
                          id={`card_action_status_select_${record.id}`}
                          name={`card_action_status_select_${record.id}`}
                          value={record.status}
                          loading={updatingId === record.id}
                          onChange={(val) => handleStatusChange(record, val)}
                          disabled={record.status === 'COMPLETED' || record.status === 'CANCELLED'}
                          className="w-full text-xs font-medium"
                          options={[
                            {
                              label: hasIncompleteDeps ? '🔒 Todo (Locked)' : 'Todo',
                              value: 'TODO',
                              disabled: hasIncompleteDeps
                            },
                            {
                              label: hasIncompleteDeps ? '🔒 In Progress (Locked)' : 'In Progress',
                              value: 'IN_PROGRESS',
                              disabled: hasIncompleteDeps
                            },
                            { label: 'Blocked', value: 'BLOCKED' },
                            {
                              label: hasIncompleteDeps ? '🔒 Completed (Locked)' : 'Completed',
                              value: 'COMPLETED',
                              disabled: hasIncompleteDeps
                            },
                            { label: 'Cancelled', value: 'CANCELLED' }
                          ]}
                        />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </Card>

      {/* Reusable Action Item Detail Modal */}
      <ActionDetailModal
        open={Boolean(viewDetailActionItem)}
        onClose={handleCloseDetailModal}
        actionItem={viewDetailActionItem}
        onNavigateMeeting={(meetingId) => navigate(`/meetings/${meetingId}`)}
        onStatusChange={async (item, newStatus) => {
          await handleStatusChange(item, newStatus);
          setViewDetailActionItem((prev) => (prev ? { ...prev, status: newStatus } : null));
        }}
        onCompleteRequest={(item) => {
          setCompletingItem(item);
          setCompletionNotesInput(item.completion_notes || '');
        }}
      />

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
            id="completion_notes_input"
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
