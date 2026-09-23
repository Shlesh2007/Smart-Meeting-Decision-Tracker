import React from 'react';
import { Tag } from 'antd';
import {
  ClockCircleOutlined, SyncOutlined, CheckCircleOutlined,
  CloseCircleOutlined, ExclamationCircleOutlined
} from '@ant-design/icons';

export const StatusBadge = ({ type, value }) => {
  if (type === 'overdue' && value === true) {
    return (
      <Tag color="error" icon={<ExclamationCircleOutlined />} className="font-semibold px-2 py-0.5 rounded whitespace-nowrap inline-flex items-center shrink-0 min-w-max">
        OVERDUE
      </Tag>
    );
  }

  if (type === 'meetingStatus') {
    switch (value) {
      case 'SCHEDULED':
        return <Tag color="processing" icon={<ClockCircleOutlined />} className="whitespace-nowrap inline-flex items-center shrink-0 min-w-max">Scheduled</Tag>;
      case 'IN_PROGRESS':
        return <Tag color="warning" icon={<SyncOutlined spin />} className="whitespace-nowrap inline-flex items-center shrink-0 min-w-max">In Progress</Tag>;
      case 'COMPLETED':
        return <Tag color="success" icon={<CheckCircleOutlined />} className="whitespace-nowrap inline-flex items-center shrink-0 min-w-max">Completed</Tag>;
      case 'CANCELLED':
        return <Tag color="default" icon={<CloseCircleOutlined />} className="whitespace-nowrap inline-flex items-center shrink-0 min-w-max">Cancelled</Tag>;
      default:
        return <Tag className="whitespace-nowrap inline-flex items-center shrink-0 min-w-max">{value}</Tag>;
    }
  }

  if (type === 'meetingType') {
    const colors = {
      INTERNAL: 'blue',
      CLIENT: 'purple',
      PROJECT: 'cyan',
      REVIEW: 'gold',
      PLANNING: 'green',
      OTHER: 'magenta'
    };
    return <Tag color={colors[value] || 'blue'} className="m-0 font-semibold uppercase px-2 py-0.5 rounded whitespace-nowrap inline-flex items-center shrink-0 min-w-max justify-center">{value}</Tag>;
  }

  if (type === 'priority') {
    const config = {
      LOW: { color: 'green', label: 'Low' },
      MEDIUM: { color: 'blue', label: 'Medium' },
      HIGH: { color: 'gold', label: 'High' },
      CRITICAL: { color: 'magenta', label: 'Critical' }
    };
    const c = config[value] || { color: 'default', label: value };
    return <Tag color={c.color} className="font-medium whitespace-nowrap inline-flex items-center shrink-0 min-w-max">{c.label}</Tag>;
  }

  if (type === 'decisionStatus') {
    switch (value) {
      case 'NO_DECISION':
        return <Tag color="default" className="whitespace-nowrap inline-flex items-center shrink-0 min-w-max">No Decision</Tag>;
      case 'DECISION_MADE':
        return <Tag color="success" icon={<CheckCircleOutlined />} className="whitespace-nowrap inline-flex items-center shrink-0 min-w-max">Decision Made</Tag>;
      case 'DEFERRED':
        return <Tag color="warning" className="whitespace-nowrap inline-flex items-center shrink-0 min-w-max">Deferred</Tag>;
      case 'REJECTED':
        return <Tag color="error" className="whitespace-nowrap inline-flex items-center shrink-0 min-w-max">Rejected</Tag>;
      default:
        return <Tag className="whitespace-nowrap inline-flex items-center shrink-0 min-w-max">{value}</Tag>;
    }
  }

  if (type === 'actionStatus') {
    switch (value) {
      case 'TODO':
        return <Tag color="default" className="whitespace-nowrap inline-flex items-center shrink-0 min-w-max">Todo</Tag>;
      case 'IN_PROGRESS':
        return <Tag color="processing" className="whitespace-nowrap inline-flex items-center shrink-0 min-w-max">In Progress</Tag>;
      case 'BLOCKED':
        return <Tag color="error" icon={<ExclamationCircleOutlined />} className="whitespace-nowrap inline-flex items-center shrink-0 min-w-max">Blocked</Tag>;
      case 'COMPLETED':
        return <Tag color="success" icon={<CheckCircleOutlined />} className="whitespace-nowrap inline-flex items-center shrink-0 min-w-max">Completed</Tag>;
      case 'CANCELLED':
        return <Tag color="default" className="whitespace-nowrap inline-flex items-center shrink-0 min-w-max">Cancelled</Tag>;
      default:
        return <Tag className="whitespace-nowrap inline-flex items-center shrink-0 min-w-max">{value}</Tag>;
    }
  }

  return <Tag className="whitespace-nowrap inline-flex items-center shrink-0 min-w-max">{String(value)}</Tag>;
};
