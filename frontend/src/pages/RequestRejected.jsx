import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Logo } from '../components/Logo.jsx';
import { organizationJoinRequestService } from '../services/api.js';
import { getErrorMessage } from '../utils/errorHandler.js';
import { Button, Card, Tag, App } from 'antd';
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
    <div className="min-h-screen bg-slate-50 dark:bg-[#080f1f] text-slate-900 dark:text-[#f8fafc] flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden transition-colors selection:bg-[#2563eb] selection:text-white">
      {/* Fullscreen Fixed Background Image */}
      <div className="fixed inset-0 pointer-events-none select-none z-0 overflow-hidden">
        <img
          src="/background-img.png"
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover object-center pointer-events-none select-none brightness-[1.05]"
        />
      </div>

      <div className="relative z-10 w-full max-w-xl space-y-6 my-auto py-4">
        
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <Logo variant="full" height={40} className="mx-auto" />
          
          {/* Neutral Info Icon Badge */}
          <div className="pt-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-3xl shadow-sm border border-slate-300 dark:border-slate-700">
              <InfoCircleOutlined />
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight m-0 leading-tight">
            Update on Your Organization Request
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 m-0 max-w-md mx-auto leading-relaxed">
            Unfortunately, your request to join <strong>{orgName}</strong> was not approved.
          </p>
        </div>

        {/* Rejection Details Card */}
        <Card
          className="shadow-xl shadow-slate-200/50 dark:shadow-none rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 backdrop-blur-md overflow-hidden"
          styles={{ body: { padding: '24px' } }}
        >
          <div className="space-y-6 text-center">
            
            {/* Details Box */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 text-left space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <BankOutlined className="text-slate-500 dark:text-slate-400 text-lg" />
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{orgName}</span>
                </div>
                <Tag color="default" className="font-semibold text-[10px] px-2.5 py-0.5 rounded-full border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                  Request Decision Recorded
                </Tag>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700/60 pt-3 flex flex-wrap items-center justify-between text-xs text-slate-600 dark:text-slate-400 gap-2">
                <div>
                  <span className="font-semibold text-slate-500">Requested Department:</span>{' '}
                  <strong className="text-slate-800 dark:text-slate-200">{deptName}</strong>
                </div>
                {decision?.created_at && (
                  <div>
                    <span className="font-semibold text-slate-500">Submitted:</span>{' '}
                    <strong className="text-slate-800 dark:text-slate-200">{dayjs(decision.created_at).format('MMM DD, YYYY')}</strong>
                  </div>
                )}
              </div>

              {/* Display Review Notes if provided by reviewer safely */}
              {decision?.review_notes && String(decision.review_notes).trim() ? (
                <div className="border-t border-slate-200 dark:border-slate-700/60 pt-3 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Reviewer Note:</span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 m-0 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                    {decision.review_notes}
                  </p>
                </div>
              ) : null}
            </div>

            {decision?.remaining_unacknowledged_count > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 m-0 font-medium">
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
                className="w-full font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 h-10 border-none shadow-sm transition-colors text-sm"
              >
                Explore Other Organizations
              </Button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium m-0">
              You can request to join another organization or create your own workspace.
            </p>

          </div>
        </Card>

        {/* Footer Actions */}
        {user?.email && (
          <div className="text-center">
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={logout}
              className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white font-medium text-xs"
            >
              Sign out of {user.email}
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}
