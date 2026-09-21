'use client';

import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, DatePicker, TimePicker, message, Popover, Tag } from 'antd';
import { TeamOutlined, UserOutlined, RightOutlined } from '@ant-design/icons';
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

      // Ensure at least creator or existing participants are populated
      let participantIds = Array.isArray(meeting.participants)
        ? meeting.participants
        : meeting.participants_detail
        ? meeting.participants_detail.map(p => p.id)
        : [];

      if (participantIds.length === 0 && meeting.created_by) {
        participantIds = [meeting.created_by];
      }

      form.setFieldsValue({
        title: meeting.title,
        description: meeting.description,
        meeting_date: dayjs(meeting.meeting_date),
        time_range: [startTime, endTime],
        location: meeting.location,
        meeting_type: meeting.meeting_type,
        team: meeting.team,
        participant_ids: participantIds
      });
    }
  }, [meeting, open, form]);

  const handleFinish = async (values) => {
    setSubmitting(true);
    let selectedParticipants = values.participant_ids || [];

    // Ensure meeting never has 0 participants: retain creator if empty
    if (selectedParticipants.length === 0 && meeting?.created_by) {
      selectedParticipants = [meeting.created_by];
    }

    const payload = {
      title: values.title,
      description: values.description,
      meeting_date: values.meeting_date.format('YYYY-MM-DD'),
      start_time: values.time_range[0].format('HH:mm:ss'),
      end_time: values.time_range[1].format('HH:mm:ss'),
      location: values.location,
      meeting_type: values.meeting_type,
      team: values.team || null,
      participant_ids: selectedParticipants
    };

    try {
      await meetingService.updateMeeting(meeting.id, payload);
      message.success('Meeting details updated successfully!');
      onSuccess();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.end_time?.[0] || 'Failed to update meeting details.';
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
      width={650}
      style={{ maxWidth: '95vw' }}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        className="pt-2"
      >
        <Form.Item
          name="title"
          label="Meeting Title"
          rules={[{ required: true, message: 'Please enter meeting title' }]}
        >
          <Input id="edit_meeting_title" name="title" placeholder="e.g. Q3 Architecture & API Response Time Review" />
        </Form.Item>

        <Form.Item name="description" label="Meeting Agenda & Description">
          <Input.TextArea id="edit_meeting_description" name="description" rows={3} placeholder="Outline key topics to discuss..." />
        </Form.Item>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item
            name="meeting_date"
            label="Meeting Date"
            rules={[{ required: true, message: 'Please select meeting date' }]}
          >
            <DatePicker id="edit_meeting_date" name="meeting_date" className="w-full" disabledDate={(current) => current && current.isBefore(dayjs().startOf('day'))} />
          </Form.Item>

          <Form.Item
            name="time_range"
            label="Start & End Time"
            rules={[{ required: true, message: 'Please select time range' }]}
          >
            <TimePicker.RangePicker 
              id="edit_meeting_time_range" 
              name="time_range" 
              className="w-full" 
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item name="meeting_type" label="Meeting Type" rules={[{ required: true }]}>
            <Select id="edit_meeting_type" name="meeting_type" options={[
              { label: 'Internal', value: 'INTERNAL' },
              { label: 'Client', value: 'CLIENT' },
              { label: 'Project', value: 'PROJECT' },
              { label: 'Review', value: 'REVIEW' },
              { label: 'Planning', value: 'PLANNING' },
              { label: 'Other', value: 'OTHER' }
            ]} />
          </Form.Item>

          <Form.Item name="location" label="Location / Link" rules={[{ required: true }]}>
            <Select
              id="edit_meeting_location"
              name="location"
              mode="combobox"
              placeholder="Select or enter location / link"
              options={[
                { label: '🏢 Conference Room A', value: 'Conference Room A' },
                { label: '🏢 Conference Room B', value: 'Conference Room B' },
                { label: '📹 Google Meet (Public)', value: 'Google Meet: https://meet.google.com (Public)' },
                { label: '🔒 Google Meet (Protected)', value: 'Google Meet: https://meet.google.com (Protected)' }
              ]}
            />
          </Form.Item>
        </div>


        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item
            name="team"
            label="Assign to Team (Optional)"
          >
            <Select
              id="edit_meeting_team"
              name="team"
              placeholder="Select team"
              allowClear
              optionLabelProp="label"
            >
              {teams.map((t) => (
                <Select.Option key={t.id} value={t.id} label={t.name}>
                  <Popover
                    placement="right"
                    mouseEnterDelay={0.15}
                    title={
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700 pb-1">
                        <TeamOutlined className="text-blue-500" />
                        <span>{t.name} Members ({t.members_detail?.length || 0})</span>
                      </div>
                    }
                    content={
                      <div className="max-h-48 overflow-y-auto space-y-1.5 min-w-[220px] py-1">
                        {t.members_detail && t.members_detail.length > 0 ? (
                          t.members_detail.map((m) => (
                            <div key={m.id} className="flex items-center space-x-2 text-xs py-0.5">
                              <UserOutlined className="text-slate-400 text-[10px] shrink-0" />
                              <div className="flex-1 min-w-0">
                                <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">{m.full_name || m.username}</span>
                                <span className="text-[10px] text-slate-400 block truncate">{m.email}</span>
                              </div>
                              <Tag color="blue" className="text-[9px] m-0 font-bold uppercase shrink-0">{m.role}</Tag>
                            </div>
                          ))
                        ) : (
                          <p className="text-slate-400 text-xs italic m-0">No members assigned</p>
                        )}
                      </div>
                    }
                  >
                    <div className="flex items-center justify-between w-full py-0.5">
                      <span className="font-medium text-xs text-slate-800 dark:text-slate-200">{t.name}</span>
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-slate-800 px-2 py-0.5 rounded-full flex items-center space-x-1 ml-2 shrink-0">
                        <span>{t.members_detail?.length || 0} members</span>
                        <RightOutlined className="text-[8px]" />
                      </span>
                    </div>
                  </Popover>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="participant_ids"
            label="Invite Individual Participants"
            help={
              selectedTeamObj
                ? `Members of "${selectedTeamObj.name}" are automatically included and hidden from this list.`
                : undefined
            }
          >
            <Select
              id="edit_meeting_participant_ids"
              name="participant_ids"
              mode="multiple"
              placeholder={selectedTeamObj ? "Select additional non-team participants" : "Select participants"}
              options={availableIndividualUsers.map(u => ({ label: `${u.full_name} (${u.role})`, value: u.id }))}
            />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
};
