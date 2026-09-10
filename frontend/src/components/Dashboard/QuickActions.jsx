'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PlusOutlined, CalendarOutlined, ThunderboltOutlined, RightOutlined } from '@ant-design/icons';
import { ActionFormModal } from '../ActionFormModal.jsx';

export const QuickActions = () => {
  const [showAddActionModal, setShowAddActionModal] = useState(false);

  return (
    <>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-xs transition-all h-full flex flex-col justify-between">
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-6.5 h-6.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs">
              <ThunderboltOutlined />
            </div>
            <div>
              <h3 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 m-0">
                Quick Actions
              </h3>
            </div>
          </div>
        </div>

        {/* Action Buttons Grid */}
        <div className="my-2 space-y-2">
          {/* Action 1: Schedule Meeting */}
          <Link href="/meetings/new" className="no-underline block">
            <div className="p-2.5 rounded-lg bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 hover:bg-blue-100/60 dark:hover:bg-blue-900/50 transition-all flex items-center justify-between group cursor-pointer">
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-xs shrink-0">
                  <PlusOutlined />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 m-0 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    Schedule Meeting
                  </h4>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 m-0">
                    Create session & set agenda
                  </p>
                </div>
              </div>
              <RightOutlined className="text-[10px] text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>

          {/* Action 2: Add Action Item */}
          <div
            onClick={() => setShowAddActionModal(true)}
            className="p-2.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/60 hover:bg-amber-100/60 dark:hover:bg-amber-900/50 transition-all flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center text-xs font-bold shadow-xs shrink-0">
                <ThunderboltOutlined />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 m-0 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  Add Action Item
                </h4>
                <p className="text-[9px] text-slate-500 dark:text-slate-400 m-0">
                  Log task & assign owner
                </p>
              </div>
            </div>
            <RightOutlined className="text-[10px] text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-transform group-hover:translate-x-0.5" />
          </div>

          {/* Action 3: View Calendar */}
          <Link href="/meetings" className="no-underline block">
            <div className="p-2.5 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/50 transition-all flex items-center justify-between group cursor-pointer">
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-xs shrink-0">
                  <CalendarOutlined />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 m-0 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    View Calendar
                  </h4>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 m-0">
                    Browse meeting list
                  </p>
                </div>
              </div>
              <RightOutlined className="text-[10px] text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
          <span>Shortcuts</span>
          <span className="font-semibold text-blue-600 dark:text-blue-400">
            SmartMeeting Tools
          </span>
        </div>
      </div>

      {/* Action Form Modal */}
      <ActionFormModal
        open={showAddActionModal}
        onClose={() => setShowAddActionModal(false)}
        onSuccess={() => {
          setShowAddActionModal(false);
        }}
      />
    </>
  );
};
