import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Tag } from 'antd';
import {
  FireOutlined,
  CalendarOutlined,
  UserOutlined,
  ArrowRightOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { format, parseISO } from 'date-fns';
import { actionService } from '../../services/api.js';

export const NeedsAttention = ({ overdueList = [] }) => {
  const [activeTab, setActiveTab] = useState('ALL');
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    actionService
      .getMyActions()
      .then((res) => {
        const list = res.results || res || [];
        const activeList = list.filter((a) => a.status !== 'COMPLETED' && a.status !== 'CANCELLED');
        setActions(activeList);
      })
      .catch(() => {
        setActions(overdueList);
      })
      .finally(() => setLoading(false));
  }, [overdueList]);

  const filteredActions = React.useMemo(() => {
    const today = new Date().toISOString().split('T')[0];

    return actions.filter((item) => {
      if (activeTab === 'OVERDUE') {
        return item.due_date && item.due_date < today;
      }
      if (activeTab === 'CRITICAL') {
        return item.priority === 'CRITICAL';
      }
      if (activeTab === 'HIGH') {
        return item.priority === 'HIGH' || item.priority === 'CRITICAL';
      }
      return (
        (item.due_date && item.due_date < today) ||
        item.priority === 'CRITICAL' ||
        item.priority === 'HIGH'
      );
    });
  }, [actions, activeTab]);

  const renderActionRow = (item) => {
    const today = new Date().toISOString().split('T')[0];
    const isOverdue = item.due_date && item.due_date < today;
    const dueDateStr = item.due_date
      ? format(parseISO(item.due_date), 'MMM d')
      : 'No deadline';
    const assigneeName =
      item.assigned_to_detail?.full_name || item.assigned_to_name || item.assigned_to || 'Unassigned';

    return (
      <div
        key={item.id}
        className="p-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-800 transition-all flex items-center justify-between gap-2 group"
      >
        <div className="flex items-center space-x-2.5 min-w-0 flex-1">
          <div
            className={`w-8 h-8 rounded-lg flex flex-col items-center justify-center shrink-0 font-bold text-xs ${
              isOverdue
                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60'
                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60'
            }`}
          >
            {isOverdue ? <ExclamationCircleOutlined /> : <FireOutlined />}
          </div>

          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center space-x-1.5 flex-wrap">
              <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 m-0 truncate group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                {item.title}
              </h4>
              {isOverdue ? (
                <Tag color="error" className="text-[9px] uppercase font-bold rounded m-0 border-none px-1 py-0">
                  Overdue
                </Tag>
              ) : (
                <Tag
                  color={item.priority === 'CRITICAL' ? 'red' : 'orange'}
                  className="text-[9px] uppercase font-bold rounded m-0 border-none px-1 py-0"
                >
                  {item.priority || 'MEDIUM'}
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
          <Link to="/my-actions" className="no-underline">
            <Button
              type="primary"
              size="small"
              className="bg-rose-600 hover:bg-rose-700 font-semibold rounded-md text-[10px] border-none px-2 py-0.5 h-6 flex items-center gap-1 text-white"
            >
              <span>View</span>
              <ArrowRightOutlined className="text-[8px]" />
            </Button>
          </Link>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-xs transition-all h-full flex flex-col justify-between">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
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

        {/* Filter Tabs */}
        <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50 text-[10px] overflow-x-auto max-w-full">
          {[
            { label: 'All Urgent', key: 'ALL' },
            { label: 'Overdue', key: 'OVERDUE' },
            { label: 'Critical', key: 'CRITICAL' },
            { label: 'High', key: 'HIGH' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-2 py-0.5 rounded font-bold border-0 cursor-pointer transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 bg-transparent hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content / Empty State */}
      <div className="my-2.5 space-y-2 max-h-[220px] overflow-y-auto pr-0.5 flex-1 flex flex-col justify-center">
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
          filteredActions.slice(0, 4).map((item) => renderActionRow(item))
        )}
      </div>

      {/* Footer */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
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
