import React from 'react';
import { Empty, Button } from 'antd';

export const EmptyState = ({
  title = 'No Records Found',
  description = 'There are no items to display at this time.',
  actionText,
  onAction
}) => {
  return (
    <div className="py-12 bg-white dark:bg-slate-800/80 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700/80 flex justify-center items-center">
      <Empty
        description={
          <div className="space-y-1">
            <p className="text-base font-semibold text-slate-800 dark:text-slate-200 m-0">{title}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 m-0">{description}</p>
          </div>
        }
      >
        {actionText && onAction && (
          <Button type="primary" onClick={onAction} className="mt-2 bg-blue-600 hover:bg-blue-700 font-semibold rounded-xl border-none">
            {actionText}
          </Button>
        )}
      </Empty>
    </div>
  );
};
