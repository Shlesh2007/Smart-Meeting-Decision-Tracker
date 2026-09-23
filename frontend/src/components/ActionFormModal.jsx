import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, DatePicker, message, Alert } from 'antd';
import dayjs from 'dayjs';
import { actionService, userService, meetingService, discussionService, decisionService } from '../services/api.js';

export const ActionFormModal = ({
  open, onClose, decisionId, meetingId, existingAction, availableActions = [], onSuccess
}) => {
  const [form] = Form.useForm();
  const [users, setUsers] = useState([]);
  const [meetingParticipants, setMeetingParticipants] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [decisionsList, setDecisionsList] = useState([]);
  const [prereqActions, setPrereqActions] = useState([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState(meetingId || null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      userService.getUsers()
        .then((res) => {
          const list = res.results || res || [];
          // Deduplicate by id / email to prevent duplicate entries
          const uniqueMap = new Map();
          list.forEach(u => uniqueMap.set(u.id, u));
          setUsers(Array.from(uniqueMap.values()));
        })
        .catch(() => setUsers([]));

      const targetMId = meetingId || existingAction?.meeting_id;
      if (targetMId) {
        setSelectedMeetingId(targetMId);
        loadMeetingPrereqs(targetMId);
      } else {
        meetingService.getMeetings()
          .then((res) => setMeetings(res.results || res))
          .catch(() => setMeetings([]));
      }

      if (existingAction) {
        form.setFieldsValue({
          title: existingAction.title,
          description: existingAction.description,
          completion_notes: existingAction.completion_notes || '',
          assigned_to: existingAction.assigned_to,
          priority: existingAction.priority,
          due_date: existingAction.due_date ? dayjs(existingAction.due_date) : null,
          status: existingAction.status,
          dependency_ids: existingAction.dependencies || [],
          meeting_id: existingAction.meeting_id,
          decision: existingAction.decision
        });
      } else {
        form.resetFields();
        if (targetMId) {
          form.setFieldsValue({ meeting_id: targetMId });
        }
        if (decisionId) {
          form.setFieldsValue({ decision: decisionId });
        }
      }
    }
  }, [open, existingAction, meetingId, decisionId, form]);

  const loadMeetingPrereqs = async (mId) => {
    if (!mId) return;
    try {
      const [actionsRes, discRes, meetingRes] = await Promise.all([
        actionService.getActions({ meeting: mId }),
        discussionService.getDiscussions(mId),
        meetingService.getMeetingById(mId).catch(() => null)
      ]);
      const actionsList = actionsRes.results || actionsRes;
      setPrereqActions(actionsList);

      if (meetingRes && meetingRes.participants_detail) {
        const parts = meetingRes.participants_detail;
        const uniqueMap = new Map();
        parts.forEach(u => uniqueMap.set(u.id, u));
        setMeetingParticipants(Array.from(uniqueMap.values()));
      } else {
        setMeetingParticipants([]);
      }

      const decs = [];
      const discussions = discRes.results || discRes || [];
      discussions.forEach((disc) => {
        if (disc.decision) {
          decs.push({
            id: disc.decision.id,
            title: `${disc.title} (Decision #${disc.decision.id})`
          });
        }
      });
      setDecisionsList(decs);
    } catch (err) {
      console.error('Failed to load meeting context', err);
    }
  };

  const handleMeetingChange = (mId) => {
    setSelectedMeetingId(mId);
    form.setFieldsValue({ decision: undefined, dependency_ids: [], assigned_to: undefined });
    loadMeetingPrereqs(mId);
  };

  const handleSubmit = async (values) => {
    setSubmitting(true);
    let finalDecisionId = decisionId || values.decision;

    if (!finalDecisionId && (values.meeting_id || selectedMeetingId)) {
      const mId = values.meeting_id || selectedMeetingId;
      try {
        const discRes = await discussionService.getDiscussions(mId);
        const discussions = discRes.results || discRes || [];
        const existingDiscWithDecision = discussions.find(d => d.decision && d.decision.id);
        
        if (existingDiscWithDecision) {
          finalDecisionId = existingDiscWithDecision.decision.id;
        } else {
          const newDisc = await discussionService.createDiscussion({
            meeting: mId,
            title: 'General Action Items',
            points: 'Action items logged for meeting'
          });
          const newDec = await decisionService.createDecision({
            discussion: newDisc.id,
            status: 'DECISION_MADE',
            decision: 'Action items recorded'
          });
          finalDecisionId = newDec.id;
        }
      } catch (e) {
        message.error('Failed to attach action item to meeting.');
        setSubmitting(false);
        return;
      }
    }

    if (!finalDecisionId) {
      message.error('Please select an associated meeting for this action item.');
      setSubmitting(false);
      return;
    }

    const payload = {
      decision: finalDecisionId,
      title: values.title,
      description: values.description,
      completion_notes: values.completion_notes || '',
      assigned_to: values.assigned_to,
      priority: values.priority,
      due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : '',
      dependency_ids: values.dependency_ids || []
    };

    if (existingAction) {
      payload.status = values.status;
    }

    try {
      if (existingAction) {
        await actionService.updateAction(existingAction.id, payload);
        message.success('Action item updated!');
      } else {
        await actionService.createAction(payload);
        message.success('Action item created successfully!');
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      const statusErr = err.response?.data?.status?.[0] || err.response?.data?.detail || 'Failed to save action item.';
      message.error(statusErr);
    } finally {
      setSubmitting(false);
    }
  };

  const currentMeetingId = meetingId || selectedMeetingId || existingAction?.meeting_id;
  const actionsPool = prereqActions.length > 0 ? prereqActions : availableActions;
  
  const filterableDeps = actionsPool.filter(a => {
    if (existingAction && a.id === existingAction.id) return false;
    if (currentMeetingId) {
      return Number(a.meeting_id) === Number(currentMeetingId);
    }
    return true;
  });

  const availableAssignees = (currentMeetingId && meetingParticipants.length > 0)
    ? meetingParticipants
    : users;

  const assigneeOptionsList = [...availableAssignees];
  if (existingAction?.assigned_to && !assigneeOptionsList.some(u => u.id === existingAction.assigned_to)) {
    const existingUser = users.find(u => u.id === existingAction.assigned_to);
    if (existingUser) assigneeOptionsList.push(existingUser);
  }

  return (
    <Modal
      title={existingAction ? 'Edit Action Item' : 'Add Action Item'}
      open={open}
      style={{ maxWidth: '95vw' }}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={submitting}
      okText={existingAction ? 'Update Action' : 'Create Action'}
      okButtonProps={{ className: 'bg-slate-900 hover:bg-slate-800 font-semibold text-white border-none h-9 px-4 rounded-lg shadow-xs' }}
      cancelButtonProps={{ className: 'font-semibold border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 h-9 px-4 rounded-lg' }}
      width={600}
    >
      <Alert
        type="info"
        showIcon
        message="Meeting Specific Action Items & Prerequisites"
        description="Action items are associated with a specific meeting. Prerequisite dependencies and assignees are strictly filtered to participants of this meeting."
        className="mb-4 rounded-lg"
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ priority: 'MEDIUM', status: 'TODO' }}
        className="space-y-4"
      >
        {!meetingId && !decisionId && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              name="meeting_id"
              label="Associated Meeting"
              rules={[{ required: true, message: 'Please select a meeting' }]}
              className="!mb-0"
            >
              <Select
                id="meeting_id"
                name="meeting_id"
                showSearch
                placeholder="Select meeting"
                optionFilterProp="children"
                onChange={handleMeetingChange}
                options={meetings.map(m => ({ label: `${m.title} (${m.meeting_date})`, value: m.id }))}
                className="w-full"
              />
            </Form.Item>

            {decisionsList.length > 0 && (
              <Form.Item
                name="decision"
                label="Topic / Decision Point"
                className="!mb-0"
              >
                <Select
                  id="decision"
                  name="decision"
                  placeholder="Select decision topic"
                  options={decisionsList.map(d => ({ label: d.title, value: d.id }))}
                  className="w-full"
                />
              </Form.Item>
            )}
          </div>
        )}

        <Form.Item
          name="title"
          label="Action Title"
          rules={[{ required: true, message: 'Please enter action title' }]}
          className="!mb-0"
        >
          <Input id="title" name="title" placeholder="e.g. Create proof of concept for Elasticsearch" className="w-full" />
        </Form.Item>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item
            name="assigned_to"
            label={currentMeetingId && meetingParticipants.length > 0 ? "Assignee (Meeting Participant)" : "Assignee"}
            rules={[{ required: true, message: 'Please assign to a team member' }]}
            className="!mb-0"
          >
            <Select
              id="assigned_to"
              name="assigned_to"
              showSearch
              placeholder={currentMeetingId && meetingParticipants.length > 0 ? "Select meeting participant" : "Select team member"}
              optionFilterProp="children"
              options={assigneeOptionsList.map(u => ({ label: `${u.full_name} • ${u.email} (${u.role})`, value: u.id }))}
              className="w-full"
            />
          </Form.Item>

          <Form.Item
            name="due_date"
            label="Due Date"
            rules={[{ required: true, message: 'Please set due date' }]}
            className="!mb-0"
          >
            <DatePicker
              id="due_date"
              name="due_date"
              className="w-full"
              disabledDate={(current) => current && current.isBefore(dayjs().startOf('day'))}
            />
          </Form.Item>
        </div>

        {existingAction ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item name="priority" label="Priority" className="!mb-0">
              <Select
                id="priority"
                name="priority"
                options={[
                  { label: 'Low', value: 'LOW' },
                  { label: 'Medium', value: 'MEDIUM' },
                  { label: 'High', value: 'HIGH' },
                  { label: 'Critical', value: 'CRITICAL' }
                ]}
                className="w-full"
              />
            </Form.Item>

            <Form.Item name="status" label="Status" className="!mb-0">
              <Select
                id="status"
                name="status"
                disabled={existingAction?.status === 'COMPLETED' || existingAction?.status === 'CANCELLED'}
                options={[
                  { label: 'Todo', value: 'TODO' },
                  { label: 'In Progress', value: 'IN_PROGRESS' },
                  { label: 'Blocked', value: 'BLOCKED' },
                  { label: 'Completed', value: 'COMPLETED' },
                  { label: 'Cancelled', value: 'CANCELLED' }
                ]}
                className="w-full"
              />
            </Form.Item>
          </div>
        ) : (
          <Form.Item name="priority" label="Priority" className="!mb-0">
            <Select
              id="priority"
              name="priority"
              options={[
                { label: 'Low', value: 'LOW' },
                { label: 'Medium', value: 'MEDIUM' },
                { label: 'High', value: 'HIGH' },
                { label: 'Critical', value: 'CRITICAL' }
              ]}
              className="w-full"
            />
          </Form.Item>
        )}

        <Form.Item
          name="dependency_ids"
          label="Depends On Action(s) (Prerequisites)"
          help={
            currentMeetingId
              ? "Showing actions from this meeting only."
              : "Please select a meeting above to view meeting prerequisite actions."
          }
          className="!mb-0"
        >
          <Select
            id="dependency_ids"
            name="dependency_ids"
            mode="multiple"
            placeholder={
              currentMeetingId
                ? filterableDeps.length > 0 ? "Select prerequisite actions" : "No other actions in this meeting"
                : "Select a meeting first"
            }
            options={filterableDeps.map(dep => ({
              label: `${dep.title} [Status: ${dep.status}]`,
              value: dep.id
            }))}
            className="w-full"
          />
        </Form.Item>

        <Form.Item name="description" label="Detailed Instructions" className="!mb-0">
          <Input.TextArea id="description" name="description" rows={2} placeholder="Describe specific execution steps..." className="w-full" />
        </Form.Item>

        <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.status !== currentValues.status}>
          {({ getFieldValue }) =>
            getFieldValue('status') === 'COMPLETED' ? (
              <Form.Item
                name="completion_notes"
                label="Completion Notes / Work Outcome (Delivered Results)"
                className="!mb-0"
              >
                <Input.TextArea id="completion_notes" name="completion_notes" rows={2} placeholder="Explain what work was completed, results achieved, or links to deliverables..." className="w-full" />
              </Form.Item>
            ) : null
          }
        </Form.Item>
      </Form>
    </Modal>
  );
};
