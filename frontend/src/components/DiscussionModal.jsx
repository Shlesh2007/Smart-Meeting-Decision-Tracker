'use client';

import React, { useState } from 'react';
import { Modal, Form, Input, Select, message } from 'antd';
import { discussionService } from '../services/api.js';

export const DiscussionModal = ({ open, onClose, meetingId, onSuccess }) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      await discussionService.createDiscussion({
        meeting: meetingId,
        title: values.title,
        description: values.description,
        priority: values.priority
      });
      message.success('Discussion point added successfully!');
      form.resetFields();
      onSuccess();
      onClose();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Failed to add discussion.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Add New Discussion Point"
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={submitting}
      okText="Add Discussion"
      okButtonProps={{ className: 'bg-blue-600 hover:bg-blue-700 font-semibold' }}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ priority: 'MEDIUM' }}>
        <Form.Item
          name="title"
          label="Discussion Title / Topic"
          rules={[{ required: true, message: 'Please enter a discussion title' }]}
        >
          <Input placeholder="e.g. API Response time is too high" />
        </Form.Item>

        <Form.Item name="description" label="Detailed Notes / Context">
          <Input.TextArea rows={3} placeholder="Describe the discussion background..." />
        </Form.Item>

        <Form.Item
          name="priority"
          label="Priority Level"
          rules={[{ required: true, message: 'Please select priority' }]}
        >
          <Select options={[
            { label: 'Low', value: 'LOW' },
            { label: 'Medium', value: 'MEDIUM' },
            { label: 'High', value: 'HIGH' },
            { label: 'Critical', value: 'CRITICAL' }
          ]} />
        </Form.Item>
      </Form>
    </Modal>
  );
};
