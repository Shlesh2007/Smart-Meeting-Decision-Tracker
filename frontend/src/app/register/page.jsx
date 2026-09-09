'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext.jsx';
import { Form, Input, Button, Card, Select, message, Typography } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined, ThunderboltOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function RegisterPage() {
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
    <div style={{ minHeight: '85vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: '100%', padding: '16px 12px', boxSizing: 'border-box' }}>
      <div style={{ width: '100%', textAlign: 'center', marginBottom: '24px' }}>
        <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center mx-auto text-2xl shadow-lg mb-3">
          <ThunderboltOutlined />
        </div>
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

          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: 'Username is required' }]}
          >
            <Input prefix={<UserOutlined className="text-gray-400" />} placeholder="john_doe" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email Address"
            rules={[
              { required: true, message: 'Email is required' },
              { type: 'email', message: 'Enter a valid email' }
            ]}
          >
            <Input prefix={<MailOutlined className="text-gray-400" />} placeholder="john@example.com" />
          </Form.Item>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
            <Form.Item
              name="role"
              label="Account Role"
              rules={[{ required: true, message: 'Role is required' }]}
            >
              <Select className="w-full" options={[
                { label: 'Member (Participate & Update actions)', value: 'MEMBER' },
                { label: 'Admin (Manage users & meetings)', value: 'ADMIN' }
              ]} />
            </Form.Item>

            <Form.Item name="department" label="Department / Team">
              <Input placeholder="Engineering / Product" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, min: 6, message: 'Password must be at least 6 characters' }]}
            >
              <Input.Password prefix={<LockOutlined className="text-gray-400" />} placeholder="••••••••" />
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
              <Input.Password prefix={<LockOutlined className="text-gray-400" />} placeholder="••••••••" />
            </Form.Item>
          </div>

          <Form.Item className="mt-4 mb-2">
            <Button type="primary" htmlType="submit" loading={submitting} block size="large" className="font-semibold bg-blue-600 hover:bg-blue-700 rounded-xl border-none">
              Complete Registration
            </Button>
          </Form.Item>
        </Form>

        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 text-center text-sm text-slate-600 dark:text-slate-400">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-500 no-underline">
            Sign in
          </Link>
        </div>
      </Card>
    </div>
  );
}
