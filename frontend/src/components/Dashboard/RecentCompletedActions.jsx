import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import { format, parseISO } from 'date-fns';
import { actionService } from '../../services/api.js';
import { StatusBadge } from '../StatusBadge.jsx';

export const RecentCompletedActions = () => {
  const [completedActions, setCompletedActions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    actionService
      .getMyActions({ status: 'COMPLETED' })
      .then((res) => {
        const list = res.results || res || [];
        setCompletedActions(list.slice(0, 4));
      })
      .catch(() => {
        actionService
          .getActions({ status: 'COMPLETED' })
          .then((res) => setCompletedActions((res.results || res || []).slice(0, 4)))
          .catch(() => setCompletedActions([]));
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-xs transition-all h-full flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="w-6.5 h-6.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs">
            <CheckCircleOutlined />
          </div>
          <div>
            <h3 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 m-0">
              Recent Completed Actions
            </h3>
          </div>
        </div>

        <Link to="/my-actions?tab=COMPLETED" className="no-underline">
          <Button type="link" size="small" className="text-[11px] text-blue-600 dark:text-blue-400 font-bold p-0">
            View All →
          </Button>
        </Link>
      </div>

      {/* List */}
      <div className="my-2 space-y-1.5 max-h-[170px] overflow-y-auto pr-0.5 flex-1 flex flex-col justify-center">
        {loading ? (
          <p className="text-center text-slate-400 py-4 text-xs font-semibold">Loading completed items...</p>
        ) : completedActions.length === 0 ? (
          <div className="py-3 px-3 text-center space-y-1 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 my-auto">
            <div className="w-7 h-7 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto text-xs">
              <CheckCircleOutlined />
            </div>
            <p className="font-bold text-xs text-slate-800 dark:text-slate-200 m-0">No Completed Actions Yet</p>
            <p className="text-[10px] text-slate-400 m-0 max-w-xs mx-auto leading-tight">
              Completed action items will automatically display here as you finish tasks.
            </p>
          </div>
        ) : (
          completedActions.map((item) => {
            const dateStr = item.updated_at
              ? format(parseISO(item.updated_at), 'MMM d')
              : item.due_date
              ? format(parseISO(item.due_date), 'MMM d')
              : 'Done';

            return (
              <div
                key={item.id}
                className="p-2 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-800 transition-all flex items-center justify-between gap-2 group"
              >
                <div className="flex items-center space-x-2 min-w-0 pr-1">
                  <div className="w-6 h-6 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs shrink-0">
                    <CheckCircleOutlined />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <p className="font-bold text-xs text-slate-900 dark:text-slate-100 m-0 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {item.title}
                    </p>
                    <div className="flex items-center space-x-1.5 text-[9px] text-slate-400">
                      <span className="truncate">{item.assigned_to_name || item.assigned_to || 'You'}</span>
                      <span>•</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{dateStr}</span>
                    </div>
                  </div>
                </div>

                <StatusBadge type="priority" value={item.priority || 'MEDIUM'} />
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
        <span>History</span>
        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
          {completedActions.length} Resolutions Logged
        </span>
      </div>
    </div>
  );
};
