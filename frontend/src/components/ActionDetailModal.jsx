import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Tag, Select, Button, Tooltip, message as staticMessage, App } from 'antd';
import {
  CheckSquareOutlined, LockOutlined, ExclamationCircleOutlined, ArrowRightOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { StatusBadge } from './StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { actionService } from '../services/api.js';

export const ActionDetailModal = ({
  open,
  onClose,
  actionItem,
  onStatusChange,
  onNavigateMeeting,
  onCompleteRequest
}) => {
  const navigate = useNavigate();
  const staticApp = App.useApp ? App.useApp() : null;
  const message = staticApp?.message || staticMessage;
  const { user } = useAuth();

  const [updating, setUpdating] = useState(false);
  const [justUpdated, setJustUpdated] = useState(false);

  useEffect(() => {
    if (justUpdated) {
      const timer = setTimeout(() => setJustUpdated(false), 600);
      return () => clearTimeout(timer);
    }
  }, [justUpdated]);

  if (!actionItem) return null;

  const assignees = Array.isArray(actionItem.assigned_to_detail)
    ? actionItem.assigned_to_detail
    : actionItem.assigned_to_detail
    ? [actionItem.assigned_to_detail]
    : [];

  const assignedIds = Array.isArray(actionItem.assigned_to)
    ? actionItem.assigned_to.map((u) => (typeof u === 'object' ? u.id : u))
    : actionItem.assigned_to
    ? [typeof actionItem.assigned_to === 'object' ? actionItem.assigned_to.id : actionItem.assigned_to]
    : [];

  const isAssignedToUser = user?.id && assignedIds.includes(user.id);
  const dependencies = actionItem.dependency_details || [];
  const hasIncompleteDeps = dependencies.some((d) => !d.is_completed);

  const handleSelectStatus = async (newStatus) => {
    if (newStatus === actionItem.status) return;

    if (hasIncompleteDeps && ['TODO', 'IN_PROGRESS', 'COMPLETED'].includes(newStatus)) {
      message.error(`Status update to ${newStatus.replace('_', ' ')} is locked until all prerequisites finish.`);
      return;
    }

    if (newStatus === 'COMPLETED') {
      if (onCompleteRequest) {
        onCompleteRequest(actionItem);
        return;
      }
    }

    setUpdating(true);
    try {
      if (onStatusChange) {
        await onStatusChange(actionItem, newStatus);
      } else {
        await actionService.updateActionStatus(actionItem.id, newStatus);
        message.success(`Status updated to ${newStatus}`);
      }
      setJustUpdated(true);
    } catch (err) {
      const errMsg =
        err.response?.data?.status?.[0] ||
        err.response?.data?.detail ||
        'Failed to update action status.';
      message.error(errMsg);
    } finally {
      setUpdating(false);
    }
  };

  const meetingTitleStr =
    actionItem.meeting_title ||
    (actionItem.meeting_detail && actionItem.meeting_detail.title) ||
    (actionItem.meeting && typeof actionItem.meeting === 'object' ? actionItem.meeting.title : null);

  const getRawMeetingId = () => {
    if (actionItem.meeting_id) return actionItem.meeting_id;
    if (actionItem.meeting) {
      if (typeof actionItem.meeting === 'object') return actionItem.meeting.id;
      if (typeof actionItem.meeting === 'number' || typeof actionItem.meeting === 'string') return actionItem.meeting;
    }
    if (actionItem.meeting_detail?.id) return actionItem.meeting_detail.id;
    if (actionItem.decision_detail?.discussion?.meeting) return actionItem.decision_detail.discussion.meeting;
    if (actionItem.decision?.discussion?.meeting?.id) return actionItem.decision.discussion.meeting.id;
    return null;
  };
  const meetingId = getRawMeetingId();

  const meetingDateStr =
    actionItem.meeting_date ||
    (actionItem.meeting_detail && actionItem.meeting_detail.meeting_date);

  const discussionTitleStr =
    actionItem.discussion_title ||
    (actionItem.decision_detail && actionItem.decision_detail.discussion_title) ||
    (actionItem.decision_detail && actionItem.decision_detail.discussion && actionItem.decision_detail.discussion.title) ||
    (actionItem.decision && typeof actionItem.decision === 'object' && actionItem.decision.discussion ? actionItem.decision.discussion.title : null);

  const handleNavigateToSingleMeeting = () => {
    if (meetingId) {
      if (onNavigateMeeting) {
        onNavigateMeeting(meetingId);
      } else {
        onClose();
        navigate(`/meetings/${meetingId}`);
      }
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={
        <div className="flex items-center space-x-2.5 pr-10">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-base shrink-0">
            <CheckSquareOutlined />
          </div>
          <div className="min-w-0">
            <h2 className="font-extrabold text-base text-slate-900 dark:text-white m-0 leading-tight truncate">
              Action Item Details
            </h2>
            <p className="text-[11px] font-normal text-slate-400 m-0 truncate">
              Task breakdown, assignees & prerequisite locks
            </p>
          </div>
        </div>
      }
      width={680}
      style={{ maxWidth: 'calc(100vw - 24px)', margin: '12px auto' }}
      styles={{
        body: {
          maxHeight: 'calc(80vh - 70px)',
          overflowY: 'auto',
          paddingRight: '6px',
        },
      }}
      className="top-6"
    >
      <div className="space-y-3 py-1.5 text-xs">
        {/* Header Title & Badges Bar */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <div
                className={`transition-all duration-300 ease-in-out ${
                  justUpdated ? 'scale-110 ring-2 ring-blue-500/50 rounded-md' : 'scale-100'
                }`}
              >
                <StatusBadge type="actionStatus" value={actionItem.status} />
              </div>

              <StatusBadge type="priority" value={actionItem.priority} />

              {actionItem.is_overdue && <StatusBadge type="overdue" value={true} />}

              {meetingTitleStr && (
                <Tag
                  color="purple"
                  onClick={handleNavigateToSingleMeeting}
                  className={`text-[11px] font-bold m-0 px-2 py-0.5 rounded-lg border-purple-200 dark:border-purple-900 flex items-center gap-1 ${
                    meetingId
                      ? 'cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/80 transition-all hover:scale-105'
                      : ''
                  }`}
                  title={meetingId ? 'Open this specific meeting details' : undefined}
                >
                  <span>
                    Meeting: <strong>{meetingTitleStr}</strong>
                    {meetingDateStr ? ` (${dayjs(meetingDateStr).format('MMM DD')})` : ''}
                  </span>
                  {meetingId && <ArrowRightOutlined className="text-[9px]" />}
                </Tag>
              )}

              {discussionTitleStr && (
                <Tag
                  color="cyan"
                  className="text-[11px] font-bold m-0 px-2 py-0.5 rounded-lg border-cyan-200 dark:border-cyan-900 flex items-center gap-1"
                >
                  <span>Topic: <strong>{discussionTitleStr}</strong></span>
                </Tag>
              )}
            </div>

            {/* Quick Update Status Selector */}
            <div className="flex items-center space-x-1.5 shrink-0">
              <span className="text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400">
                Status:
              </span>
              <Select
                id={`modal_action_status_select_${actionItem.id}`}
                name={`modal_action_status_select_${actionItem.id}`}
                value={actionItem.status}
                loading={updating}
                onChange={handleSelectStatus}
                className="w-36 font-bold text-xs"
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
                    disabled: hasIncompleteDeps,
                  },
                  { label: 'Cancelled', value: 'CANCELLED' },
                ]}
              />
            </div>
          </div>

          <h1 className="text-base font-extrabold text-slate-900 dark:text-white m-0 leading-snug tracking-tight pt-1">
            {actionItem.title}
          </h1>
        </div>

        {/* Discussion Topic Box */}
        {discussionTitleStr && (
          <div className="p-2.5 bg-cyan-50/60 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-900/60 rounded-xl space-y-0.5">
            <span className="text-[9.5px] font-bold text-cyan-800 dark:text-cyan-300 uppercase tracking-wider block">
              Associated Discussion Topic / Decision Point
            </span>
            <p className="text-xs font-semibold text-slate-900 dark:text-white m-0 leading-relaxed">
              💬 {discussionTitleStr}
            </p>
          </div>
        )}

        {/* Description Section */}
        {actionItem.description && (
          <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
            <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block">
              Description
            </span>
            <p className="text-xs text-slate-700 dark:text-slate-300 m-0 leading-relaxed whitespace-pre-wrap">
              {actionItem.description}
            </p>
          </div>
        )}

        {/* Assignee(s) & Deadline Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Assignees Card */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col justify-between">
            <div>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Assignee(s)
              </span>
              {assignees.length > 0 ? (
                <div className="flex flex-wrap gap-1 items-center">
                  {assignees.map((u) => (
                    <Tag
                      key={u.id}
                      color="blue"
                      className="text-[11px] font-bold px-2 py-0.5 m-0 rounded-md border-blue-200 dark:border-blue-900"
                    >
                      {u.full_name || u.username}
                    </Tag>
                  ))}
                </div>
              ) : (
                <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                  {actionItem.created_by_detail
                    ? actionItem.created_by_detail.full_name || actionItem.created_by_detail.username
                    : 'Unassigned'}
                </span>
              )}
            </div>

            {isAssignedToUser && (
              <div className="mt-1.5 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                <Tag color="cyan" className="text-[9px] font-extrabold m-0 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Assigned to You
                </Tag>
              </div>
            )}
          </div>

          {/* Deadline Card */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col justify-between">
            <div>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                Deadline
              </span>
              <span
                className={`font-extrabold text-xs block ${
                  actionItem.is_overdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                }`}
              >
                {actionItem.due_date
                  ? dayjs(actionItem.due_date).format('MMMM DD, YYYY')
                  : 'No Target Date'}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block mt-0.5">
                Created: <strong>{actionItem.created_at ? dayjs(actionItem.created_at).format('MMM DD, YYYY [at] h:mm A') : '—'}</strong>
              </span>
            </div>

            {actionItem.is_overdue && (
              <div className="mt-1.5 pt-1 border-t border-rose-200 dark:border-rose-900/60 flex items-center space-x-1 text-rose-600 dark:text-rose-400 font-extrabold text-[9.5px] uppercase tracking-wider">
                <ExclamationCircleOutlined />
                <span>Overdue Action Item</span>
              </div>
            )}
          </div>
        </div>

        {/* Work Done / Delivered Outcome (If completed or has notes) */}
        {actionItem.completion_notes && (
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl space-y-1">
            <strong className="font-extrabold block text-emerald-800 dark:text-emerald-300 text-[11px]">
              ✅ Work Done / Delivered Outcome:
            </strong>
            <p className="text-xs text-emerald-900 dark:text-emerald-200 m-0 leading-relaxed whitespace-pre-wrap">
              {actionItem.completion_notes}
            </p>
          </div>
        )}

        {/* Prerequisite Dependencies Section */}
        {dependencies.length > 0 && (
          <div className="p-2.5 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl space-y-1.5 min-w-0 max-w-full overflow-hidden">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9.5px] font-extrabold text-amber-800 dark:text-amber-400 uppercase tracking-wider shrink-0">
                Prerequisite Dependencies ({dependencies.length})
              </span>
              {hasIncompleteDeps && (
                <Tag color="warning" className="text-[9px] font-bold m-0 px-1.5 py-0 shrink-0">
                  Prereqs Incomplete
                </Tag>
              )}
            </div>

            <div className="space-y-1 min-w-0 max-w-full overflow-hidden">
              {dependencies.map((dep) => (
                <div
                  key={dep.id}
                  className="flex items-center justify-between gap-2 text-xs p-1.5 bg-white dark:bg-slate-900 rounded-lg border border-amber-200/80 dark:border-amber-900/40 shadow-2xs min-w-0 max-w-full overflow-hidden"
                >
                  <div className="flex items-center space-x-2 min-w-0 flex-1 overflow-hidden">
                    <span className="text-xs shrink-0">
                      {dep.is_completed ? '✓' : '🔒'}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block min-w-0 flex-1" title={dep.title}>
                      {dep.title}
                    </span>
                  </div>
                  <Tag
                    color={dep.is_completed ? 'success' : 'error'}
                    className="text-[9.5px] font-extrabold m-0 shrink-0 uppercase"
                  >
                    {dep.status || (dep.is_completed ? 'COMPLETED' : 'BLOCKED')}
                  </Tag>
                </div>
              ))}
            </div>

            {hasIncompleteDeps && (
              <div className="pt-1 border-t border-amber-200 dark:border-amber-900/50 flex items-center space-x-1.5 text-amber-800 dark:text-amber-300 font-bold text-[10px] leading-tight min-w-0 max-w-full overflow-hidden">
                <LockOutlined className="shrink-0 text-xs text-amber-600" />
                <span className="min-w-0 flex-1">
                  Status update to Completed is locked until all prerequisites finish.
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
