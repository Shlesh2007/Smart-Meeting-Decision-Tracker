import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Logo } from '../components/Logo.jsx';
import { getErrorMessage } from '../utils/errorHandler.js';
import { authService } from '../services/api.js';
import { Form, Input, Select, Button, Card, Alert, App, ConfigProvider, theme as antdTheme, Tag } from 'antd';
import {
  BankOutlined, UsergroupAddOutlined, PlusOutlined,
  CheckCircleOutlined, RightOutlined, LogoutOutlined, InfoCircleOutlined,
  ClockCircleOutlined, SyncOutlined, TeamOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

export default function Onboarding() {
  const { user, joinOrganization, logout, refreshUser } = useAuth();
  const { message } = App.useApp();
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [orgStatus, setOrgStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [joinForm] = Form.useForm();

  const fetchOrgStatus = (showSpinner = true) => {
    if (showSpinner) setLoadingStatus(true);
    authService.getOrganizationStatus()
      .then(async (data) => {
        setOrgStatus(data);
        // If user was approved or rejected while waiting on this page, refresh user profile to trigger automatic navigation
        if (!data?.user_pending_request && user) {
          try {
            await refreshUser();
          } catch (_) {}
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch organization status:", err);
      })
      .finally(() => {
        if (showSpinner) setLoadingStatus(false);
      });
  };

  useEffect(() => {
    fetchOrgStatus(true);

    // Live Auto-Refresh: poll every 5 seconds so approvals/rejections appear immediately without page refresh
    const pollTimer = setInterval(() => {
      fetchOrgStatus(false);
    }, 5000);

    const handleFocus = () => {
      fetchOrgStatus(false);
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(pollTimer);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('visibilitychange', handleFocus);
    };
  }, []);

  const handleJoinOrg = async (values) => {
    const selectedOrgVal = values.organization_id || values.organization_name;
    if (!selectedOrgVal) {
      message.error('Please select an organization to join.');
      return;
    }

    const selectedOrgObj = orgStatus?.all_organizations?.find(
      (o) => String(o.id) === String(selectedOrgVal) || o.name === selectedOrgVal
    );

    setSubmitting(true);
    setConfirmationMessage('');
    try {
      const res = await joinOrganization({
        organization_id: selectedOrgObj?.id || (typeof selectedOrgVal === 'number' ? selectedOrgVal : undefined),
        organization_name: selectedOrgObj?.name || selectedOrgVal || orgStatus?.organization_name || 'SmartMeeting Workspace',
        department: values.department || 'General Team'
      });
      if (res.pending) {
        const msg = "Your request has been submitted successfully. You will receive an email notification once your request is reviewed and accepted.";
        setConfirmationMessage(msg);
        message.success(msg);
        fetchOrgStatus();
      } else {
        message.success(res.message || 'Joined organization successfully!');
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      message.error(getErrorMessage(err, 'Failed to submit join request.'));
    } finally {
      setSubmitting(false);
    }
  };

  const organizationsList = orgStatus?.all_organizations || [];
  const hasEligibleOrgs = organizationsList.length > 0;

  return (
    <ConfigProvider theme={{ algorithm: antdTheme.defaultAlgorithm }}>
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-x-hidden overflow-y-auto selection:bg-[#2563eb] selection:text-white">
        {/* Fullscreen Fixed Background Image */}
        <div className="fixed inset-0 pointer-events-none select-none z-0 overflow-hidden bg-[#eff6ff]">
          {/* Desktop / Tablet (>= sm): Full widescreen cover */}
          <img
            src="/background-img.png"
            alt=""
            aria-hidden="true"
            className="hidden sm:block w-full h-full object-cover object-center pointer-events-none select-none brightness-[1.05]"
          />

          {/* Mobile Screens (< sm): Show both top & bottom 3D cubes and circles */}
          <div className="sm:hidden absolute inset-0 overflow-hidden">
            <img
              src="/background-img.png"
              alt=""
              aria-hidden="true"
              className="w-full h-[40vh] object-cover object-top opacity-90 brightness-[1.05]"
            />
            <img
              src="/background-img.png"
              alt=""
              aria-hidden="true"
              className="w-full h-[40vh] object-cover object-bottom absolute bottom-0 left-0 opacity-85 brightness-[1.05]"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#eff6ff]/50 to-[#eff6ff]/80" />
          </div>
        </div>

        <div className="relative z-10 w-full max-w-xl space-y-6 my-auto py-6 sm:py-8">
          {/* Brand Header */}
          <div className="text-center space-y-2">
            <Logo variant="full" height={40} className="mx-auto" />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight m-0">
              Welcome, {user?.first_name || user?.full_name || user?.username}!
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 m-0 max-w-md mx-auto">
              {orgStatus?.user_pending_request
                ? "Your workspace join request has been submitted and is currently under review."
                : "You do not currently belong to an active organization workspace. Select an existing organization to request access or create your own."}
            </p>
          </div>

          {/* Main Onboarding Card (Single Unified Dialog Box) */}
          <div className="w-full bg-white shadow-xl shadow-slate-400/15 rounded-[24px] p-6 sm:p-7 border border-slate-100 auth-card">
            {orgStatus?.user_pending_request ? (
              <div className="space-y-4">
                {/* Live Success Notice if submitted in this session */}
                {confirmationMessage && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center space-x-2 text-left">
                    <CheckCircleOutlined className="text-emerald-600 text-base shrink-0" />
                    <div>
                      <p className="font-bold m-0 text-emerald-900">Request Submitted Successfully</p>
                      <p className="m-0 text-emerald-700 text-[11px]">{confirmationMessage}</p>
                    </div>
                  </div>
                )}

                {/* Status Header */}
                <div className="text-center pt-1 space-y-2">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-100 text-amber-600 text-2xl shadow-sm border border-amber-200">
                    <ClockCircleOutlined />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 m-0">
                      Join Request Under Review
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 m-0">
                      Your request to join the workspace has been recorded and is currently awaiting approval.
                    </p>
                  </div>
                </div>

                {/* Organization & Department Details Box */}
                <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/80 border border-amber-200/90 space-y-3">
                  <div className="flex items-center justify-between pb-2.5 border-b border-amber-200">
                    <div className="flex items-center space-x-2 min-w-0">
                      <BankOutlined className="text-amber-700 text-base shrink-0" />
                      <span className="font-bold text-sm text-slate-900 truncate">
                        {orgStatus.user_pending_request.organization_name}
                      </span>
                    </div>
                    <Tag color="warning" className="font-bold uppercase tracking-wider text-[10px] px-2.5 py-0.5 rounded-full border-none bg-amber-500 text-white shrink-0 m-0">
                      Pending Review
                    </Tag>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 pt-0.5">
                    <div className="flex items-center space-x-1.5">
                      <TeamOutlined className="text-amber-700 text-xs shrink-0" />
                      <span className="text-slate-500 font-medium">Department:</span>
                      <strong className="text-slate-800 truncate">
                        {orgStatus.user_pending_request.requested_department || 'General Team'}
                      </strong>
                    </div>
                    <div className="flex items-center space-x-1.5 sm:justify-end">
                      <ClockCircleOutlined className="text-amber-700 text-xs shrink-0" />
                      <span className="text-slate-500 font-medium">Submitted:</span>
                      <strong className="text-slate-800">
                        {dayjs(orgStatus.user_pending_request.created_at).format('MMM DD, YYYY')}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Next Steps Guidance */}
                <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200/80 space-y-2 text-left">
                  <div className="flex items-center space-x-2">
                    <InfoCircleOutlined className="text-blue-600 text-sm shrink-0" />
                    <h4 className="font-bold text-xs text-blue-950 m-0">What happens next?</h4>
                  </div>
                  <ul className="text-xs text-blue-900/90 space-y-1.5 m-0 pl-5 list-disc leading-relaxed">
                    <li>
                      An <strong>Organization Owner or Administrator</strong> will review your request.
                    </li>
                    <li>
                      You will receive an <strong>email notification</strong> once your request is reviewed and accepted.
                    </li>
                    <li>
                      This page automatically refreshes and will grant workspace access as soon as approved.
                    </li>
                  </ul>
                </div>

                {/* Live Auto-Sync Status Bar */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <div className="flex items-center space-x-2 text-slate-500">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[11px] font-medium text-slate-500">Auto-refreshing status...</span>
                  </div>
                  <Button
                    type="text"
                    size="small"
                    icon={<SyncOutlined spin={loadingStatus} />}
                    onClick={() => fetchOrgStatus(true)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-semibold p-0 h-auto"
                  >
                    Refresh Status
                  </Button>
                </div>
              </div>
            ) : !hasEligibleOrgs && !loadingStatus ? (
              <div className="pt-1 space-y-4">
                <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
                  <UsergroupAddOutlined className="text-blue-500 text-lg" />
                  <h2 className="text-base font-bold text-slate-800 m-0">
                    Request an Organization to Join
                  </h2>
                </div>
                <div className="text-center py-6 space-y-3">
                  <BankOutlined className="text-4xl text-slate-300" />
                  <div>
                    <p className="font-bold text-sm text-slate-700 m-0">No Organizations Available to Join</p>
                    <p className="text-xs text-slate-500 mt-1 m-0">
                      There are currently no organizations in the database to join. You can create a new organization below.
                    </p>
                  </div>
                  <Button
                    type="primary"
                    onClick={() => navigate('/create-organization')}
                    icon={<PlusOutlined />}
                    className="font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white h-10 border-none shadow-sm transition-colors text-sm"
                  >
                    Create New Organization
                  </Button>
                </div>
              </div>
            ) : (
              <div className="pt-1 space-y-4">
                <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
                  <UsergroupAddOutlined className="text-blue-500 text-lg" />
                  <h2 className="text-base font-bold text-slate-800 m-0">
                    Request an Organization to Join
                  </h2>
                </div>

                <Alert
                  type="info"
                  showIcon
                  icon={<CheckCircleOutlined className="text-blue-600" />}
                  message={<span className="font-semibold text-xs sm:text-sm text-blue-900">Select an Organization to Join</span>}
                  description={<span className="text-xs text-blue-800">Choose an existing organization from the database and select your department. An Organization Owner or Admin must approve your join request.</span>}
                  className="rounded-2xl border-blue-200 bg-blue-50/60"
                />

                <Form form={joinForm} layout="vertical" onFinish={handleJoinOrg} disabled={submitting} size="middle">
                  <Form.Item
                    name="organization_id"
                    label={<span className="font-semibold text-xs uppercase tracking-wider text-slate-700">Select Organization</span>}
                    rules={[{ required: true, message: 'Please select an organization from the list' }]}
                    initialValue={organizationsList[0]?.id || organizationsList[0]?.name}
                  >
                    <Select
                      id="join_org_select"
                      name="organization_id"
                      className="rounded-xl text-sm font-semibold"
                      popupClassName="auth-select-dropdown"
                      placeholder="Select an organization..."
                      loading={loadingStatus}
                      options={organizationsList.map((org) => ({
                        label: `${org.name}${org.owner_name ? ` (Owner: ${org.owner_name})` : ''}`,
                        value: org.id || org.name
                      }))}
                    />
                  </Form.Item>

                  <Form.Item
                    name="department"
                    label={<span className="font-semibold text-xs uppercase tracking-wider text-slate-700">Select Your Department</span>}
                    rules={[{ required: true, message: 'Please select or enter your department' }]}
                    initialValue={orgStatus?.existing_departments?.[0] || "General Team"}
                  >
                    <Select
                      id="join_dept"
                      name="department"
                      className="rounded-xl text-sm"
                      popupClassName="auth-select-dropdown"
                      options={Array.from(new Set([
                        ...(orgStatus?.existing_departments || []),
                        'Executive & Strategy', 'Engineering & Tech Lead', 'Operations & Governance',
                        'Backend Infrastructure', 'Frontend & Mobile Guild', 'DevOps & Cloud Systems',
                        'QA & Security Assurance', 'Product & Analytics', 'General Team'
                      ])).map(d => ({
                        label: d,
                        value: d
                      }))}
                    />
                  </Form.Item>

                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={submitting}
                    block
                    icon={<RightOutlined />}
                    className="font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white h-10 border-none shadow-sm transition-colors text-sm"
                  >
                    Request to Join
                  </Button>
                </Form>
              </div>
            )}
          </div>

        {/* Subtle Text Link at Bottom */}
        <div className="text-center pt-1">
          <Link
            to="/create-organization"
            className="text-xs text-slate-600 hover:text-slate-900 font-medium no-underline transition-colors"
          >
            New here? Become an Organizer with your own organization
          </Link>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-center items-center space-x-4">
          <Button
            type="link"
            icon={<LogoutOutlined />}
            onClick={logout}
            className="text-slate-600 hover:text-slate-900 font-medium text-xs"
          >
            Sign out of {user?.email}
          </Button>
        </div>

      </div>
    </div>
  </ConfigProvider>
  );
}
