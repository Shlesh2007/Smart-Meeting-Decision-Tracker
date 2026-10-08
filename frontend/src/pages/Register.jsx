import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Logo } from '../components/Logo.jsx';
import { AuthHero } from '../components/AuthHero.jsx';
import { getErrorMessage } from '../utils/errorHandler.js';
import { Form, Input, Button, Divider, App, ConfigProvider, theme as antdTheme } from 'antd';
import {
  UserOutlined, MailOutlined, LockOutlined, SafetyCertificateOutlined,
  SendOutlined, CheckCircleOutlined, GoogleOutlined, GithubOutlined,
  CalendarOutlined, CheckSquareOutlined, FileTextOutlined, ClockCircleOutlined,
  ThunderboltOutlined, TeamOutlined
} from '@ant-design/icons';

export default function Register() {
  const { message } = App.useApp();
  const { requestRegisterOTP, confirmRegister } = useAuth();
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [otpRequesting, setOtpRequesting] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [oauthLoading, setOauthLoading] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    form.resetFields();
  }, [form]);

  // OAuth Handlers
  const handleGoogleOAuth = () => {
    setOauthLoading('google');
    const clientId = (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_GOOGLE_CLIENT_ID || import.meta.env?.NEXT_PUBLIC_GOOGLE_CLIENT_ID)) || '1051715789667-m86kur6hnaciip8cp4ghoq08eeso6et3.apps.googleusercontent.com';
    const envRedirect = (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_GOOGLE_REDIRECT_URI || import.meta.env?.NEXT_PUBLIC_GOOGLE_REDIRECT_URI)) || '';
    const rawRedirect = envRedirect || `${window.location.origin}/login`;
    const redirectUri = encodeURIComponent(rawRedirect);
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=email%20profile%20openid&prompt=select_account`;
    window.location.href = googleAuthUrl;
  };

  const handleGithubOAuth = () => {
    setOauthLoading('github');
    const clientId = (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_GITHUB_CLIENT_ID || import.meta.env?.NEXT_PUBLIC_GITHUB_CLIENT_ID)) || 'Ov23li85R8iyZCz0Yn3h';
    const envRedirect = (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_GITHUB_REDIRECT_URI || import.meta.env?.NEXT_PUBLIC_GITHUB_REDIRECT_URI)) || '';
    const rawRedirect = envRedirect || `${window.location.origin}/login`;
    const redirectUri = encodeURIComponent(rawRedirect);
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user:email&prompt=consent`;
    window.location.href = githubAuthUrl;
  };

  // Send OTP inline to the specified email address
  const handleSendOtpInline = async () => {
    try {
      await form.validateFields(['first_name', 'last_name', 'username', 'email', 'password', 'password_confirm']);
    } catch {
      return;
    }

    const values = form.getFieldsValue();
    setOtpRequesting(true);
    try {
      const res = await requestRegisterOTP(values);
      setOtpSent(true);
      setOtpEmail(values.email);
      message.success(res.message || `6-digit verification code sent to ${values.email}`);
    } catch (err) {
      console.error('Registration OTP Request Error:', err);
      const resData = err.response?.data;
      if (resData && typeof resData === 'object' && !Array.isArray(resData)) {
        const fieldErrors = [];
        Object.entries(resData).forEach(([key, val]) => {
          if (['username', 'email', 'password', 'password_confirm', 'first_name', 'last_name', 'department'].includes(key)) {
            const msg = Array.isArray(val) ? val.join(', ') : String(val);
            fieldErrors.push({ name: key, errors: [msg] });
          }
        });
        if (fieldErrors.length > 0) {
          form.setFields(fieldErrors);
          return;
        }
      }
      message.error(getErrorMessage(err, 'Failed to send verification code.'));
    } finally {
      setOtpRequesting(false);
    }
  };

  const handleResendOtp = async () => {
    const currentEmail = form.getFieldValue('email') || otpEmail;
    if (!currentEmail) {
      message.error('Please enter an email address.');
      return;
    }
    setOtpRequesting(true);
    try {
      const values = form.getFieldsValue();
      await requestRegisterOTP(values);
      message.success(`A new verification code has been sent to ${currentEmail}`);
    } catch (err) {
      message.error(getErrorMessage(err, 'Failed to resend verification code.'));
    } finally {
      setOtpRequesting(false);
    }
  };

  // Main Form Submit Handler
  const onFormSubmit = async (values) => {
    if (!otpSent) {
      try {
        await form.validateFields(['first_name', 'last_name', 'username', 'email', 'password', 'password_confirm']);
      } catch {
        return;
      }

      setSubmitting(true);
      try {
        const res = await requestRegisterOTP(values);
        setOtpSent(true);
        setOtpEmail(values.email);
        message.success(res.message || `6-digit verification code sent to ${values.email}. Please enter the OTP below.`);
      } catch (err) {
        console.error('Registration OTP Request Error:', err);
        const resData = err.response?.data;
        if (resData && typeof resData === 'object' && !Array.isArray(resData)) {
          const fieldErrors = [];
          Object.entries(resData).forEach(([key, val]) => {
            if (['username', 'email', 'password', 'password_confirm', 'first_name', 'last_name', 'department'].includes(key)) {
              const msg = Array.isArray(val) ? val.join(', ') : String(val);
              fieldErrors.push({ name: key, errors: [msg] });
            }
          });
          if (fieldErrors.length > 0) {
            form.setFields(fieldErrors);
            return;
          }
        }
        message.error(getErrorMessage(err, 'Failed to send verification code.'));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!values.otp_code || values.otp_code.trim().length !== 6) {
      form.setFields([{ name: 'otp_code', errors: ['Please enter the 6-digit OTP code sent to your email'] }]);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...values,
        otp_code: values.otp_code.trim()
      };
      await confirmRegister(payload);
      message.success('Email verified! Welcome to SmartMeeting Tracker.');
      navigate('/dashboard');
    } catch (err) {
      const msg = getErrorMessage(err, 'OTP verification failed. Please check the code entered.');
      form.setFields([{ name: 'otp_code', errors: [msg] }]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: antdTheme.defaultAlgorithm,
        token: {
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          colorPrimary: '#0f172a',
          colorBgContainer: '#ffffff',
          colorBgElevated: '#ffffff',
          colorText: '#0f172a',
          colorTextSecondary: '#64748b',
          colorBorder: '#cbd5e1',
          borderRadius: 12,
          fontSize: 14,
          fontSizeLG: 14,
        },
        components: {
          Form: {
            labelColor: '#334155',
            labelRequiredMarkColor: '#ef4444',
            itemMarginBottom: 14,
          },
          Input: {
            colorBgContainer: '#ffffff',
            colorBorder: '#cbd5e1',
            colorText: '#0f172a',
            colorTextPlaceholder: '#94a3b8',
            activeBg: '#ffffff',
            activeBorderColor: '#0f172a',
            hoverBorderColor: '#94a3b8',
            controlHeight: 44,
            borderRadius: 12,
            fontSize: 14,
            fontSizeLG: 14,
          },
          Button: {
            colorPrimary: '#0f172a',
            colorPrimaryHover: '#1e293b',
            colorPrimaryActive: '#020617',
            controlHeight: 44,
            borderRadius: 12,
          }
        }
      }}
    >
      <div className="relative w-screen h-screen overflow-hidden lg:grid lg:grid-cols-[50vw_50vw] bg-slate-100/80 lg:bg-slate-50 text-slate-900 select-none">
        
        {/* ========================================== */}
        {/* MOBILE BACKGROUND IMAGE OVERLAY (< lg)     */}
        {/* ========================================== */}
        <div className="lg:hidden absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <img
            src="/auth-hero.png"
            alt="Background Hero"
            className="w-full h-full object-cover object-center filter brightness-[1.08] contrast-[0.85] opacity-25"
          />
          <div className="absolute inset-0 bg-slate-100/70 backdrop-blur-[2px]" />
        </div>

        {/* ========================================== */}
        {/* DESKTOP LEFT SIDE HERO (50vw x 100vh)      */}
        {/* ========================================== */}
        <AuthHero />

        {/* ========================================== */}
        {/* RIGHT SIDE / MAIN FORM CONTAINER (50vw x 100vh) */}
        {/* ========================================== */}
        <div className="relative z-10 w-full lg:w-[50vw] h-screen overflow-y-auto overflow-x-hidden flex flex-col justify-center items-center p-3 sm:p-6 xl:p-8">
          
          <div className="w-[min(calc(100%-32px),480px)] mx-auto flex flex-col items-center justify-center my-auto py-2">
            
            {/* Brand Logo Header */}
            <div className="mb-3 text-center">
              <Logo variant="full" height={38} isDark={false} className="mx-auto" />
            </div>

            {/* Page Heading & Subtitle Above Card */}
            <div className="text-center mb-4 px-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#0f172a] tracking-tight m-0 leading-tight">
                Create Your Account
              </h1>
              <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed m-0 max-w-[340px] sm:max-w-md mx-auto">
                Sign up with email verification to manage meetings and track decisions
              </p>
            </div>

            {/* Floating White Card */}
            <div className="w-full bg-white shadow-xl shadow-slate-400/15 rounded-[24px] p-6 sm:p-7 border border-slate-100 auth-card">
              
              {/* Registration Form */}
              <Form
                form={form}
                name="register_form"
                layout="vertical"
                onFinish={onFormSubmit}
                size="large"
                initialValues={{ department: 'General Team' }}
                disabled={submitting || otpRequesting || Boolean(oauthLoading)}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
                  <Form.Item
                    name="first_name"
                    label={<span className="font-semibold text-slate-700 text-xs uppercase tracking-wider">First Name</span>}
                    rules={[{ required: true, message: 'Please enter first name' }]}
                    className="mb-2"
                  >
                    <Input id="first_name" name="first_name" prefix={<UserOutlined className="text-slate-400 mr-1.5" />} placeholder="John" className="rounded-xl border-slate-300 h-10 text-sm" />
                  </Form.Item>

                  <Form.Item
                    name="last_name"
                    label={<span className="font-semibold text-slate-700 text-xs uppercase tracking-wider">Last Name</span>}
                    rules={[{ required: true, message: 'Please enter last name' }]}
                    className="mb-2"
                  >
                    <Input id="last_name" name="last_name" prefix={<UserOutlined className="text-slate-400 mr-1.5" />} placeholder="Doe" className="rounded-xl border-slate-300 h-10 text-sm" />
                  </Form.Item>
                </div>

                <Form.Item
                  name="username"
                  label={<span className="font-semibold text-slate-700 text-xs uppercase tracking-wider">Username</span>}
                  rules={[{ required: true, message: 'Please enter username' }]}
                  className="mb-2"
                >
                  <Input id="username" name="username" prefix={<UserOutlined className="text-slate-400 mr-1.5" />} placeholder="john_doe" className="rounded-xl border-slate-300 h-10 text-sm" />
                </Form.Item>

                <Form.Item
                  name="email"
                  label={<span className="font-semibold text-slate-700 text-xs uppercase tracking-wider">Email Address</span>}
                  rules={[
                    { required: true, message: 'Please enter email address' },
                    { type: 'email', message: 'Invalid email address format' }
                  ]}
                  className="mb-2"
                >
                  <Input
                    id="email"
                    name="email"
                    prefix={<MailOutlined className="text-slate-400 mr-1.5" />}
                    placeholder="john@example.com"
                    className="rounded-xl border-slate-300 h-10 text-sm"
                    suffix={
                      <Button
                        type="link"
                        size="small"
                        loading={otpRequesting}
                        onClick={handleSendOtpInline}
                        className="text-xs font-bold text-[#2563eb] hover:text-[#1d4ed8] p-0 h-auto"
                      >
                        {otpSent ? 'Resend OTP' : 'Send OTP'}
                      </Button>
                    }
                  />
                </Form.Item>

                {/* INLINE EMAIL OTP INPUT FIELD */}
                {otpSent && (
                  <div className="mb-2 p-2.5 bg-blue-50/80 rounded-xl border border-blue-200 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-700">
                      <span className="font-semibold text-blue-700 flex items-center gap-1">
                        <SafetyCertificateOutlined className="text-blue-600 text-sm" />
                        Verification code sent to <strong>{otpEmail || form.getFieldValue('email')}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        className="text-blue-600 font-bold hover:underline bg-transparent border-none p-0 cursor-pointer text-xs shrink-0"
                      >
                        Resend Code
                      </button>
                    </div>

                    <Form.Item
                      name="otp_code"
                      label="Enter 6-Digit OTP Verification Code"
                      rules={[
                        { required: true, message: 'Please enter OTP code' },
                        { len: 6, message: 'OTP code must be exactly 6 digits' }
                      ]}
                      className="!mb-0"
                    >
                      <Input
                        id="otp_code"
                        name="otp_code"
                        size="large"
                        prefix={<SafetyCertificateOutlined className="text-blue-600" />}
                        placeholder="123456"
                        maxLength={6}
                        className="text-center font-mono text-lg tracking-widest rounded-xl border-slate-300 focus:border-blue-500 h-10"
                      />
                    </Form.Item>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
                  <Form.Item
                    name="password"
                    label={<span className="font-semibold text-slate-700 text-xs uppercase tracking-wider">Password</span>}
                    rules={[
                      { required: true, message: 'Please enter password' },
                      { min: 6, message: 'Password must be at least 6 characters' }
                    ]}
                    className="mb-3"
                  >
                    <Input.Password id="password" name="password" prefix={<LockOutlined className="text-slate-400 mr-1.5" />} placeholder="••••••••" className="rounded-xl border-slate-300 h-10 text-sm" />
                  </Form.Item>

                  <Form.Item
                    name="password_confirm"
                    label={<span className="font-semibold text-slate-700 text-xs uppercase tracking-wider">Confirm Password</span>}
                    dependencies={['password']}
                    rules={[
                      { required: true, message: 'Please enter confirm password' },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue('password') === value) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error('Passwords do not match!'));
                        },
                      }),
                    ]}
                    className="mb-3"
                  >
                    <Input id="password_confirm" name="password_confirm" prefix={<LockOutlined className="text-slate-400 mr-1.5" />} placeholder="Confirm password" className="rounded-xl border-slate-300 h-10 text-sm" />
                  </Form.Item>
                </div>

                <Form.Item className="mb-0">
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={submitting || otpRequesting}
                    disabled={submitting || otpRequesting || Boolean(oauthLoading)}
                    block
                    icon={otpSent ? <CheckCircleOutlined /> : <UserOutlined />}
                    className="font-bold rounded-xl border-none bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-sm h-11 shadow-md shadow-slate-900/20 transition-all duration-200 active:scale-[0.99]"
                  >
                    {otpSent ? 'Verify OTP & Complete Registration' : 'Create Account'}
                  </Button>
                </Form.Item>
              </Form>

              <Divider style={{ margin: '16px 0 16px 0', fontSize: '12px', color: '#64748b', borderColor: '#cbd5e1' }}>
                <span style={{ whiteSpace: 'nowrap' }}>Or continue with</span>
              </Divider>

              {/* Social OAuth Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%', marginBottom: '16px' }}>
                <Button
                  icon={<GoogleOutlined className="text-red-500 text-base" />}
                  onClick={handleGoogleOAuth}
                  loading={oauthLoading === 'google'}
                  disabled={submitting || otpRequesting || Boolean(oauthLoading)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', height: '42px' }}
                  className="font-semibold border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-all duration-150 shadow-none text-xs"
                >
                  Google
                </Button>
                <Button
                  icon={<GithubOutlined className="text-slate-800 text-base group-hover:!text-white group-hover:!fill-white transition-colors" />}
                  onClick={handleGithubOAuth}
                  loading={oauthLoading === 'github'}
                  disabled={submitting || otpRequesting || Boolean(oauthLoading)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', height: '42px' }}
                  className="group font-semibold border-slate-200 bg-white text-slate-700 hover:bg-[#181717] hover:text-white hover:border-[#181717] transition-all duration-150 shadow-none text-xs"
                >
                  GitHub
                </Button>
              </div>

              {/* Login Link Footer */}
              <div className="text-center text-xs text-slate-500">
                Already have an account?{' '}
                <Link to="/login" className="font-bold text-slate-900 hover:text-slate-700 no-underline transition-colors">
                  Login now
                </Link>
              </div>

            </div>

            {/* Bottom Footer Copyright */}
            <div className="w-full text-center text-[10px] text-slate-400 mt-3">
              © {new Date().getFullYear()} Smart Meeting Decision Tracker. All rights reserved.
            </div>

          </div>

        </div>

      </div>
    </ConfigProvider>
  );
}
