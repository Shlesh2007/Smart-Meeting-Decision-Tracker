'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext.jsx';
import { authService } from '../../services/api.js';
import { Form, Input, Button, Card, message, Typography, Modal, Divider, Steps } from 'antd';
import {
  UserOutlined, LockOutlined, ThunderboltOutlined, InfoCircleOutlined,
  GoogleOutlined, GithubOutlined, MailOutlined, SafetyCertificateOutlined, CheckCircleOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

export default function LoginPage() {
  const { login, refreshUser } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(null);

  // OTP Password Reset Wizard States
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [resetStep, setResetStep] = useState(0); // 0: Request OTP, 1: Verify OTP, 2: New Password, 3: Success
  const [resetEmail, setResetEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  
  const [requestOtpForm] = Form.useForm();
  const [verifyOtpForm] = Form.useForm();
  const [newPasswordForm] = Form.useForm();

  const onFinish = async (values) => {
    setSubmitting(true);
    try {
      await login(values);
      message.success('Logged in successfully!');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Invalid username or password.';
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const processedOAuthRef = React.useRef(false);

  // Auto-handle OAuth Callbacks on Page Load
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (processedOAuthRef.current) return;

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const hash = window.location.hash;

    if (code) {
      processedOAuthRef.current = true;
      // Strip single-use code from URL immediately to prevent duplicate code submissions on re-renders
      window.history.replaceState({}, document.title, window.location.pathname);

      setOauthLoading('github');
      authService.loginWithGithub({ code })
        .then(async (data) => {
          await refreshUser();
          message.success(data.message || 'Logged in with GitHub successfully!');
          router.push('/dashboard');
        })
        .catch((err) => {
          const errMsg = err.response?.data?.error || 'GitHub authentication failed.';
          message.error(errMsg);
          setOauthLoading(null);
        });
    } else if (hash && hash.includes('access_token')) {
      processedOAuthRef.current = true;
      // Strip access_token hash from URL immediately to prevent duplicate submissions
      window.history.replaceState({}, document.title, window.location.pathname);

      const hashParams = new URLSearchParams(hash.replace('#', '?'));
      const token = hashParams.get('access_token') || hashParams.get('id_token');
      if (token) {
        setOauthLoading('google');
        authService.loginWithGoogle({ credential: token })
          .then(async (data) => {
            await refreshUser();
            message.success(data.message || 'Logged in with Google successfully!');
            router.push('/dashboard');
          })
          .catch((err) => {
            const errMsg = err.response?.data?.error || 'Google authentication failed.';
            message.error(errMsg);
            setOauthLoading(null);
          });
      }
    }
  }, [router, refreshUser]);

  // Direct Google OAuth Login Handler - Launches Real Google Consent Screen
  const handleGoogleOAuth = () => {
    setOauthLoading('google');
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '1051715789667-m86kur6hnaciip8cp4ghoq08eeso6et3.apps.googleusercontent.com';
    const redirectUri = encodeURIComponent(`${window.location.origin}/login`);
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=email%20profile&prompt=select_account`;
    window.location.href = googleAuthUrl;
  };

  // Direct GitHub OAuth Login Handler - Launches Real GitHub Authorization
  const handleGithubOAuth = () => {
    setOauthLoading('github');
    const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || 'Ov23li85R8iyZCz0Yn3h';
    const redirectUri = encodeURIComponent(`${window.location.origin}/login`);
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user:email&prompt=consent`;
    window.location.href = githubAuthUrl;
  };

  // Step 1: Request OTP
  const handleRequestOTP = async (values) => {
    setOtpLoading(true);
    try {
      const res = await authService.requestResetOTP(values.account);
      setResetEmail(res.email || values.account);
      message.success(res.message || 'OTP code sent to your email!');
      setResetStep(1);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to send OTP code.';
      message.error(msg);
    } finally {
      setOtpLoading(false);
    }
  };

  // Step 2: Verify OTP Code
  const handleVerifyOTP = async (values) => {
    setOtpLoading(true);
    try {
      const res = await authService.verifyResetOTP(resetEmail, values.otp_code);
      setOtpCode(values.otp_code);
      message.success(res.message || 'OTP verified successfully!');
      setResetStep(2);
    } catch (err) {
      const msg = err.response?.data?.error || 'Invalid or expired OTP code.';
      message.error(msg);
    } finally {
      setOtpLoading(false);
    }
  };

  // Step 3: Set New Password
  const handleConfirmNewPassword = async (values) => {
    if (values.new_password !== values.confirm_password) {
      message.error('Passwords do not match.');
      return;
    }
    setOtpLoading(true);
    try {
      const res = await authService.confirmPasswordReset(resetEmail, otpCode, values.new_password);
      message.success(res.message || 'Password reset successfully!');
      setResetStep(3);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to reset password.';
      message.error(msg);
    } finally {
      setOtpLoading(false);
    }
  };

  const closeResetModal = () => {
    setIsForgotModalOpen(false);
    setResetStep(0);
    setResetEmail('');
    setOtpCode('');
    requestOtpForm.resetFields();
    verifyOtpForm.resetFields();
    newPasswordForm.resetFields();
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center py-4 sm:py-12 px-3 sm:px-6 lg:px-8 w-full max-w-md mx-auto">
      <div className="w-full text-center mb-6 px-2">
        <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center mx-auto text-2xl shadow-lg mb-3">
          <ThunderboltOutlined />
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight m-0">
          Sign In to Your Account
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-1.5 m-0 leading-relaxed">
          Manage meetings, record decisions & track follow-up dependencies
        </p>
      </div>

      <Card className="w-full max-w-full shadow-xs rounded-2xl border border-slate-200/80 dark:border-slate-700/80 dark:bg-slate-800" styles={{ body: { padding: '16px' } }}>
        <Form
          name="login_form"
          layout="vertical"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: 'Please enter your username!' }]}
          >
            <Input prefix={<UserOutlined className="text-gray-400" />} placeholder="e.g. admin or john_doe" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Please enter your password!' }]}
            className="mb-1"
          >
            <Input.Password prefix={<LockOutlined className="text-gray-400" />} placeholder="••••••••" />
          </Form.Item>

          <div className="text-right mb-5">
            <button
              type="button"
              onClick={() => {
                closeResetModal();
                setIsForgotModalOpen(true);
              }}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-500 focus:outline-none cursor-pointer bg-transparent border-0 p-0"
            >
              Forgot password?
            </button>
          </div>

          <Form.Item className="mt-4 mb-2">
            <Button type="primary" htmlType="submit" loading={submitting} block className="font-semibold bg-blue-600 hover:bg-blue-700 rounded-xl border-none">
              Sign In
            </Button>
          </Form.Item>
        </Form>

        {/* OAuth 2.0 Buttons */}
        <Divider className="my-4 text-xs text-gray-400">Or continue with</Divider>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-2">
          <Button
            icon={<GoogleOutlined className="text-red-500" />}
            onClick={handleGoogleOAuth}
            loading={oauthLoading === 'google'}
            block
            className="flex items-center justify-center font-medium border-gray-200 dark:border-slate-700 hover:border-gray-300 rounded-xl"
          >
            Google
          </Button>
          <Button
            icon={<GithubOutlined className="text-gray-800 dark:text-white" />}
            onClick={handleGithubOAuth}
            loading={oauthLoading === 'github'}
            block
            className="flex items-center justify-center font-medium border-gray-200 dark:border-slate-700 hover:border-gray-300 rounded-xl"
          >
            GitHub
          </Button>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 text-center text-sm text-slate-600 dark:text-slate-400">
          Don't have an account?{' '}
          <Link href="/register" className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-500 no-underline">
            Register now
          </Link>
        </div>
      </Card>

      {/* 3-Step OTP Password Reset Modal */}
      <Modal
        title="Reset Password via OTP"
        open={isForgotModalOpen}
        onCancel={closeResetModal}
        footer={null}
        destroyOnClose
        width={500}
      >
        <div className="py-2">
          <Steps
            size="small"
            current={resetStep}
            className="mb-6"
            items={[
              { title: 'Request OTP' },
              { title: 'Verify OTP' },
              { title: 'New Password' },
            ]}
          />

          {/* STEP 0: Request OTP */}
          {resetStep === 0 && (
            <Form form={requestOtpForm} layout="vertical" onFinish={handleRequestOTP}>
              <p className="text-sm text-gray-600 mb-4">
                Enter your registered username or email address below to receive a 6-digit OTP verification code.
              </p>
              <Form.Item
                name="account"
                label="Username or Email Address"
                rules={[{ required: true, message: 'Please enter your username or email!' }]}
              >
                <Input prefix={<MailOutlined className="text-gray-400" />} placeholder="e.g. user@example.com or john_doe" />
              </Form.Item>
              <div className="flex justify-end space-x-2 mt-6">
                <Button onClick={closeResetModal}>Cancel</Button>
                <Button type="primary" htmlType="submit" loading={otpLoading} className="bg-blue-600 hover:bg-blue-700 font-semibold rounded-xl border-none">
                  Send OTP Code
                </Button>
              </div>
            </Form>
          )}

          {/* STEP 1: Verify OTP */}
          {resetStep === 1 && (
            <Form form={verifyOtpForm} layout="vertical" onFinish={handleVerifyOTP}>
              <div className="bg-blue-50 dark:bg-slate-800 p-3 rounded-lg border border-blue-100 dark:border-slate-700 mb-4">
                <p className="text-xs text-blue-700 dark:text-blue-300 m-0">
                  A 6-digit OTP code was sent to <strong>{resetEmail}</strong>. (In local development, check your backend server terminal log).
                </p>
              </div>

              <Form.Item
                name="otp_code"
                label="Enter 6-Digit Verification Code (OTP)"
                rules={[
                  { required: true, message: 'Please enter the 6-digit OTP code!' },
                  { len: 6, message: 'OTP code must be exactly 6 digits.' }
                ]}
              >
                <Input
                  prefix={<SafetyCertificateOutlined className="text-gray-400" />}
                  placeholder="123456"
                  maxLength={6}
                  className="text-center text-lg tracking-widest font-mono"
                />
              </Form.Item>

              <div className="flex justify-between items-center mt-6">
                <Button type="link" onClick={() => setResetStep(0)} className="p-0 text-xs text-blue-600 dark:text-blue-400">
                  Change Email
                </Button>
                <div className="space-x-2">
                  <Button onClick={closeResetModal}>Cancel</Button>
                  <Button type="primary" htmlType="submit" loading={otpLoading} className="bg-blue-600 hover:bg-blue-700 font-semibold rounded-xl border-none">
                    Verify Code
                  </Button>
                </div>
              </div>
            </Form>
          )}

          {/* STEP 2: Set New Password */}
          {resetStep === 2 && (
            <Form form={newPasswordForm} layout="vertical" onFinish={handleConfirmNewPassword}>
              <p className="text-sm text-gray-600 dark:text-slate-300 mb-4">
                OTP verified! Please enter your new password below.
              </p>

              <Form.Item
                name="new_password"
                label="New Password"
                rules={[
                  { required: true, message: 'Please enter your new password!' },
                  { min: 6, message: 'Password must be at least 6 characters.' }
                ]}
              >
                <Input.Password prefix={<LockOutlined className="text-gray-400" />} placeholder="••••••••" />
              </Form.Item>

              <Form.Item
                name="confirm_password"
                label="Confirm New Password"
                rules={[{ required: true, message: 'Please confirm your new password!' }]}
              >
                <Input.Password prefix={<LockOutlined className="text-gray-400" />} placeholder="••••••••" />
              </Form.Item>

              <div className="flex justify-end space-x-2 mt-6">
                <Button onClick={closeResetModal}>Cancel</Button>
                <Button type="primary" htmlType="submit" loading={otpLoading} className="bg-blue-600 hover:bg-blue-700 font-semibold rounded-xl border-none">
                  Update Password
                </Button>
              </div>
            </Form>
          )}

          {/* STEP 3: Success Screen */}
          {resetStep === 3 && (
            <div className="py-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto text-2xl">
                <CheckCircleOutlined />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-base m-0">Password Reset Complete!</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 m-0 max-w-xs mx-auto">
                Your password has been updated successfully. You can now sign in with your new password.
              </p>
              <div className="pt-3">
                <Button type="primary" onClick={closeResetModal} className="bg-blue-600 hover:bg-blue-700 font-semibold rounded-xl border-none px-6">
                  Sign In Now
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}




