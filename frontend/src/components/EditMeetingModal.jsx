'use client';

import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, DatePicker, TimePicker, message } from 'antd';
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
      destroyOnClose
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
          <Input placeholder="e.g. Q3 Architecture & API Response Time Review" />
        </Form.Item>

        <Form.Item name="description" label="Meeting Agenda & Description">
          <Input.TextArea rows={3} placeholder="Outline key topics to discuss..." />
        </Form.Item>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item
            name="meeting_date"
            label="Meeting Date"
            rules={[{ required: true, message: 'Please select meeting date' }]}
          >
            <DatePicker className="w-full" />
          </Form.Item>

          <Form.Item
            name="time_range"
            label="Start & End Time"
            rules={[{ required: true, message: 'Please select time range' }]}
          >
            <TimePicker.RangePicker className="w-full" format="HH:mm" />
          </Form.Item>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item name="meeting_type" label="Meeting Type" rules={[{ required: true }]}>
            <Select options={[
              { label: 'Internal', value: 'INTERNAL' },
              { label: 'Client', value: 'CLIENT' },
              { label: 'Project', value: 'PROJECT' },
              { label: 'Review', value: 'REVIEW' },
              { label: 'Planning', value: 'PLANNING' },
              { label: 'Other', value: 'OTHER' }
            ]} />
          </Form.Item>

          <Form.Item name="location" label="Location / Link">
            <Input placeholder="Virtual / Zoom / Conf Room A" />
          </Form.Item>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item
            name="team"
            label="Assign to Team (Optional)"
          >
            <Select
              placeholder="Select team"
              allowClear
              options={teams.map(t => ({ label: `${t.name} (${t.members_detail?.length || 0} members)`, value: t.id }))}
            />
          </Form.Item>

          <Form.Item
            name="participant_ids"
            label="Invite Individual Participants"
            rules={[{ required: true, message: 'At least 1 participant (or host) is required.' }]}
          >
            <Select
              mode="multiple"
              placeholder="Select participants"
              options={users.map(u => ({ label: `${u.full_name} (${u.role})`, value: u.id }))}
            />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
};
