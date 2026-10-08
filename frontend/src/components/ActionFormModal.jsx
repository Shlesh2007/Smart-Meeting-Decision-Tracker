import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Form, Input, Select, DatePicker, message as staticMessage, Alert, App, Button } from 'antd';
import dayjs from 'dayjs';
import { actionService, userService, meetingService, discussionService, decisionService } from '../services/api.js';
import { getErrorMessage } from '../utils/errorHandler.js';

export const ActionFormModal = ({
  open, onClose, decisionId, meetingId, existingAction, availableActions = [], onSuccess
}) => {
  const navigate = useNavigate();
  const staticApp = App.useApp ? App.useApp() : null;
  const message = staticApp?.message || staticMessage;
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
      const targetMId = meetingId || existingAction?.meeting_id || null;
      setSelectedMeetingId(targetMId);
      setDecisionsList([]);
      setMeetingParticipants([]);
      setPrereqActions([]);

      userService.getUsers()
        .then((res) => {
          const list = res.results || res || [];
          const uniqueMap = new Map();
          list.forEach(u => uniqueMap.set(u.id, u));
          setUsers(Array.from(uniqueMap.values()));
        })
        .catch(() => setUsers([]));

      if (targetMId) {
        loadMeetingPrereqs(targetMId);
      } else {
        meetingService.getMeetings()
          .then((res) => {
            const list = res.results || res || [];
            const activeMeetings = list.filter(m => String(m.status).toUpperCase() !== 'CANCELLED');
            setMeetings(activeMeetings);
          })
          .catch(() => setMeetings([]));
      }

      if (existingAction) {
        let initialAssignedTo = [];
        if (Array.isArray(existingAction.assigned_to)) {
          initialAssignedTo = existingAction.assigned_to.map(u => typeof u === 'object' ? u.id : u);
        } else if (existingAction.assigned_to) {
          initialAssignedTo = [typeof existingAction.assigned_to === 'object' ? existingAction.assigned_to.id : existingAction.assigned_to];
        }

        form.setFieldsValue({
          title: existingAction.title,
          description: existingAction.description,
          completion_notes: existingAction.completion_notes || '',
          assigned_to: initialAssignedTo,
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
    } else {
      setSelectedMeetingId(null);
      setDecisionsList([]);
      setMeetingParticipants([]);
      setPrereqActions([]);
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
        const dId = disc.decision?.id ? String(disc.decision.id) : `disc_${disc.id}`;
        decs.push({
          id: dId,
          discId: disc.id,
          decisionId: disc.decision?.id || null,
          title: disc.decision?.decision ? `${disc.title} (${disc.decision.decision})` : disc.title
        });
      });
      setDecisionsList(decs);
      if (decs.length === 1 && !form.getFieldValue('decision')) {
        form.setFieldsValue({ decision: decs[0].id });
      }
    } catch (err) {
      console.error('Failed to load meeting context', err);
    }
  };

  const handleMeetingChange = (mId) => {
    setSelectedMeetingId(mId);
    setDecisionsList([]);
    form.setFieldsValue({ decision: undefined, dependency_ids: [], assigned_to: [] });
    if (mId) {
      loadMeetingPrereqs(mId);
    }
  };

  const handleSubmit = async (values) => {
    setSubmitting(true);
    let finalDecisionId = decisionId || values.decision;

    if (!finalDecisionId && decisionsList.length === 1) {
      finalDecisionId = decisionsList[0].id;
    }

    if (!finalDecisionId) {
      message.error('Please select a Discussion Topic / Decision Point for this action item.');
      setSubmitting(false);
      return;
    }

    if (typeof finalDecisionId === 'string' && finalDecisionId.startsWith('disc_')) {
      const discId = Number(finalDecisionId.replace('disc_', ''));
      try {
        const newDec = await decisionService.createDecision({
          discussion: discId,
          status: 'NO_DECISION',
          decision: 'Action item recorded'
        });
        finalDecisionId = newDec.id;
      } catch (e) {
        const mId = values.meeting_id || selectedMeetingId || meetingId;
        const discRes = await discussionService.getDiscussions(mId);
        const discussions = discRes.results || discRes || [];
        const found = discussions.find(d => Number(d.id) === Number(discId));
        if (found && found.decision && found.decision.id) {
          finalDecisionId = found.decision.id;
        } else {
          message.error(getErrorMessage(e, 'Failed to link action item to discussion topic.'));
          setSubmitting(false);
          return;
        }
      }
    }

    const payload = {
      decision: finalDecisionId,
      title: values.title,
      description: values.description,
      completion_notes: values.completion_notes || '',
      assigned_to: Array.isArray(values.assigned_to) ? values.assigned_to : (values.assigned_to ? [values.assigned_to] : []),
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
      message.error(getErrorMessage(err, 'Failed to save action item. Please check prerequisite items and required fields.'));
    } finally {
      setSubmitting(false);
    }
  };

  const formMeetingId = Form.useWatch('meeting_id', form);
  const currentMeetingId = formMeetingId || meetingId || selectedMeetingId || existingAction?.meeting_id;
  const hasSelectedMeeting = Boolean(formMeetingId || meetingId || existingAction?.meeting_id);
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
  if (existingAction?.assigned_to) {
    const existingIds = Array.isArray(existingAction.assigned_to)
      ? existingAction.assigned_to.map(u => typeof u === 'object' ? u.id : u)
      : [typeof existingAction.assigned_to === 'object' ? existingAction.assigned_to.id : existingAction.assigned_to];

    existingIds.forEach(id => {
      if (id && !assigneeOptionsList.some(u => u.id === id)) {
        const existingUser = users.find(u => u.id === id);
        if (existingUser) assigneeOptionsList.push(existingUser);
      }
    });
  }

  return (
    <Modal
      title={existingAction ? 'Edit Action Item' : 'Add Action Item'}
      open={open}
      style={{ maxWidth: 'calc(100vw - 24px)', margin: '12px auto' }}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={submitting}
      okButtonProps={{ className: 'bg-slate-900 hover:bg-slate-800 font-semibold text-white border-none h-9 px-4 rounded-lg shadow-xs' }}
      cancelButtonProps={{ className: 'font-semibold border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 h-9 px-4 rounded-lg' }}
      okText={existingAction ? 'Update Action' : 'Create Action'}
      width={600}
    >

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        disabled={submitting}
        initialValues={{ priority: 'MEDIUM', status: 'TODO' }}
        validateTrigger={['onBlur', 'onSubmit']}
        className="space-y-3"
      >
        {!meetingId && !decisionId ? (
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
                options={meetings
                  .filter(m => String(m.status).toUpperCase() !== 'CANCELLED')
                  .map(m => ({ label: `${m.title} (${m.meeting_date})`, value: m.id }))}
                className="w-full"
              />
            </Form.Item>

            <Form.Item
              name="decision"
              label="Associated Topic / Decision"
              rules={[{ required: hasSelectedMeeting && decisionsList.length > 0, message: 'Please select a topic / decision point' }]}
              className="!mb-0"
            >
              <Select
                id="decision"
                name="decision"
                placeholder={
                  !hasSelectedMeeting
                    ? "Select meeting first"
                    : decisionsList.length === 0
                    ? "No topics available"
                    : "Select topic / decision point"
                }
                disabled={!hasSelectedMeeting || decisionsList.length === 0}
                options={decisionsList.map(d => ({ label: d.title, value: d.id }))}
                className="w-full"
              />
            </Form.Item>
          </div>
        ) : (
          hasSelectedMeeting && decisionsList.length > 0 && !decisionId && (
            <Form.Item
              name="decision"
              label="Associated Topic / Decision"
              rules={[{ required: true, message: 'Please select a topic / decision point' }]}
              className="!mb-0"
            >
              <Select
                id="decision"
                name="decision"
                placeholder="Select topic / decision point"
                options={decisionsList.map(d => ({ label: d.title, value: d.id }))}
                className="w-full"
              />
            </Form.Item>
          )
        )}

        {hasSelectedMeeting && decisionsList.length === 0 && (
          <Alert
            type="warning"
            showIcon
            message="No Discussion Topics Found"
            description={
              <div className="space-y-2 mt-1">
                <p className="m-0 text-xs text-slate-700 dark:text-slate-300">
                  This meeting does not have any discussion topics recorded yet. Action items must be linked to a discussion topic.
                </p>
                <Button
                  type="primary"
                  size="small"
                  onClick={() => {
                    onClose();
                    navigate(`/meetings/${currentMeetingId}`);
                  }}
                  className="bg-blue-600 font-bold text-xs rounded-lg mt-1"
                >
                  Go to Meeting to Add Discussion Topic
                </Button>
              </div>
            }
            className="rounded-xl border-amber-200 bg-amber-50/80 dark:bg-amber-950/40"
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item
            name="title"
            label="Action Title"
            rules={[{ required: true, message: 'Please enter action title' }]}
            className="!mb-0"
          >
            <Input id="title" name="title" placeholder="e.g. Create proof of concept for Elasticsearch" className="w-full" />
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item
            name="assigned_to"
            label="Assignees / Participants"
            rules={[{ required: true, message: 'Please assign to at least one team member' }]}
            className="!mb-0"
          >
            <Select
              id="assigned_to"
              name="assigned_to"
              mode="multiple"
              showSearch
              placeholder={currentMeetingId && meetingParticipants.length > 0 ? "Select meeting participant(s)" : "Select team member(s)"}
              optionFilterProp="children"
              options={assigneeOptionsList.map(u => ({ label: `${u.full_name} • ${u.email} (${u.role})`, value: u.id }))}
              className="w-full"
            />
          </Form.Item>

          {existingAction ? (
            <div className="grid grid-cols-2 gap-2">
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
        </div>

        {filterableDeps.length > 0 && (
          <Form.Item
            name="dependency_ids"
            label="Depends On Action(s) (Prerequisites)"
            help="Prerequisite tasks that must be completed before this action item can be marked completed."
            className="!mb-0"
          >
            <Select
              id="dependency_ids"
              name="dependency_ids"
              mode="multiple"
              placeholder="Select prerequisite actions"
              options={filterableDeps.map(dep => ({
                label: `${dep.title} [Status: ${dep.status}]`,
                value: dep.id
              }))}
              className="w-full"
            />
          </Form.Item>
        )}

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
