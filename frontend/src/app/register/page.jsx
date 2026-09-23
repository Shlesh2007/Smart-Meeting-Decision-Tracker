import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { Logo } from '../../components/Logo.jsx';
import { Form, Input, Button, Card, Select, App, Typography } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined, ThunderboltOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function RegisterPage() {
  const { message } = App.useApp();
  const { register } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const onFinish = async (values) => {
    setSubmitting(true);
    try {
      await register(values);
      message.success('Account created successfully!');
    } catch (err) {
      console.error('Registration API Call Error Detail:', err);

      const errData = err.response?.data;
      if (errData && typeof errData === 'object') {
        const errorMessages = Object.entries(errData)
          .map(([key, val]) => {
            const detail = Array.isArray(val) ? val.join(' ') : String(val);
            return `${key.toUpperCase()}: ${detail}`;
          })
          .join(' | ');
        message.error(errorMessages);
      } else {
        const rawMsg = err.response?.data?.error || err.message || 'Unknown network error';
        message.error(`Registration Failed: ${rawMsg}. Check Browser Console (F12) for details.`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center w-full px-3 py-6 box-border">
      <div style={{ width: '100%', textAlign: 'center', marginBottom: '24px' }} className="flex flex-col items-center">
        <Logo variant="full" height={44} className="mx-auto mb-3" />
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }} className="text-slate-900 dark:text-white tracking-tight">
          Create Your Account
        </h1>
        <p style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: '280px', margin: '6px auto 0', lineHeight: 1.4 }} className="dark:text-slate-400">
          Join your team to participate in meeting decisions & action tracking
        </p>
      </div>

      <div style={{ width: '100%', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto', boxSizing: 'border-box' }}>
        <Card
          style={{ width: '100%', borderRadius: '16px', boxSizing: 'border-box' }}
          styles={{ body: { padding: '24px 20px' } }}
          className="shadow-xs border border-slate-200/80 dark:border-slate-700/80 dark:bg-slate-800"
        >
        <Form
          <Form
            name="register_form"
            layout="vertical"
            onFinish={onFinish}
            initialValues={{ role: 'MEMBER' }}
            size="middle"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
              <Form.Item
                name="first_name"
                label="First Name"
                rules={[{ required: true, message: 'First name is required' }]}
              >
                <Input id="first_name" name="first_name" placeholder="John" />
              </Form.Item>

              <Form.Item
                name="last_name"
                label="Last Name"
                rules={[{ required: true, message: 'Last name is required' }]}
              >
                <Input id="last_name" name="last_name" placeholder="Doe" />
              </Form.Item>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
              <Form.Item
                name="username"
                label="Username"
                rules={[{ required: true, message: 'Username is required' }]}
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
                { required: true, message: 'Email is required' },
                { type: 'email', message: 'Enter a valid email address' }
              ]}
              help="A 6-digit verification code will be sent to this email address."
            >
              <Input id="email" name="email" prefix={<MailOutlined className="text-slate-400" />} placeholder="john@example.com" />
            </Form.Item>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
              <Form.Item
                name="password"
                label="Password"
                rules={[{ required: true, min: 6, message: 'Password must be at least 6 characters' }]}
              >
                <Input.Password id="password" name="password" prefix={<LockOutlined className="text-slate-400" />} placeholder="••••••••" />
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
                <Input.Password id="password_confirm" name="password_confirm" prefix={<LockOutlined className="text-slate-400" />} placeholder="••••••••" />
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
                className="font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-xl border-none"
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
        destroyOnHidden
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
            <label htmlFor="otp_code" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase">
              6-Digit OTP Code
            </label>
            <Input
              id="otp_code"
              name="otp_code"
              size="large"
              placeholder="123456"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              className="text-center tracking-widest text-lg font-bold"
            />
          </div>

          <div className="pt-2">
            <Button
              type="primary"
              block
              size="large"
              loading={verifying}
              onClick={handleVerifyOtp}
              className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold border-none"
            >
              Verify & Complete Registration
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
