'use client';

import React from 'react';
import { MetricCard } from './MetricCard.jsx';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  FireOutlined,
} from '@ant-design/icons';

export const DashboardMetrics = ({ metrics = {}, onCardClick }) => {
  const cards = [
    {
      key: 'total_meetings',
      title: 'Total Meetings',
      value: metrics.total_meetings ?? 0,
      subtitle: 'Logged',
      theme: 'blue',
      icon: <CalendarOutlined />,
      trend: 'All time meetings',
      onClick: () => onCardClick && onCardClick('/meetings'),
    },
    {
      key: 'upcoming_meetings',
      title: 'Upcoming Meetings',
      value: metrics.upcoming_meetings ?? 0,
      subtitle: 'Scheduled',
      theme: 'indigo',
      icon: <ClockCircleOutlined />,
      trend: 'Upcoming schedule',
      onClick: () => onCardClick && onCardClick('/meetings'),
    },
    {
      key: 'open_actions',
      title: 'Open Actions',
      value: metrics.open_actions ?? 0,
      subtitle: 'Active',
      theme: 'amber',
      icon: <ThunderboltOutlined />,
      trend: 'Pending resolution',
      onClick: () => onCardClick && onCardClick('/my-actions'),
    },
    {
      key: 'completed_actions',
      title: 'Completed',
      value: metrics.completed_actions ?? 0,
      subtitle: 'Done',
      theme: 'green',
      icon: <CheckCircleOutlined />,
      trend: 'Successfully closed',
      onClick: () => onCardClick && onCardClick('/my-actions?tab=COMPLETED'),
    },
    {
      key: 'overdue_actions',
      title: 'Overdue Actions',
      value: metrics.overdue_actions ?? 0,
      subtitle: 'Needs Action',
      theme: 'rose',
      icon: <ExclamationCircleOutlined />,
      trend: 'Past target date',
      onClick: () => onCardClick && onCardClick('/my-actions?tab=OVERDUE'),
    },
    {
      key: 'critical_actions',
      title: 'Critical Actions',
      value: metrics.critical_actions ?? 0,
      subtitle: 'Urgent',
      theme: 'red',
      icon: <FireOutlined />,
      trend: 'High priority risk',
      onClick: () => onCardClick && onCardClick('/my-actions?tab=CRITICAL'),
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
      {cards.map((card) => (
        <MetricCard
          key={card.key}
          title={card.title}
          value={card.value}
          subtitle={card.subtitle}
          theme={card.theme}
          icon={card.icon}
          trend={card.trend}
          onClick={card.onClick}
        />
      ))}
    </div>
  );
};
