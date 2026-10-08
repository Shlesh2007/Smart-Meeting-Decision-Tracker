
import React, { useState, useEffect } from 'react';
import { Modal, Avatar, Tag, Descriptions, Button, Form, Input, Alert, App, Grid, Select } from 'antd';
import { 
  UserOutlined, MailOutlined, IdcardOutlined, CalendarOutlined, 
  TeamOutlined, EditOutlined, SafetyCertificateOutlined, 
  LockOutlined, CheckOutlined, ArrowLeftOutlined, KeyOutlined,
  DeleteOutlined, WarningOutlined, ExclamationCircleOutlined, CloseOutlined,
  LogoutOutlined, SwapOutlined, CrownOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { authService, departmentRequestService } from '../services/api.js';
import { getErrorMessage } from '../utils/errorHandler.js';

const { useBreakpoint } = Grid;

export const ProfileModal = ({ open, onClose, user }) => {
  const screens = useBreakpoint();
  const isDesktop = screens.md ?? (typeof window !== 'undefined' ? window.innerWidth >= 768 : true);
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { logout, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  const [loading, setLoading] = useState(false);

  // Department Request Flow State
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [requestedDept, setRequestedDept] = useState('');
  const [deptReason, setDeptReason] = useState('');
  const [deptLoading, setDeptLoading] = useState(false);
  const [pendingReq, setPendingReq] = useState(null);

  useEffect(() => {
    if (user && open) {
      departmentRequestService.getRequests()
        .then((data) => {
          const list = data.results || data || [];
          const activePending = list.find(r => r.status === 'PENDING');
          setPendingReq(activePending || null);
        })
        .catch(() => setPendingReq(null));
    }
  }, [user, open]);

  useEffect(() => {
    if (showDeptModal) {
      if (pendingReq) {
        setRequestedDept(pendingReq.requested_department || '');
        setDeptReason(pendingReq.reason || '');
      } else {
        setRequestedDept('');
        setDeptReason('');
      }
    }
  }, [showDeptModal, pendingReq]);

  // Email Change Flow State
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailStep, setEmailStep] = useState(1); // 1 = Request, 2 = Verify
  const [newEmail, setNewEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSuccessMsg, setEmailSuccessMsg] = useState('');

  // Delete Account: pre-check / ownership-block state
  const [showDeleteCheckModal, setShowDeleteCheckModal] = useState(false);
  const [deleteCheckLoading, setDeleteCheckLoading] = useState(false);
  const [deleteCheckData, setDeleteCheckData] = useState(null); // {can_delete, requires_ownership_transfer, message, eligible_users, ...}

  // Ownership Transfer Modal
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTarget, setTransferTarget] = useState(null);
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState('');

  // Delete Account Confirmation Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const [form] = Form.useForm();


  useEffect(() => {
    if (user && open && isEditing) {
      form.setFieldsValue({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        department: user.department || '',
      });
    }
  }, [user, open, isEditing, form]);

  if (!user) return null;

  const handleConfirmLogout = () => {
    onClose();
    Modal.confirm({
      title: 'Sign Out Confirmation',
      icon: <LogoutOutlined className="text-rose-500" />,
      content: 'Are you sure you want to end your current session and log out?',
      okText: 'Logout',
      okType: 'danger',
      cancelText: 'Cancel',
      centered: true,
      onOk() {
        logout();
      },
    });
  };

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
      message.error(getErrorMessage(err, 'Failed to update profile details.'));
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
      setEmailError(getErrorMessage(err, 'Failed to send verification email.'));
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
      setEmailError(getErrorMessage(err, 'Failed to verify OTP code.'));
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

  // Step 1: Check account deletion eligibility before showing the delete modal
  const handleOpenDeleteFlow = async () => {
    setDeleteCheckLoading(true);
    setDeleteCheckData(null);
    try {
      const data = await authService.checkDeleteAccount();
      setDeleteCheckData(data);
      if (!data.can_delete) {
        // Blocked: show the block/ownership-transfer modal
        setShowDeleteCheckModal(true);
      } else {
        // Clear to delete: jump straight to confirmation modal
        setDeletePassword('');
        setDeleteConfirmationText('');
        setDeleteError('');
        setShowDeleteModal(true);
      }
    } catch (err) {
      message.error(getErrorMessage(err, 'Failed to check account deletion status.'));
    } finally {
      setDeleteCheckLoading(false);
    }
  };

  // Step 2a: Transfer ownership to a selected user
  const handleTransferOwnership = async () => {
    setTransferError('');
    if (!transferTarget) {
      setTransferError('Please select a user to transfer ownership to.');
      return;
    }
    setTransferLoading(true);
    try {
      const res = await authService.transferOwnership(transferTarget);
      await refreshUser();
      message.success(res.message || 'Ownership transferred successfully!');
      setShowTransferModal(false);
      setTransferTarget(null);
      setShowDeleteCheckModal(false);
      // Re-run check — user is now eligible to delete
      const freshCheck = await authService.checkDeleteAccount();
      setDeleteCheckData(freshCheck);
      if (freshCheck.can_delete) {
        setDeletePassword('');
        setDeleteConfirmationText('');
        setDeleteError('');
        setShowDeleteModal(true);
      } else {
        setShowDeleteCheckModal(true);
      }
    } catch (err) {
      setTransferError(getErrorMessage(err, 'Failed to transfer ownership.'));
    } finally {
      setTransferLoading(false);
    }
  };

  // Step 2b: Final account deletion
  const handleDeleteAccount = async () => {
    setDeleteError('');
    setDeleteLoading(true);
    try {
      const payload = {
        password: deletePassword,
        confirmation: deleteConfirmationText.trim(),
      };
      await authService.deleteAccount(payload);
      message.success('Your account has been deleted.');
      setShowDeleteModal(false);
      onClose();
      logout();
    } catch (err) {
      const errData = err?.response?.data;
      if (errData?.requires_ownership_transfer || errData?.requires_admin_assignment) {
        // Server rejected — re-show check modal with fresh data
        setShowDeleteModal(false);
        setDeleteCheckData({ ...deleteCheckData, ...errData, can_delete: false });
        setShowDeleteCheckModal(true);
        return;
      }
      setDeleteError(getErrorMessage(err, 'Failed to delete account. Please try again.'));
    } finally {
      setDeleteLoading(false);
    }
  };

  const resetDeleteFlow = () => {
    setShowDeleteModal(false);
    setShowDeleteCheckModal(false);
    setShowTransferModal(false);
    setDeletePassword('');
    setDeleteConfirmationText('');
    setDeleteError('');
    setTransferError('');
    setTransferTarget(null);
    setDeleteCheckData(null);
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
                id="profile_header_edit_btn"
                name="profile_header_edit_btn"
                icon={<EditOutlined className="text-blue-600 dark:text-blue-400" />}
                onClick={() => setIsEditing(true)}
                className="text-blue-600 dark:text-blue-400 font-semibold hover:bg-blue-50 dark:hover:bg-slate-800"
              >
                Edit Profile
              </Button>
            )}
          </div>
        }
        open={open && !showEmailModal && !showDeleteModal && !showDeleteCheckModal && !showTransferModal}
        onCancel={() => {
          setIsEditing(false);
          onClose();
        }}
        footer={
          isEditing ? [
            <Button 
              key="cancel" 
              id="profile_footer_cancel_btn"
              name="profile_footer_cancel_btn"
              icon={<CloseOutlined />}
              onClick={() => {
                form.resetFields();
                setIsEditing(false);
              }}
              disabled={loading}
            >
              Cancel
            </Button>,
            <Button 
              key="save" 
              id="profile_footer_save_btn"
              name="profile_footer_save_btn"
              type="primary" 
              loading={loading}
              onClick={() => form.submit()}
              className="bg-slate-900 hover:bg-slate-800 font-semibold text-white"
            >
              Save Changes
            </Button>,
          ] : (!isDesktop ? [
            <Button
              key="logout"
              danger
              type="default"
              icon={<LogoutOutlined />}
              onClick={handleConfirmLogout}
              className="bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white border-rose-200 font-bold text-xs"
            >
              Logout
            </Button>
          ] : null)
        }

        width={560}
        style={{ maxWidth: 'calc(100vw - 24px)', margin: '12px auto' }}
      >
        <div className="py-1 space-y-2.5">
          {/* Profile Card Banner */}
          <div className="bg-slate-50 dark:bg-slate-800/80 p-2.5 sm:p-3 rounded-xl border border-slate-200 dark:border-slate-700/70 flex items-center space-x-3 shadow-xs">
            <Avatar size={44} className="bg-slate-600 font-extrabold text-lg shadow-md ring-2 ring-blue-500/20 text-white shrink-0 flex items-center justify-center">
              {(user?.first_name || user?.full_name || user?.username || 'U')[0].toUpperCase()}
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white m-0 truncate leading-tight">
                {user.full_name || user.username}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 m-0 truncate leading-tight mt-0.5">{user.email}</p>
              <div className="mt-1 flex items-center space-x-1.5 flex-wrap">
                <Tag color={user.role === 'ADMIN' ? 'volcano' : 'blue'} className="font-bold uppercase tracking-wider text-[9.5px] py-0 px-1.5">
                  {user.role}
                </Tag>
                {user.department && (
                  <Tag color="geekblue" className="font-medium text-[10px] py-0 px-1.5">
                    {user.department}
                  </Tag>
                )}
              </div>
            </div>
          </div>

          {!isEditing ? (
            /* View Mode Details */
            <div className="space-y-2.5">
              <Descriptions column={1} bordered size="small" className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 [&_.ant-descriptions-item-cell]:!py-1.5 [&_.ant-descriptions-item-cell]:!px-3">
                <Descriptions.Item label={<span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center text-xs"><UserOutlined className="mr-1.5 text-blue-500" />Username</span>}>
                  <span className="font-semibold text-slate-900 dark:text-slate-200 text-xs sm:text-sm">{user.username}</span>
                </Descriptions.Item>

                <Descriptions.Item label={<span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center text-xs"><MailOutlined className="mr-1.5 text-blue-500" />Email Address</span>}>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 w-full min-w-0">
                    <span className="font-medium text-slate-900 dark:text-slate-200 break-all text-xs sm:text-sm">{user.email}</span>
                    <Button 
                      type="link" 
                      size="small"
                      icon={<SafetyCertificateOutlined className="text-blue-600" />}
                      onClick={() => setShowEmailModal(true)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 p-0 shrink-0 whitespace-nowrap mt-0.5 sm:mt-0"
                    >
                      Change Email
                    </Button>
                  </div>
                </Descriptions.Item>

                <Descriptions.Item label={<span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center text-xs"><IdcardOutlined className="mr-1.5 text-blue-500" />Account Role</span>}>
                  <div className="flex items-center justify-between gap-1 w-full min-w-0">
                    <span className="font-bold text-slate-900 dark:text-slate-200 text-xs sm:text-sm">{user.role}</span>
                    {(user.role === 'ADMIN' || user.role === 'OWNER') && (
                      <Button
                        type="primary"
                        size="small"
                        icon={<TeamOutlined />}
                        onClick={() => {
                          onClose();
                          navigate('/admin');
                        }}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] rounded-lg border-none shrink-0"
                      >
                        Admin Portal →
                      </Button>
                    )}
                  </div>
                </Descriptions.Item>

                <Descriptions.Item label={<span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center text-xs"><TeamOutlined className="mr-1.5 text-blue-500" />Department</span>}>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 w-full min-w-0">
                    <div>
                      <span className="font-medium text-slate-900 dark:text-slate-200 text-xs sm:text-sm">{user.department || 'General Team'}</span>
                      {pendingReq && (
                        <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-0.5">
                          ⏳ Pending Request: {pendingReq.requested_department}
                        </span>
                      )}
                    </div>
                    <Button
                      type="link"
                      size="small"
                      icon={<TeamOutlined className="text-blue-600" />}
                      onClick={() => {
                        if (pendingReq) {
                          setRequestedDept(pendingReq.requested_department || '');
                          setDeptReason(pendingReq.reason || '');
                        } else {
                          setRequestedDept('');
                          setDeptReason('');
                        }
                        setShowDeptModal(true);
                      }}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 p-0 shrink-0 whitespace-nowrap mt-0.5 sm:mt-0"
                    >
                      {pendingReq ? 'View Request' : 'Request Change'}
                    </Button>
                  </div>
                </Descriptions.Item>

                <Descriptions.Item label={<span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center text-xs"><CalendarOutlined className="mr-1.5 text-blue-500" />Member Since</span>}>
                  <span className="font-medium text-slate-900 dark:text-slate-200 text-xs sm:text-sm">
                    {user.date_joined ? dayjs(user.date_joined).format('MMMM DD, YYYY') : 'N/A'}
                  </span>
                </Descriptions.Item>
              </Descriptions>

              {/* Danger Zone: Account Deletion */}
              <div className="bg-red-50/70 dark:bg-red-950/20 p-2 sm:p-2.5 rounded-xl border border-red-200 dark:border-red-900/40 flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  <WarningOutlined className="text-red-600 dark:text-red-400 text-sm shrink-0" />
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-red-900 dark:text-red-300 block leading-tight">Danger Zone</span>
                    <span className="text-[10px] text-red-700 dark:text-red-400 block leading-tight truncate">Permanently remove your personal account access.</span>
                  </div>
                </div>
                <Button
                  size="small"
                  danger
                  type="primary"
                  icon={<DeleteOutlined />}
                  loading={deleteCheckLoading}
                  onClick={handleOpenDeleteFlow}
                  className="text-xs font-semibold shrink-0 px-2 py-0.5 h-7 flex items-center justify-center rounded-lg"
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
              disabled={loading}
              initialValues={{
                first_name: user?.first_name || '',
                last_name: user?.last_name || '',
                department: user?.department || '',
              }}
              className="space-y-3 pt-1"
            >
              <div className="grid grid-cols-2 gap-3">
                <Form.Item
                  label={<span className="font-semibold text-slate-700 dark:text-slate-300">First Name</span>}
                  name="first_name"
                  rules={[{ required: true, message: 'First name is required' }]}
                >
                  <Input id="first_name" name="first_name" prefix={<UserOutlined className="text-slate-400" />} placeholder="John" size="large" className="rounded-lg" />
                </Form.Item>

                <Form.Item
                  label={<span className="font-semibold text-slate-700 dark:text-slate-300">Last Name</span>}
                  name="last_name"
                  rules={[{ required: true, message: 'Last name is required' }]}
                >
                  <Input id="last_name" name="last_name" prefix={<UserOutlined className="text-slate-400" />} placeholder="Doe" size="large" className="rounded-lg" />
                </Form.Item>
              </div>

              {/* Read-only Department display in edit mode */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Assigned Department (Admin Assigned)</span>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 m-0">{user.department || 'General Team'}</p>
              </div>


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
        destroyOnHidden
        closable={false}
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
            <Form form={form} layout="vertical" onFinish={handleRequestEmailOTP}>
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 mb-3">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Current Registered Email</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm flex items-center">
                  <MailOutlined className="mr-2 text-blue-500" />
                  {user.email}
                </span>
              </div>

              <Form.Item
                name="new_email"
                label="Enter New Email Address"
                rules={[
                  { required: true, message: 'Please enter new email address' },
                  { type: 'email', message: 'Invalid email address format' }
                ]}
                className="mb-1"
              >
                <Input
                  id="profile_new_email"
                  name="new_email"
                  prefix={<MailOutlined className="text-slate-400" />}
                  placeholder="e.g. new.email@company.com"
                  size="large"
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="rounded-lg"
                  autoFocus
                />
              </Form.Item>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                A 6-digit verification code will be sent to this new email inbox.
              </p>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button id="email_step1_cancel_btn" name="email_step1_cancel_btn" icon={<CloseOutlined />} onClick={resetEmailFlow}>Cancel</Button>
                <Button
                  id="email_step1_send_btn"
                  name="email_step1_send_btn"
                  type="primary"
                  htmlType="submit"
                  icon={<MailOutlined />}
                  loading={emailLoading}
                  className="bg-slate-900 hover:bg-slate-800 font-semibold text-white text-xs"
                >
                  Send Verification Code
                </Button>
              </div>
            </Form>
          ) : (
            /* STEP 2: Enter 6-Digit OTP */
            <Form layout="vertical" onFinish={handleVerifyEmailOTP}>
              <div className="bg-blue-50 dark:bg-blue-950/40 p-3.5 rounded-xl border border-blue-100 dark:border-blue-900/50 mb-3">
                <div className="flex items-center space-x-2 text-blue-800 dark:text-blue-300 font-semibold text-xs mb-1">
                  <MailOutlined />
                  <span>Verification Code Sent To:</span>
                </div>
                <div className="font-bold text-blue-900 dark:text-blue-200 text-sm truncate">
                  {newEmail}
                </div>
              </div>

              <Form.Item
                name="otp_code"
                label="Enter 6-Digit Verification Code"
                rules={[
                  { required: true, message: 'Please enter OTP code' },
                  { len: 6, message: 'OTP code must be exactly 6 digits' }
                ]}
                className="mb-1"
              >
                <Input
                  id="profile_email_otp"
                  name="email_otp"
                  prefix={<KeyOutlined className="text-blue-500" />}
                  placeholder="123456"
                  maxLength={6}
                  size="large"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="text-center font-mono font-bold tracking-widest text-xl rounded-lg"
                  autoFocus
                />
              </Form.Item>
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-3 flex items-center justify-between">
                <span>Code valid for 10 minutes.</span>
                <button
                  type="button"
                  id="profile_resend_otp_btn"
                  name="profile_resend_otp_btn"
                  onClick={() => handleRequestEmailOTP({ new_email: newEmail })}
                  disabled={emailLoading}
                  className="text-blue-600 dark:text-blue-400 font-semibold hover:underline bg-transparent border-0 p-0 cursor-pointer"
                >
                  Resend Code
                </button>
              </div>

              <div className="flex flex-col xs:flex-row items-stretch xs:items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="text"
                  id="email_step2_change_email_btn"
                  name="email_step2_change_email_btn"
                  icon={<ArrowLeftOutlined />}
                  onClick={() => setEmailStep(1)}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800 p-0 justify-start"
                >
                  Change Email
                </Button>
                <div className="flex items-center justify-end gap-2 shrink-0">
                  <Button id="email_step2_cancel_btn" name="email_step2_cancel_btn" icon={<CloseOutlined />} onClick={resetEmailFlow}>Cancel</Button>
                  <Button
                    id="email_step2_verify_btn"
                    name="email_step2_verify_btn"
                    type="primary"
                    htmlType="submit"
                    icon={<CheckOutlined />}
                    loading={emailLoading}
                    className="bg-slate-900 hover:bg-slate-800 font-semibold text-white text-xs"
                  >
                    Verify & Change Email
                  </Button>
                </div>
              </div>
            </Form>
          )}
        </div>
      </Modal>

      {/* MODAL 1: Account Deletion Blocked — Ownership / Admin Transfer Required */}
      <Modal
        title={
          <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400">
            <WarningOutlined className="text-xl" />
            <span className="font-bold text-lg">Account Deletion Unavailable</span>
          </div>
        }
        open={showDeleteCheckModal}
        onCancel={resetDeleteFlow}
        footer={null}
        width={500}
        destroyOnHidden
        closable={true}
      >
        <div className="py-3 space-y-4">
          <Alert
            message={deleteCheckData?.requires_ownership_transfer ? "You're the only Owner" : "You're the only Administrator"}
            description={deleteCheckData?.message || "You must transfer your role before deleting your account."}
            type="warning"
            showIcon
            icon={<CrownOutlined />}
          />

          <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {deleteCheckData?.requires_ownership_transfer
              ? 'Transfer your Owner role to another user. You will become Admin and can then delete your account.'
              : 'Promote another user to Admin or Owner role, then you can delete your account.'}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button icon={<CloseOutlined />} onClick={resetDeleteFlow}>Cancel</Button>
            <Button
              type="primary"
              icon={<SwapOutlined />}
              onClick={() => {
                setTransferTarget(null);
                setTransferError('');
                setShowTransferModal(true);
              }}
              className="bg-amber-600 hover:bg-amber-700 border-amber-600 font-semibold text-white"
            >
              Transfer Ownership
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 2: Transfer Ownership to Another User */}
      <Modal
        title={
          <div className="flex items-center space-x-2 text-slate-900 dark:text-white">
            <SwapOutlined className="text-blue-600 dark:text-blue-400 text-lg" />
            <span className="font-bold">Transfer Ownership</span>
          </div>
        }
        open={showTransferModal}
        onCancel={() => {
          setShowTransferModal(false);
          setTransferTarget(null);
          setTransferError('');
        }}
        footer={null}
        width={480}
        destroyOnHidden
        closable={true}
      >
        <div className="py-3 space-y-4">
          <Alert
            message="Select who will receive ownership"
            description={
              deleteCheckData?.requires_ownership_transfer
                ? 'The selected user will become the new Owner. Your role will change to Admin.'
                : 'The selected user will become an Administrator of the organization.'
            }
            type="info"
            showIcon
          />

          {transferError && (
            <Alert message={transferError} type="error" showIcon closable onClose={() => setTransferError('')} />
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Select Target User
            </label>
            <Select
              id="transfer_target_user"
              showSearch
              placeholder="Search and select a user..."
              size="large"
              className="w-full"
              value={transferTarget}
              onChange={(val) => setTransferTarget(val)}
              optionFilterProp="label"
              options={(deleteCheckData?.eligible_users || []).map(u => ({
                value: u.id,
                label: `${u.full_name} (${u.email}) — ${u.role}`,
              }))}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              icon={<CloseOutlined />}
              onClick={() => {
                setShowTransferModal(false);
                setTransferTarget(null);
                setTransferError('');
              }}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              icon={<SwapOutlined />}
              loading={transferLoading}
              disabled={!transferTarget || transferLoading}
              onClick={handleTransferOwnership}
              className="bg-slate-900 hover:bg-slate-800 font-semibold text-white"
            >
              Transfer & Continue
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 3: Delete Account Final Confirmation */}
      <Modal
        title={
          <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
            <ExclamationCircleOutlined className="text-xl" />
            <span className="font-bold text-lg">Delete your account?</span>
          </div>
        }
        open={showDeleteModal}
        onCancel={resetDeleteFlow}
        footer={null}
        width={490}
        destroyOnHidden
        closable={false}
      >
        <div className="py-3 space-y-4">
          <Alert
            message="This action is permanent and cannot be undone."
            description="This will permanently delete your personal account and revoke your access to Smart Meeting. Your organization's meetings, decisions, action items, and other shared data will not be deleted."
            type="error"
            showIcon
            icon={<WarningOutlined />}
          />

          {(deleteCheckData?.is_oauth_user === false) && (
            <div className="bg-blue-50 dark:bg-blue-950/30 p-2.5 rounded-lg border border-blue-100 dark:border-blue-900/40 text-xs text-blue-800 dark:text-blue-300">
              <span className="font-semibold">Note:</span> Some items associated with your account may be reassigned to another user before your account is deleted.
            </div>
          )}

          {deleteError && (
            <Alert message={deleteError} type="error" showIcon closable onClose={() => setDeleteError('')} />
          )}

          <div className="space-y-3">
            {!(deleteCheckData?.is_oauth_user ?? user?.is_oauth_user) && (
              <div>
                <label htmlFor="delete_password" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Confirm Password
                </label>
                <Input.Password
                  id="delete_password"
                  name="delete_password"
                  prefix={<LockOutlined className="text-slate-400" />}
                  placeholder="Enter your current password"
                  size="large"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="rounded-lg"
                  autoFocus
                />
              </div>
            )}

            <div>
              <label htmlFor="delete_confirmation_text" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Type <strong className="text-red-600 dark:text-red-400">DELETE</strong> to confirm
              </label>
              <Input
                id="delete_confirmation_text"
                name="delete_confirmation_text"
                placeholder="DELETE"
                size="large"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                className="rounded-lg font-mono tracking-widest"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              id="delete_modal_cancel_btn"
              name="delete_modal_cancel_btn"
              icon={<CloseOutlined />}
              onClick={resetDeleteFlow}
            >
              Cancel
            </Button>
            <Button
              id="delete_modal_confirm_btn"
              name="delete_modal_confirm_btn"
              type="primary"
              danger
              icon={<DeleteOutlined />}
              loading={deleteLoading}
              disabled={
                deleteLoading ||
                deleteConfirmationText.trim() !== 'DELETE' ||
                (!(deleteCheckData?.is_oauth_user ?? user?.is_oauth_user) && !deletePassword)
              }
              onClick={handleDeleteAccount}
              className="font-semibold"
            >
              Delete Account
            </Button>
          </div>
        </div>
      </Modal>


      {/* Department Request Modal */}
      <Modal
        title={
          <div className="flex items-center space-x-2 text-slate-900 dark:text-white">
            <TeamOutlined className="text-blue-600 dark:text-blue-400 text-lg" />
            <span className="font-bold">Request Department Change</span>
          </div>
        }
        open={showDeptModal}
        onCancel={() => setShowDeptModal(false)}
        footer={null}
        width={480}
        destroyOnHidden
        closable={false}
      >
        <div className="pt-0 pb-1 space-y-2.5">
          <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 space-y-0.5">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Current Department</span>
            <span className="font-bold text-slate-900 dark:text-white text-sm">{user.department || 'General Team'}</span>
          </div>

          {pendingReq && (
            <Alert
              type="warning"
              showIcon
              message="Active Pending Request"
              description={`You have a pending request to change your department to "${pendingReq.requested_department}". Submitting a new request will update your pending request.`}
              className="rounded-lg text-xs py-2 px-3"
            />
          )}

          <div>
            <label htmlFor="profile_requested_dept" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Target Department
            </label>
            <Input
              id="profile_requested_dept"
              name="requested_department"
              prefix={<TeamOutlined className="text-slate-400" />}
              placeholder="e.g. DevOps & Cloud Systems, Engineering, Marketing..."
              size="large"
              value={requestedDept}
              onChange={(e) => setRequestedDept(e.target.value)}
              className="rounded-lg mb-2"
            />

            <label htmlFor="profile_dept_reason" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Reason / Justification for Request
            </label>
            <Input.TextArea
              id="profile_dept_reason"
              name="dept_reason"
              rows={2}
              placeholder="e.g. Transferred to DevOps squad to manage Kubernetes clusters and deployment pipelines."
              value={deptReason}
              onChange={(e) => setDeptReason(e.target.value)}
              className="rounded-lg"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button icon={<CloseOutlined />} onClick={() => setShowDeptModal(false)}>Cancel</Button>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              loading={deptLoading}
              onClick={async () => {
                if (!requestedDept.trim()) {
                  message.error('Please enter a requested department name.');
                  return;
                }
                setDeptLoading(true);
                try {
                  const res = await departmentRequestService.createRequest({
                    requested_department: requestedDept.trim(),
                    reason: deptReason.trim(),
                  });
                  message.success('Department change request submitted to Admin/Manager!');
                  setPendingReq(res);
                  setShowDeptModal(false);
                  setRequestedDept('');
                  setDeptReason('');
                } catch (err) {
                  const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to submit department request.';
                  message.error(msg);
                } finally {
                  setDeptLoading(false);
                }
              }}
              className="bg-slate-900 hover:bg-slate-800 font-semibold text-white"
            >
              Submit Request
            </Button>
          </div>
        </div>
      </Modal>

    </>
  );
};

