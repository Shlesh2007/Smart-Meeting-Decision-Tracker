import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Logo } from '../components/Logo.jsx';
import { getErrorMessage } from '../utils/errorHandler.js';
import { Form, Input, Button, Card, App, ConfigProvider, theme as antdTheme } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined, SafetyCertificateOutlined, SendOutlined, CheckCircleOutlined } from '@ant-design/icons';

export default function Register() {
  const { message } = App.useApp();
  const { requestRegisterOTP, confirmRegister } = useAuth();

  const [submitting, setSubmitting] = useState(false);
  const [otpRequesting, setOtpRequesting] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [form] = Form.useForm();

  // Send OTP inline to the specified email address
  const handleSendOtpInline = async () => {
    try {
      await form.validateFields(['email']);
    } catch {
      message.error('Please enter a valid email address first.');
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
          if (['username', 'email', 'password', 'first_name', 'last_name', 'department'].includes(key)) {
            const msg = Array.isArray(val) ? val.join(', ') : String(val);
            fieldErrors.push({ name: key, errors: [msg] });
          }
        });
        if (fieldErrors.length > 0) {
          form.setFields(fieldErrors);
          return;
        }
      }
      form.setFields([{ name: 'email', errors: [getErrorMessage(err, 'Failed to send verification code.')] }]);
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
    // If OTP has not been sent yet, request OTP first
    if (!otpSent) {
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
            if (['username', 'email', 'password', 'first_name', 'last_name', 'department'].includes(key)) {
              const msg = Array.isArray(val) ? val.join(', ') : String(val);
              fieldErrors.push({ name: key, errors: [msg] });
            }
          });
          if (fieldErrors.length > 0) {
            form.setFields(fieldErrors);
            return;
          }
        }
        form.setFields([{ name: 'email', errors: [getErrorMessage(err, 'Failed to send verification code.')] }]);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // If OTP was sent, confirm OTP and complete registration
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
          colorPrimary: '#2563eb',
          colorBgContainer: '#ffffff',
          colorBgElevated: '#ffffff',
          colorText: '#0f172a',
          colorTextSecondary: '#64748b',
          colorBorder: '#cbd5e1',
          borderRadius: 16,
        },
        components: {
          Card: {
            colorBgContainer: '#ffffff',
          },
          Input: {
            colorBgContainer: '#f8fafc',
            colorBorder: '#cbd5e1',
            colorText: '#0f172a',
            colorTextPlaceholder: '#94a3b8',
          },
          Button: {
            colorPrimary: '#2563eb',
            colorPrimaryHover: '#1d4ed8',
          }
        }
      }}
    >
      <div className="min-h-screen relative flex flex-col justify-center items-center w-full px-4 py-8 overflow-hidden select-none bg-gradient-to-br from-slate-100 via-blue-50/50 to-slate-200 text-slate-900">
        {/* Background Image Overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-25 scale-105 pointer-events-none mix-blend-multiply"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80')`
          }}
        />

        {/* Ambient Gradient Blobs */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 w-full text-center mb-5 max-w-md flex flex-col items-center">
          <Logo variant="full" height={44} isDark={false} className="mx-auto mb-2 drop-shadow-sm" />
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight m-0">
            Create Your Account
          </h1>
          <p className="text-xs sm:text-sm text-slate-800 font-semibold max-w-xs mx-auto mt-1.5 leading-relaxed">
            Sign up with email verification to participate in team meetings and decision tracking
          </p>
        </div>

        <div className="relative z-10 w-full max-w-[500px]">
          <Card
            style={{ width: '100%', borderRadius: '20px', boxSizing: 'border-box' }}
            styles={{ body: { padding: '24px 24px' } }}
            className="shadow-xl border border-slate-200/80 bg-white text-slate-900 transition-all duration-300"
          >
            <Form
              form={form}
              name="register_form"
              layout="vertical"
              onFinish={onFormSubmit}
              size="middle"
              initialValues={{ department: 'General Team' }}
              disabled={submitting || otpRequesting}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                <Form.Item
                  name="first_name"
                  label="First Name"
                  rules={[{ required: true, message: 'Please enter first name' }]}
                >
                  <Input id="first_name" name="first_name" placeholder="John" />
                </Form.Item>

                <Form.Item
                  name="last_name"
                  label="Last Name"
                  rules={[{ required: true, message: 'Please enter last name' }]}
                >
                  <Input id="last_name" name="last_name" placeholder="Doe" />
                </Form.Item>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                <Form.Item
                  name="username"
                  label="Username"
                  rules={[{ required: true, message: 'Please enter username' }]}
                >
                  <Input id="username" name="username" prefix={<UserOutlined className="text-slate-400" />} placeholder="john_doe" />
                </Form.Item>

                <Form.Item name="department" label="Department / Team">
                  <Input id="department" name="department" placeholder="Engineering / Product" />
                </Form.Item>
              </div>

              <Form.Item
                name="email"
                label="Email Address"
                rules={[
                  { required: true, message: 'Please enter email address' },
                  { type: 'email', message: 'Invalid email address format' }
                ]}
                help={!otpSent ? "A 6-digit verification code will be sent to this email address." : undefined}
                className={otpSent ? 'mb-2' : ''}
              >
                <Input
                  id="email"
                  name="email"
                  prefix={<MailOutlined className="text-slate-400" />}
                  placeholder="john@example.com"
                  suffix={
                    <Button
                      type="link"
                      size="small"
                      loading={otpRequesting}
                      onClick={handleSendOtpInline}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 p-0 h-auto"
                    >
                      {otpSent ? 'Resend OTP' : 'Send OTP'}
                    </Button>
                  }
                />
              </Form.Item>

              {/* INLINE EMAIL OTP INPUT FIELD */}
              {otpSent && (
                <div className="mb-4 p-3 bg-blue-50/80 rounded-xl border border-blue-200 space-y-2">
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
                      className="text-center font-mono text-lg tracking-widest rounded-xl border-slate-300 focus:border-blue-500"
                    />
                  </Form.Item>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                <Form.Item
                  name="password"
                  label="Password"
                  rules={[
                    { required: true, message: 'Please enter password' },
                    { min: 6, message: 'Password must be at least 6 characters' }
                  ]}
                >
                  <Input.Password id="password" name="password" prefix={<LockOutlined className="text-slate-400" />} placeholder="••••••••" />
                </Form.Item>

                <Form.Item
                  name="password_confirm"
                  label="Confirm Password"
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
                >
                  <Input.Password id="password_confirm" name="password_confirm" prefix={<LockOutlined className="text-slate-400" />} placeholder="Confirm password" />
                </Form.Item>
              </div>

              <Form.Item className="mt-4 mb-2">
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={submitting || otpRequesting}
                  block
                  size="large"
                  icon={otpSent ? <CheckCircleOutlined /> : <SendOutlined />}
                  className="font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl border-none shadow-md shadow-blue-600/20"
                >
                  {otpSent ? 'Verify OTP & Complete Registration' : 'Send Email Verification Code'}
                </Button>
              </Form.Item>
            </Form>

            <div className="mt-4 pt-4 border-t border-slate-100 text-center text-sm text-slate-500">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700 no-underline">
                Login
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </ConfigProvider>
  );
}
