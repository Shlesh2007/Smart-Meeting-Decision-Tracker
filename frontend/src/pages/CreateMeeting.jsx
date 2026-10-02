import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { meetingService, userService, teamService } from '../services/api.js';
import { getErrorMessage } from '../utils/errorHandler.js';
import {
  Form, Input, Select, DatePicker, TimePicker, Button, Card, Checkbox, Radio, ConfigProvider, Popover, Tag, App, Space
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
  const meetingType = Form.useWatch('meeting_type', form) || 'INTERNAL';
  const locationType = Form.useWatch('location_type', form) || 'CONFERENCE_ROOM';
  const accessType = Form.useWatch('access_type', form) || 'PUBLIC';
  const needsReminder = Form.useWatch('needs_reminder', form) || false;
  const isRecurring = Form.useWatch('is_recurring', form) || false;
  const recurrenceDuration = Form.useWatch('recurrence_duration', form) || '14_DAYS';
  const recurrencePattern = Form.useWatch('recurrence_pattern', form) || 'DAILY';
  const selectedTeamId = Form.useWatch('team', form);

  // Automatically select location_type based on meeting_type: Conference Room for Internal, Google Meet for any other type
  useEffect(() => {
    if (meetingType === 'INTERNAL') {
      form.setFieldsValue({ location_type: 'CONFERENCE_ROOM' });
    } else {
      form.setFieldsValue({ location_type: 'GOOGLE_MEET' });
    }
  }, [meetingType, form]);

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
        const pattern = values.recurrence_pattern || 'DAILY';
        const meetingDateStart = values.meeting_date.startOf('day');
        const endDateStart = values.recurrence_end_date.startOf('day');

        if (endDateStart.isSame(meetingDateStart) || endDateStart.isBefore(meetingDateStart)) {
          message.error('Repeat Until Date cannot be the same as or before the meeting start date.');
          setSubmitting(false);
          return;
        }

        if (pattern === 'WEEKLY') {
          const minEndDate = values.meeting_date.add(7, 'day').startOf('day');
          if (endDateStart.isBefore(minEndDate)) {
            message.error('Repeat Until Date must be at least 1 week (7 days) after the meeting start date for weekly recurring meetings.');
            setSubmitting(false);
            return;
          }
        }
        recurrenceEndDate = values.recurrence_end_date.format('YYYY-MM-DD');
      } else {
        recurrenceEndDate = values.meeting_date.add(14, 'day').format('YYYY-MM-DD');
      }
    }

    const meetingDateStr = values.meeting_date.format('YYYY-MM-DD');
    const startTimeStr = values.time_range[0].format('HH:mm:ss');
    const meetingStartDateTime = dayjs(`${meetingDateStr} ${startTimeStr}`);

    const hasTeam = values.team !== undefined && values.team !== null && values.team !== '';
    const hasParticipants = Array.isArray(values.participant_ids) && values.participant_ids.length > 0;

    if (!hasTeam && !hasParticipants) {
      message.error('Please assign a team or invite at least one individual participant.');
      setSubmitting(false);
      return;
    }

    if (meetingStartDateTime.isBefore(dayjs().subtract(2, 'minute'))) {
      message.error('Meeting start time cannot be scheduled in the past.');
      setSubmitting(false);
      return;
    }

    const payload = {
      title: values.title,
      description: values.description,
      meeting_date: meetingDateStr,
      start_time: startTimeStr,
      end_time: values.time_range[1].format('HH:mm:ss'),
      location: computedLocation,
      meeting_type: values.meeting_type,
      team: values.team ? Number(values.team) : null,
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
      message.error(getErrorMessage(err, 'Failed to create meeting. Please check form fields.'));
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <style>{`
        .compact-meet-space.ant-space-compact-block {
          display: flex !important;
          width: 100% !important;
        }
        .compact-meet-space.ant-space-compact-block > .ant-space-compact-item:first-child,
        .compact-meet-space.ant-space-compact-block > .ant-space-compact-item:first-child .ant-input-affix-wrapper,
        .compact-meet-input,
        .compact-meet-input.ant-input-affix-wrapper {
          flex: 1 1 auto !important;
          min-width: 0 !important;
          border-top-right-radius: 0 !important;
          border-bottom-right-radius: 0 !important;
          border-start-end-radius: 0 !important;
          border-end-end-radius: 0 !important;
          border-top-left-radius: 8px !important;
          border-bottom-left-radius: 8px !important;
          border-start-start-radius: 8px !important;
          border-end-start-radius: 8px !important;
        }
        .compact-meet-space.ant-space-compact-block > .ant-space-compact-item:last-child {
          flex: 0 0 110px !important;
          width: 110px !important;
          min-width: 110px !important;
          max-width: 110px !important;
          margin-inline-start: -1px !important;
        }
        .compact-meet-space.ant-space-compact-block > .ant-space-compact-item:last-child,
        .compact-meet-space.ant-space-compact-block > .ant-space-compact-item:last-child .ant-select-selector,
        .compact-meet-select,
        .compact-meet-select .ant-select-selector {
          border-top-left-radius: 0 !important;
          border-bottom-left-radius: 0 !important;
          border-start-start-radius: 0 !important;
          border-end-start-radius: 0 !important;
          border-top-right-radius: 8px !important;
          border-bottom-right-radius: 8px !important;
          border-start-end-radius: 8px !important;
          border-end-end-radius: 8px !important;
        }
        .custom-range-picker.ant-picker-range {
          width: 100% !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
          display: flex !important;
          padding-left: 8px !important;
          padding-right: 8px !important;
        }
        .custom-range-picker.ant-picker-range .ant-picker-input {
          min-width: 0 !important;
          flex: 1 1 0% !important;
          display: flex !important;
        }
        .custom-range-picker.ant-picker-range .ant-picker-input > input {
          width: 0 !important;
          min-width: 0 !important;
          flex: 1 1 0% !important;
          text-align: center !important;
          font-size: 12px !important;
          padding: 0 !important;
        }
        .custom-range-picker.ant-picker-range .ant-picker-range-separator {
          padding: 0 2px !important;
        }
        .custom-range-picker.ant-picker-range .ant-picker-suffix {
          margin-left: 2px !important;
        }
      `}</style>
      
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
          disabled={submitting}
          initialValues={{
            meeting_type: 'INTERNAL',
            location_type: 'CONFERENCE_ROOM',
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* LEFT COLUMN (6 cols): Primary Details & Location */}
            <div className="lg:col-span-6 space-y-4">
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

                <Form.Item name="location_type" label="Location / Link" rules={[{ required: true }]} className="m-0">
                  <Select id="location_type" name="location_type" options={[
                    { label: 'Conference Room', value: 'CONFERENCE_ROOM' },
                    { label: 'Google Meet', value: 'GOOGLE_MEET' }
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
                  <Input id="conference_room" name="conference_room" prefix={<EnvironmentOutlined className="text-blue-500" />} placeholder="e.g. Conference Room A - Floor 3" />
                </Form.Item>
              ) : (
                <div className="space-y-3 bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <Form.Item
                    label={<span className="font-semibold text-slate-700 dark:text-slate-300">Enter Google Meeting Link</span>}
                    className="m-0"
                  >
                    <Space.Compact block className="compact-meet-space">
                      <Form.Item
                        name="google_meet_link"
                        noStyle
                        rules={[
                          { required: true, message: 'Please enter Google Meet link' },
                          {
                            pattern: /^(https?:\/\/)?(meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}|meet\.google\.com\/[a-zA-Z0-9_-]+)(\?.*)?$/i,
                            message: 'Invalid Google Meet URL format. Use format: https://meet.google.com/abc-defg-hij'
                          }
                        ]}
                      >
                        <Input
                          id="create_google_meet_link"
                          name="google_meet_link"
                          className="compact-meet-input"
                          prefix={<VideoCameraOutlined className="text-blue-500 mr-1" />}
                          placeholder="https://meet.google.com/abc-defg-hij"
                        />
                      </Form.Item>
                      <Form.Item name="access_type" noStyle>
                        <Select
                          id="create_access_type"
                          name="access_type"
                          className="compact-meet-select font-semibold text-xs"
                          popupMatchSelectWidth={false}
                          options={[
                            { label: 'Without Pass', value: 'PUBLIC' },
                            { label: 'With Pass', value: 'PROTECTED' }
                          ]}
                        />
                      </Form.Item>
                    </Space.Compact>
                  </Form.Item>

                  {accessType === 'PROTECTED' && (
                    <Form.Item
                      name="google_meet_password"
                      label="Meet Password"
                      rules={[{ required: true, message: 'Please enter meeting password' }]}
                      className="m-0 pt-1"
                    >
                      <Input.Password id="google_meet_password" name="google_meet_password" prefix={<LockOutlined className="text-amber-500" />} placeholder="Enter password" />
                    </Form.Item>
                  )}
                </div>
              )}

              <Form.Item name="description" label="Meeting Agenda & Description" className="m-0">
                <Input.TextArea id="description" name="description" rows={3} placeholder="Outline key topics to discuss..." />
              </Form.Item>

              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 [&_.ant-form-item-control-input]:!min-h-0">
                <Form.Item name="needs_reminder" valuePropName="checked" className="!m-0" style={{ marginBottom: 0 }}>
                  <Checkbox className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                    Needs to send reminder when scheduling meeting
                  </Checkbox>
                </Form.Item>

                {needsReminder && (
                  <div className="mt-1 pt-1 text-[11px] text-slate-600 dark:text-slate-400 flex items-center space-x-1.5 border-t border-slate-200 dark:border-slate-700">
                    <MailOutlined className="text-blue-500" />
                    <span>
                      Automated email reminder & Send Password option will be initialized.
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN (6 cols): Date, Time, Team & Participants, Recurring */}
            <div className="lg:col-span-6 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-1 gap-3">
                  <Form.Item
                    name="meeting_date"
                    label="Meeting Date"
                    rules={[{ required: true, message: 'Please select meeting date' }]}
                    className="m-0"
                  >
                    <DatePicker id="meeting_date" name="meeting_date" style={{ width: '100%' }} disabledDate={(current) => current && current.isBefore(dayjs().startOf('day'))} />
                  </Form.Item>

                  <Form.Item
                    name="time_range"
                    label="Start & End Time"
                    rules={[{ required: true, message: 'Please select time range' }]}
                    className="m-0 min-w-0"
                  >
                    <TimePicker.RangePicker 
                      id="time_range" 
                      name="time_range" 
                      className="custom-range-picker"
                      format="HH:mm"
                      hideDisabledOptions={true}
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

              <div>
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
                    {teams.map((t) => {
                      const mList = t.members_detail && t.members_detail.length > 0
                        ? t.members_detail
                        : (t.members && users.length > 0 ? users.filter(u => t.members.includes(u.id)) : []);

                      const popoverContent = (
                        <div className="p-1 space-y-2 max-w-xs min-w-[220px]">
                          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-1.5">
                            <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                              <TeamOutlined className="text-blue-600 dark:text-blue-400" />
                              {t.name}
                            </span>
                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                              {mList.length} members
                            </span>
                          </div>

                          {t.description && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 italic m-0 line-clamp-2 leading-tight">
                              "{t.description}"
                            </p>
                          )}

                          <div className="space-y-1 max-h-48 overflow-y-auto pt-1">
                            <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                              Team Members List:
                            </span>
                            {mList.length > 0 ? (
                              mList.map((m) => (
                                <div key={m.id || m.email} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60">
                                  <div className="min-w-0 flex-1 mr-2">
                                    <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate text-[11px]">
                                      {m.full_name || m.username}
                                    </span>
                                    <span className="text-[10px] text-slate-400 block truncate">
                                      {m.email}
                                    </span>
                                  </div>
                                  <Tag color="blue" className="text-[9px] font-bold m-0 px-1.5 py-0 shrink-0 uppercase border-0">
                                    {m.role || 'Member'}
                                  </Tag>
                                </div>
                              ))
                            ) : (
                              <span className="text-xs text-slate-400 italic block py-1">No members assigned to this team.</span>
                            )}
                          </div>
                        </div>
                      );

                      return (
                        <Select.Option key={t.id} value={t.id} label={t.name}>
                          <Popover
                            placement="right"
                            trigger="hover"
                            mouseEnterDelay={0.1}
                            content={popoverContent}
                            overlayInnerStyle={{ padding: '10px 12px', borderRadius: '12px' }}
                          >
                            <div className="flex items-center justify-between w-full py-0.5 cursor-pointer">
                              <span className="font-medium text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                <TeamOutlined className="text-blue-500 text-xs" />
                                {t.name}
                              </span>
                              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-slate-800 px-2 py-0.5 rounded-full flex items-center ml-2 shrink-0">
                                {mList.length} members
                              </span>
                            </div>
                          </Popover>
                        </Select.Option>
                      );
                    })}
                  </Select>
                </Form.Item>
                <p className="text-xs text-slate-400 dark:text-slate-400 mt-1.5 mb-5">
                  Selecting a team automatically invites all members of that team. Hover over a team to preview its members.
                </p>
              </div>

              <div>
                <Form.Item
                  name="participant_ids"
                  label="Invite Individual Participants"
                  className="m-0"
                >
                  <Select
                    id="participant_ids"
                    name="participant_ids"
                    mode="multiple"
                    placeholder={selectedTeamObj ? "Select additional non-team participants" : "Select team members"}
                    options={availableIndividualUsers.map(u => ({ label: `${u.full_name} • ${u.email} (${u.role})`, value: u.id }))}
                  />
                </Form.Item>
                <p className="text-xs text-slate-400 dark:text-slate-400 mt-1.5 mb-5">
                  {selectedTeamObj
                    ? `Members of "${selectedTeamObj.name}" are automatically invited and hidden from this list.`
                    : "Select additional individual users to invite."}
                </p>
              </div>

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
                    <div className="mt-1.5 space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Form.Item name="recurrence_pattern" label="Repeat Frequency (How Often)" className="!m-0" style={{ marginBottom: 0 }}>
                          <Select
                            id="recurrence_pattern"
                            name="recurrence_pattern"
                            options={[
                              { label: '🔁 Daily (Every day)', value: 'DAILY' },
                              { label: '💼 Weekdays (Mon - Fri)', value: 'WEEKDAYS' },
                              { label: '📅 Weekly (Same day)', value: 'WEEKLY' },
                            ]}
                          />
                        </Form.Item>

                        <Form.Item name="recurrence_duration" label="Repeat Duration (How Long)" className="!m-0" style={{ marginBottom: 0 }}>
                          <Select
                            id="recurrence_duration"
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
                        <div>
                          <Form.Item
                            name="recurrence_end_date"
                            label={recurrencePattern === 'WEEKLY' ? "Repeat Until Date (At least 1 week after start date)" : "Repeat Until Date (After start date)"}
                            rules={[{ required: true, message: 'Please select an end date for recurring meeting' }]}
                            className="m-0"
                          >
                            <DatePicker
                              id="recurrence_end_date"
                              name="recurrence_end_date"
                              style={{ width: '100%' }}
                              disabledDate={(current) => {
                                const startDate = form.getFieldValue('meeting_date') || dayjs();
                                const pattern = form.getFieldValue('recurrence_pattern') || 'DAILY';
                                if (!current) return false;
                                if (pattern === 'WEEKLY') {
                                  const minEndDate = startDate.add(7, 'day').startOf('day');
                                  return current < minEndDate;
                                } else {
                                  // For DAILY or WEEKDAYS, end date must be strictly after meeting_date (start date + 1 day)
                                  const minEndDate = startDate.add(1, 'day').startOf('day');
                                  return current < minEndDate;
                                }
                              }}
                            />
                          </Form.Item>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 m-0">
                            {recurrencePattern === 'WEEKLY'
                              ? "Custom end date must be at least 7 days (1 week) after the meeting start date to allow weekly recurring occurrences."
                              : "Custom end date must be after the meeting start date (cannot be the same date)."}
                          </p>
                        </div>
                      )}

                      <div className="text-[11px] text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/30 p-2 rounded-lg border border-purple-200 dark:border-purple-800">
                        ✨ SMDT will automatically generate daily meeting instances for each day so you can record decisions and action items per session.
                      </div>
                    </div>
                  )}
                </div>
              </ConfigProvider>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end space-x-3">
                <Link to="/dashboard" className="no-underline">
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
