import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { meetingService, userService, teamService } from '../services/api.js';
import {
  Form, Input, Select, DatePicker, TimePicker, Button, Card, Checkbox, Radio, ConfigProvider, Popover, Tag, App
} from 'antd';
import { ArrowLeftOutlined, VideoCameraOutlined, EnvironmentOutlined, LockOutlined, MailOutlined, SyncOutlined, TeamOutlined, UserOutlined, RightOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

export default function CreateMeeting() {
  const { message } = App.useApp();
  const navigate = useNavigate();

  const [form] = Form.useForm();
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Form watch states
  const locationType = Form.useWatch('location_type', form) || 'GOOGLE_MEET';
  const accessType = Form.useWatch('access_type', form) || 'PUBLIC';
  const needsReminder = Form.useWatch('needs_reminder', form) || false;
  const isRecurring = Form.useWatch('is_recurring', form) || false;
  const recurrenceDuration = Form.useWatch('recurrence_duration', form) || '14_DAYS';
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
    Promise.all([
      userService.getUsers(),
      teamService.getTeams()
    ])
      .then(([uRes, tRes]) => {
        const uList = uRes.results || uRes || [];
        const uniqueMap = new Map();
        uList.forEach(u => uniqueMap.set(u.id, u));
        setUsers(Array.from(uniqueMap.values()));
        setTeams(tRes.results || tRes || []);
      })
      .catch(() => {
        setUsers([]);
        setTeams([]);
      });
  }, []);

  const onFinish = async (values) => {
    setSubmitting(true);

    let computedLocation = 'Conference Room A';
    if (values.location_type === 'GOOGLE_MEET') {
      let meetLink = (values.google_meet_link || '').trim();
      if (meetLink && !meetLink.startsWith('http://') && !meetLink.startsWith('https://')) {
        meetLink = `https://${meetLink}`;
      }
      if (!meetLink) meetLink = 'https://meet.google.com';

      if (values.access_type === 'PROTECTED' && values.google_meet_password) {
        computedLocation = `Google Meet: ${meetLink} (Pass: ${values.google_meet_password})`;
      } else {
        computedLocation = `Google Meet: ${meetLink} (Public)`;
      }
    } else {
      computedLocation = values.conference_room || 'Conference Room A';
    }

    let recurrenceEndDate = undefined;
    if (values.is_recurring) {
      if (values.recurrence_duration === '7_DAYS') {
        recurrenceEndDate = values.meeting_date.add(7, 'day').format('YYYY-MM-DD');
      } else if (values.recurrence_duration === '14_DAYS') {
        recurrenceEndDate = values.meeting_date.add(14, 'day').format('YYYY-MM-DD');
      } else if (values.recurrence_duration === '30_DAYS') {
        recurrenceEndDate = values.meeting_date.add(30, 'day').format('YYYY-MM-DD');
      } else if (values.recurrence_duration === 'CUSTOM' && values.recurrence_end_date) {
        recurrenceEndDate = values.recurrence_end_date.format('YYYY-MM-DD');
      } else {
        recurrenceEndDate = values.meeting_date.add(14, 'day').format('YYYY-MM-DD');
      }
    }

    const payload = {
      title: values.title,
      description: values.description,
      meeting_date: values.meeting_date.format('YYYY-MM-DD'),
      start_time: values.time_range[0].format('HH:mm:ss'),
      end_time: values.time_range[1].format('HH:mm:ss'),
      location: computedLocation,
      meeting_type: values.meeting_type,
      team: values.team || undefined,
      participant_ids: values.participant_ids || [],
      is_recurring: values.is_recurring || false,
      recurrence_pattern: values.is_recurring ? (values.recurrence_pattern || 'DAILY') : undefined,
      recurrence_end_date: recurrenceEndDate
    };

    try {
      const created = await meetingService.createMeeting(payload);
      
      if (values.needs_reminder) {
        try {
          await meetingService.sendMeetingReminder(created.id);
        } catch {
          // ignore notification fallback error
        }
      }

      message.success('Meeting scheduled successfully!');
      navigate(`/meetings/${created.id}`);
    } catch (err) {
      const msg = err.response?.data?.end_time?.[0] || err.response?.data?.detail || 'Failed to create meeting.';
      message.error(msg);
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      
      <div className="flex items-center space-x-3">
        <Link to="/meetings" className="no-underline">
          <Button icon={<ArrowLeftOutlined />} shape="circle" />
        </Link>
        <div>
          <h1 className="m-0 text-slate-900 dark:text-white font-bold text-2xl">
            Schedule New Meeting
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs m-0">
            Set up meeting details, location link, teams, and participants
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
            location_type: 'GOOGLE_MEET',
            access_type: 'PUBLIC',
            conference_room: 'Conference Room A',
            meeting_date: dayjs(),
            needs_reminder: false,
            is_recurring: false,
            recurrence_pattern: 'DAILY',
            recurrence_duration: '14_DAYS'
          }}
          size="middle"
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* LEFT COLUMN (6 cols): Primary Details & Location */}
            <div className="md:col-span-6 lg:col-span-6 space-y-4">
              <Form.Item
                name="title"
                label="Meeting Title"
                rules={[{ required: true, message: 'Please enter meeting title' }]}
                className="m-0"
              >
                <Input id="create_meeting_title" name="title" placeholder="e.g. Q3 Architecture & API Response Time Review" />
              </Form.Item>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Form.Item name="meeting_type" label="Meeting Type" rules={[{ required: true }]} className="m-0">
                  <Select id="create_meeting_type" name="meeting_type" options={[
                    { label: 'Internal', value: 'INTERNAL' },
                    { label: 'Client', value: 'CLIENT' },
                    { label: 'Project', value: 'PROJECT' },
                    { label: 'Review', value: 'REVIEW' },
                    { label: 'Planning', value: 'PLANNING' },
                    { label: 'Other', value: 'OTHER' }
                  ]} />
                </Form.Item>

                <Form.Item name="location_type" label="Location / Link" rules={[{ required: true }]} className="m-0">
                  <Select id="create_location_type" name="location_type" options={[
                    { label: '🏢 Conference Room', value: 'CONFERENCE_ROOM' },
                    { label: '📹 Google Meet', value: 'GOOGLE_MEET' }
                  ]} />
                </Form.Item>
              </div>

              {locationType === 'CONFERENCE_ROOM' ? (
                <Form.Item
                  name="conference_room"
                  label="Conference Room Details"
                  rules={[{ required: true, message: 'Please specify conference room' }]}
                  className="m-0"
                >
                  <Input id="create_conference_room" name="conference_room" prefix={<EnvironmentOutlined className="text-blue-500" />} placeholder="e.g. Conference Room A - Floor 3" />
                </Form.Item>
              ) : (
                <div className="space-y-3 bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <Form.Item
                    name="google_meet_link"
                    label="Enter Google Meeting Link"
                    rules={[
                      { required: true, message: 'Please enter Google Meet link' },
                      {
                        pattern: /^(https?:\/\/)?(meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}|meet\.google\.com\/[a-zA-Z0-9_-]+)(\?.*)?$/i,
                        message: 'Invalid Google Meet URL format. Use format: https://meet.google.com/abc-defg-hij'
                      }
                    ]}
                    className="m-0"
                  >
                    <Input
                      id="create_google_meet_link"
                      name="google_meet_link"
                      prefix={<VideoCameraOutlined className="text-blue-500 mr-1" />}
                      placeholder="https://meet.google.com/abc-defg-hij"
                      addonAfter={
                        <Form.Item name="access_type" noStyle initialValue="PUBLIC">
                          <Select
                            id="create_access_type"
                            name="access_type"
                            className="w-40 font-semibold text-xs"
                            options={[
                              { label: 'Public (no pass)', value: 'PUBLIC' },
                              { label: 'With Password', value: 'PROTECTED' }
                            ]}
                          />
                        </Form.Item>
                      }
                    />
                  </Form.Item>

                  {accessType === 'PROTECTED' && (
                    <Form.Item
                      name="google_meet_password"
                      label="Meet Password"
                      rules={[{ required: true, message: 'Please enter meeting password' }]}
                      className="m-0 pt-1"
                    >
                      <Input.Password id="create_google_meet_password" name="google_meet_password" prefix={<LockOutlined className="text-amber-500" />} placeholder="Enter password" />
                    </Form.Item>
                  )}
                </div>
              )}

              <Form.Item name="description" label="Meeting Agenda & Description" className="m-0">
                <Input.TextArea id="create_meeting_description" name="description" rows={3} placeholder="Outline key topics to discuss..." />
              </Form.Item>
            </div>

            {/* RIGHT COLUMN (6 cols): Date, Time, Team & Participants, Reminder */}
            <div className="md:col-span-6 lg:col-span-6 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-900/50 p-3 sm:p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 sm:gap-3">
                  <Form.Item
                    name="meeting_date"
                    label="Meeting Date"
                    rules={[{ required: true, message: 'Please select meeting date' }]}
                    className="m-0 sm:col-span-5 min-w-0"
                  >
                    <DatePicker id="create_meeting_date" name="meeting_date" style={{ width: '100%' }} disabledDate={(current) => current && current.isBefore(dayjs().startOf('day'))} />
                  </Form.Item>

                  <Form.Item
                    name="time_range"
                    label="Start & End Time"
                    rules={[{ required: true, message: 'Please select time range' }]}
                    className="m-0 sm:col-span-7 min-w-0"
                  >
                    <TimePicker.RangePicker id="create_time_range" name="time_range" style={{ width: '100%' }} format="HH:mm" />
                  </Form.Item>
                </div>
              </div>

              <Form.Item
                name="team"
                label="Assign to Team (Optional)"
                help="Selecting a team automatically invites all members of that team."
                className="m-0"
              >
                <Select
                  id="create_meeting_team"
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
                    ? `Members of "${selectedTeamObj.name}" are automatically invited and hidden from this list.`
                    : "Select additional individual users to invite."
                }
                className="m-0"
              >
                <Select
                  id="create_participant_ids"
                  name="participant_ids"
                  mode="multiple"
                  placeholder={selectedTeamObj ? "Select additional non-team participants" : "Select team members"}
                  options={availableIndividualUsers.map(u => ({ label: `${u.full_name} • ${u.email} (${u.role})`, value: u.id }))}
                />
              </Form.Item>

              <ConfigProvider
                theme={{
                  components: {
                    Checkbox: {
                      colorPrimary: "rgb(8,8,8)",
                      colorPrimaryHover: "rgb(0,0,0)"
                    }
                  }
                }}
              >
                {/* RECURRING MEETING CONFIGURATION */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <Form.Item name="is_recurring" valuePropName="checked" className="m-0">
                    <Checkbox className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                      <span className="flex items-center gap-1.5">
                        <SyncOutlined className="text-purple-600 dark:text-purple-400" />
                        Repeat this meeting automatically (e.g. Daily Client Sync)
                      </span>
                    </Checkbox>
                  </Form.Item>

                  {isRecurring && (
                    <div className="pt-2.5 border-t border-slate-200 dark:border-slate-700 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Form.Item name="recurrence_pattern" label="Repeat Frequency (How Often)" className="m-0">
                          <Select
                            id="create_recurrence_pattern"
                            name="recurrence_pattern"
                            options={[
                              { label: '🔁 Daily (Every day)', value: 'DAILY' },
                              { label: '💼 Weekdays (Mon - Fri)', value: 'WEEKDAYS' },
                              { label: '📅 Weekly (Same day)', value: 'WEEKLY' },
                            ]}
                          />
                        </Form.Item>

                        <Form.Item name="recurrence_duration" label="Repeat Duration (How Long)" className="m-0">
                          <Select
                            id="create_recurrence_duration"
                            name="recurrence_duration"
                            options={[
                              { label: 'For 7 Days (1 Week)', value: '7_DAYS' },
                              { label: 'For 14 Days (2 Weeks)', value: '14_DAYS' },
                              { label: 'For 30 Days (1 Month)', value: '30_DAYS' },
                              { label: 'Until Custom End Date', value: 'CUSTOM' },
                            ]}
                          />
                        </Form.Item>
                      </div>

                      {recurrenceDuration === 'CUSTOM' && (
                        <Form.Item
                          name="recurrence_end_date"
                          label="Repeat Until Date"
                          rules={[{ required: true, message: 'Please select end date' }]}
                          className="m-0"
                        >
                          <DatePicker
                            id="create_recurrence_end_date"
                            name="recurrence_end_date"
                            style={{ width: '100%' }}
                            disabledDate={(current) => current && current <= dayjs().endOf('day')}
                          />
                        </Form.Item>
                      )}

                      <div className="text-[11px] text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/30 p-2 rounded-lg border border-purple-200 dark:border-purple-800">
                        ✨ SMDT will automatically generate daily meeting instances for each day so you can record decisions and action items per session.
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <Form.Item name="needs_reminder" valuePropName="checked" className="m-0">
                    <Checkbox className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                      Needs to send reminder when scheduling meeting
                    </Checkbox>
                  </Form.Item>

                  {needsReminder && (
                    <div className="pt-1.5 text-[11px] text-slate-600 dark:text-slate-400 flex items-center space-x-1.5 border-t border-slate-200 dark:border-slate-700">
                      <MailOutlined className="text-blue-500" />
                      <span>
                        Automated email reminder & Send Password option will be initialized.
                      </span>
                    </div>
                  )}
                </div>
              </ConfigProvider>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end space-x-3">
                <Link to="/meetings" className="no-underline">
                  <Button className="rounded-xl">Cancel</Button>
                </Link>
                <Button type="primary" htmlType="submit" loading={submitting} className="bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl border-none">
                  Schedule Meeting
                </Button>
              </div>
            </div>

          </div>
        </Form>
      </Card>
    </div>
  );
}
