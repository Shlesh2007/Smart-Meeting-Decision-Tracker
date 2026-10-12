import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Logo } from '../components/Logo.jsx';
import { getErrorMessage } from '../utils/errorHandler.js';
import { authService } from '../services/api.js';
import { Form, Input, Select, Button, Card, Alert, App, ConfigProvider, theme as antdTheme } from 'antd';
import {
  BankOutlined, UsergroupAddOutlined, PlusOutlined,
  CheckCircleOutlined, RightOutlined, LogoutOutlined, InfoCircleOutlined
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
              You do not currently belong to an active organization workspace. Select an existing organization to request access or create your own.
            </p>
          </div>

          {/* Live Confirmation Banner after submitting request */}
          {confirmationMessage && (
            <Alert
              type="info"
              showIcon
              icon={<CheckCircleOutlined className="text-blue-600 text-lg" />}
              message={<span className="font-bold text-sm text-blue-900">Request Submitted</span>}
              description={<span className="text-xs text-blue-800">{confirmationMessage}</span>}
              className="rounded-2xl border-blue-200 bg-blue-50/90 shadow-sm"
            />
          )}

          {/* Live System Organization Status Banner */}
          {!loadingStatus && orgStatus && (
            <div className="w-full space-y-3">
              {orgStatus.user_pending_request && (
                <Alert
                  type="warning"
                  showIcon
                  icon={<InfoCircleOutlined className="text-amber-600 text-lg" />}
                  message={<span className="font-bold text-sm text-amber-900">⏳ Join Request Pending Review</span>}
                  description={
                    <div className="text-xs space-y-1 text-amber-800">
                      <p className="m-0">
                        Your request to join <strong>{orgStatus.user_pending_request.organization_name}</strong> (Department: <strong>{orgStatus.user_pending_request.requested_department}</strong>) has been submitted.
                      </p>
                      <p className="m-0 font-semibold">
                        You will receive an email notification once your request is reviewed and accepted by an Administrator or Owner.
                      </p>
                    </div>
                  }
                  className="rounded-2xl border-amber-300 bg-amber-50/90 shadow-sm"
                />
              )}
            </div>
          )}

          {/* Main Onboarding Card wrapped in light ConfigProvider to always stay pure white */}
          <div className="w-full bg-white shadow-xl shadow-slate-400/15 rounded-[24px] p-6 sm:p-7 border border-slate-100 auth-card">
            <div className="pt-1 space-y-4">
              <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
                <UsergroupAddOutlined className="text-blue-500 text-lg" />
                <h2 className="text-base font-bold text-slate-800 m-0">
                  Request an Organization to Join
                </h2>
              </div>

              {orgStatus?.user_pending_request ? (
                <div className="p-5 bg-amber-50/90 rounded-2xl border border-amber-200 space-y-3 text-center">
                  <InfoCircleOutlined className="text-3xl text-amber-600" />
                  <div>
                    <h3 className="text-base font-bold text-amber-900 m-0">Join Request Under Review</h3>
                    <p className="text-xs text-amber-800 mt-1 m-0">
                      Your request to join <strong>{orgStatus.user_pending_request.organization_name}</strong> was submitted on {dayjs(orgStatus.user_pending_request.created_at).format('MMM DD, YYYY')}.
                    </p>
                  </div>
                  <Alert
                    type="info"
                    message={<span className="text-blue-900 font-semibold">What happens next?</span>}
                    description={<span className="text-blue-800">An Organization Owner or Administrator will review your request. You will receive an email notification once accepted.</span>}
                    className="text-left text-xs rounded-xl bg-blue-50/80 border-blue-200"
                  />
                </div>
              ) : !hasEligibleOrgs && !loadingStatus ? (
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
              ) : (
                <>
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
                </>
              )}
            </div>
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
