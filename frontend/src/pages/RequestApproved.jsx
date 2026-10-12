import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Logo } from '../components/Logo.jsx';
import { organizationJoinRequestService } from '../services/api.js';
import { getErrorMessage } from '../utils/errorHandler.js';
import { Button, Card, Tag, App } from 'antd';
import { CheckCircleOutlined, BankOutlined, LogoutOutlined, RightOutlined } from '@ant-design/icons';

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
          
          {/* Success Icon Badge */}
          <div className="pt-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 text-3xl shadow-sm border border-emerald-200 dark:border-emerald-800/60 animate-bounce">
              <CheckCircleOutlined />
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight m-0 leading-tight">
            Congratulations! Your Request Has Been Approved!
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 m-0 max-w-md mx-auto leading-relaxed">
            Welcome to <strong>{orgName}</strong>! Your request to join the organization has been approved by an Administrator. You're all set to get started.
          </p>
        </div>

        {/* Approval Card */}
        <Card
          className="shadow-xl shadow-slate-200/50 dark:shadow-none rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 backdrop-blur-md overflow-hidden"
          styles={{ body: { padding: '24px' } }}
        >
          <div className="space-y-6 text-center">
            
            {/* Organization & Department Details Box */}
            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/40 text-left space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <BankOutlined className="text-emerald-600 dark:text-emerald-400 text-lg" />
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{orgName}</span>
                </div>
                <Tag color="emerald" className="font-bold uppercase tracking-wider text-[10px] px-2.5 py-0.5 rounded-full border-none">
                  Member Access Granted
                </Tag>
              </div>

              <div className="border-t border-emerald-200/50 dark:border-emerald-900/30 pt-3 flex flex-wrap items-center justify-between text-xs text-slate-600 dark:text-slate-400 gap-2">
                <div>
                  <span className="font-semibold text-slate-500">Department:</span>{' '}
                  <strong className="text-slate-800 dark:text-slate-200">{deptName}</strong>
                </div>
                {decision?.reviewed_by_name && (
                  <div>
                    <span className="font-semibold text-slate-500">Approved by:</span>{' '}
                    <strong className="text-slate-800 dark:text-slate-200">{decision.reviewed_by_name}</strong>
                  </div>
                )}
              </div>

              {decision?.review_notes && (
                <div className="text-xs text-slate-600 dark:text-slate-400 italic pt-1 border-t border-emerald-200/40 dark:border-emerald-900/30">
                  "{decision.review_notes}"
                </div>
              )}
            </div>

            {decision?.remaining_unacknowledged_count > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 m-0 font-medium">
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
                className="w-full font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 h-10 border-none shadow-sm transition-colors text-sm"
              >
                Continue to Dashboard
              </Button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium m-0">
              We're glad to have you on board.
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
