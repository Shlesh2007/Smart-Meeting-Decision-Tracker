'use client';

import React from 'react';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

export const LoadingSkeleton = ({ tip = 'Loading workspace data...' }) => {
  const antIcon = <LoadingOutlined style={{ fontSize: 36, color: '#4f46e5' }} spin />;

  return (
    <div className="min-h-[50vh] flex flex-col justify-center items-center py-16 space-y-4">
      <Spin indicator={antIcon} size="large" />
      <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 block">{tip}</span>
    </div>
  );
};
