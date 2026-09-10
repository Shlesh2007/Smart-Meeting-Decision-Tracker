'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Tag } from 'antd';
import { FireOutlined } from '@ant-design/icons';
import { format, parseISO } from 'date-fns';
import { actionService } from '../../services/api.js';
import { StatusBadge } from '../StatusBadge.jsx';

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
        <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50 text-[10px]">
          {[
            { label: 'All Urgent', key: 'ALL' },
            { label: 'Overdue', key: 'OVERDUE' },
            { label: 'Critical', key: 'CRITICAL' },
            { label: 'High Priority', key: 'HIGH' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-2 py-0.5 rounded font-bold border-0 cursor-pointer transition-all ${
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

      {/* Table / List View */}
      <div className="my-2 max-h-[220px] overflow-y-auto pr-0.5 flex-1 flex flex-col justify-center">
        {loading ? (
          <p className="text-center text-slate-400 py-4 text-xs font-semibold">Loading items...</p>
        ) : filteredActions.length === 0 ? (
          <div className="py-4 px-3 text-center space-y-1 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 my-auto">
            <div className="w-7 h-7 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto text-xs font-bold">
              ✓
            </div>
            <p className="font-bold text-slate-800 dark:text-slate-200 text-xs m-0">All Priority Items On Track!</p>
            <p className="text-[10px] text-slate-400 m-0 max-w-xs mx-auto leading-tight">
              No pending action items requiring immediate attention.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="pb-1.5 pl-1">Action Item</th>
                  <th className="pb-1.5 hidden md:table-cell">Priority</th>
                  <th className="pb-1.5">Due Date</th>
                  <th className="pb-1.5">Status</th>
                  <th className="pb-1.5 pr-1 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {filteredActions.slice(0, 4).map((item) => {
                  const isOverdue =
                    item.due_date && new Date(item.due_date) < new Date(new Date().setHours(0, 0, 0, 0));
                  const dueDateStr = item.due_date
                    ? format(parseISO(item.due_date), 'MMM d')
                    : 'No date';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2 pl-1 max-w-[200px]">
                        <div className="space-y-0.5 pr-1">
                          <p className="font-bold text-slate-900 dark:text-slate-100 text-xs m-0 truncate">
                            {item.title}
                          </p>
                          <p className="text-[9px] text-slate-400 m-0 truncate">
                            By: {item.assigned_to_name || item.assigned_to || 'Unassigned'}
                          </p>
                        </div>
                      </td>

                      <td className="py-2 hidden md:table-cell whitespace-nowrap">
                        <StatusBadge type="priority" value={item.priority || 'MEDIUM'} />
                      </td>

                      <td className="py-2 whitespace-nowrap">
                        <span
                          className={`font-semibold text-xs ${
                            isOverdue ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {dueDateStr}
                        </span>
                      </td>

                      <td className="py-2 whitespace-nowrap">
                        {isOverdue ? (
                          <Tag color="error" className="font-bold rounded text-[9px] m-0 px-1 py-0">
                            Overdue
                          </Tag>
                        ) : (
                          <StatusBadge type="actionStatus" value={item.status} />
                        )}
                      </td>

                      <td className="py-2 pr-1 text-right whitespace-nowrap">
                        <Link href="/my-actions" className="no-underline">
                          <Button
                            type="default"
                            size="small"
                            className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 font-semibold text-[10px] rounded px-2 h-6"
                          >
                            View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
        <span>High Priority</span>
        <Link href="/my-actions" className="no-underline">
          <span className="font-bold text-rose-600 dark:text-rose-400 hover:underline">
            Manage All ({filteredActions.length}) →
          </span>
        </Link>
      </div>
    </div>
  );
};
