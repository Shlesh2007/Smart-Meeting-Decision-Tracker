import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card, List, Typography, Avatar, Flex, Space, Button, Spin, Empty, Tag, message, Tooltip, Modal, Input } from 'antd';
import {
  ThunderboltOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  RightOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  LockOutlined,
  FileDoneOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { actionService } from '../../services/api.js';
import { StatusBadge } from '../StatusBadge.jsx';
import { ActionFormModal } from '../ActionFormModal.jsx';

const { Text, Title } = Typography;

export const MyNextUpCard = ({ onRefreshDashboard }) => {
  const [tasks, setTasks] = useState([]);
  const [totalPendingCount, setTotalPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [showAddActionModal, setShowAddActionModal] = useState(false);

  // Outcome / Completion Modal state
  const [completingItem, setCompletingItem] = useState(null);
  const [completionNotesInput, setCompletionNotesInput] = useState('');

  const fetchMyTasks = useCallback(() => {
    setLoading(true);
    actionService
      .getMyActions({ page_size: 50 })
      .then((res) => {
        const list = res.results || res || [];
        // Filter out completed and cancelled tasks
        const pendingList = list.filter(
          (item) => item.status !== 'COMPLETED' && item.status !== 'CANCELLED'
        );
        setTotalPendingCount(pendingList.length);

        // Sort: overdue tasks first, then by earliest due date
        const sorted = [...pendingList].sort((a, b) => {
          const now = dayjs();
          const aOverdue = a.due_date && dayjs(a.due_date).isBefore(now, 'day');
          const bOverdue = b.due_date && dayjs(b.due_date).isBefore(now, 'day');

          if (aOverdue && !bOverdue) return -1;
          if (!aOverdue && bOverdue) return 1;

          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return dayjs(a.due_date).diff(dayjs(b.due_date));
        });

        setTasks(sorted.slice(0, 4));
      })
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchMyTasks();
  }, [fetchMyTasks]);

  // Open the outcome dialog when complete checkbox/button is clicked
  const handleOpenCompletionModal = (item) => {
    setCompletingItem(item);
    setCompletionNotesInput(item.completion_notes || '');
  };

  // Submit completion along with resolution notes
  const handleConfirmCompletion = async () => {
    if (!completingItem) return;
    setUpdatingId(completingItem.id);
    try {
      await actionService.updateActionStatus(completingItem.id, 'COMPLETED', {
        completion_notes: completionNotesInput.trim() || undefined,
      });

      message.success(`" ${completingItem.title} " marked as completed! 🎉`);
      setCompletingItem(null);
      setCompletionNotesInput('');
      fetchMyTasks();
      if (onRefreshDashboard) {
        onRefreshDashboard();
      }
    } catch (err) {
      const errMsg =
        err.response?.data?.status?.[0] ||
        err.response?.data?.detail ||
        'Unable to complete action item.';

      message.error({
        content: (
          <div className="text-left font-sans">
            <p className="font-bold text-rose-600 m-0 mb-1 flex items-center gap-1">
              <LockOutlined /> Dependency Lock
            </p>
            <p className="m-0 text-xs">{errMsg}</p>
          </div>
        ),
        duration: 5,
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDueDateTag = (dueDateStr) => {
    if (!dueDateStr) return null;
    const today = dayjs().startOf('day');
    const due = dayjs(dueDateStr).startOf('day');
    const diffDays = due.diff(today, 'day');

    if (diffDays < 0) {
      return (
        <Tag
          icon={<ExclamationCircleOutlined className="text-[10px]" />}
          className="!mr-0 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60 text-[10px] font-bold py-0 px-1.5 rounded-md flex items-center gap-1"
        >
          Overdue ({Math.abs(diffDays)}d)
        </Tag>
      );
    }
    if (diffDays === 0) {
      return (
        <Tag
          icon={<ClockCircleOutlined className="text-[10px]" />}
          className="!mr-0 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/60 text-[10px] font-bold py-0 px-1.5 rounded-md flex items-center gap-1"
        >
          Due Today
        </Tag>
      );
    }
    if (diffDays === 1) {
      return (
        <Tag className="!mr-0 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/60 text-[10px] font-medium py-0 px-1.5 rounded-md">
          Tomorrow
        </Tag>
      );
    }
    return (
      <Tag className="!mr-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 text-[10px] font-medium py-0 px-1.5 rounded-md">
        {due.format('MMM D')}
      </Tag>
    );
  };

  return (
    <>
      <Card
        className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-xs h-full flex flex-col justify-between dark:bg-slate-900"
        styles={{
          body: {
            padding: '16px',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          },
        }}
        title={
          <Flex align="center" justify="space-between" className="w-full">
            <Space align="center" size={8}>
              <Avatar
                shape="square"
                size={26}
                icon={<ThunderboltOutlined />}
                className="bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-none rounded-lg flex items-center justify-center text-xs"
              />
              <Title level={5} className="!m-0 !text-xs !font-extrabold text-slate-900 dark:text-slate-100">
                My Next Up
              </Title>
            </Space>
            <Tooltip title="Log new task">
              <Button
                type="text"
                size="small"
                icon={<PlusOutlined className="text-amber-600 dark:text-amber-400 text-xs" />}
                onClick={() => setShowAddActionModal(true)}
                className="hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-lg flex items-center justify-center h-7 w-7 p-0"
              />
            </Tooltip>
          </Flex>
        }
      >
        <div className="my-1 flex-1 overflow-y-auto">
          {loading ? (
            <Flex justify="center" align="center" className="py-8">
              <Spin size="small" tip="Loading your tasks..." />
            </Flex>
          ) : tasks.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div className="text-center space-y-1 py-2">
                  <Text className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    All caught up! 🎉
                  </Text>
                  <Text type="secondary" className="text-[11px] block">
                    No pending action items assigned to you.
                  </Text>
                </div>
              }
              className="my-auto py-3"
            />
          ) : (
            <List
              itemLayout="horizontal"
              dataSource={tasks}
              renderItem={(item) => {
                const isCompleting = updatingId === item.id;
                const hasDependencies = item.dependencies && item.dependencies.length > 0;

                return (
                  <List.Item className="!p-2.5 !rounded-xl !bg-slate-50/80 dark:!bg-slate-800/50 hover:!bg-slate-100/90 dark:hover:!bg-slate-800 !border !border-slate-200/60 dark:!border-slate-700/60 transition-all !mb-2 last:!mb-0 flex items-center justify-between group">
                    <Flex align="center" gap={10} className="w-full overflow-hidden">
                      <Tooltip title="Complete task & record outcome notes">
                        <button
                          type="button"
                          disabled={isCompleting}
                          onClick={() => handleOpenCompletionModal(item)}
                          className="shrink-0 w-6 h-6 rounded-full border-2 border-slate-300 dark:border-slate-600 hover:border-amber-500 dark:hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center justify-center transition-all cursor-pointer group-hover:scale-105"
                        >
                          {isCompleting ? (
                            <Spin size="small" className="text-[10px]" />
                          ) : (
                            <CheckCircleOutlined className="text-slate-300 dark:text-slate-600 group-hover:text-amber-500 dark:group-hover:text-amber-400 text-xs transition-colors" />
                          )}
                        </button>
                      </Tooltip>

                      <div className="flex-1 min-w-0">
                        <Flex justify="space-between" align="center" gap={6} className="mb-0.5">
                          <Text className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate block group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                            {item.title}
                          </Text>
                          <StatusBadge type="priority" value={item.priority || 'MEDIUM'} />
                        </Flex>
                        <Flex justify="space-between" align="center" gap={4} className="mt-1">
                          {formatDueDateTag(item.due_date)}
                          {hasDependencies && (
                            <Tooltip title={`${item.dependencies.length} prerequisite dependency task(s)`}>
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-0.5 font-semibold">
                                <LockOutlined className="text-[9px]" /> {item.dependencies.length} Dep
                              </span>
                            </Tooltip>
                          )}
                        </Flex>
                      </div>
                    </Flex>
                  </List.Item>
                );
              }}
            />
          )}
        </div>

        <Flex align="center" justify="space-between" className="pt-2.5 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <Text type="secondary" className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
            {totalPendingCount} pending task{totalPendingCount !== 1 ? 's' : ''} assigned
          </Text>
          <Link
            to="/my-actions"
            className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 no-underline"
          >
            <span>View My Workspace</span>
            <RightOutlined className="text-[8px]" />
          </Link>
        </Flex>
      </Card>

      {/* Outcome / Completion Notes Dialog */}
      <Modal
        title={
          <Flex align="center" gap={8}>
            <Avatar
              shape="square"
              size={24}
              icon={<FileDoneOutlined />}
              className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-none rounded flex items-center justify-center text-xs"
            />
            <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
              Complete Action Item & Record Outcome
            </span>
          </Flex>
        }
        open={Boolean(completingItem)}
        onCancel={() => {
          setCompletingItem(null);
          setCompletionNotesInput('');
        }}
        onOk={handleConfirmCompletion}
        confirmLoading={updatingId === completingItem?.id}
        okText="Mark Completed"
        okButtonProps={{ className: 'bg-emerald-600 hover:bg-emerald-700 font-bold rounded-lg' }}
        cancelButtonProps={{ className: 'rounded-lg font-semibold' }}
        className="rounded-xl"
      >
        {completingItem && (
          <div className="space-y-3 py-2">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              <Text className="font-bold text-xs text-slate-900 dark:text-slate-100 block mb-0.5">
                {completingItem.title}
              </Text>
              {completingItem.description && (
                <Text type="secondary" className="text-[11px] block truncate">
                  {completingItem.description}
                </Text>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Completion / Resolution Notes (Outcome)
              </label>
              <Input.TextArea
                id="completion_notes_input"
                name="completion_notes"
                rows={3}
                value={completionNotesInput}
                onChange={(e) => setCompletionNotesInput(e.target.value)}
                placeholder="e.g. Deployed updated API backend, verified response status codes in staging environment."
                className="rounded-lg text-xs"
              />
              <Text type="secondary" className="text-[10px] text-slate-400 mt-1 block">
                Record work results, PR links, or resolution details for team audit records.
              </Text>
            </div>
          </div>
        )}
      </Modal>

      <ActionFormModal
        open={showAddActionModal}
        onClose={() => setShowAddActionModal(false)}
        onSuccess={() => {
          setShowAddActionModal(false);
          fetchMyTasks();
          if (onRefreshDashboard) onRefreshDashboard();
        }}
      />
    </>
  );
};
