'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { meetingService, userService, teamService } from '../../../services/api.js';
import {
  Form, Input, Select, DatePicker, TimePicker, Button, Card, message, Typography
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function CreateMeetingPage() {
  const [form] = Form.useForm();
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
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
  }, []);

  const onFinish = async (values) => {
    setSubmitting(true);
    const payload = {
      title: values.title,
      description: values.description,
      meeting_date: values.meeting_date.format('YYYY-MM-DD'),
      start_time: values.time_range[0].format('HH:mm:ss'),
      end_time: values.time_range[1].format('HH:mm:ss'),
      location: values.location || 'Virtual / Zoom',
      meeting_type: values.meeting_type,
      status: values.status,
      team: values.team || undefined,
      participant_ids: values.participant_ids || []
    };

    try {
      const created = await meetingService.createMeeting(payload);
      message.success('Meeting scheduled successfully!');
      window.location.href = `/meetings/${created.id}`;
    } catch (err) {
      const msg = err.response?.data?.end_time?.[0] || err.response?.data?.detail || 'Failed to create meeting.';
      message.error(msg);
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      
      <div className="flex items-center space-x-3">
        <Link href="/meetings">
          <Button icon={<ArrowLeftOutlined />} shape="circle" />
        </Link>
        <div>
          <h1 className="m-0 text-slate-900 dark:text-white font-bold text-2xl">
            Schedule New Meeting
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm m-0">
            Set up meeting details, assign teams and invite participants
          </p>
        </div>
      </div>

      <Card className="shadow-xs rounded-2xl border border-slate-200/80 dark:border-slate-700/80 dark:bg-slate-800">
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            meeting_type: 'INTERNAL',
            status: 'SCHEDULED',
            location: 'Virtual / Zoom',
            meeting_date: dayjs()
          }}
          size="large"
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            <Form.Item name="status" label="Initial Status" rules={[{ required: true }]}>
              <Select options={[
                { label: 'Scheduled', value: 'SCHEDULED' },
                { label: 'In Progress', value: 'IN_PROGRESS' },
                { label: 'Completed', value: 'COMPLETED' },
                { label: 'Cancelled', value: 'CANCELLED' }
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
              help="Selecting a team automatically invites all members of that team."
            >
              <Select
                placeholder="Select team (e.g. Engineering Lead Team)"
                allowClear
                options={teams.map(t => ({ label: `${t.name} (${t.members_detail?.length || 0} members)`, value: t.id }))}
              />
            </Form.Item>

            <Form.Item
              name="participant_ids"
              label="Invite Individual Participants"
            >
              <Select
                mode="multiple"
                placeholder="Select individual team members"
                options={users.map(u => ({ label: `${u.full_name} (${u.role})`, value: u.id }))}
              />
            </Form.Item>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end space-x-3">
            <Link href="/meetings">
              <Button size="large" className="rounded-xl">Cancel</Button>
            </Link>
            <Button type="primary" htmlType="submit" loading={submitting} size="large" className="bg-blue-600 hover:bg-blue-700 font-semibold rounded-xl border-none">
              Schedule Meeting
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
