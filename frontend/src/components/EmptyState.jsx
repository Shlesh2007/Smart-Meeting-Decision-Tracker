import React from 'react';
import { Button } from 'antd';
import { InboxOutlined, PlusOutlined } from '@ant-design/icons';

export const EmptyState = ({
  title = 'No Records Found',
  description = 'There are no items to display at this time.',
  icon,
  actionText,
  onAction
}) => {
  return (
    <div className="py-12 sm:py-16 px-4 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center shadow-xs transition-colors">
      <div className="max-w-md mx-auto space-y-4">
        {/* Dark-Mode Native Glowing Icon Avatar */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto text-3xl sm:text-4xl shadow-xs dark:shadow-blue-900/20">
          {icon || <InboxOutlined />}
        </div>

        <div className="space-y-1.5">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white m-0 tracking-tight">
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 m-0 max-w-sm mx-auto leading-relaxed">
            {description}
          </p>
        </div>

        {actionText && onAction && (
          <div className="pt-2">
            <Button
              type="primary"
              onClick={onAction}
              icon={<PlusOutlined />}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg border-none shadow-xs px-5 py-2 text-xs sm:text-sm h-auto"
            >
              {actionText}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
