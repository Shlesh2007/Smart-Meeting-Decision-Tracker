'use client';

import React from 'react';
import { Modal, Avatar, Tag, Descriptions, Button } from 'antd';
import { UserOutlined, MailOutlined, IdcardOutlined, CalendarOutlined, TeamOutlined } from '@ant-design/icons';
import { format } from 'date-fns';

export const ProfileModal = ({ open, onClose, user }) => {
  if (!user) return null;

  return (
    <Modal
      title={
        <div className="flex items-center space-x-2 text-slate-900 dark:text-white">
          <UserOutlined className="text-blue-600 dark:text-blue-400" />
          <span className="font-bold">User Profile Details</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" type="primary" onClick={onClose} className="bg-blue-600 hover:bg-blue-700">
          Close Profile
        </Button>,
      ]}
      width={500}
    >
      <div className="py-4 space-y-6">
        {/* Profile Card Banner */}
        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center space-x-4">
          <Avatar size={64} icon={<UserOutlined />} className="bg-blue-600 shadow-md" />
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white m-0">{user.full_name}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 m-0">{user.email}</p>
            <div className="mt-2 flex items-center space-x-2">
              <Tag color={user.role === 'ADMIN' ? 'volcano' : 'blue'} className="font-bold uppercase">
                {user.role}
              </Tag>
              {user.department && <Tag color="geekblue">{user.department}</Tag>}
            </div>
          </div>
        </div>

        {/* Detailed Information Grid */}
        <Descriptions column={1} bordered size="small" className="bg-white rounded-lg">
          <Descriptions.Item label={<span className="font-semibold text-slate-600 flex items-center"><UserOutlined className="mr-2" />Username</span>}>
            <span className="font-semibold text-slate-900">{user.username}</span>
          </Descriptions.Item>

          <Descriptions.Item label={<span className="font-semibold text-slate-600 flex items-center"><MailOutlined className="mr-2" />Email Address</span>}>
            <span className="font-medium text-slate-900">{user.email}</span>
          </Descriptions.Item>

          <Descriptions.Item label={<span className="font-semibold text-slate-600 flex items-center"><IdcardOutlined className="mr-2" />Account Role</span>}>
            <span className="font-bold text-slate-900">{user.role}</span>
          </Descriptions.Item>

          <Descriptions.Item label={<span className="font-semibold text-slate-600 flex items-center"><TeamOutlined className="mr-2" />Department</span>}>
            <span className="font-medium text-slate-900">{user.department || 'General Team'}</span>
          </Descriptions.Item>

          <Descriptions.Item label={<span className="font-semibold text-slate-600 flex items-center"><CalendarOutlined className="mr-2" />Member Since</span>}>
            <span className="font-medium text-slate-900">
              {user.date_joined ? format(new Date(user.date_joined), 'MMMM dd, yyyy') : 'N/A'}
            </span>
          </Descriptions.Item>
        </Descriptions>
      </div>
    </Modal>
  );
};
