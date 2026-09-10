import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Logo } from '../components/Logo.jsx';
import { Form, Input, Button, Card, Modal, message } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined, SafetyCertificateOutlined, SendOutlined } from '@ant-design/icons';

export default function Register() {
  const { requestRegisterOTP, confirmRegister } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [formData, setFormData] = useState(null);
  const [otpCode, setOtpCode] = useState('');
  const [form] = Form.useForm();

  // Step 1: Submit signup details & request email OTP
  const onFinishStep1 = async (values) => {
    setSubmitting(true);
    try {
      const res = await requestRegisterOTP(values);
      setFormData(values);
      setShowOtpModal(true);
      message.success(res.message || `6-digit verification code sent to ${values.email}`);
    } catch (err) {
      console.error('Registration OTP Request Error:', err);
      const errData = err.response?.data;
      if (errData && typeof errData === 'object' && !Array.isArray(errData)) {
        Object.entries(errData).forEach(([key, val]) => {
          const detail = Array.isArray(val) ? val.join(' ') : String(val);
          if (key === 'non_field_errors' || key === 'detail' || key === 'error') {
            message.error(detail);
          } else {
            const formattedField = key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ');
            message.error(`${formattedField}: ${detail}`);
          }
        });
      } else {
        const rawMsg = err.response?.data?.error || err.response?.data?.detail || err.message || 'Failed to send verification code.';
        message.error(rawMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Step 2: Confirm OTP & Complete Registration
  const handleConfirmOtp = async () => {
    if (!otpCode || otpCode.trim().length !== 6) {
      message.error('Please enter the 6-digit verification code sent to your email.');
      return;
    }

    setVerifying(true);
    try {
      const payload = {
        ...formData,
        otp_code: otpCode.trim()
      };
      await confirmRegister(payload);
      message.success('Email verified! Welcome to SmartMeeting Tracker.');
      setShowOtpModal(false);
    } catch (err) {
      const rawMsg = err.response?.data?.error || err.response?.data?.detail || err.message || 'OTP verification failed.';
      message.error(rawMsg);
    } finally {
      setVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (!formData) return;
    try {
      await requestRegisterOTP(formData);
      message.success(`A new verification code has been sent to ${formData.email}`);
    } catch (err) {
      message.error('Failed to resend verification code.');
    }
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 4rem)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: '100%', padding: '24px 12px', boxSizing: 'border-box' }}>
      <div style={{ width: '100%', textAlign: 'center', marginBottom: '24px' }}>
        <Logo variant="icon" height={56} className="mx-auto mb-3" />
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }} className="text-slate-900 dark:text-white tracking-tight">
          Create Your Account
        </h1>
        <p style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: '320px', margin: '6px auto 0', lineHeight: 1.4 }} className="dark:text-slate-400">
          Sign up with email verification to participate in team meetings and decision tracking
        </p>
      </div>

      <div style={{ width: '100%', maxWidth: '520px', marginLeft: 'auto', marginRight: 'auto', boxSizing: 'border-box' }}>
        <Card
          style={{ width: '100%', borderRadius: '16px', boxSizing: 'border-box' }}
          styles={{ body: { padding: '24px 20px' } }}
          className="shadow-xs border border-slate-200/80 dark:border-slate-700/80 dark:bg-slate-800"
        >
          <Form
            form={form}
            name="register_form"
            layout="vertical"
            onFinish={onFinishStep1}
            size="middle"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
              <Form.Item
                name="first_name"
                label="First Name"
                rules={[{ required: true, message: 'First name is required' }]}
              >
                <Input placeholder="John" />
              </Form.Item>

              <Form.Item
                name="last_name"
                label="Last Name"
                rules={[{ required: true, message: 'Last name is required' }]}
              >
                <Input placeholder="Doe" />
              </Form.Item>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
              <Form.Item
                name="username"
                label="Username"
                rules={[{ required: true, message: 'Username is required' }]}
              >
                <Input prefix={<UserOutlined className="text-slate-400" />} placeholder="john_doe" />
              </Form.Item>

              <Form.Item name="department" label="Department / Team">
                <Input placeholder="Engineering / Product" />
              </Form.Item>
            </div>

            <Form.Item
              name="email"
              label="Email Address"
              rules={[
                { required: true, message: 'Email is required' },
                { type: 'email', message: 'Enter a valid email address' }
              ]}
              help="A 6-digit verification code will be sent to this email address."
            >
              <Input prefix={<MailOutlined className="text-slate-400" />} placeholder="john@example.com" />
            </Form.Item>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
              <Form.Item
                name="password"
                label="Password"
                rules={[{ required: true, min: 6, message: 'Password must be at least 6 characters' }]}
              >
                <Input.Password prefix={<LockOutlined className="text-slate-400" />} placeholder="••••••••" />
              </Form.Item>

              <Form.Item
                name="password_confirm"
                label="Confirm Password"
                dependencies={['password']}
                rules={[
                  { required: true, message: 'Please confirm password' },
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
                <Input.Password prefix={<LockOutlined className="text-slate-400" />} placeholder="••••••••" />
              </Form.Item>
            </div>

            <Form.Item className="mt-4 mb-2">
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                block
                size="large"
                icon={<SendOutlined />}
                className="font-semibold bg-blue-600 hover:bg-blue-700 rounded-xl border-none"
              >
                Send Email Verification Code
              </Button>
            </Form.Item>
          </Form>

          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 text-center text-sm text-slate-600 dark:text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-500 no-underline">
              Sign in
            </Link>
          </div>
        </Card>
      </div>

      {/* Step 2: Email OTP Verification Modal */}
      <Modal
        title={
          <div className="flex items-center space-x-2 text-slate-900 dark:text-white">
            <SafetyCertificateOutlined className="text-blue-600 text-xl" />
            <span className="font-bold">Verify Your Email Address</span>
          </div>
        }
        open={showOtpModal}
        onCancel={() => setShowOtpModal(false)}
        footer={null}
        centered
        destroyOnClose
      >
        <div className="py-2 space-y-4">
          <div className="bg-blue-50 dark:bg-slate-800 p-3.5 rounded-xl border border-blue-100 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-1">
            <p className="m-0 font-semibold text-slate-900 dark:text-white">
              Verification Code Sent!
            </p>
            <p className="m-0">
              We sent a 6-digit verification code to <strong>{formData?.email}</strong>. Please check your inbox and enter the code below to complete your registration.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase">
              6-Digit OTP Code
            </label>
            <Input
              size="large"
              placeholder="e.g. 849201"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              className="text-center font-mono text-xl tracking-widest rounded-xl border-slate-300 focus:border-blue-500"
            />
          </div>

          <div className="pt-2 flex flex-col space-y-2">
            <Button
              type="primary"
              size="large"
              block
              loading={verifying}
              onClick={handleConfirmOtp}
              className="bg-blue-600 hover:bg-blue-700 font-bold rounded-xl border-none"
            >
              Verify Email & Activate Account
            </Button>

            <div className="flex justify-between items-center text-xs pt-1">
              <button
                type="button"
                onClick={handleResendOtp}
                className="text-blue-600 dark:text-blue-400 font-semibold hover:underline bg-transparent border-none cursor-pointer"
              >
                Resend Verification Code
              </button>
              <button
                type="button"
                onClick={() => setShowOtpModal(false)}
                className="text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer"
              >
                Edit Registration Details
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
