import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Logo } from '../components/Logo.jsx';
import { organizationJoinRequestService } from '../services/api.js';
import { getErrorMessage } from '../utils/errorHandler.js';
import { Button, Card, Tag, App, ConfigProvider, theme as antdTheme } from 'antd';
import { CheckOutlined, BankOutlined, LogoutOutlined, RightOutlined } from '@ant-design/icons';

export default function RequestApproved() {
  const { user, refreshUser, logout } = useAuth();
  const { message } = App.useApp();
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);

  const decision = user?.unacknowledged_decision;

  const handleContinue = async () => {
    setSubmitting(true);
    try {
      if (decision?.id) {
        await organizationJoinRequestService.acknowledgeRequest(decision.id);
      }
      if (decision?.organization_id) {
        localStorage.setItem('selected_org_id', decision.organization_id);
      }
      await refreshUser();
      message.success(`Welcome to ${decision?.organization_name || user?.organization_name || 'your workspace'}!`);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      message.error(getErrorMessage(err, 'Failed to confirm decision acknowledgement. Navigating to dashboard...'));
      navigate('/dashboard', { replace: true });
    } finally {
      setSubmitting(false);
    }
  };

  const orgName = decision?.organization_name || user?.organization_name || 'SmartMeeting Workspace';
  const deptName = decision?.requested_department || user?.department || 'General Team';

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
          <div className="text-center space-y-3">
            <Logo variant="full" height={40} className="mx-auto" />
            
            {/* Success Icon Badge */}
            <div className="pt-2">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 text-3xl shadow-sm border border-emerald-200">
                <CheckOutlined />
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight m-0 leading-tight">
              Congratulations! Your Request Has Been Approved!
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 m-0 max-w-md mx-auto leading-relaxed">
              Welcome to <strong>{orgName}</strong>! Your request to join the organization has been approved by an Administrator. You're all set to get started.
            </p>
          </div>

          {/* Floating White Approval Card */}
          <div className="w-full bg-white shadow-xl shadow-slate-400/15 rounded-[24px] p-6 sm:p-7 border border-slate-100 auth-card">
            <div className="space-y-6 text-center">
              
              {/* Organization & Department Details Box */}
              <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-left space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <BankOutlined className="text-emerald-600 text-lg" />
                    <span className="font-bold text-sm text-slate-900">{orgName}</span>
                  </div>
                  <Tag color="emerald" className="font-bold uppercase tracking-wider text-[10px] px-2.5 py-0.5 rounded-full border-none bg-emerald-600 text-white">
                    Member Access Granted
                  </Tag>
                </div>

                <div className="border-t border-emerald-200/80 pt-3 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
                  <div>
                    <span className="font-semibold text-slate-500">Department:</span>{' '}
                    <strong className="text-slate-800">{deptName}</strong>
                  </div>
                  {decision?.reviewed_by_name && (
                    <div>
                      <span className="font-semibold text-slate-500">Approved by:</span>{' '}
                      <strong className="text-slate-800">{decision.reviewed_by_name}</strong>
                    </div>
                  )}
                </div>

                {decision?.review_notes && (
                  <div className="text-xs text-slate-600 italic pt-1 border-t border-emerald-200/80">
                    "{decision.review_notes}"
                  </div>
                )}
              </div>

              {decision?.remaining_unacknowledged_count > 0 && (
                <p className="text-xs text-amber-600 m-0 font-medium">
                  Note: You have {decision.remaining_unacknowledged_count} additional update(s) to review after this.
                </p>
              )}

              {/* Primary Action Button */}
              <div className="pt-1">
                <Button
                  type="primary"
                  loading={submitting}
                  onClick={handleContinue}
                  icon={<RightOutlined />}
                  className="w-full font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white h-10 border-none shadow-sm transition-colors text-sm"
                >
                  Continue to Dashboard
                </Button>
              </div>

              <p className="text-xs text-slate-500 font-medium m-0">
                We're glad to have you on board.
              </p>

            </div>
          </div>

          {/* Footer Actions */}
          {user?.email && (
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
