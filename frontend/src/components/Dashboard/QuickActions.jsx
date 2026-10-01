import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusOutlined, CalendarOutlined, FormOutlined, RightOutlined } from '@ant-design/icons';
import { ActionFormModal } from '../ActionFormModal.jsx';

export const QuickActions = () => {
  const [showAddActionModal, setShowAddActionModal] = useState(false);

  return (
    <>
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs transition-all h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-sm shadow-2xs">
              <FormOutlined />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 m-0">
                Quick Actions
              </h3>
            </div>
          </div>
        </div>

        {/* Action Buttons Grid (Fills vertical space evenly without empty gaps) */}
        <div className="flex-1 flex flex-col justify-evenly py-3 space-y-3">
          {/* Action 1: Schedule Meeting */}
          <Link to="/meetings/new" className="no-underline block flex-1 flex">
            <div className="w-full p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100/80 dark:border-blue-900/60 hover:bg-blue-100/70 dark:hover:bg-blue-900/50 transition-all flex items-center justify-between group cursor-pointer shadow-2xs">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center text-sm font-bold shadow-xs shrink-0">
                  <PlusOutlined />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 m-0 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                    Schedule Meeting
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 m-0 truncate">
                    Create session & set agenda
                  </p>
                </div>
              </div>
              <RightOutlined className="text-xs text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-transform group-hover:translate-x-1 shrink-0 ml-2" />
            </div>
          </Link>

          {/* Action 2: Add Action Item */}
          <div
            onClick={() => setShowAddActionModal(true)}
            className="w-full flex-1 p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-100/80 dark:border-amber-900/60 hover:bg-amber-100/70 dark:hover:bg-amber-900/50 transition-all flex items-center justify-between group cursor-pointer shadow-2xs"
          >
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center text-sm font-bold shadow-xs shrink-0">
                <FormOutlined />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 m-0 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors truncate">
                  Add Action Item
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 m-0 truncate">
                  Log task & assign team member
                </p>
              </div>
            </div>
            <RightOutlined className="text-xs text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-transform group-hover:translate-x-1 shrink-0 ml-2" />
          </div>

          {/* Action 3: View Calendar */}
          <Link to="/meetings?view=calendar" className="no-underline block flex-1 flex">
            <div className="w-full p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100/80 dark:border-indigo-900/60 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/50 transition-all flex items-center justify-between group cursor-pointer shadow-2xs">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-sm font-bold shadow-xs shrink-0">
                  <CalendarOutlined />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 m-0 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                    View Calendar
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 m-0 truncate">
                    Monthly calendar schedule
                  </p>
                </div>
              </div>
              <RightOutlined className="text-xs text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-transform group-hover:translate-x-1 shrink-0 ml-2" />
            </div>
          </Link>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between shrink-0">
          <span>Shortcuts</span>
          <span className="font-bold text-blue-600 dark:text-blue-400">
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
