import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Tag, Segmented } from 'antd';
import {
  FireOutlined,
  CalendarOutlined,
  UserOutlined,
  ArrowRightOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { actionService } from '../../services/api.js';

import { useAuth } from '../../context/AuthContext.jsx';

export const NeedsAttention = ({ overdueList = [], urgentList = [], loading = false }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('ALL');
  const [actions, setActions] = useState([]);

  useEffect(() => {
    const combinedFromProps = [...(urgentList || []), ...(overdueList || [])];
    const itemMap = new Map();
    combinedFromProps.forEach((item) => {
      if (item && item.id) itemMap.set(item.id, item);
    });
    setActions(Array.from(itemMap.values()));
  }, [overdueList, urgentList]);

  const handleViewAction = (item) => {
    if (item && item.id) {
      navigate(`/my-actions?action_id=${item.id}`);
    } else {
      navigate('/my-actions');
    }
  };

  const filteredActions = React.useMemo(() => {
    const today = dayjs().format('YYYY-MM-DD');

    return actions.filter((item) => {
      if (!item) return false;

      const itemStatus = (item.status || '').toUpperCase();
      if (itemStatus === 'COMPLETED' || itemStatus === 'CANCELLED') {
        return false;
      }

      const itemPriority = (item.priority || '').toUpperCase();
      const dueDateFormatted = item.due_date
        ? dayjs(item.due_date).format('YYYY-MM-DD')
        : null;

      const isOverdue = Boolean(dueDateFormatted && dueDateFormatted < today);
      const isCritical = itemPriority === 'CRITICAL';
      const isHigh = itemPriority === 'HIGH';

      if (activeTab === 'OVERDUE') {
        return isOverdue;
      }
      if (activeTab === 'CRITICAL') {
        return isCritical;
      }
      if (activeTab === 'HIGH') {
        return isHigh;
      }
      return isOverdue || isCritical || isHigh;
    });
  }, [actions, activeTab]);

  const renderActionRow = (item) => {
    const today = dayjs().format('YYYY-MM-DD');
    const dueDateFormatted = item.due_date
      ? dayjs(item.due_date).format('YYYY-MM-DD')
      : null;
    const isOverdue = Boolean(dueDateFormatted && dueDateFormatted < today && item.status !== 'COMPLETED' && item.status !== 'CANCELLED');
    const itemPriority = (item.priority || 'MEDIUM').toUpperCase();
    const isCritical = itemPriority === 'CRITICAL';
    const isHigh = itemPriority === 'HIGH';
    const dueDateStr = item.due_date
      ? dayjs(item.due_date).format('MMM D')
      : 'No deadline';
    const assigneesList = Array.isArray(item.assigned_to_detail)
      ? item.assigned_to_detail
      : (item.assigned_to_detail ? [item.assigned_to_detail] : []);
    const rawName = assigneesList.length > 0
      ? assigneesList.map(u => u.full_name || u.username).join(', ')
      : (item.assigned_to_name && item.assigned_to_name !== 'Unassigned' ? item.assigned_to_name : '');
    const assigneeName = rawName || (user ? (user.full_name || user.username) : 'Team Member');

    return (
      <div
        key={item.id}
        onClick={() => handleViewAction(item)}
        className="py-1.5 px-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 transition-all flex items-center justify-between gap-2 cursor-pointer group shadow-2xs"
      >
        <div className="flex items-center space-x-2.5 min-w-0 flex-1">
          <div
            className={`w-8 h-8 rounded-lg flex flex-col items-center justify-center shrink-0 font-bold text-xs ${
              isCritical
                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60'
                : isHigh
                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60'
                : isOverdue
                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60'
                : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60'
            }`}
          >
            {isCritical || (isOverdue && !isHigh) ? <ExclamationCircleOutlined /> : <FireOutlined />}
          </div>

          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center space-x-1.5 flex-wrap">
              <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 m-0 truncate group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                {item.title}
              </h4>
              <Tag
                color={isCritical ? 'red' : isHigh ? 'orange' : 'blue'}
                className="text-[9px] uppercase font-bold rounded m-0 border-none px-1 py-0"
              >
                {itemPriority}
              </Tag>
              {isOverdue && (
                <Tag color="error" className="text-[9px] uppercase font-bold rounded m-0 border-none px-1 py-0">
                  Overdue
                </Tag>
              )}
            </div>

            <div className="flex items-center space-x-2 text-[10px] text-slate-500 dark:text-slate-400 flex-wrap">
              <span className="flex items-center space-x-1">
                <CalendarOutlined className="text-slate-400 text-[9px]" />
                <span className={isOverdue ? 'text-rose-600 dark:text-rose-400 font-bold' : ''}>
                  {dueDateStr}
                </span>
              </span>

              <span className="flex items-center space-x-1 truncate max-w-[120px]">
                <UserOutlined className="text-slate-400 text-[9px]" />
                <span className="truncate">{assigneeName}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="shrink-0 flex items-center justify-end">
          <Button
            type="primary"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleViewAction(item);
            }}
            className="bg-slate-900 hover:bg-slate-800 font-semibold rounded-md text-[10px] border-none px-2 py-0.5 h-6 flex items-center gap-1 text-white cursor-pointer"
          >
            <span>View</span>
            <ArrowRightOutlined className="text-[8px]" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-3.5 shadow-xs transition-all h-full flex flex-col justify-between">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="w-6.5 h-6.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xs font-bold">
            <FireOutlined />
          </div>
          <div>
            <h3 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 m-0">
              Needs Your Attention
            </h3>
          </div>
        </div>

        {/* Filter Tabs using AntD Segmented */}
        <Segmented
          size="small"
          value={activeTab}
          onChange={(val) => setActiveTab(val)}
          options={[
            { label: 'All Urgent', value: 'ALL' },
            { label: 'Overdue', value: 'OVERDUE' },
            { label: 'Critical', value: 'CRITICAL' },
            { label: 'High', value: 'HIGH' },
          ]}
          className="bg-slate-100 dark:bg-slate-800 text-[10px] font-bold"
        />
      </div>

      {/* Content / Empty State */}
      <div className="my-1 space-y-1.5 max-h-[330px] overflow-y-auto pr-0.5 flex-1 flex flex-col justify-start">
        {loading ? (
          <p className="text-center text-slate-400 py-4 text-xs font-semibold">Loading items...</p>
        ) : filteredActions.length === 0 ? (
          <div className="py-3 px-3 text-center space-y-2 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 my-auto">
            <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto text-sm">
              <CheckCircleOutlined />
            </div>
            <div className="space-y-0.5">
              <p className="font-bold text-slate-800 dark:text-slate-200 text-xs m-0">All Priority Items On Track!</p>
              <p className="text-[10px] text-slate-400 m-0 max-w-xs mx-auto leading-tight">
                No pending action items requiring immediate attention.
              </p>
            </div>
          </div>
        ) : (
          filteredActions.map((item) => renderActionRow(item))
        )}
      </div>

      {/* Footer */}
      <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
        <span>High Priority Action Items</span>
        <Link to="/my-actions" className="no-underline">
          <span className="font-bold text-rose-600 dark:text-rose-400 hover:underline">
            Manage All ({filteredActions.length}) →
          </span>
        </Link>
      </div>
    </div>
  );
};
