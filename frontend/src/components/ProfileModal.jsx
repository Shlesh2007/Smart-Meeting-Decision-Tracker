'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Avatar, Tag, Descriptions, Button, Form, Input, message, Alert } from 'antd';
import { 
  UserOutlined, MailOutlined, IdcardOutlined, CalendarOutlined, 
  TeamOutlined, EditOutlined, SafetyCertificateOutlined, 
  LockOutlined, CheckOutlined, ArrowLeftOutlined, KeyOutlined,
  DeleteOutlined, WarningOutlined, ExclamationCircleOutlined
} from '@ant-design/icons';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext.jsx';
import { authService } from '../services/api.js';

export const ProfileModal = ({ open, onClose, user }) => {
  const { logout, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Email Change Flow State
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailStep, setEmailStep] = useState(1); // 1 = Request, 2 = Verify
  const [newEmail, setNewEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSuccessMsg, setEmailSuccessMsg] = useState('');

  // Delete Account State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const [form] = Form.useForm();

  useEffect(() => {
    if (user && open) {
      form.setFieldsValue({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        department: user.department || '',
      });
    }
  }, [user, open, form]);

  if (!user) return null;

  const handleSaveProfile = async (values) => {
    setLoading(true);
    try {
      await authService.updateProfile({
        first_name: values.first_name,
        last_name: values.last_name,
        department: values.department,
      });
      await refreshUser();
      message.success('Profile details updated successfully!');
      setIsEditing(false);
    } catch (err) {
      const errMsg = err.response?.data?.error || err.response?.data?.detail || 'Failed to update profile details.';
      message.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestEmailOTP = async () => {
    setEmailError('');
    setEmailSuccessMsg('');
    const trimmedEmail = newEmail.trim().toLowerCase();

    if (!trimmedEmail) {
      setEmailError('Please enter a new email address.');
      return;
    }
    if (trimmedEmail === user.email.toLowerCase()) {
      setEmailError('The new email address is identical to your current email address.');
      return;
    }
    if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setEmailError('Please enter a valid email address.');
      return;
    }

    setEmailLoading(true);
    try {
      const res = await authService.requestEmailChangeOTP(trimmedEmail);
      setEmailSuccessMsg(res.message || `Verification code sent to ${trimmedEmail}`);
      setEmailStep(2);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to send verification email.';
      setEmailError(msg);
    } finally {
      setEmailLoading(false);
    }
  };

  const handleVerifyEmailOTP = async () => {
    setEmailError('');
    const trimmedOtp = otpCode.trim();

    if (!trimmedOtp || trimmedOtp.length < 6) {
      setEmailError('Please enter the full 6-digit verification code.');
      return;
    }

    setEmailLoading(true);
    try {
      const res = await authService.verifyEmailChangeOTP(newEmail.trim().toLowerCase(), trimmedOtp);
      await refreshUser();
      message.success(res.message || 'Email address updated successfully!');
      setShowEmailModal(false);
      setEmailStep(1);
      setNewEmail('');
      setOtpCode('');
      setEmailError('');
      setEmailSuccessMsg('');
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to verify code.';
      setEmailError(msg);
    } finally {
      setEmailLoading(false);
    }
  };

  const resetEmailFlow = () => {
    setShowEmailModal(false);
    setEmailStep(1);
    setNewEmail('');
    setOtpCode('');
    setEmailError('');
    setEmailSuccessMsg('');
  };

  const handleDeleteAccount = async () => {
    setDeleteError('');
    setDeleteLoading(true);
    try {
      const payload = {
        password: deletePassword,
        confirmation: deleteConfirmationText,
      };
      await authService.deleteAccount(payload);
      message.success('Your account has been deleted successfully.');
      setShowDeleteModal(false);
      onClose();
      logout();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to delete account.';
      setDeleteError(msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      {/* Main Profile Details Modal */}
      <Modal
        title={
          <div className="flex items-center justify-between pr-6">
            <div className="flex items-center space-x-2 text-slate-900 dark:text-white">
              <UserOutlined className="text-blue-600 dark:text-blue-400 text-lg" />
              <span className="font-bold text-lg">
                {isEditing ? 'Edit Profile Details' : 'User Profile Details'}
              </span>
            </div>
            {!isEditing && (
              <Button
                type="text"
                icon={<EditOutlined className="text-blue-600 dark:text-blue-400" />}
                onClick={() => setIsEditing(true)}
                className="text-blue-600 dark:text-blue-400 font-semibold hover:bg-blue-50 dark:hover:bg-slate-800"
              >
                Edit Profile
              </Button>
            )}
          </div>
        }
        open={open && !showEmailModal && !showDeleteModal}
        onCancel={() => {
          setIsEditing(false);
          onClose();
        }}
        footer={
          isEditing ? [
            <Button 
              key="cancel" 
              onClick={() => setIsEditing(false)}
              disabled={loading}
            >
              Cancel
            </Button>,
            <Button 
              key="save" 
              type="primary" 
              loading={loading}
              onClick={() => form.submit()}
              className="bg-blue-600 hover:bg-blue-700 font-semibold"
            >
              Save Changes
            </Button>,
          ] : [
            <Button key="close" type="primary" onClick={onClose} className="bg-blue-600 hover:bg-blue-700 font-semibold">
              Close Profile
            </Button>,
          ]
        }
        width={560}
      >
        <div className="py-3 space-y-5">
          {/* Profile Card Banner */}
          <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700/70 flex items-center space-x-4 shadow-xs">
            <Avatar size={64} icon={<UserOutlined />} className="bg-blue-600 shadow-md ring-2 ring-blue-500/20" />
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white m-0 truncate">
                {user.full_name || user.username}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 m-0 truncate">{user.email}</p>
              <div className="mt-2 flex items-center space-x-2 flex-wrap gap-y-1">
                <Tag color={user.role === 'ADMIN' ? 'volcano' : 'blue'} className="font-bold uppercase tracking-wider text-[10px]">
                  {user.role}
                </Tag>
                {user.department && (
                  <Tag color="geekblue" className="font-medium text-[11px]">
                    {user.department}
                  </Tag>
                )}
              </div>
            </div>
          </div>

          {!isEditing ? (
            /* View Mode Details */
            <div className="space-y-4">
              <Descriptions column={1} bordered size="small" className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                <Descriptions.Item label={<span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center"><UserOutlined className="mr-2 text-blue-500" />Username</span>}>
                  <span className="font-semibold text-slate-900 dark:text-slate-200">{user.username}</span>
                </Descriptions.Item>

                <Descriptions.Item label={<span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center"><MailOutlined className="mr-2 text-blue-500" />Email Address</span>}>
                  <div className="flex items-center justify-between w-full">
                    <span className="font-medium text-slate-900 dark:text-slate-200">{user.email}</span>
                    <Button 
                      type="link" 
                      size="small"
                      icon={<SafetyCertificateOutlined className="text-blue-600" />}
                      onClick={() => setShowEmailModal(true)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 p-0 ml-2"
                    >
                      Change Email
                    </Button>
                  </div>
                </Descriptions.Item>

                <Descriptions.Item label={<span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center"><IdcardOutlined className="mr-2 text-blue-500" />Account Role</span>}>
                  <span className="font-bold text-slate-900 dark:text-slate-200">{user.role}</span>
                </Descriptions.Item>

                <Descriptions.Item label={<span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center"><TeamOutlined className="mr-2 text-blue-500" />Department</span>}>
                  <span className="font-medium text-slate-900 dark:text-slate-200">{user.department || 'General Team'}</span>
                </Descriptions.Item>

                <Descriptions.Item label={<span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center"><CalendarOutlined className="mr-2 text-blue-500" />Member Since</span>}>
                  <span className="font-medium text-slate-900 dark:text-slate-200">
                    {user.date_joined ? format(new Date(user.date_joined), 'MMMM dd, yyyy') : 'N/A'}
                  </span>
                </Descriptions.Item>
              </Descriptions>

              {/* Danger Zone: Account Deletion */}
              <div className="bg-red-50/70 dark:bg-red-950/20 p-3.5 rounded-xl border border-red-200 dark:border-red-900/40 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <WarningOutlined className="text-red-600 dark:text-red-400 text-lg" />
                  <div>
                    <span className="text-xs font-bold text-red-900 dark:text-red-300 block">Danger Zone</span>
                    <span className="text-[11px] text-red-700 dark:text-red-400">Permanently remove your account, profile details, and access.</span>
                  </div>
                </div>
                <Button
                  size="small"
                  danger
                  type="primary"
                  icon={<DeleteOutlined />}
                  onClick={() => setShowDeleteModal(true)}
                  className="text-xs font-semibold shrink-0 ml-2"
                >
                  Delete Account
                </Button>
              </div>
            </div>
          ) : (
            /* Edit Mode Form */
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSaveProfile}
              className="space-y-3 pt-1"
            >
              <div className="grid grid-cols-2 gap-3">
                <Form.Item
                  label={<span className="font-semibold text-slate-700 dark:text-slate-300">First Name</span>}
                  name="first_name"
                  rules={[{ required: true, message: 'First name is required' }]}
                >
                  <Input prefix={<UserOutlined className="text-slate-400" />} placeholder="John" size="large" className="rounded-lg" />
                </Form.Item>

                <Form.Item
                  label={<span className="font-semibold text-slate-700 dark:text-slate-300">Last Name</span>}
                  name="last_name"
                  rules={[{ required: true, message: 'Last name is required' }]}
                >
                  <Input prefix={<UserOutlined className="text-slate-400" />} placeholder="Doe" size="large" className="rounded-lg" />
                </Form.Item>
              </div>

              <Form.Item
                label={<span className="font-semibold text-slate-700 dark:text-slate-300">Department / Team</span>}
                name="department"
              >
                <Input prefix={<TeamOutlined className="text-slate-400" />} placeholder="Engineering, Product, Operations..." size="large" className="rounded-lg" />
              </Form.Item>

              {/* Read-only Email display */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Email Address (Protected)</span>
                  <Tag icon={<LockOutlined />} color="default" className="m-0 text-[10px]">Verified OTP</Tag>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{user.email}</span>
                  <Button
                    type="link"
                    size="small"
                    onClick={() => setShowEmailModal(true)}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 p-0"
                  >
                    Change Email
                  </Button>
                </div>
              </div>
            </Form>
          )}
        </div>
      </Modal>

      {/* 2-Step OTP Email Change Modal */}
      <Modal
        title={
          <div className="flex items-center space-x-2 text-slate-900 dark:text-white">
            <SafetyCertificateOutlined className="text-blue-600 dark:text-blue-400 text-lg" />
            <span className="font-bold">Update Account Email</span>
          </div>
        }
        open={showEmailModal}
        onCancel={resetEmailFlow}
        footer={null}
        width={460}
        destroyOnClose
      >
        <div className="py-3 space-y-4">
          {emailError && (
            <Alert message={emailError} type="error" showIcon closable onClose={() => setEmailError('')} />
          )}

          {emailSuccessMsg && (
            <Alert message={emailSuccessMsg} type="success" showIcon closable onClose={() => setEmailSuccessMsg('')} />
          )}

          {emailStep === 1 ? (
            /* STEP 1: Enter New Email */
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Current Registered Email</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm flex items-center">
                  <MailOutlined className="mr-2 text-blue-500" />
                  {user.email}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Enter New Email Address
                </label>
                <Input
                  prefix={<MailOutlined className="text-slate-400" />}
                  placeholder="e.g. new.email@company.com"
                  size="large"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="rounded-lg"
                  autoFocus
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                  A 6-digit verification code will be sent to this new email inbox.
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <Button onClick={resetEmailFlow}>Cancel</Button>
                <Button
                  type="primary"
                  icon={<MailOutlined />}
                  loading={emailLoading}
                  onClick={handleRequestEmailOTP}
                  className="bg-blue-600 hover:bg-blue-700 font-semibold"
                >
                  Send Verification Code
                </Button>
              </div>
            </div>
          ) : (
            /* STEP 2: Enter 6-Digit OTP */
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950/40 p-3.5 rounded-xl border border-blue-100 dark:border-blue-900/50">
                <div className="flex items-center space-x-2 text-blue-800 dark:text-blue-300 font-semibold text-xs mb-1">
                  <MailOutlined />
                  <span>Verification Code Sent To:</span>
                </div>
                <div className="font-bold text-blue-900 dark:text-blue-200 text-sm truncate">
                  {newEmail}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Enter 6-Digit Verification Code
                </label>
                <Input
                  prefix={<KeyOutlined className="text-blue-500" />}
                  placeholder="123456"
                  maxLength={6}
                  size="large"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="text-center font-mono font-bold tracking-widest text-xl rounded-lg"
                  autoFocus
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 flex items-center justify-between">
                  <span>Code valid for 10 minutes.</span>
                  <button
                    type="button"
                    onClick={handleRequestEmailOTP}
                    disabled={emailLoading}
                    className="text-blue-600 dark:text-blue-400 font-semibold hover:underline bg-transparent border-0 p-0 cursor-pointer"
                  >
                    Resend Code
                  </button>
                </p>
              </div>

              <div className="flex justify-between items-center pt-2">
                <Button
                  type="text"
                  icon={<ArrowLeftOutlined />}
                  onClick={() => setEmailStep(1)}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800"
                >
                  Change Email
                </Button>
                <div className="space-x-2">
                  <Button onClick={resetEmailFlow}>Cancel</Button>
                  <Button
                    type="primary"
                    icon={<CheckOutlined />}
                    loading={emailLoading}
                    onClick={handleVerifyEmailOTP}
                    className="bg-blue-600 hover:bg-blue-700 font-semibold"
                  >
                    Verify & Change Email
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Delete Account Confirmation Modal */}
      <Modal
        title={
          <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
            <ExclamationCircleOutlined className="text-xl" />
            <span className="font-bold text-lg">Delete Account</span>
          </div>
        }
        open={showDeleteModal}
        onCancel={() => {
          setShowDeleteModal(false);
          setDeletePassword('');
          setDeleteConfirmationText('');
          setDeleteError('');
        }}
        footer={null}
        width={480}
        destroyOnClose
      >
        <div className="py-3 space-y-4">
          <Alert
            message="Are you sure you want to delete your account?"
            description="This action is permanent and cannot be undone. All your profile information, settings, and account data will be completely erased."
            type="error"
            showIcon
            icon={<WarningOutlined />}
          />

          {deleteError && (
            <Alert message={deleteError} type="error" showIcon closable onClose={() => setDeleteError('')} />
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Confirm Account Deletion
            </label>
            <Input.Password
              prefix={<LockOutlined className="text-slate-400" />}
              placeholder="Enter your password to confirm"
              size="large"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className="rounded-lg mb-2"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 m-0">
              Or type <strong className="text-red-600 dark:text-red-400">DELETE</strong> below if signed in with Google/GitHub:
            </p>
            <Input
              placeholder="Type DELETE to confirm"
              size="large"
              value={deleteConfirmationText}
              onChange={(e) => setDeleteConfirmationText(e.target.value)}
              className="rounded-lg mt-1"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button 
              onClick={() => {
                setShowDeleteModal(false);
                setDeletePassword('');
                setDeleteConfirmationText('');
                setDeleteError('');
              }}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              danger
              icon={<DeleteOutlined />}
              loading={deleteLoading}
              onClick={handleDeleteAccount}
              className="font-semibold"
            >
              Delete Account
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
