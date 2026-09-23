import React from 'react';
import { Modal, Avatar, Tag, Descriptions, Button } from 'antd';
import { 
  UserOutlined, MailOutlined, IdcardOutlined, CalendarOutlined, 
  TeamOutlined, CloseOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

export const ParticipantProfileModal = ({ open, onClose, user }) => {
  if (!user) return null;

  const displayName = user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || 'Participant';
  const roleName = user.role || 'MEMBER';
  const isAdminOrOwner = roleName === 'ADMIN' || roleName === 'OWNER';

  return (
    <Modal
      title={
        <div className="flex items-center space-x-2 text-slate-900 dark:text-white">
          <UserOutlined className="text-blue-600 dark:text-blue-400 text-lg" />
          <span className="font-bold text-lg">User Profile Details</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={520}
      centered
      destroyOnHidden
    >
      <div className="py-3 space-y-5">
        {/* Profile Banner */}
        <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-700/70 flex items-center space-x-3 sm:space-x-4 shadow-xs">
          <Avatar 
            size={56} 
            className="bg-blue-600 font-extrabold text-xl sm:text-2xl shadow-md ring-2 ring-blue-500/20 text-white shrink-0 flex items-center justify-center"
          >
            {(user.first_name || user.full_name || user.username || 'P')[0].toUpperCase()}
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white m-0 truncate">
              {displayName}
            </h3>
            {user.email && (
              <p className="text-xs text-slate-500 dark:text-slate-400 m-0 truncate">{user.email}</p>
            )}
            <div className="mt-1.5 flex items-center space-x-2 flex-wrap gap-y-1">
              <Tag color={isAdminOrOwner ? 'volcano' : 'blue'} className="font-bold uppercase tracking-wider text-[10px]">
                {roleName}
              </Tag>
              {user.department && (
                <Tag color="geekblue" className="font-medium text-[11px]">
                  {user.department}
                </Tag>
              )}
            </div>
          </div>
        </div>

        {/* Profile Details List */}
        <div className="space-y-4">
          <Descriptions 
            column={1} 
            bordered 
            size="small" 
            className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800"
          >
            {user.username && (
              <Descriptions.Item label={<span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center"><UserOutlined className="mr-2 text-blue-500" />Username</span>}>
                <span className="font-semibold text-slate-900 dark:text-slate-200">{user.username}</span>
              </Descriptions.Item>
            )}

            {user.email && (
              <Descriptions.Item label={<span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center"><MailOutlined className="mr-2 text-blue-500" />Email Address</span>}>
                <span className="font-medium text-slate-900 dark:text-slate-200 break-all text-xs sm:text-sm">{user.email}</span>
              </Descriptions.Item>
            )}

            <Descriptions.Item label={<span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center"><IdcardOutlined className="mr-2 text-blue-500" />Account Role</span>}>
              <span className="font-bold text-slate-900 dark:text-slate-200">{roleName}</span>
            </Descriptions.Item>

            <Descriptions.Item label={<span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center"><TeamOutlined className="mr-2 text-blue-500" />Department</span>}>
              <span className="font-medium text-slate-900 dark:text-slate-200">{user.department || 'General Team'}</span>
            </Descriptions.Item>

            <Descriptions.Item label={<span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center"><CalendarOutlined className="mr-2 text-blue-500" />Member Since</span>}>
              <span className="font-medium text-slate-900 dark:text-slate-200">
                {user.date_joined ? dayjs(user.date_joined).format('MMMM DD, YYYY') : 'N/A'}
              </span>
            </Descriptions.Item>
          </Descriptions>
        </div>
      </div>
    </Modal>
  );
};
