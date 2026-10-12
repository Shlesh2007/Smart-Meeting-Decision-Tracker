import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Logo } from '../components/Logo.jsx';
import { organizationJoinRequestService } from '../services/api.js';
import { getErrorMessage } from '../utils/errorHandler.js';
import { Button, Card, Tag, App, ConfigProvider, theme as antdTheme } from 'antd';
import { InfoCircleOutlined, BankOutlined, LogoutOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

export default function RequestRejected() {
  const { user, refreshUser, logout } = useAuth();
  const { message } = App.useApp();
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);

  const decision = user?.unacknowledged_decision;

  const handleExplore = async () => {
    setSubmitting(true);
    try {
      if (decision?.id) {
        await organizationJoinRequestService.acknowledgeRequest(decision.id);
      }
      await refreshUser();
      navigate('/onboarding', { replace: true });
    } catch (err) {
      message.error(getErrorMessage(err, 'Failed to confirm decision acknowledgement. Navigating to organization list...'));
      navigate('/onboarding', { replace: true });
    } finally {
      setSubmitting(false);
    }
  };

  const orgName = decision?.organization_name || 'the requested organization';
  const deptName = decision?.requested_department || 'General Team';

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
            
            {/* Neutral Info Icon Badge */}
            <div className="pt-2">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-200 text-slate-600 text-3xl shadow-sm border border-slate-300">
                <InfoCircleOutlined />
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight m-0 leading-tight">
              Update on Your Organization Request
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 m-0 max-w-md mx-auto leading-relaxed">
              Unfortunately, your request to join <strong>{orgName}</strong> was not approved.
            </p>
          </div>

          {/* Floating White Rejection Details Card */}
          <div className="w-full bg-white shadow-xl shadow-slate-400/15 rounded-[24px] p-6 sm:p-7 border border-slate-100 auth-card">
            <div className="space-y-6 text-center">
              
              {/* Details Box */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-100/90 border border-slate-200 text-left space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <BankOutlined className="text-slate-500 text-lg" />
                    <span className="font-bold text-sm text-slate-900">{orgName}</span>
                  </div>
                  <Tag color="default" className="font-semibold text-[10px] px-2.5 py-0.5 rounded-full border-slate-300 text-slate-600">
                    Request Decision Recorded
                  </Tag>
                </div>

                <div className="border-t border-slate-200 pt-3 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
                  <div>
                    <span className="font-semibold text-slate-500">Requested Department:</span>{' '}
                    <strong className="text-slate-800">{deptName}</strong>
                  </div>
                  {decision?.created_at && (
                    <div>
                      <span className="font-semibold text-slate-500">Submitted:</span>{' '}
                      <strong className="text-slate-800">{dayjs(decision.created_at).format('MMM DD, YYYY')}</strong>
                    </div>
                  )}
                </div>

                {/* Display Review Notes if provided by reviewer safely */}
                {decision?.review_notes && String(decision.review_notes).trim() ? (
                  <div className="border-t border-slate-200 pt-3 space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Reviewer Note:</span>
                    <p className="text-xs text-slate-700 m-0 bg-white p-3 rounded-xl border border-slate-200/80">
                      {decision.review_notes}
                    </p>
                  </div>
                ) : null}
              </div>

              {decision?.remaining_unacknowledged_count > 0 && (
                <p className="text-xs text-amber-600 m-0 font-medium">
                  Note: You have {decision.remaining_unacknowledged_count} additional decision update(s) to review after this.
                </p>
              )}

              {/* Primary Action Button */}
              <div className="pt-1">
                <Button
                  type="primary"
                  loading={submitting}
                  onClick={handleExplore}
                  icon={<SearchOutlined />}
                  className="w-full font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white h-10 border-none shadow-sm transition-colors text-sm"
                >
                  Explore Other Organizations
                </Button>
              </div>

              <p className="text-xs text-slate-500 font-medium m-0">
                You can request to join another organization or create your own workspace.
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
