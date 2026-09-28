import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { mockActionItems } from '../data/mockData';

export default function NeedsAttention({ actionItems = mockActionItems }) {
  const [filter, setFilter] = useState('Critical');

  // Case-insensitive filtering & support for Critical/Urgent/Overdue/High
  const itemsToFilter = actionItems && actionItems.length > 0 ? actionItems : mockActionItems;

  const filtered = itemsToFilter.filter(item => {
    if (item.status === 'Completed' || item.status === 'Done') return false;
    
    const p = item.priority ? item.priority.toLowerCase() : '';

    if (filter === 'Critical') {
      return p === 'critical' || p === 'urgent';
    }
    if (filter === 'Overdue') {
      return item.isOverdue || item.overdue || (item.dueDate && new Date(item.dueDate) < new Date());
    }
    if (filter === 'High') {
      return p === 'high';
    }
    // All Urgent tab
    return p === 'critical' || p === 'urgent' || p === 'high' || item.isOverdue;
  });

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500" />
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">
              Needs Your Attention
            </h3>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
            {['All Urgent', 'Overdue', 'Critical', 'High'].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1 rounded-md transition-all font-medium ${
                  filter === tab
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="space-y-2.5">
            {filtered.map((item, idx) => (
              <div
                key={item.id || idx}
                className="p-3 border border-slate-100 dark:border-slate-800 rounded-lg flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/60 transition-colors"
              >
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <span>Assignee: <strong className="text-slate-700 dark:text-slate-300">{item.assignee}</strong></span>
                    <span>&bull;</span>
                    <span className="text-rose-500 font-medium">Due {item.dueDate}</span>
                  </p>
                </div>
                <span className="text-[10px] px-2.5 py-1 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-full font-bold border border-rose-200/60 dark:border-rose-900/50">
                  {item.priority || 'Critical'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">
              All Priority Items On Track!
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              No pending action items requiring immediate attention.
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
        <span className="text-slate-400">High Priority Action Items</span>
        <button className="text-rose-600 dark:text-rose-400 font-semibold hover:underline flex items-center gap-1">
          Manage All ({filtered.length}) &rarr;
        </button>
      </div>
    </div>
  );
}
