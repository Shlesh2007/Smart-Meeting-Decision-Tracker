import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, List, Typography, Avatar, Flex, Space, Button, Spin, Empty } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { actionService } from '../../services/api.js';
import { StatusBadge } from '../StatusBadge.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const { Text, Title } = Typography;

export const RecentCompletedActions = () => {
  const { isAdmin, isOwner } = useAuth();
  const [completedActions, setCompletedActions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const fetcher = (isAdmin || isOwner)
      ? actionService.getActions({ status: 'COMPLETED' })
      : actionService.getMyActions({ status: 'COMPLETED' });

    fetcher
      .then((res) => {
        const list = res.results || res || [];
        setCompletedActions(list.slice(0, 4));
      })
      .catch(() => setCompletedActions([]))
      .finally(() => setLoading(false));
  }, [isAdmin, isOwner]);

  return (
    <Card
      className="rounded-xl border-slate-200 dark:border-slate-800 shadow-xs h-full flex flex-col justify-between dark:bg-slate-900"
      styles={{
        body: {
          padding: '14px',
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
              icon={<CheckCircleOutlined />}
              className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-none rounded-lg flex items-center justify-center text-xs"
            />
            <Title level={5} className="!m-0 !text-xs !font-extrabold text-slate-900 dark:text-slate-100">
              Recent Completed Actions
            </Title>
          </Space>
          <Link to="/my-actions?tab=COMPLETED" className="no-underline">
            <Button type="link" size="small" className="text-[11px] text-blue-600 dark:text-blue-400 font-bold p-0">
              View All →
            </Button>
          </Link>
        </Flex>
      }
    >
      <div className="my-2 max-h-[170px] overflow-y-auto flex-1">
        {loading ? (
          <Flex justify="center" align="center" className="py-6">
            <Spin size="small" tip="Loading completed items..." />
          </Flex>
        ) : completedActions.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Text type="secondary" className="text-[10px] block max-w-xs mx-auto">
                No completed action items logged yet.
              </Text>
            }
            className="my-auto py-2"
          />
        ) : (
          <List
            itemLayout="horizontal"
            dataSource={completedActions}
            renderItem={(item) => {
              const dateStr = item.updated_at
                ? dayjs(item.updated_at).format('MMM D')
                : item.due_date
                ? dayjs(item.due_date).format('MMM D')
                : 'Done';

              const assigneeStr = Array.isArray(item.assigned_to_detail)
                ? (item.assigned_to_detail.length > 0 ? item.assigned_to_detail.map(u => u.full_name || u.username).join(', ') : 'You')
                : (item.assigned_to_detail?.full_name || item.assigned_to_name || 'You');

              return (
                <List.Item className="!p-2 !rounded-lg !bg-slate-50/70 dark:!bg-slate-800/40 !border !border-slate-100 dark:!border-slate-800 hover:!border-emerald-300 dark:hover:!border-emerald-800 transition-all !mb-1.5 last:!mb-0 flex items-center justify-between">
                  <List.Item.Meta
                    avatar={
                      <Avatar
                        shape="square"
                        size={24}
                        icon={<CheckCircleOutlined />}
                        className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-none rounded flex items-center justify-center text-xs"
                      />
                    }
                    title={
                      <Text className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate block">
                        {item.title}
                      </Text>
                    }
                    description={
                      <Space size={4} className="text-[9px] text-slate-400">
                        <Text type="secondary" className="text-[9px] truncate max-w-[110px]">
                          Assignee: {assigneeStr}
                        </Text>
                        <Text type="secondary">•</Text>
                        <Text className="text-emerald-600 dark:text-emerald-400 font-semibold text-[9px]">
                          {dateStr}
                        </Text>
                      </Space>
                    }
                  />
                  <StatusBadge type="priority" value={item.priority || 'MEDIUM'} />
                </List.Item>
              );
            }}
          />
        )}
      </div>

      <Flex align="center" justify="space-between" className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 shrink-0">
        <Text type="secondary" className="text-[10px]">History</Text>
        <Text className="font-semibold text-emerald-600 dark:text-emerald-400 text-[10px]">
          {completedActions.length} Resolutions Logged
        </Text>
      </Flex>
    </Card>
  );
};
