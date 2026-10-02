import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, List, Typography, Avatar, Flex, Space } from 'antd';
import { PlusOutlined, CalendarOutlined, FormOutlined, RightOutlined } from '@ant-design/icons';
import { ActionFormModal } from '../ActionFormModal.jsx';

const { Text, Title } = Typography;

export const QuickActions = () => {
  const [showAddActionModal, setShowAddActionModal] = useState(false);

  const actionItems = [
    {
      key: 'schedule_meeting',
      title: 'Schedule Meeting',
      desc: 'Create session & set agenda',
      icon: <PlusOutlined className="text-blue-600 dark:text-blue-400" />,
      bgIcon: 'bg-blue-50 dark:bg-blue-950/60 border-blue-100 dark:border-blue-900/40',
      to: '/meetings/new',
    },
    {
      key: 'add_action_item',
      title: 'Add Action Item',
      desc: 'Log task & assign team member',
      icon: <FormOutlined className="text-amber-600 dark:text-amber-400" />,
      bgIcon: 'bg-amber-50 dark:bg-amber-950/60 border-amber-100 dark:border-amber-900/40',
      onClick: () => setShowAddActionModal(true),
    },
    {
      key: 'view_calendar',
      title: 'View Calendar',
      desc: 'Monthly calendar schedule',
      icon: <CalendarOutlined className="text-indigo-600 dark:text-indigo-400" />,
      bgIcon: 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-100 dark:border-indigo-900/40',
      to: '/meetings?view=calendar',
    },
  ];

  return (
    <>
      <Card
        className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-xs h-full flex flex-col justify-between dark:bg-slate-900"
        styles={{
          body: {
            padding: '16px',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          },
        }}
        title={
          <Space align="center" size={8}>
            <Avatar
              shape="square"
              size={26}
              icon={<FormOutlined />}
              className="bg-slate-50 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 border-none rounded-lg flex items-center justify-center text-xs"
            />
            <Title level={5} className="!m-0 !text-xs !font-extrabold text-blue-900 dark:text-blue-100">
              Quick Actions
            </Title>
          </Space>
        }
      >
        <List
          itemLayout="horizontal"
          dataSource={actionItems}
          className="flex-1 flex flex-col justify-evenly py-1"
          renderItem={(item) => {
            const content = (
              <List.Item className="!p-3.5 !rounded-xl !bg-slate-50/70 dark:!bg-slate-800/50 hover:!bg-slate-100/90 dark:hover:!bg-slate-800 !border !border-slate-200/60 dark:!border-slate-700/60 transition-all cursor-pointer group !mb-2.5 last:!mb-0 flex items-center justify-between">
                <List.Item.Meta
                  avatar={
                    <Avatar
                      shape="square"
                      size={36}
                      icon={item.icon}
                      className={`${item.bgIcon} border rounded-xl flex items-center justify-center font-bold`}
                    />
                  }
                  title={
                    <Text className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors block">
                      {item.title}
                    </Text>
                  }
                  description={
                    <Text type="secondary" className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                      {item.desc}
                    </Text>
                  }
                />
                <RightOutlined className="text-xs text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-transform group-hover:translate-x-0.5 shrink-0 ml-2" />
              </List.Item>
            );

            if (item.to) {
              return (
                <Link key={item.key} to={item.to} className="no-underline block flex-1 flex flex-col justify-center">
                  {content}
                </Link>
              );
            }

            return (
              <div key={item.key} onClick={item.onClick} className="flex-1 flex flex-col justify-center">
                {content}
              </div>
            );
          }}
        />

        <Flex align="center" justify="space-between" className="pt-2.5 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <Text type="secondary" className="text-[10px]">Shortcuts</Text>
          <Text className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
            SmartMeeting Tools
          </Text>
        </Flex>
      </Card>

      <ActionFormModal
        open={showAddActionModal}
        onClose={() => setShowAddActionModal(false)}
        onSuccess={() => setShowAddActionModal(false)}
      />
    </>
  );
};
