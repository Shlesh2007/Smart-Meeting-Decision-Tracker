import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, message, Alert } from 'antd';
import { decisionService } from '../services/api.js';
import { getErrorMessage } from '../utils/errorHandler.js';
import { StatusBadge } from './StatusBadge.jsx';

export const DecisionModal = ({
  open, onClose, discussionId, existingDecision, onSuccess, initialStatus = 'DECISION_MADE'
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(
    existingDecision?.status || initialStatus
  );

  useEffect(() => {
    if (open) {
      if (existingDecision) {
        const stat = existingDecision.status || initialStatus;
        form.setFieldsValue({
          status: stat,
          decision: existingDecision.decision,
          reason: existingDecision.reason
        });
        setSelectedStatus(stat);
      } else {
        const defaultStat = initialStatus || 'DECISION_MADE';
        form.resetFields();
        form.setFieldsValue({ status: defaultStat });
        setSelectedStatus(defaultStat);
      }
    }
  }, [open, existingDecision, initialStatus, form]);

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      const activeStat = values.status || selectedStatus || initialStatus;
      const payload = {
        discussion: discussionId,
        status: activeStat,
        decision: values.decision || (activeStat === 'DEFERRED' ? 'Decision Deferred' : activeStat === 'REJECTED' ? 'Proposal Rejected' : ''),
        reason: values.reason || ''
      };

      if (existingDecision) {
        await decisionService.updateDecision(existingDecision.id, payload);
        message.success(`Decision updated (Version ${existingDecision.version + 1} saved to audit history)!`);
      } else {
        await decisionService.createDecision(payload);
        message.success('Decision recorded successfully!');
      }
      onSuccess();
      onClose();
    } catch (err) {
      message.error(getErrorMessage(err, 'Failed to record decision. Please check input fields.'));
    } finally {
      setSubmitting(false);
    }
  };

  const getModalTitle = () => {
    if (existingDecision) {
      return `Update Decision (Current Version ${existingDecision.version})`;
    }
    if (selectedStatus === 'REJECTED') return 'Reject Proposal';
    if (selectedStatus === 'DEFERRED') return 'Defer Decision';
    if (selectedStatus === 'NO_DECISION') return 'Skip Decision';
    return 'Add Decision';
  };

  return (
    <Modal
      title={getModalTitle()}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={submitting}
      cancelText="Cancel"
      cancelButtonProps={{
        className: 'rounded-xl font-bold text-xs h-8.5 px-4 text-slate-600 hover:text-slate-800 border-slate-200'
      }}
      okText={
        existingDecision
          ? 'Update Decision'
          : selectedStatus === 'REJECTED'
          ? 'Confirm Rejection'
          : selectedStatus === 'DEFERRED'
          ? 'Confirm Deferral'
          : 'Save Decision'
      }
      okButtonProps={{
        className:
          selectedStatus === 'REJECTED'
            ? 'bg-rose-600 hover:bg-rose-700 font-bold text-xs h-8.5 px-4 text-white border-none rounded-xl shadow-xs'
            : selectedStatus === 'DEFERRED'
            ? 'bg-amber-600 hover:bg-amber-700 font-bold text-xs h-8.5 px-4 text-white border-none rounded-xl shadow-xs'
            : 'bg-slate-900 hover:bg-slate-800 font-bold text-xs h-8.5 px-4 text-white border-none rounded-xl shadow-xs'
      }}
      width={480}
      style={{ maxWidth: 'calc(100vw - 24px)', margin: '12px auto' }}
    >
      {existingDecision && (
        <Alert
          type="info"
          showIcon
          message="Decision History Preserved"
          description="Updating this decision will automatically snapshot the previous version in the Decision History log."
          className="mb-4 rounded-xl"
        />
      )}

      <Form form={form} layout="vertical" onFinish={handleSubmit} disabled={submitting}>
        <Form.Item name="status" hidden initialValue={selectedStatus}>
          <Input />
        </Form.Item>

        <div className="mb-4 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
          <span className="text-xs font-bold uppercase text-slate-500">Outcome Action:</span>
          <StatusBadge type="decisionStatus" value={selectedStatus} />
        </div>

        {selectedStatus === 'DECISION_MADE' && (
          <Form.Item
            name="decision"
            label="Decision Resolution Details"
            rules={[{ required: true, message: 'Please specify the decision details' }]}
          >
            <Input.TextArea id="decision" name="decision" rows={3} placeholder="e.g. Introduce Redis caching for search query results" />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};
