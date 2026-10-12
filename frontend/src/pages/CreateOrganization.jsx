import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Logo } from '../components/Logo.jsx';
import { getErrorMessage } from '../utils/errorHandler.js';
import { Form, Input, Select, Button, Card, Alert, App, ConfigProvider, theme as antdTheme } from 'antd';
import {
  BankOutlined, PlusOutlined, CrownOutlined, ArrowLeftOutlined, LogoutOutlined
} from '@ant-design/icons';

export default function CreateOrganization() {
  const { user, createOrganization, logout } = useAuth();
  const { message } = App.useApp();
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [showDeptField, setShowDeptField] = useState(false);
  const [form] = Form.useForm();

  const handleCreateOrg = async (values) => {
    const trimmedName = (values.name || '').trim();
    if (!trimmedName) {
      form.setFields([{ name: 'name', errors: ['Organization name is required'] }]);
      return;
    }

    setSubmitting(true);
    try {
      const selectedDept = showDeptField && values.department ? values.department.trim() : 'Executive & Strategy';
      const res = await createOrganization({
        name: trimmedName,
        department: selectedDept
      });

      if (res.organization?.id) {
        localStorage.setItem('selected_org_id', res.organization.id);
      }

      message.success(res.message || `Organization "${trimmedName}" created successfully! You are now the Owner.`);
      
      // Redirect directly to dashboard for the newly created organization
      window.location.href = '/dashboard';
    } catch (err) {
      const errMsg = getErrorMessage(err, 'Failed to create organization.');
      message.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

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
          {/* Header Brand */}
          <div className="text-center space-y-2">
            <Logo variant="full" height={40} className="mx-auto" />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight m-0">
              Create Your Organization
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 m-0 max-w-md mx-auto">
              Establish a new organization workspace for your team. You will be assigned as the Founder & OWNER.
            </p>
          </div>

          {/* Main Card wrapped in light ConfigProvider to always stay pure white */}
          <div className="w-full bg-white shadow-xl shadow-slate-400/15 rounded-[24px] p-6 sm:p-7 border border-slate-100 auth-card">
            <div className="space-y-4">
              <Alert
                type="info"
                showIcon
                icon={<CrownOutlined className="text-amber-500 text-lg" />}
                message={<span className="font-bold text-sm text-slate-800">Organization Founder Status</span>}
                description={
                  <span className="text-xs text-slate-600">
                    As the creator of this organization, you will automatically receive the <strong>OWNER</strong> role with complete governance and administration permissions over your new workspace.
                  </span>
                }
                className="rounded-2xl border-amber-200 bg-amber-50/60"
              />

              <Form
                form={form}
                layout="vertical"
                onFinish={handleCreateOrg}
                disabled={submitting}
                size="middle"
                initialValues={{ department: 'Executive & Strategy' }}
              >
                <Form.Item
                  name="name"
                  label={<span className="font-semibold text-xs uppercase tracking-wider text-slate-700">Organization Name</span>}
                  rules={[
                    { required: true, message: 'Please enter organization name' },
                    { min: 3, message: 'Organization name must be at least 3 characters' },
                    { max: 150, message: 'Organization name cannot exceed 150 characters' }
                  ]}
                  className="mb-4"
                >
                  <Input
                    id="create_org_name"
                    name="name"
                    prefix={<BankOutlined className="text-slate-400 mr-2" />}
                    placeholder="e.g. Acme Innovations Corp"
                    className="rounded-xl border-slate-300 text-sm h-10"
                  />
                </Form.Item>

                {/* Collapsible Optional Department Selector */}
                <div className="mb-5">
                  <button
                    type="button"
                    onClick={() => setShowDeptField(!showDeptField)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer bg-transparent border-none p-0 focus:outline-none"
                  >
                    <span>{showDeptField ? '− Hide personal department' : '+ Add personal department (optional)'}</span>
                  </button>
                  {!showDeptField && (
                    <p className="text-[11.5px] text-slate-500 mt-1 m-0">
                      By default, your founder role covers all teams under <strong>Executive & Strategy</strong>.
                    </p>
                  )}
                </div>

                {showDeptField && (
                  <Form.Item
                    name="department"
                    label={<span className="font-semibold text-xs uppercase tracking-wider text-slate-700">Your Department (Optional)</span>}
                    className="mb-5"
                    extra={<span className="text-[11px] text-slate-500">Specify if you actively head a specific functional unit (e.g. Engineering, Product).</span>}
                  >
                    <Select
                      id="create_org_dept"
                      name="department"
                      className="rounded-xl text-sm"
                      popupClassName="auth-select-dropdown"
                      options={[
                        { label: 'Executive & Strategy', value: 'Executive & Strategy' },
                        { label: 'Engineering & Tech Lead', value: 'Engineering & Tech Lead' },
                        { label: 'Operations & Governance', value: 'Operations & Governance' },
                        { label: 'Backend Infrastructure', value: 'Backend Infrastructure' },
                        { label: 'Frontend & Mobile Guild', value: 'Frontend & Mobile Guild' },
                        { label: 'DevOps & Cloud Systems', value: 'DevOps & Cloud Systems' },
                        { label: 'QA & Security Assurance', value: 'QA & Security Assurance' },
                        { label: 'Product & Analytics', value: 'Product & Analytics' },
                        { label: 'General Team', value: 'General Team' }
                      ]}
                    />
                  </Form.Item>
                )}

                <Button
                  type="primary"
                  htmlType="submit"
                  loading={submitting}
                  block
                  icon={<PlusOutlined />}
                  className="font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white h-10 border-none shadow-sm transition-colors text-sm"
                >
                  Create Organization & Open Dashboard
                </Button>
              </Form>

              <div className="pt-2 text-center">
                <Link
                  to="/onboarding"
                  className="text-xs text-slate-600 hover:text-slate-900 font-medium inline-flex items-center gap-1.5 no-underline transition-colors"
                >
                  <ArrowLeftOutlined className="text-[10px]" />
                  <span>Already looking to join an organization? Request to Join</span>
                </Link>
              </div>

            </div>
          </div>

          {/* Footer sign out link */}
          {user && (
            <div className="text-center">
              <Button
                type="text"
                icon={<LogoutOutlined />}
                onClick={logout}
                className="text-slate-600 hover:text-slate-900 font-medium text-xs"
              >
                Sign out of {user.email}
              </Button>
            </div>
          )}

        </div>
      </div>
    </ConfigProvider>
  );
}
