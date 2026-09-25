
import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, DatePicker, TimePicker, message, Popover, Tag, Checkbox } from 'antd';
import { TeamOutlined, UserOutlined, RightOutlined, SyncOutlined } from '@ant-design/icons';
import { meetingService, userService, teamService } from '../services/api.js';
import dayjs from 'dayjs';

export const EditMeetingModal = ({ open, onClose, meeting, onSuccess }) => {
  const [form] = Form.useForm();
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      Promise.all([
        userService.getUsers(),
        teamService.getTeams()
      ])
        .then(([uRes, tRes]) => {
          setUsers(uRes.results || uRes);
          setTeams(tRes.results || tRes);
        })
        .catch(() => {
          setUsers([]);
          setTeams([]);
        });
    }
  }, [open]);

  const selectedTeamId = Form.useWatch('team', form);
  const isRecurring = Form.useWatch('is_recurring', form);

  // Compute selected team object & member IDs to exclude them from individual invite list
  const selectedTeamObj = teams.find(t => t.id === selectedTeamId);
  const teamMemberIds = new Set(
    selectedTeamObj
      ? (selectedTeamObj.members || (selectedTeamObj.members_detail ? selectedTeamObj.members_detail.map(m => m.id) : []))
      : []
  );

  const availableIndividualUsers = users.filter(u => !teamMemberIds.has(u.id));

  // Auto-clean individual participant selections if a user is already in the selected team
  useEffect(() => {
    if (selectedTeamId && teams.length > 0) {
      const selectedTeam = teams.find(t => t.id === selectedTeamId);
      if (selectedTeam) {
        const tMemberIds = new Set(
          selectedTeam.members || (selectedTeam.members_detail ? selectedTeam.members_detail.map(m => m.id) : [])
        );
        const currentIndividualIds = form.getFieldValue('participant_ids') || [];
        const cleanedIds = currentIndividualIds.filter(id => !tMemberIds.has(id));
        if (cleanedIds.length !== currentIndividualIds.length) {
          form.setFieldsValue({ participant_ids: cleanedIds });
        }
      }
    }
  }, [selectedTeamId, teams, form]);

  useEffect(() => {
    if (meeting && open) {
      const startTime = meeting.start_time ? dayjs(meeting.start_time, 'HH:mm:ss') : dayjs();
      const endTime = meeting.end_time ? dayjs(meeting.end_time, 'HH:mm:ss') : dayjs().add(1, 'hour');

      const participantIds = Array.isArray(meeting.participants)
        ? meeting.participants
        : meeting.participants_detail
        ? meeting.participants_detail.map(p => p.id)
        : [];

      form.setFieldsValue({
        title: meeting.title,
        description: meeting.description,
        meeting_date: dayjs(meeting.meeting_date),
        time_range: [startTime, endTime],
        location: meeting.location,
        meeting_type: meeting.meeting_type,
        team: meeting.team,
        participant_ids: participantIds,
        is_recurring: meeting.is_recurring || false,
        recurrence_pattern: meeting.recurrence_pattern || 'DAILY',
        recurrence_end_date: meeting.recurrence_end_date ? dayjs(meeting.recurrence_end_date) : null,
        update_series: false
      });
    }
  }, [meeting, open, form]);

  const handleFinish = async (values) => {
    const hasTeam = values.team !== undefined && values.team !== null && values.team !== '';
    const hasParticipants = Array.isArray(values.participant_ids) && values.participant_ids.length > 0;

    if (!hasTeam && !hasParticipants) {
      message.error('Please assign a team or invite at least one individual participant.');
      return;
    }

    setSubmitting(true);

    const payload = {
      title: values.title,
      description: values.description,
      meeting_date: values.meeting_date.format('YYYY-MM-DD'),
      start_time: values.time_range[0].format('HH:mm:ss'),
      end_time: values.time_range[1].format('HH:mm:ss'),
      location: values.location,
      meeting_type: values.meeting_type,
      team: values.team ? Number(values.team) : null,
      participant_ids: selectedParticipants,
      is_recurring: values.is_recurring || false,
      recurrence_pattern: values.is_recurring ? (values.recurrence_pattern || 'DAILY') : null,
      recurrence_end_date: values.is_recurring && values.recurrence_end_date ? values.recurrence_end_date.format('YYYY-MM-DD') : null,
      update_series: values.update_series || false
    };

    try {
      await meetingService.updateMeeting(meeting.id, payload);
      message.success('Meeting details updated successfully!');
      onSuccess();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.participant_ids?.[0] || err.response?.data?.detail || err.response?.data?.end_time?.[0] || 'Failed to update meeting details.';
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Edit Meeting Details"
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={submitting}
      okText="Update Meeting"
      width={960}
      style={{ maxWidth: '95vw' }}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        className="pt-2 px-1"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* LEFT COLUMN: Title, Type/Location, Description */}
          <div className="space-y-4">
            <Form.Item
              name="title"
              label="Meeting Title"
              rules={[{ required: true, message: 'Please enter meeting title' }]}
              className="m-0"
            >
              <Input id="title" name="title" placeholder="e.g. Q3 Architecture & API Response Time Review" />
            </Form.Item>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Form.Item name="meeting_type" label="Meeting Type" rules={[{ required: true }]} className="m-0">
                <Select id="meeting_type" name="meeting_type" options={[
                  { label: 'Internal', value: 'INTERNAL' },
                  { label: 'Client', value: 'CLIENT' },
                  { label: 'Project', value: 'PROJECT' },
                  { label: 'Review', value: 'REVIEW' },
                  { label: 'Planning', value: 'PLANNING' },
                  { label: 'Other', value: 'OTHER' }
                ]} />
              </Form.Item>

              <Form.Item name="location" label="Location / Link" rules={[{ required: true }]} className="m-0">
                <Select
                  id="location"
                  name="location"
                  mode="combobox"
                  placeholder="Select or enter location / link"
                  options={[
                    { label: 'Conference Room A', value: 'Conference Room A' },
                    { label: 'Conference Room B', value: 'Conference Room B' },
                    { label: 'Google Meet (Public)', value: 'Google Meet: https://meet.google.com (Public)' },
                    { label: 'Google Meet (Protected)', value: 'Google Meet: https://meet.google.com (Protected)' }
                  ]}
                />
              </Form.Item>
            </div>

            <Form.Item name="description" label="Meeting Agenda & Description" className="m-0">
              <Input.TextArea id="description" name="description" rows={5} placeholder="Outline key topics to discuss..." />
            </Form.Item>
          </div>

          {/* RIGHT COLUMN: Date/Time, Team/Participants, Recurrence */}
          <div className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-1 gap-3">
                <Form.Item
                  name="meeting_date"
                  label="Meeting Date"
                  rules={[{ required: true, message: 'Please select meeting date' }]}
                  className="m-0"
                >
                  <DatePicker id="meeting_date" name="meeting_date" className="w-full" disabledDate={(current) => current && current.isBefore(dayjs().startOf('day'))} />
                </Form.Item>

                <Form.Item
                  name="time_range"
                  label="Start & End Time"
                  rules={[{ required: true, message: 'Please select time range' }]}
                  className="m-0"
                >
                  <TimePicker.RangePicker 
                    id="time_range" 
                    name="time_range" 
                    className="custom-range-picker" 
                    format="HH:mm" 
                    disabledTime={() => {
                      const selectedDate = form.getFieldValue('meeting_date');
                      if (!selectedDate || !selectedDate.isSame(dayjs(), 'day')) {
                        return {};
                      }
                      const now = dayjs();
                      const currentHour = now.hour();
                      const currentMinute = now.minute();
                      return {
                        disabledHours: () => Array.from({ length: currentHour }, (_, i) => i),
                        disabledMinutes: (selectedHour) => {
                          if (selectedHour === currentHour) {
                            return Array.from({ length: currentMinute }, (_, i) => i);
                          }
                          return [];
                        }
                      };
                    }}
                  />
                </Form.Item>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Form.Item
                name="team"
                label="Assign to Team (Optional)"
                className="m-0"
              >
                <Select
                  id="team"
                  name="team"
                  placeholder="Select team"
                  allowClear
                  optionLabelProp="label"
                >
                  {teams.map((t) => (
                    <Select.Option key={t.id} value={t.id} label={t.name}>
                      <div className="flex items-center justify-between w-full py-0.5">
                        <span className="font-medium text-xs text-slate-800 dark:text-slate-200">{t.name}</span>
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-slate-800 px-2 py-0.5 rounded-full flex items-center ml-2 shrink-0">
                          {t.members_detail?.length || (t.members ? t.members.length : 0)} members
                        </span>
                      </div>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="participant_ids"
                label="Invite Individual Participants"
                className="m-0"
              >
                <Select
                  id="participant_ids"
                  name="participant_ids"
                  mode="multiple"
                  placeholder={selectedTeamObj ? "Additional participants" : "Select participants"}
                  options={availableIndividualUsers.map(u => ({ label: `${u.full_name} (${u.role})`, value: u.id }))}
                />
              </Form.Item>
            </div>

            {/* RECURRING MEETING CONFIGURATION */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 [&_.ant-form-item-label]:!pb-0 [&_.ant-form-item-label]:!pt-0 [&_.ant-form-item-label>label]:!h-auto [&_.ant-form-item-label>label]:!min-h-0 [&_.ant-form-item-row]:!mb-0 [&_.ant-form-item-control-input]:!min-h-0">
              <Form.Item name="is_recurring" valuePropName="checked" className="!m-0" style={{ marginBottom: 0 }}>
                <Checkbox id="is_recurring" name="is_recurring" className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                  <span className="flex items-center gap-1.5">
                    <SyncOutlined className="text-purple-600 dark:text-purple-400" />
                    Repeat this meeting automatically (e.g. Daily Client Sync)
                  </span>
                </Checkbox>
              </Form.Item>

              {isRecurring && (
                <div className="mt-1.5 space-y-1.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Form.Item name="recurrence_pattern" label="Repeat Frequency (How Often)" className="!m-0" style={{ marginBottom: 0 }}>
                      <Select
                        id="recurrence_pattern"
                        name="recurrence_pattern"
                        options={[
                          { label: 'Daily (Every day)', value: 'DAILY' },
                          { label: 'Weekdays (Mon - Fri)', value: 'WEEKDAYS' },
                          { label: 'Weekly (Same day)', value: 'WEEKLY' },
                        ]}
                      />
                    </Form.Item>

                    <Form.Item name="recurrence_end_date" label="Repeat Until Date" className="!m-0" style={{ marginBottom: 0 }}>
                      <DatePicker
                        id="recurrence_end_date"
                        name="recurrence_end_date"
                        className="w-full"
                        placeholder="Select end date"
                      />
                    </Form.Item>
                  </div>

                  {meeting?.recurrence_group_id && (
                    <div className="pt-0.5">
                      <Form.Item name="update_series" valuePropName="checked" className="!m-0" style={{ marginBottom: 0 }}>
                        <Checkbox className="text-xs text-purple-700 dark:text-purple-300 font-bold">
                          Apply changes to all future meetings in this recurring series
                        </Checkbox>
                      </Form.Item>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </Form>
    </Modal>
  );
};
