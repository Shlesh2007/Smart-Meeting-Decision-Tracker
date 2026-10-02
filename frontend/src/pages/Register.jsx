import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Logo } from '../components/Logo.jsx';
import { getErrorMessage } from '../utils/errorHandler.js';
import { Form, Input, Button, Card, App } from 'antd';
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
    <div className="min-h-screen flex flex-col justify-center items-center w-full px-2 sm:px-4 py-4 sm:py-8 box-border">
      <div style={{ width: '100%', textAlign: 'center', marginBottom: '16px' }} className="flex flex-col items-center">
        <Logo variant="full" height={44} className="mx-auto mb-2" />
        <h1 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }} className="text-slate-900 dark:text-white tracking-tight">
          Create Your Account
        </h1>
        <p style={{ fontSize: '0.8rem', color: '#64748b', maxWidth: '300px', margin: '4px auto 0', lineHeight: 1.35 }} className="dark:text-slate-400">
          Sign up with email verification to participate in team meetings and decision tracking
        </p>
      </div>

      <div style={{ width: '100%', maxWidth: '480px', marginLeft: 'auto', marginRight: 'auto', boxSizing: 'border-box' }}>
        <Card
          style={{ width: '100%', borderRadius: '16px', boxSizing: 'border-box' }}
          styles={{ body: { padding: '16px 14px' } }}
          className="shadow-xs border border-slate-200/80 dark:border-slate-700/80 dark:bg-slate-800"
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
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 p-0 h-auto"
                  >
                    {otpSent ? 'Resend OTP' : 'Send OTP'}
                  </Button>
                }
              />
            </Form.Item>

            {/* INLINE EMAIL OTP INPUT FIELD (Renders directly below Email field) */}
            {otpSent && (
              <div className="mb-4 p-3 bg-blue-50/90 dark:bg-slate-800/90 rounded-xl border border-blue-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                  <span className="font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                    <SafetyCertificateOutlined className="text-blue-600 text-sm" />
                    Verification code sent to <strong>{otpEmail || form.getFieldValue('email')}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    className="text-blue-600 dark:text-blue-400 font-bold hover:underline bg-transparent border-none p-0 cursor-pointer text-xs shrink-0"
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
                    prefix={<SafetyCertificateOutlined className="text-blue-500" />}
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
                <Input id="password_confirm" name="password_confirm" prefix={<LockOutlined className="text-slate-400" />} placeholder="Confirm password" />
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
                className="font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-xl border-none"
              >
                {otpSent ? 'Verify OTP & Complete Registration' : 'Send Email Verification Code'}
              </Button>
            </Form.Item>
          </Form>

          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 text-center text-sm text-slate-600 dark:text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-500 no-underline">
              Login
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
