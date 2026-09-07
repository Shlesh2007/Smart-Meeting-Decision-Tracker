'use client';

import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, DatePicker, message, Alert } from 'antd';
import dayjs from 'dayjs';
import { actionService, userService } from '../services/api.js';

export const ActionFormModal = ({
  open, onClose, decisionId, existingAction, availableActions = [], onSuccess
}) => {
  const [form] = Form.useForm();
  const [users, setUsers] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      userService.getUsers()
        .then((res) => setUsers(res.results || res))
        .catch(() => setUsers([]));

      if (existingAction) {
        form.setFieldsValue({
          title: existingAction.title,
          description: existingAction.description,
          assigned_to: existingAction.assigned_to,
          priority: existingAction.priority,
          due_date: existingAction.due_date ? dayjs(existingAction.due_date) : null,
          status: existingAction.status,
          dependency_ids: existingAction.dependencies || []
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, existingAction, form]);

  const handleSubmit = async (values) => {
    setSubmitting(true);
    const payload = {
      decision: decisionId,
      title: values.title,
      description: values.description,
      assigned_to: values.assigned_to,
      priority: values.priority,
      due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : '',
      status: values.status,
      dependency_ids: values.dependency_ids || []
    };

    try {
      if (existingAction) {
        await actionService.updateAction(existingAction.id, payload);
        message.success('Action item updated!');
      } else {
        await actionService.createAction(payload);
        message.success('Action item created successfully!');
      }
      onSuccess();
      onClose();
    } catch (err) {
      const statusErr = err.response?.data?.status?.[0] || err.response?.data?.detail || 'Failed to save action item.';
      message.error(statusErr);
    } finally {
      setSubmitting(false);
    }
  };

  const filterableDeps = availableActions.filter(a => !existingAction || a.id !== existingAction.id);

  return (
    <Modal
      title={existingAction ? 'Edit Action Item' : 'Add Action Item'}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={submitting}
      okText={existingAction ? 'Update Action' : 'Create Action'}
      okButtonProps={{ className: 'bg-blue-600 hover:bg-blue-700 font-semibold' }}
      width={600}
    >
      <Alert
        type="info"
        showIcon
        message="Action Dependency Rule Enforced"
        description="If this action depends on other actions, it cannot be completed until all prerequisite dependencies are Completed (Rule 2)."
        className="mb-4"
      />

      <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ priority: 'MEDIUM', status: 'TODO' }}>
        <Form.Item
          name="title"
          label="Action Title"
          rules={[{ required: true, message: 'Please enter action title' }]}
        >
          <Input placeholder="e.g. Create proof of concept for Elasticsearch" />
        </Form.Item>

        <Form.Item name="description" label="Detailed Instructions">
          <Input.TextArea rows={2} placeholder="Describe specific execution steps..." />
        </Form.Item>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item
            name="assigned_to"
            label="Assigned Owner"
            rules={[{ required: true, message: 'Please assign to a team member' }]}
          >
            <Select
              showSearch
              placeholder="Select team member"
              optionFilterProp="children"
              options={users.map(u => ({ label: `${u.full_name} (${u.role})`, value: u.id }))}
            />
          </Form.Item>

          <Form.Item
            name="due_date"
            label="Due Date"
            rules={[{ required: true, message: 'Please set due date' }]}
          >
            <DatePicker className="w-full" />
          </Form.Item>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item name="priority" label="Priority">
            <Select options={[
              { label: 'Low', value: 'LOW' },
              { label: 'Medium', value: 'MEDIUM' },
              { label: 'High', value: 'HIGH' },
              { label: 'Critical', value: 'CRITICAL' }
            ]} />
          </Form.Item>

          <Form.Item name="status" label="Initial Status">
            <Select options={[
              { label: 'Todo', value: 'TODO' },
              { label: 'In Progress', value: 'IN_PROGRESS' },
              { label: 'Blocked', value: 'BLOCKED' },
              { label: 'Completed', value: 'COMPLETED' },
              { label: 'Cancelled', value: 'CANCELLED' }
            ]} />
          </Form.Item>
        </div>

        <Form.Item
          name="dependency_ids"
          label="Depends On Action(s) (Prerequisites)"
          help="Selecting prerequisite actions locks this action from completion until dependencies are finished."
        >
          <Select
            mode="multiple"
            placeholder="Select prerequisite actions"
            options={filterableDeps.map(dep => ({
              label: `${dep.title} [Status: ${dep.status}]`,
              value: dep.id
            }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
