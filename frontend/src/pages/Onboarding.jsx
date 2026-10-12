import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Logo } from '../components/Logo.jsx';
import { getErrorMessage } from '../utils/errorHandler.js';
import { authService } from '../services/api.js';
import { Form, Input, Select, Button, Card, Alert, App } from 'antd';
import {
  BankOutlined, UsergroupAddOutlined, PlusOutlined,
  CheckCircleOutlined, RightOutlined, LogoutOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

export default function Onboarding() {
  const { user, joinOrganization, logout } = useAuth();
  const { message } = App.useApp();
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [orgStatus, setOrgStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [joinForm] = Form.useForm();

  const fetchOrgStatus = () => {
    setLoadingStatus(true);
    authService.getOrganizationStatus()
      .then((data) => {
        setOrgStatus(data);
      })
      .catch((err) => {
        console.warn("Failed to fetch organization status:", err);
      })
      .finally(() => setLoadingStatus(false));
  };

  useEffect(() => {
    fetchOrgStatus();
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
    <div className="min-h-screen bg-slate-50 dark:bg-[#080f1f] text-slate-900 dark:text-[#f8fafc] flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-x-hidden overflow-y-auto transition-colors selection:bg-[#2563eb] selection:text-white">
      {/* Fullscreen Fixed Background Image */}
      <div className="fixed inset-0 pointer-events-none select-none z-0 overflow-hidden bg-[#eff6ff] dark:bg-[#080f1f]">
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
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#eff6ff]/50 to-[#eff6ff]/80 dark:via-[#080f1f]/60 dark:to-[#080f1f]/90" />
        </div>
      </div>

      <div className="relative z-10 w-full max-w-xl space-y-6 my-auto py-6 sm:py-8">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Logo variant="full" height={40} className="mx-auto" />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight m-0">
            Welcome, {user?.first_name || user?.full_name || user?.username}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 m-0 max-w-md mx-auto">
            You do not currently belong to an active organization workspace. Select an existing organization to request access or create your own.
          </p>
        </div>

        {/* Live Confirmation Banner after submitting request */}
        {confirmationMessage && (
          <Alert
            type="info"
            showIcon
            icon={<CheckCircleOutlined className="text-blue-600 text-lg" />}
            message={<span className="font-bold text-sm text-blue-900 dark:text-blue-200">Request Submitted</span>}
            description={<span className="text-xs text-blue-800 dark:text-blue-300">{confirmationMessage}</span>}
            className="rounded-2xl border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-950/40 shadow-sm"
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
                message={<span className="font-bold text-sm text-amber-900 dark:text-amber-300">⏳ Join Request Pending Review</span>}
                description={
                  <div className="text-xs space-y-1 text-amber-800 dark:text-amber-400">
                    <p className="m-0">
                      Your request to join <strong>{orgStatus.user_pending_request.organization_name}</strong> (Department: <strong>{orgStatus.user_pending_request.requested_department}</strong>) has been submitted.
                    </p>
                    <p className="m-0 font-semibold">
                      You will receive an email notification once your request is reviewed and accepted by an Administrator or Owner.
                    </p>
                  </div>
                }
                className="rounded-2xl border-amber-300 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 shadow-sm"
              />
            )}
          </div>
        )}

        {/* Main Onboarding Card */}
        <Card
          className="shadow-xl shadow-slate-200/50 dark:shadow-none rounded-2xl border border-white/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl overflow-hidden"
          styles={{ body: { padding: '24px' } }}
        >
          <div className="pt-1 space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <UsergroupAddOutlined className="text-blue-500 text-lg" />
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-200 m-0">
                Request an Organization to Join
              </h2>
            </div>

            {orgStatus?.user_pending_request ? (
              <div className="p-4 bg-amber-50/80 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-900/50 space-y-3 text-center">
                <InfoCircleOutlined className="text-3xl text-amber-600 dark:text-amber-400" />
                <div>
                  <h3 className="text-base font-bold text-amber-900 dark:text-amber-200 m-0">Join Request Under Review</h3>
                  <p className="text-xs text-amber-800 dark:text-amber-400 mt-1 m-0">
                    Your request to join <strong>{orgStatus.user_pending_request.organization_name}</strong> was submitted on {dayjs(orgStatus.user_pending_request.created_at).format('MMM DD, YYYY')}.
                  </p>
                </div>
                <Alert
                  type="info"
                  message="What happens next?"
                  description="An Organization Owner or Administrator will review your request. You will receive an email notification once accepted."
                  className="text-left text-xs rounded-xl"
                />
              </div>
            ) : !hasEligibleOrgs && !loadingStatus ? (
              <div className="text-center py-6 space-y-3">
                <BankOutlined className="text-4xl text-slate-300 dark:text-slate-600" />
                <div>
                  <p className="font-bold text-sm text-slate-700 dark:text-slate-300 m-0">No Organizations Available to Join</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 m-0">
                    There are currently no organizations in the database to join. You can create a new organization below.
                  </p>
                </div>
                <Button
                  type="primary"
                  onClick={() => navigate('/create-organization')}
                  icon={<PlusOutlined />}
                  className="font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 h-10 border-none shadow-sm transition-colors text-sm"
                >
                  Create New Organization
                </Button>
              </div>
            ) : (
              <>
                <Alert
                  type="info"
                  showIcon
                  icon={<CheckCircleOutlined className="text-blue-600 dark:text-blue-400" />}
                  message={<span className="font-semibold text-xs sm:text-sm">Select an Organization to Join</span>}
                  description={<span className="text-xs">Choose an existing organization from the database and select your department. An Organization Owner or Admin must approve your join request.</span>}
                  className="rounded-2xl border-blue-200 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-950/20"
                />

                <Form form={joinForm} layout="vertical" onFinish={handleJoinOrg} disabled={submitting} size="middle">
                  <Form.Item
                    name="organization_id"
                    label={<span className="font-semibold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">Select Organization</span>}
                    rules={[{ required: true, message: 'Please select an organization from the list' }]}
                    initialValue={organizationsList[0]?.id || organizationsList[0]?.name}
                  >
                    <Select
                      id="join_org_select"
                      name="organization_id"
                      className="rounded-xl text-sm font-semibold"
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
                    label={<span className="font-semibold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">Select Your Department</span>}
                    initialValue={orgStatus?.existing_departments?.[0] || "General Team"}
                  >
                    <Select
                      id="join_dept"
                      name="department"
                      className="rounded-xl text-sm"
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
                    className="font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 h-10 border-none shadow-sm transition-colors text-sm"
                  >
                    Request to Join
                  </Button>
                </Form>
              </>
            )}
          </div>
        </Card>

        {/* Subtle Text Link at Bottom */}
        <div className="text-center pt-1">
          <Link
            to="/create-organization"
            className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white font-medium no-underline transition-colors"
          >
            New here? Become an Organizer with your own organization
          </Link>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-center items-center space-x-4">
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={logout}
            className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white font-medium text-xs"
          >
            Sign out of {user?.email}
          </Button>
        </div>

      </div>
    </div>
  );
}
