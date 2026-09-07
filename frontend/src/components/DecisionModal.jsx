'use client';

import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, message, Alert } from 'antd';
import { decisionService } from '../services/api.js';

export const DecisionModal = ({
  open, onClose, discussionId, existingDecision, onSuccess
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(
    existingDecision?.status || 'DECISION_MADE'
  );

  useEffect(() => {
    if (open) {
      if (existingDecision) {
        form.setFieldsValue({
          status: existingDecision.status,
          decision: existingDecision.decision,
          reason: existingDecision.reason
        });
        setSelectedStatus(existingDecision.status);
      } else {
        form.resetFields();
        setSelectedStatus('DECISION_MADE');
      }
    }
  }, [open, existingDecision, form]);

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      if (existingDecision) {
        await decisionService.updateDecision(existingDecision.id, {
          discussion: discussionId,
          status: values.status,
          decision: values.decision,
          reason: values.reason
        });
        message.success(`Decision updated (Version ${existingDecision.version + 1} saved to audit history)!`);
      } else {
        await decisionService.createDecision({
          discussion: discussionId,
          status: values.status,
          decision: values.decision,
          reason: values.reason
        });
        message.success('Decision recorded successfully!');
      }
      onSuccess();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.decision?.[0] || err.response?.data?.detail || 'Failed to record decision.';
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={existingDecision ? `Update Decision (Current Version ${existingDecision.version})` : 'Record Decision'}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={submitting}
      okText={existingDecision ? 'Save & Snapshot New Version' : 'Save Decision'}
      okButtonProps={{ className: 'bg-blue-600 hover:bg-blue-700 font-semibold' }}
      width={550}
    >
      {existingDecision && (
        <Alert
          type="info"
          showIcon
          message="Decision History Preserved"
          description="Updating this decision will automatically snapshot the previous version in the Decision History log (Rule 3)."
          className="mb-4"
        />
      )}

      <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ status: 'DECISION_MADE' }}>
        <Form.Item
          name="status"
          label="Decision Outcome / Status"
          rules={[{ required: true, message: 'Please select outcome status' }]}
        >
          <Select
            onChange={(val) => setSelectedStatus(val)}
            options={[
              { label: 'Decision Made', value: 'DECISION_MADE' },
              { label: 'Deferred', value: 'DEFERRED' },
              { label: 'Rejected', value: 'REJECTED' },
              { label: 'No Decision', value: 'NO_DECISION' }
            ]}
          />
        </Form.Item>

        {selectedStatus === 'DECISION_MADE' && (
          <Form.Item
            name="decision"
            label="Decision Resolution Details"
            rules={[{ required: true, message: 'Please specify the decision details' }]}
          >
            <Input.TextArea rows={3} placeholder="e.g. Introduce Redis caching for search query results" />
          </Form.Item>
        )}

        <Form.Item name="reason" label="Rationale / Supporting Reason">
          <Input.TextArea rows={2} placeholder="e.g. Reduces database load and response latency by 80%" />
        </Form.Item>
      </Form>
    </Modal>
  );
};
