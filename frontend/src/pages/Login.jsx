import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { authService } from '../services/api.js';
import { Logo } from '../components/Logo.jsx';
import { getErrorMessage } from '../utils/errorHandler.js';
import { Form, Input, Button, Card, Typography, Modal, Divider, Steps, Alert, Tag, App, ConfigProvider, theme as antdTheme } from 'antd';
import {
  UserOutlined, LockOutlined,
  GoogleOutlined, GithubOutlined, MailOutlined, SafetyCertificateOutlined,
  CheckCircleOutlined, SyncOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

export default function Login() {
  const { message } = App.useApp();
  const { login, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(null);
  const passwordInputRef = useRef(null);

  // OTP Password Reset Wizard States
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [resetStep, setResetStep] = useState(0);
  const [resetEmail, setResetEmail] = useState('');
  const [resetUsername, setResetUsername] = useState('');
  const [resetFullName, setResetFullName] = useState('');
  const [resetUserRole, setResetUserRole] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  const [previewUser, setPreviewUser] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const lookupTimerRef = useRef(null);

  const handleAccountInputChange = (e) => {
    const val = (e.target.value || '').trim();
    if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current);

    if (!val) {
      setPreviewUser(null);
      setLookupLoading(false);
      return;
    }

    setLookupLoading(true);
    lookupTimerRef.current = setTimeout(async () => {
      try {
        const res = await authService.lookupAccount(val);
        if (res && res.found) {
          setPreviewUser(res);
          setResetEmail(res.email);
          setResetUsername(res.username);
          setResetFullName(res.full_name);
          setResetUserRole(res.role);
        } else {
          setPreviewUser(null);
        }
      } catch {
        setPreviewUser(null);
      } finally {
        setLookupLoading(false);
      }
    }, 250);
  };
  
  const [loginForm] = Form.useForm();
  const [requestOtpForm] = Form.useForm();
  const [verifyOtpForm] = Form.useForm();
  const [newPasswordForm] = Form.useForm();

  useEffect(() => {
    loginForm.resetFields();
    if (typeof window !== 'undefined') {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
  }, [loginForm]);

  const handleLoginValuesChange = (changedValues, allValues) => {
    const rawUsername = allValues.username ?? '';
    const rawPassword = allValues.password ?? '';

    // Clear server "Invalid..." error as soon as user modifies any field
    const passwordErrors = loginForm.getFieldError('password') || [];
    if (passwordErrors.some((e) => e.includes('Invalid username or password'))) {
      loginForm.setFields([{ name: 'password', errors: [] }]);
    }

    // Live validation: show field error if user clears username or password while typing
    if ('username' in changedValues && !rawUsername.trim()) {
      loginForm.setFields([{ name: 'username', errors: ['Please enter username'] }]);
    }
    if ('password' in changedValues && !rawPassword) {
      loginForm.setFields([{ name: 'password', errors: ['Please enter password'] }]);
    }
  };

  const onFinish = async (values) => {
    setSubmitting(true);
    try {
      const userProfile = await login(values);
      message.success(`Welcome back, ${userProfile?.full_name || values.username}!`);
      navigate('/dashboard');
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Invalid username or password. Please try again.');
      
      const resData = err.response?.data;
      if (resData && typeof resData === 'object' && !Array.isArray(resData) && !resData.detail && !resData.error && !resData.message) {
        const fieldErrors = [];
        if (resData.username) {
          const msg = Array.isArray(resData.username) ? resData.username.join(', ') : String(resData.username);
          fieldErrors.push({ name: 'username', errors: [msg] });
        }
        if (resData.password) {
          const msg = Array.isArray(resData.password) ? resData.password.join(', ') : String(resData.password);
          fieldErrors.push({ name: 'password', errors: [msg] });
        }
        if (fieldErrors.length > 0) {
          loginForm.setFields(fieldErrors);
          return;
        }
      }

      // Set red colored error text directly below password input using Ant Design native form field errors
      loginForm.setFields([
        {
          name: 'password',
          errors: [errorMsg],
        },
      ]);
    } finally {
      setSubmitting(false);
    }
  };

  const processedOAuthRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (processedOAuthRef.current) return;

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const hash = window.location.hash;

    if (code) {
      processedOAuthRef.current = true;
      window.history.replaceState({}, document.title, window.location.pathname);

      setOauthLoading('github');
      authService.loginWithGithub({ code })
        .then(async (data) => {
          await refreshUser();
          message.success(data.message || 'Logged in with GitHub successfully!');
          navigate('/dashboard');
        })
        .catch((err) => {
          message.error(getErrorMessage(err, 'GitHub authentication failed.'));
          setOauthLoading(null);
        });
    } else if (hash && hash.includes('access_token')) {
      processedOAuthRef.current = true;
      window.history.replaceState({}, document.title, window.location.pathname);

      const hashParams = new URLSearchParams(hash.replace('#', '?'));
      const token = hashParams.get('access_token') || hashParams.get('id_token');
      const expiresIn = hashParams.get('expires_in');
      const refreshToken = hashParams.get('refresh_token');

      if (token) {
        setOauthLoading('google');
        authService.loginWithGoogle({
          credential: token,
          access_token: token,
          expires_in: expiresIn,
          refresh_token: refreshToken
        })
          .then(async (data) => {
            await refreshUser();
            message.success(data.message || 'Logged in with Google successfully!');
            navigate('/dashboard');
          })
          .catch((err) => {
            message.error(getErrorMessage(err, 'Google authentication failed.'));
            setOauthLoading(null);
          });
      }
    }
  }, [navigate, refreshUser]);

  const handleGoogleOAuth = () => {
    setOauthLoading('google');
    const clientId = (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_GOOGLE_CLIENT_ID || import.meta.env?.NEXT_PUBLIC_GOOGLE_CLIENT_ID)) || '1051715789667-m86kur6hnaciip8cp4ghoq08eeso6et3.apps.googleusercontent.com';
    const envRedirect = (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_GOOGLE_REDIRECT_URI || import.meta.env?.NEXT_PUBLIC_GOOGLE_REDIRECT_URI)) || '';
    const rawRedirect = envRedirect || `${window.location.origin}/login`;
    const redirectUri = encodeURIComponent(rawRedirect);
    console.log(`🔑 Initiating Google OAuth with redirect_uri: ${rawRedirect}`);
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=email%20profile%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fmeetings.space.readonly&prompt=select_account`;

    const isWebView = typeof window !== 'undefined' && (
      window.WebToNative ||
      /wv|WebView|Version\/[0-9.]+/i.test(navigator.userAgent)
    );

    if (isWebView && window.WebToNative?.openInBrowser) {
      window.WebToNative.openInBrowser(googleAuthUrl);
      setTimeout(() => setOauthLoading(null), 3000);
    } else if (isWebView) {
      window.open(googleAuthUrl, '_system');
      setTimeout(() => setOauthLoading(null), 3000);
    } else {
      window.location.href = googleAuthUrl;
    }
  };

  const handleGithubOAuth = () => {
    setOauthLoading('github');
    const clientId = (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_GITHUB_CLIENT_ID || import.meta.env?.NEXT_PUBLIC_GITHUB_CLIENT_ID)) || 'Ov23li85R8iyZCz0Yn3h';
    const envRedirect = (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_GITHUB_REDIRECT_URI || import.meta.env?.NEXT_PUBLIC_GITHUB_REDIRECT_URI)) || '';
    const rawRedirect = envRedirect || `${window.location.origin}/login`;
    const redirectUri = encodeURIComponent(rawRedirect);
    console.log(`🔑 Initiating GitHub OAuth with redirect_uri: ${rawRedirect}`);
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user:email&prompt=consent`;

    const isWebView = typeof window !== 'undefined' && (
      window.WebToNative ||
      /wv|WebView|Version\/[0-9.]+/i.test(navigator.userAgent)
    );

    if (isWebView && window.WebToNative?.openInBrowser) {
      window.WebToNative.openInBrowser(githubAuthUrl);
      setTimeout(() => setOauthLoading(null), 3000);
    } else if (isWebView) {
      window.open(githubAuthUrl, '_system');
      setTimeout(() => setOauthLoading(null), 3000);
    } else {
      window.location.href = githubAuthUrl;
    }
  };



  const handleRequestOTP = async (values) => {
    setOtpLoading(true);
    try {
      const res = await authService.requestResetOTP(values.account);
      setResetEmail(res.email || values.account);
      setResetUsername(res.username || '');
      setResetFullName(res.full_name || '');
      setResetUserRole(res.role || '');
      message.success(res.message || 'OTP code sent to your email!');
      setResetStep(1);
    } catch (err) {
      console.error('Request OTP Error:', err);
      const msg = err.response?.data?.error 
        || err.response?.data?.detail 
        || (err.message === 'Network Error' ? 'Network Error: Unable to connect to backend server.' : err.message) 
        || 'Failed to send OTP code.';
      requestOtpForm.setFields([{ name: 'account', errors: [msg] }]);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOTP = async (values) => {
    setOtpLoading(true);
    try {
      const res = await authService.verifyResetOTP(resetEmail, values.otp_code);
      setOtpCode(values.otp_code);
      message.success(res.message || 'OTP verified successfully!');
      setResetStep(2);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || err.message || 'Invalid or expired OTP code.';
      verifyOtpForm.setFields([{ name: 'otp_code', errors: [msg] }]);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleConfirmNewPassword = async (values) => {
    if (values.new_password !== values.confirm_password) {
      newPasswordForm.setFields([{ name: 'confirm_password', errors: ['Passwords do not match.'] }]);
      return;
    }
    setOtpLoading(true);
    try {
      const res = await authService.confirmPasswordReset(resetEmail, otpCode, values.new_password);
      message.success(res.message || 'Password reset successfully!');
      setResetStep(3);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || err.message || 'Failed to reset password.';
      newPasswordForm.setFields([{ name: 'new_password', errors: [msg] }]);
    } finally {
      setOtpLoading(false);
    }
  };

  const closeResetModal = () => {
    setIsForgotModalOpen(false);
    setResetStep(0);
    setResetEmail('');
    setResetUsername('');
    setResetFullName('');
    setResetUserRole('');
    setPreviewUser(null);
    setLookupLoading(false);
    setOtpCode('');
    requestOtpForm.resetFields();
    verifyOtpForm.resetFields();
    newPasswordForm.resetFields();
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: antdTheme.defaultAlgorithm,
        token: {
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          colorPrimary: '#2563eb',
          colorBgContainer: '#ffffff',
          colorBgElevated: '#ffffff',
          colorText: '#0f172a',
          colorTextSecondary: '#64748b',
          colorBorder: '#cbd5e1',
          borderRadius: 16,
        },
        components: {
          Form: {
            labelColor: '#334155',
            labelRequiredMarkColor: '#ef4444',
          },
          Card: {
            colorBgContainer: '#ffffff',
          },
          Modal: {
            colorBgElevated: '#ffffff',
          },
          Input: {
            colorBgContainer: '#f8fafc',
            colorBorder: '#cbd5e1',
            colorText: '#0f172a',
            colorTextPlaceholder: '#94a3b8',
            activeBg: '#ffffff',
          },
          Button: {
            colorPrimary: '#2563eb',
            colorPrimaryHover: '#1d4ed8',
          }
        }
      }}
    >
      <div className="min-h-screen relative flex flex-col justify-center items-center w-full px-4 py-8 overflow-hidden select-none bg-gradient-to-br from-slate-100 via-blue-50/50 to-slate-200 text-slate-900">
        {/* High Quality Enterprise Background Image Overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-25 scale-105 pointer-events-none mix-blend-multiply"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80')`
          }}
        />

        {/* Radial Gradient Overlay & Ambient Glowing Blobs */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Logo & Title Header */}
        <div className="relative z-10 w-full text-center mb-6 max-w-md flex flex-col items-center">
          <Logo variant="full" height={44} isDark={false} className="mx-auto mb-3 drop-shadow-sm" />
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight m-0">
            Login to Your Account
          </h1>
          <p className="text-xs sm:text-sm text-slate-800 font-semibold max-w-xs mx-auto mt-1.5 leading-relaxed">
            Access your team meetings, action items, and decision logs
          </p>
        </div>

        {/* Clean Light Form Card */}
        <div className="relative z-10 w-full max-w-md">
          <Card
            style={{ width: '100%', borderRadius: '20px', boxSizing: 'border-box' }}
            styles={{ body: { padding: '24px 24px' } }}
            className="shadow-xl border border-slate-200/80 bg-white text-slate-900 transition-all duration-300"
          >
            <Form
              form={loginForm}
              name="login_form"
              layout="vertical"
              onFinish={onFinish}
              onValuesChange={handleLoginValuesChange}
              validateTrigger={['onChange', 'onBlur']}
              autoComplete="off"
              size="large"
              disabled={submitting || Boolean(oauthLoading)}
            >
              <Form.Item
                name="username"
                label="Username"
                rules={[{ required: true, message: 'Please enter username' }]}
              >
                <Input
                  id="username"
                  name="username"
                  prefix={<UserOutlined className="text-slate-400" />}
                  placeholder="Username or email"
                  autoComplete="username"
                  onPressEnter={(e) => {
                    e.preventDefault();
                    passwordInputRef.current?.focus();
                  }}
                />
              </Form.Item>

              <Form.Item
                name="password"
                label="Password"
                rules={[{ required: true, message: 'Please enter password' }]}
                className="mb-1"
              >
                <Input.Password
                  id="password"
                  name="password"
                  ref={passwordInputRef}
                  prefix={<LockOutlined className="text-slate-400" />}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </Form.Item>

              <div className="text-right mb-5">
                <button
                  type="button"
                  disabled={submitting || Boolean(oauthLoading)}
                  onClick={() => {
                    closeResetModal();
                    setIsForgotModalOpen(true);
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-blue-600 focus:outline-none cursor-pointer bg-transparent border-0 p-0 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              <Form.Item className="mt-4 mb-2">
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={submitting}
                  disabled={submitting || Boolean(oauthLoading)}
                  block
                  className="font-semibold rounded-xl border-none bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20"
                >
                  Login
                </Button>
              </Form.Item>
            </Form>

            <Divider style={{ margin: '16px 0', fontSize: '12px', color: '#64748b' }}>
              <span style={{ whiteSpace: 'nowrap' }}>Or continue with</span>
            </Divider>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%', marginBottom: '12px' }}>
              <Button
                icon={<GoogleOutlined className="text-red-500" />}
                onClick={handleGoogleOAuth}
                loading={oauthLoading === 'google'}
                disabled={submitting || Boolean(oauthLoading)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px' }}
                className="font-medium border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 shadow-sm"
              >
                Google
              </Button>
              <Button
                icon={<GithubOutlined className="text-slate-800" />}
                onClick={handleGithubOAuth}
                loading={oauthLoading === 'github'}
                disabled={submitting || Boolean(oauthLoading)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px' }}
                className="font-medium border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 shadow-sm"
              >
                GitHub
              </Button>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 text-center text-sm text-slate-500">
              Don't have an account?{' '}
              <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-700 no-underline">
                Register now
              </Link>
            </div>
          </Card>
        </div>

      <Modal
        title="Reset Password via OTP"
        open={isForgotModalOpen}
        onCancel={closeResetModal}
        footer={null}
        destroyOnHidden
        width={500}
        style={{ maxWidth: 'calc(100vw - 24px)', margin: '12px auto' }}
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

          {resetStep === 0 && (
            <Form form={requestOtpForm} layout="vertical" onFinish={handleRequestOTP}>
              <p className="text-sm text-slate-600 mb-4">
                Enter your registered username or email address below to receive a 6-digit OTP verification code.
              </p>
              <Form.Item
                name="account"
                label="Username or Email Address"
                rules={[{ required: true, message: 'Please enter your username or email!' }]}
              >
                <Input
                  id="account"
                  name="account"
                  prefix={<MailOutlined className="text-slate-400" />}
                  placeholder="e.g. user@example.com or organizer"
                  onChange={handleAccountInputChange}
                />
              </Form.Item>

              {lookupLoading ? (
                <div className="text-xs text-blue-600 py-2 flex items-center space-x-1.5 animate-pulse">
                  <SyncOutlined spin className="text-blue-500" /> <span>Looking up connected account...</span>
                </div>
              ) : previewUser ? (
                <div className="bg-blue-50/80 p-3.5 rounded-xl border border-blue-200 mt-1 mb-2 space-y-1.5 text-xs shadow-sm">
                  <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <UserOutlined /> Connected User Account:
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-500">Username:</span>
                    <span className="font-bold text-slate-900 font-mono text-xs">@{previewUser.username}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-500">Name:</span>
                    <span className="font-bold text-slate-900 text-xs">{previewUser.full_name || previewUser.username}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-500">Role:</span>
                    {previewUser.role && (
                      <Tag color={previewUser.role === 'OWNER' ? 'gold' : previewUser.role === 'ADMIN' ? 'volcano' : previewUser.role === 'MANAGER' ? 'cyan' : 'blue'} className="font-bold m-0 text-[10px] px-2 py-0.5">
                        {previewUser.role}
                      </Tag>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-500">Email:</span>
                    <span className="font-medium text-slate-700 text-xs">{previewUser.email}</span>
                  </div>
                </div>
              ) : null}

              <div className="flex justify-end space-x-2 mt-6">
                <Button onClick={closeResetModal}>Cancel</Button>
                <Button type="primary" htmlType="submit" loading={otpLoading} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl border-none">
                  Send OTP Code
                </Button>
              </div>
            </Form>
          )}

          {resetStep === 1 && (
            <Form form={verifyOtpForm} layout="vertical" onFinish={handleVerifyOTP}>
              <Form.Item label="Registered Email Address" className="mb-2">
                <Input value={resetEmail} disabled prefix={<MailOutlined className="text-slate-400" />} />
              </Form.Item>

              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mb-4">
                <p className="text-xs text-blue-700 m-0">
                  A 6-digit OTP code was sent to <strong>{resetEmail}</strong>. Please enter the OTP code below.
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
                  id="otp_code"
                  name="otp_code"
                  prefix={<SafetyCertificateOutlined className="text-slate-400" />}
                  placeholder="123456"
                  maxLength={6}
                  className="text-center text-lg tracking-widest font-mono"
                />
              </Form.Item>

              <div className="flex justify-between items-center mt-6">
                <Button type="link" onClick={() => setResetStep(0)} className="p-0 text-xs text-blue-600">
                  Change Account
                </Button>
                <div className="space-x-2">
                  <Button onClick={closeResetModal}>Cancel</Button>
                  <Button type="primary" htmlType="submit" loading={otpLoading} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl border-none">
                    Verify Code
                  </Button>
                </div>
              </div>
            </Form>
          )}

          {resetStep === 2 && (
            <Form form={newPasswordForm} layout="vertical" onFinish={handleConfirmNewPassword}>
              {resetUsername && (
                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 mb-4 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs">
                      <UserOutlined />
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">Setting New Password For</div>
                      <div className="text-xs font-bold text-slate-900">
                        {resetFullName || resetUsername} <span className="font-mono text-emerald-700 font-semibold">(@{resetUsername})</span>
                      </div>
                    </div>
                  </div>
                  {resetUserRole && (
                    <Tag color={resetUserRole === 'OWNER' ? 'gold' : resetUserRole === 'ADMIN' ? 'volcano' : resetUserRole === 'MANAGER' ? 'cyan' : 'blue'} className="font-bold m-0 text-[10px]">
                      {resetUserRole}
                    </Tag>
                  )}
                </div>
              )}

              <p className="text-xs text-slate-600 mb-4">
                OTP verified for <strong>@{resetUsername}</strong>! Please enter your new password below.
              </p>

              <Form.Item
                name="new_password"
                label="New Password"
                rules={[
                  { required: true, message: 'Please enter your new password!' },
                  { min: 6, message: 'Password must be at least 6 characters.' }
                ]}
              >
                <Input.Password id="new_password" name="new_password" prefix={<LockOutlined className="text-slate-400" />} placeholder="••••••••" />
              </Form.Item>

              <Form.Item
                name="confirm_password"
                label="Confirm New Password"
                rules={[{ required: true, message: 'Please enter confirm new password' }]}
              >
                <Input id="confirm_password" name="confirm_password" prefix={<LockOutlined className="text-slate-400" />} placeholder="Confirm new password" />
              </Form.Item>

              <div className="flex justify-end space-x-2 mt-6">
                <Button onClick={closeResetModal}>Cancel</Button>
                <Button type="primary" htmlType="submit" loading={otpLoading} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl border-none">
                  Update Password
                </Button>
              </div>
            </Form>
          )}

          {resetStep === 3 && (
            <div className="py-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-2xl">
                <CheckCircleOutlined />
              </div>
              <h3 className="font-semibold text-slate-900 text-base m-0">Password Reset Complete!</h3>
              <p className="text-sm text-slate-600 m-0 max-w-xs mx-auto">
                Your password has been updated successfully. You can now login with your new password.
              </p>
              <div className="pt-3">
                <Button type="primary" onClick={closeResetModal} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl border-none px-6">
                  Login Now
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
    </ConfigProvider>
  );
}
