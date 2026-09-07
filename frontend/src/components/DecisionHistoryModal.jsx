'use client';

import React, { useEffect, useState } from 'react';
import { Modal, Timeline, Tag, Spin, Typography } from 'antd';
import { decisionService } from '../services/api.js';
import { StatusBadge } from './StatusBadge.jsx';
import { HistoryOutlined, UserOutlined, CalendarOutlined } from '@ant-design/icons';
import { format } from 'date-fns';

const { Text, Paragraph } = Typography;

export const DecisionHistoryModal = ({ open, onClose, decisionId }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && decisionId) {
      setLoading(true);
      decisionService.getDecisionHistory(decisionId)
        .then((data) => setHistory(data))
        .catch(() => setHistory([]))
        .finally(() => setLoading(false));
    }
  }, [open, decisionId]);

  return (
    <Modal
      title={
        <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
          <HistoryOutlined className="text-xl" />
          <span className="text-lg font-bold">Decision Version History</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={650}
    >
      {loading ? (
        <div className="py-12 text-center">
          <Spin size="large" tip="Loading audit log history..." />
        </div>
      ) : history.length === 0 ? (
        <p className="text-slate-500 py-6 text-center">No history records found for this decision.</p>
      ) : (
        <div className="py-4 px-2 max-h-[60vh] overflow-y-auto">
          <Timeline
            mode="left"
            items={history.map((record) => ({
              color: record.version === 1 ? 'blue' : 'green',
              children: (
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-2 shadow-xs">
                  <div className="flex justify-between items-center mb-2">
                    <Tag color="blue" className="font-bold text-sm">
                      Version {record.version}
                    </Tag>
                    <StatusBadge type="decisionStatus" value={record.status} />
                  </div>

                  {record.decision_text && (
                    <div className="mb-2">
                      <Text strong className="text-xs uppercase text-slate-500 block mb-1">Decision Detail</Text>
                      <Paragraph className="bg-white p-2.5 rounded border border-slate-100 m-0 font-medium text-slate-800">
                        {record.decision_text}
                      </Paragraph>
                    </div>
                  )}

                  {record.reason && (
                    <div className="mb-2">
                      <Text strong className="text-xs uppercase text-slate-500 block mb-1">Rationale / Reason</Text>
                      <Text type="secondary" className="text-sm italic block bg-slate-100 p-2 rounded">
                        "{record.reason}"
                      </Text>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-xs text-slate-400 mt-3 pt-2 border-t border-slate-200">
                    <span className="flex items-center space-x-1">
                      <UserOutlined />
                      <span>Changed by: {record.changed_by_detail?.full_name || 'System User'}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <CalendarOutlined />
                      <span>{record.changed_at ? format(new Date(record.changed_at), 'PPP p') : 'N/A'}</span>
                    </span>
                  </div>
                </div>
              ),
            }))}
          />
        </div>
      )}
    </Modal>
  );
};
