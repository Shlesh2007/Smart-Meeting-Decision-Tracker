import React from 'react';
import { Tag } from 'antd';
import {
  ClockCircleOutlined, SyncOutlined, CheckCircleOutlined,
  CloseCircleOutlined, ExclamationCircleOutlined
} from '@ant-design/icons';

export const StatusBadge = ({ type, value }) => {
  if (type === 'overdue' && value === true) {
    return (
      <Tag color="error" icon={<ExclamationCircleOutlined />} className="font-semibold px-2 py-0.5 rounded">
        OVERDUE
      </Tag>
    );
  }

  if (type === 'meetingStatus') {
    switch (value) {
      case 'SCHEDULED':
        return <Tag color="processing" icon={<ClockCircleOutlined />}>Scheduled</Tag>;
      case 'IN_PROGRESS':
        return <Tag color="warning" icon={<SyncOutlined spin />}>In Progress</Tag>;
      case 'COMPLETED':
        return <Tag color="success" icon={<CheckCircleOutlined />}>Completed</Tag>;
      case 'CANCELLED':
        return <Tag color="default" icon={<CloseCircleOutlined />}>Cancelled</Tag>;
      default:
        return <Tag>{value}</Tag>;
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
    return <Tag color={colors[value] || 'blue'} className="font-semibold uppercase px-2 py-0.5 rounded">{value}</Tag>;
  }

  if (type === 'priority') {
    const config = {
      LOW: { color: 'green', label: 'Low' },
      MEDIUM: { color: 'blue', label: 'Medium' },
      HIGH: { color: 'gold', label: 'High' },
      CRITICAL: { color: 'magenta', label: 'Critical' }
    };
    const c = config[value] || { color: 'default', label: value };
    return <Tag color={c.color} className="font-medium">{c.label}</Tag>;
  }

  if (type === 'decisionStatus') {
    switch (value) {
      case 'NO_DECISION':
        return <Tag color="default">No Decision</Tag>;
      case 'DECISION_MADE':
        return <Tag color="success" icon={<CheckCircleOutlined />}>Decision Made</Tag>;
      case 'DEFERRED':
        return <Tag color="warning">Deferred</Tag>;
      case 'REJECTED':
        return <Tag color="error">Rejected</Tag>;
      default:
        return <Tag>{value}</Tag>;
    }
  }

  if (type === 'actionStatus') {
    switch (value) {
      case 'TODO':
        return <Tag color="default">Todo</Tag>;
      case 'IN_PROGRESS':
        return <Tag color="processing">In Progress</Tag>;
      case 'BLOCKED':
        return <Tag color="error" icon={<ExclamationCircleOutlined />}>Blocked</Tag>;
      case 'COMPLETED':
        return <Tag color="success" icon={<CheckCircleOutlined />}>Completed</Tag>;
      case 'CANCELLED':
        return <Tag color="default">Cancelled</Tag>;
      default:
        return <Tag>{value}</Tag>;
    }
  }

  return <Tag>{String(value)}</Tag>;
};
