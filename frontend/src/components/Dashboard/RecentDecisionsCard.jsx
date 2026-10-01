import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card, List, Typography, Avatar, Flex, Space, Button, Spin, Empty, Tag, Modal, Tooltip, Badge } from 'antd';
import {
  FileTextOutlined,
  RightOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  HistoryOutlined,
  UserOutlined,
  UnorderedListOutlined,
  ContainerOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { decisionService } from '../../services/api.js';

const { Text, Title, Paragraph } = Typography;

export const RecentDecisionsCard = () => {
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDecision, setSelectedDecision] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchDecisions = useCallback(() => {
    setLoading(true);
    decisionService
      .getDecisions({ page_size: 20 })
      .then((res) => {
        const list = res.results || res || [];
        // Filter out items with no decision text or sort by latest
        const sorted = [...list].sort((a, b) => {
          return dayjs(b.updated_at || b.created_at).diff(dayjs(a.updated_at || a.created_at));
        });
        setDecisions(sorted.slice(0, 6));
      })
      .catch(() => setDecisions([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchDecisions();
  }, [fetchDecisions]);

  const handleOpenDetailModal = (item) => {
    setSelectedDecision(item);
    if (item.id) {
      setLoadingHistory(true);
      decisionService
        .getDecisionHistory(item.id)
        .then((res) => setHistoryList(res || []))
        .catch(() => setHistoryList([]))
        .finally(() => setLoadingHistory(false));
    }
  };

  const renderStatusTag = (status) => {
    if (status === 'DECISION_MADE' || status === 'APPROVED') {
      return (
        <Tag className="!mr-0 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/60 text-[10px] font-bold py-0 px-1.5 rounded-md">
          Decision Made
        </Tag>
      );
    }
    if (status === 'DEFERRED' || status === 'PENDING') {
      return (
        <Tag className="!mr-0 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/60 text-[10px] font-bold py-0 px-1.5 rounded-md">
          Deferred
        </Tag>
      );
    }
    return (
      <Tag className="!mr-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 text-[10px] font-medium py-0 px-1.5 rounded-md">
        Pending
      </Tag>
    );
  };

  return (
    <>
      <Card
        className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-xs h-full flex flex-col justify-between dark:bg-slate-900"
        styles={{
          body: {
            padding: '12px',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          },
        }}
        title={
          <Flex align="center" justify="space-between" className="w-full">
            <Space align="center" size={8}>
              <Avatar
                shape="square"
                size={26}
                icon={<FileTextOutlined />}
                className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-none rounded-lg flex items-center justify-center text-xs"
              />
              <Title level={5} className="!m-0 !text-xs !font-extrabold text-slate-900 dark:text-slate-100">
                Recent Key Decisions
              </Title>
            </Space>
            <Tag color="indigo" className="!mr-0 font-bold text-[10px] rounded-md border-indigo-200">
              Audit Feed
            </Tag>
          </Flex>
        }
      >
        <div className="my-1 max-h-[330px] flex-1 overflow-y-auto">
          {loading ? (
            <Flex justify="center" align="center" className="py-8">
              <Spin size="small" tip="Loading decisions..." />
            </Flex>
          ) : decisions.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div className="text-center space-y-1 py-2">
                  <Text className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    No decisions logged yet
                  </Text>
                  <Text type="secondary" className="text-[11px] block">
                    Decisions recorded in meetings will appear here.
                  </Text>
                </div>
              }
              className="my-auto py-3"
            />
          ) : (
            <List
              itemLayout="horizontal"
              dataSource={decisions}
              renderItem={(item) => {
                const deciderName =
                  item.decided_by_detail?.full_name ||
                  item.decided_by_detail?.username ||
                  'Organizer';
                const decisionDateStr = item.decision_date || item.created_at;

                return (
                  <List.Item
                    onClick={() => handleOpenDetailModal(item)}
                    className="!p-2.5 !rounded-xl !bg-slate-50/70 dark:!bg-slate-800/40 hover:!bg-indigo-50/40 dark:hover:!bg-indigo-950/30 !border !border-slate-200/60 dark:!border-slate-700/60 hover:!border-indigo-400 dark:hover:!border-indigo-500 transition-all !mb-2 last:!mb-0 flex items-center justify-between cursor-pointer group shadow-2xs"
                  >
                    <div className="w-full min-w-0 space-y-1">
                      <Flex justify="space-between" align="center" gap={6}>
                        <Text className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate block group-hover:text-black-600 dark:group-hover:text-indigo-400 transition-colors max-w-[170px]">
                          {item.decision || 'Untitled Decision Record'}
                        </Text>
                        <Tag color="geekblue" className="!mr-0 text-[9px] font-extrabold rounded-md px-1 py-0">
                          v{item.version || 1}
                        </Tag>
                      </Flex>

                      {item.reason && (
                        <Text type="secondary" className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                          Reason: {item.reason}
                        </Text>
                      )}

                      <Flex justify="space-between" align="center" className="pt-0.5 text-[10px] text-slate-400">
                        <Space size={4} className="truncate max-w-[150px]">
                          <UserOutlined className="text-[9px]" />
                          <span className="truncate">{deciderName}</span>
                        </Space>

                        <Space size={6} className="shrink-0">
                          {renderStatusTag(item.status)}
                          {item.action_items_count > 0 && (
                            <Tooltip title={`${item.action_items_count} Action Item(s) generated`}>
                              <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-0.5">
                                <UnorderedListOutlined className="text-[9px]" /> {item.action_items_count}
                              </span>
                            </Tooltip>
                          )}
                        </Space>
                      </Flex>
                    </div>
                  </List.Item>
                );
              }}
            />
          )}
        </div>

        <Flex align="center" justify="space-between" className="pt-2.5 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <Text type="secondary" className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
            Official Decision Records
          </Text>
          <Link
            to="/meetings"
            className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 no-underline"
          >
            <span>View All Meetings</span>
            <RightOutlined className="text-[8px]" />
          </Link>
        </Flex>
      </Card>

      {/* Decision Audit Detail & Version History Modal */}
      <Modal
        title={
          <Flex align="center" gap={8}>
            <Avatar
              shape="square"
              size={24}
              icon={<ContainerOutlined />}
              className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-none rounded flex items-center justify-center text-xs"
            />
            <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
              Decision Record Audit Detail
            </span>
          </Flex>
        }
        open={Boolean(selectedDecision)}
        onCancel={() => setSelectedDecision(null)}
        footer={[
          <Button
            key="close"
            type="primary"
            onClick={() => setSelectedDecision(null)}
            className="bg-indigo-600 hover:bg-indigo-700 font-bold rounded-lg h-8 px-4 text-xs"
          >
            Done
          </Button>,
        ]}
        className="rounded-xl"
      >
        {selectedDecision && (
          <div className="space-y-4 py-2">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-2">
              <Flex justify="space-between" align="center">
                <Text className="font-bold text-xs text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Approved Decision
                </Text>
                <Tag color="geekblue" className="font-bold text-xs rounded-md">
                  Version {selectedDecision.version || 1}
                </Tag>
              </Flex>

              <Paragraph className="!m-0 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {selectedDecision.decision || 'No decision text recorded.'}
              </Paragraph>

              {selectedDecision.reason && (
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  <Text className="font-bold text-[11px] text-slate-500 block mb-0.5">
                    Justification / Rationale:
                  </Text>
                  <Text className="text-xs text-slate-700 dark:text-slate-300">
                    {selectedDecision.reason}
                  </Text>
                </div>
              )}

              <Flex justify="space-between" align="center" className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-500">
                <span>
                  Decided By: <strong>{selectedDecision.decided_by_detail?.full_name || selectedDecision.decided_by_detail?.username || 'Organizer'}</strong>
                </span>
                <span>
                  {dayjs(selectedDecision.decision_date || selectedDecision.created_at).format('MMM D, YYYY h:mm A')}
                </span>
              </Flex>
            </div>

            {/* Version History Audit Log */}
            <div>
              <Title level={5} className="!text-xs !font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-2">
                <HistoryOutlined className="text-indigo-500" />
                Immutable Audit Trail ({historyList.length} revision snapshot{historyList.length !== 1 ? 's' : ''})
              </Title>

              {loadingHistory ? (
                <Flex justify="center" className="py-4">
                  <Spin size="small" tip="Fetching history..." />
                </Flex>
              ) : historyList.length === 0 ? (
                <Text type="secondary" className="text-xs italic block">
                  Original Version 1 (No subsequent edits).
                </Text>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {historyList.map((h) => (
                    <div
                      key={h.id}
                      className="p-2.5 bg-slate-50/60 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800 text-xs space-y-1"
                    >
                      <Flex justify="space-between" align="center">
                        <Tag color="blue" className="text-[10px] font-bold rounded-md">
                          v{h.version} Snapshot
                        </Tag>
                        <Text type="secondary" className="text-[10px]">
                          {dayjs(h.changed_at).format('MMM D, YYYY h:mm A')}
                        </Text>
                      </Flex>
                      <Text className="font-semibold text-slate-800 dark:text-slate-200 block text-[11px]">
                        {h.decision_text}
                      </Text>
                      {h.reason && (
                        <Text type="secondary" className="text-[10px] block truncate">
                          Reason: {h.reason}
                        </Text>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};
