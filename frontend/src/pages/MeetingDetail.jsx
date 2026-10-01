import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { meetingService, discussionService, actionService } from '../services/api.js';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { LoadingSkeleton } from '../components/LoadingSkeleton.jsx';
import { DiscussionModal } from '../components/DiscussionModal.jsx';
import { DecisionModal } from '../components/DecisionModal.jsx';
import { ActionFormModal } from '../components/ActionFormModal.jsx';
import { DecisionHistoryModal } from '../components/DecisionHistoryModal.jsx';
import { EditMeetingModal } from '../components/EditMeetingModal.jsx';
import { ParticipantProfileModal } from '../components/ParticipantProfileModal.jsx';
import { ActionDetailModal } from '../components/ActionDetailModal.jsx';
import {
  Button, Card, Tag, Avatar, Tooltip, Alert, message, Breadcrumb, Popconfirm
} from 'antd';
import {
  CalendarOutlined, ClockCircleOutlined, EnvironmentOutlined, UserOutlined,
  PlusOutlined, HistoryOutlined, ArrowLeftOutlined, EditOutlined, MessageOutlined, FileTextOutlined,
  MailOutlined, SafetyCertificateOutlined, StopOutlined, CloseCircleOutlined, CheckSquareOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

export default function MeetingDetail() {
  const params = useParams();
  const meetingId = Number(params.id);
  const { user, isAdmin } = useAuth();

  const [meeting, setMeeting] = useState(null);
  const [discussions, setDiscussions] = useState([]);
  const [allActions, setAllActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [selectedParticipantUser, setSelectedParticipantUser] = useState(null);

  const [showDiscussionModal, setShowDiscussionModal] = useState(false);
  const [showEditMeetingModal, setShowEditMeetingModal] = useState(false);
  const [activeDiscussionForDecision, setActiveDiscussionForDecision] = useState(null);
  const [initialDecisionStatus, setInitialDecisionStatus] = useState('DECISION_MADE');

  const handleOpenDecisionModal = (disc, presetStatus = 'DECISION_MADE') => {
    setInitialDecisionStatus(presetStatus);
    setActiveDiscussionForDecision(disc);
  };
  const [activeDecisionForAction, setActiveDecisionForAction] = useState(null);
  const [activeHistoryDecisionId, setActiveHistoryDecisionId] = useState(null);
  const [editingAction, setEditingAction] = useState(null);
  const [viewingDetailAction, setViewingDetailAction] = useState(null);
  const [errorState, setErrorState] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorState(null);
    try {
      const m = await meetingService.getMeetingById(meetingId);
      setMeeting(m);
      
      try {
        const d = await discussionService.getDiscussions(meetingId);
        const listDisc = Array.isArray(d) ? d : (Array.isArray(d?.results) ? d.results : []);
        setDiscussions(listDisc);
      } catch (err) {
        console.error('Failed to load discussions:', err);
        setDiscussions([]);
      }

      try {
        const [aResMeeting, aResAll] = await Promise.all([
          actionService.getActions({ meeting: meetingId, page_size: 1000 }).catch(() => []),
          actionService.getActions({ page_size: 1000 }).catch(() => [])
        ]);

        const listMeeting = Array.isArray(aResMeeting?.results)
          ? aResMeeting.results
          : Array.isArray(aResMeeting)
          ? aResMeeting
          : [];

        const listAll = Array.isArray(aResAll?.results)
          ? aResAll.results
          : Array.isArray(aResAll)
          ? aResAll
          : [];

        const map = new Map();
        listMeeting.forEach(item => {
          if (item && item.id) map.set(item.id, item);
        });

        listAll.forEach(item => {
          if (!item || !item.id) return;
          const aMeetingId = item.meeting_id || item.meeting || (typeof item.meeting === 'object' ? item.meeting?.id : null) || (item.meeting_detail && item.meeting_detail.id);
          if (Number(aMeetingId) === Number(meetingId)) {
            map.set(item.id, item);
          }
        });

        if (map.size === 0 && listAll.length > 0) {
          listAll.forEach(item => {
            if (item && item.id) map.set(item.id, item);
          });
        }

        setAllActions(Array.from(map.values()));
      } catch (err) {
        console.error('Failed to load actions:', err);
        setAllActions([]);
      }
    } catch (err) {
      const status = err.response?.status;
      if (status === 403) {
        setErrorState('PERMISSION_DENIED');
      } else if (status === 404) {
        setErrorState('NOT_FOUND');
      } else {
        setErrorState('NETWORK_ERROR');
      }
      message.error('Failed to load meeting details.');
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    if (meetingId) loadData();
  }, [meetingId, loadData]);

  const handleCancelMeeting = async () => {
    setCancelling(true);
    try {
      await meetingService.cancelMeeting(meetingId);
      message.success('Meeting cancelled successfully.');
      loadData();
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.error || 'Only the meeting creator can cancel this meeting.';
      message.error(msg);
    } finally {
      setCancelling(false);
    }
  };

  const isMeetingPastOrEnded = Boolean(
    meeting && (
      meeting.status === 'COMPLETED' ||
      meeting.status === 'CANCELLED' ||
      new Date(meeting.meeting_date) < new Date(new Date().setHours(0, 0, 0, 0))
    )
  );

  const isCreator = Boolean(
    meeting && user && (meeting.created_by === user.id || meeting.created_by_detail?.id === user.id)
  );

  const canCancelMeeting = Boolean(
    meeting && isCreator && meeting.status !== 'CANCELLED' && meeting.status !== 'COMPLETED'
  );

  const canEditMeeting = Boolean(
    meeting && (isAdmin || isCreator)
  );

  const isMeetingDetailsEditable = Boolean(
    meeting && canEditMeeting && meeting.status === 'SCHEDULED'
  );

  const handleSendReminder = async () => {
    setSendingReminder(true);
    try {
      const res = await meetingService.sendMeetingReminder(meetingId);
      message.success(res.message || 'Meeting reminder email sent successfully!');
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to send meeting reminder email.';
      message.error(errMsg);
    } finally {
      setSendingReminder(false);
    }
  };

  const handleSendPassword = async () => {
    setSendingOtp(true);
    try {
      const res = await meetingService.sendMeetingOTP(meetingId);
      message.success(res.message || `Meeting password sent successfully!`);
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to send meeting password.';
      message.error(errMsg);
    } finally {
      setSendingOtp(false);
    }
  };

  if (loading) return <LoadingSkeleton type="detail" />;

  if (!meeting) {
    let title = 'Meeting Not Found';
    let desc = `Meeting #${meetingId} does not exist in the database or may have been deleted.`;

    if (errorState === 'PERMISSION_DENIED') {
      title = 'Access Restricted';
      desc = `You do not have permission to view Meeting #${meetingId}. Access is restricted to the organizer, invited participants, team members, or Administrators.`;
    } else if (errorState === 'NETWORK_ERROR') {
      title = 'Backend Connection Error';
      desc = `Unable to communicate with the backend server to load Meeting #${meetingId}. Please verify your API server is running.`;
    }

    return (
      <div className="py-12 text-center max-w-lg mx-auto">
        <Alert type="error" message={title} description={desc} showIcon className="rounded-xl mb-4" />
        <Link to="/meetings" className="inline-block no-underline">
          <Button type="primary" className="rounded-xl">Back to Meetings Directory</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <Breadcrumb items={[
          { title: <Link to="/meetings" className="no-underline">Meetings</Link> },
          { title: <span className="truncate max-w-[140px] sm:max-w-[240px] inline-block align-bottom">{meeting.title}</span> }
        ]} />
        <Link to="/meetings" className="no-underline shrink-0">
          <Button icon={<ArrowLeftOutlined />}>Back to Directory</Button>
        </Link>
      </div>

      <Card className="shadow-sm rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 overflow-hidden w-full">
        {/* Card Header: Tags & Quick Actions (Top Row), Title below */}
        <div className="space-y-3 pb-4 border-b border-slate-100 dark:border-slate-700 w-full min-w-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 w-full">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge type="meetingType" value={meeting.meeting_type} />
              <StatusBadge type="meetingStatus" value={meeting.status} />
              {meeting.is_recurring && (
                <Tag color="purple" className="m-0 font-semibold text-xs px-2.5 py-0.5 rounded-full border-0 bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 inline-flex items-center">
                  🔁 Recurring: {meeting.recurrence_pattern === 'DAILY' ? 'Daily' : meeting.recurrence_pattern === 'WEEKDAYS' ? 'Weekdays' : meeting.recurrence_pattern === 'WEEKLY' ? 'Weekly' : 'Series'}
                </Tag>
              )}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto shrink-0">
              <Tooltip
                title={
                  !canEditMeeting
                    ? 'Only the meeting organizer or an administrator can edit details.'
                    : meeting.status !== 'SCHEDULED'
                    ? 'Meeting details cannot be edited once the meeting is In Progress, Completed, or Cancelled.'
                    : ''
                }
              >
                <Button
                  icon={<EditOutlined />}
                  onClick={() => setShowEditMeetingModal(true)}
                  disabled={!isMeetingDetailsEditable}
                  className="font-medium whitespace-nowrap text-xs sm:text-sm px-2.5 sm:px-3 flex-1 sm:flex-initial text-center justify-center"
                >
                  Edit Details
                </Button>
              </Tooltip>

              {canCancelMeeting && (
                <Popconfirm
                  title="Cancel Meeting"
                  description="Are you sure you want to cancel this meeting? This action cannot be undone."
                  onConfirm={handleCancelMeeting}
                  okText="Yes, Cancel"
                  cancelText="No"
                  okButtonProps={{ danger: true }}
                >
                  <Button
                    danger
                    type="primary"
                    icon={<StopOutlined />}
                    loading={cancelling}
                    className="font-medium whitespace-nowrap text-xs sm:text-sm px-2.5 sm:px-3 flex-1 sm:flex-initial text-center justify-center rounded-xl"
                  >
                    Cancel Meeting
                  </Button>
                </Popconfirm>
              )}

              <Tooltip title={isMeetingPastOrEnded ? 'Reminders can only be sent for upcoming active meetings' : 'Send email reminder to all invited participants'}>
                <Button
                  icon={<MailOutlined />}
                  onClick={handleSendReminder}
                  loading={sendingReminder}
                  disabled={isMeetingPastOrEnded}
                  className="font-medium whitespace-nowrap text-xs sm:text-sm px-2.5 sm:px-3 flex-1 sm:flex-initial text-center justify-center"
                >
                  Reminder
                </Button>
              </Tooltip>

              <Tooltip title={isMeetingPastOrEnded ? 'OTP can only be sent for upcoming active meetings' : 'Dispatches 6-digit participant entry check-in OTP via email to invited attendees'}>
                <Button
                  icon={<SafetyCertificateOutlined className={isMeetingPastOrEnded ? '' : 'text-blue-600 dark:text-blue-400'} />}
                  onClick={handleSendPassword}
                  loading={sendingOtp}
                  disabled={isMeetingPastOrEnded}
                  className="font-medium whitespace-nowrap text-xs sm:text-sm px-2.5 sm:px-3 flex-1 sm:flex-initial text-center justify-center"
                >
                  Send Entry OTP
                </Button>
              </Tooltip>

              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setShowDiscussionModal(true)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl border-none shadow-xs whitespace-nowrap text-xs sm:text-sm px-2.5 sm:px-3 flex-1 sm:flex-initial text-center justify-center"
              >
                Add Discussion
              </Button>
            </div>
          </div>


          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-white m-0 tracking-tight break-words">
            {meeting.title}
          </h1>
        </div>

        {meeting.description && (
          <p className="text-slate-600 dark:text-slate-300 text-sm mt-3 mb-4 leading-relaxed break-words">
            {meeting.description}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 text-sm text-slate-600 dark:text-slate-300 w-full min-w-0">
          <div className="flex items-center space-x-2 min-w-0 overflow-hidden">
            <CalendarOutlined className="text-blue-600 dark:text-blue-400 text-base shrink-0" />
            <span className="truncate">Meeting Date: <strong>{dayjs(meeting.meeting_date).format('ddd, MMM DD, YYYY')}</strong></span>
          </div>
          <div className="flex items-center space-x-2 min-w-0 overflow-hidden">
            <ClockCircleOutlined className="text-blue-600 dark:text-blue-400 text-base shrink-0" />
            <span className="truncate">Scheduled Time: <strong>{meeting.start_time} - {meeting.end_time}</strong></span>
          </div>
          <div className="flex items-center space-x-2 min-w-0 overflow-hidden">
            <EnvironmentOutlined className="text-blue-600 dark:text-blue-400 text-base shrink-0" />
            <span className="truncate">Location: <strong>{meeting.location}</strong></span>
          </div>
          <div className="flex items-center space-x-2 min-w-0 overflow-hidden">
            <ClockCircleOutlined className="text-purple-600 dark:text-purple-400 text-base shrink-0" />
            <span className="truncate">Created: <strong>{meeting.created_at ? dayjs(meeting.created_at).format('MMM D, YYYY [at] h:mm A') : '—'}</strong></span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full min-w-0">
          <div className="flex items-center flex-wrap gap-2">
            <span className="text-xs font-bold uppercase text-slate-400 dark:text-slate-400 shrink-0">
              Participants ({meeting.participants_detail?.length || (meeting.created_by_detail ? 1 : 0)}):
            </span>
            <Avatar.Group max={{ count: 6 }}>
              {(meeting.participants_detail && meeting.participants_detail.length > 0
                ? meeting.participants_detail
                : meeting.created_by_detail
                ? [meeting.created_by_detail]
                : []
              ).map((p) => (
                <Tooltip key={p.id} open={selectedParticipantUser ? false : undefined} title={`${p.full_name || p.username} (${p.role || 'Member'}) • Click to view profile`}>
                  <Avatar
                    onClick={(e) => {
                      e.currentTarget.blur();
                      setSelectedParticipantUser(p);
                    }}
                    className="bg-blue-600 font-extrabold text-xs text-white shrink-0 flex items-center justify-center cursor-pointer hover:opacity-85 hover:scale-110 transition-all shadow-xs"
                  >
                    {(p.first_name || p.full_name || p.username || 'P')[0].toUpperCase()}
                  </Avatar>
                </Tooltip>
              ))}
            </Avatar.Group>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold shrink-0">
            Organized by:{' '}
            <strong
              onClick={() => meeting.created_by_detail && setSelectedParticipantUser(meeting.created_by_detail)}
              className={`text-slate-900 dark:text-slate-200 ${meeting.created_by_detail ? 'cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 hover:underline' : ''}`}
            >
              {meeting.created_by_detail?.full_name || 'Admin'}
            </strong>
          </span>
        </div>
      </Card>

      <div className="space-y-6 w-full min-w-0">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white m-0 flex items-center space-x-2">
            <MessageOutlined className="text-blue-600 dark:text-blue-400" />
            <span>Discussions & Decisions ({discussions.length})</span>
          </h2>
        </div>

        {discussions.length === 0 ? (
          <Card className="text-center py-10 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 dark:bg-slate-800">
            <FileTextOutlined className="text-4xl text-slate-300 dark:text-slate-600 mb-2" />
            <p className="font-semibold text-slate-700 dark:text-slate-200 m-0">No discussion points recorded yet.</p>
            <p className="text-xs text-slate-400 mb-4">Add discussions raised during the meeting to formulate decisions.</p>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowDiscussionModal(true)} className="bg-blue-600 hover:bg-blue-700 font-semibold rounded-xl border-none">
              Add First Discussion
            </Button>
          </Card>
        ) : (
          discussions.map((disc, idx) => {
            const decision = disc.decision;
            const decisionActions = allActions.filter(a => {
              if (!a || !decision) return false;
              const aDecisionId = typeof a.decision === 'object' ? a.decision?.id : a.decision;
              return Number(aDecisionId) === Number(decision.id);
            });

            return (
              <Card key={disc.id} className="shadow-sm rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 overflow-hidden w-full min-w-0">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 border-b border-slate-100 dark:border-slate-700 gap-2.5 min-w-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <Tag color="geekblue" className="font-bold">Discussion #{idx + 1}</Tag>
                      <StatusBadge type="priority" value={disc.priority} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white m-0 break-words">{disc.title}</h3>
                    {disc.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-300 m-0 mt-1 break-words">{disc.description}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-slate-500 font-semibold shrink-0 self-start sm:self-auto">
                    <Avatar size="small" className="bg-blue-600 font-extrabold text-[10px] text-white flex items-center justify-center">
                      {(disc.created_by_detail?.first_name || disc.created_by_detail?.full_name || disc.created_by_detail?.username || 'P')[0].toUpperCase()}
                    </Avatar>
                    <span>Raised by: <strong className="text-slate-800 dark:text-slate-200">{disc.created_by_detail?.full_name || disc.created_by_detail?.first_name || disc.created_by_detail?.username || 'Participant'}</strong></span>
                  </div>
                </div>

                <div className="mt-4 bg-slate-50/80 dark:bg-slate-900/60 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-700 w-full min-w-0 overflow-hidden">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 mb-3 w-full min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                      <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wide shrink-0">Decision Status:</span>
                      {decision ? (
                        <StatusBadge type="decisionStatus" value={decision.status} />
                      ) : (
                        <Tag color="default">No Decision Recorded</Tag>
                      )}
                      {decision && decision.version > 1 && (
                        <Tag color="gold" className="font-bold">
                          v{decision.version} (Updated)
                        </Tag>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      {decision ? (
                        <>
                          <Button
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => handleOpenDecisionModal(disc, decision.status)}
                            className="flex-1 sm:flex-initial text-xs h-8 px-2.5 flex items-center justify-center font-semibold"
                          >
                            Update Decision
                          </Button>
                          <Button
                            size="small"
                            icon={<HistoryOutlined />}
                            onClick={() => setActiveHistoryDecisionId(decision.id)}
                            className="text-blue-600 border-blue-200 bg-blue-50 dark:bg-slate-700/80 dark:border-slate-600 dark:text-blue-300 hover:bg-blue-100 flex-1 sm:flex-initial text-xs h-8 px-2.5 flex items-center justify-center font-semibold"
                          >
                            Version History (Audit)
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="small"
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => handleOpenDecisionModal(disc, 'DECISION_MADE')}
                            className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg border-none text-xs h-8 px-3 flex items-center justify-center shadow-xs"
                          >
                            Add Decision
                          </Button>
                          <Button
                            size="small"
                            danger
                            icon={<CloseCircleOutlined />}
                            onClick={() => handleOpenDecisionModal(disc, 'REJECTED')}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200 dark:bg-rose-950/50 dark:border-rose-900 dark:text-rose-300 font-semibold rounded-lg text-xs h-8 px-3 flex items-center justify-center"
                          >
                            Reject
                          </Button>
                          <Button
                            size="small"
                            icon={<ClockCircleOutlined />}
                            onClick={() => handleOpenDecisionModal(disc, 'DEFERRED')}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 font-semibold rounded-lg border border-slate-200 dark:border-slate-600 text-xs h-8 px-3 flex items-center justify-center"
                          >
                            Defer / Skip
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Banner when decision is Deferred or Skipped: keeps option open for other participants */}
                  {decision && (decision.status === 'DEFERRED' || decision.status === 'NO_DECISION') && (
                    <div className="mt-3 bg-amber-50/80 dark:bg-amber-950/40 p-3 rounded-lg border border-amber-200/80 dark:border-amber-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                      <div className="flex items-center space-x-2">
                        <ClockCircleOutlined className="text-amber-600 dark:text-amber-400 text-sm shrink-0" />
                        <span className="text-xs text-amber-900 dark:text-amber-200 font-medium">
                          Decision is currently {decision.status === 'DEFERRED' ? 'Deferred' : 'Skipped'}. Any meeting participant can open and record the final decision at any time.
                        </span>
                      </div>
                      <Button
                        size="small"
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => handleOpenDecisionModal(disc, 'DECISION_MADE')}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs h-7 px-3 shrink-0 flex items-center justify-center"
                      >
                        Add Decision
                      </Button>
                    </div>
                  )}

                  {/* Banner when decision is Rejected */}
                  {decision && decision.status === 'REJECTED' && (
                    <div className="mt-3 bg-rose-50/80 dark:bg-rose-950/40 p-3.5 rounded-lg border border-rose-200/80 dark:border-rose-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                      <div className="space-y-0.5">
                        <span className="text-xs font-extrabold text-rose-700 dark:text-rose-300 uppercase tracking-wide block">Proposal Rejected</span>
                        {decision.reason ? (
                          <p className="text-xs italic text-rose-900 dark:text-rose-200 m-0">&ldquo;{decision.reason}&rdquo;</p>
                        ) : (
                          <p className="text-xs text-rose-800 dark:text-rose-300 m-0">Discussion proposal was rejected without additional notes.</p>
                        )}
                      </div>
                      <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => handleOpenDecisionModal(disc, 'REJECTED')}
                        className="text-rose-700 border-rose-300 bg-white hover:bg-rose-100 dark:bg-slate-800 dark:text-rose-300 dark:border-rose-800 font-semibold text-xs h-8 px-3 shrink-0 flex items-center justify-center"
                      >
                        Revisit Outcome
                      </Button>
                    </div>
                  )}

                  {decision && decision.status === 'DECISION_MADE' && (
                    <div className="space-y-3 mt-3 bg-white dark:bg-slate-900 p-3 sm:p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 w-full min-w-0">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 min-w-0">
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-bold text-slate-400 uppercase block">Decision Text:</span>
                          <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm sm:text-base m-0 mt-0.5 break-words">{decision.decision}</p>
                        </div>
                        {decision.decided_by_detail && (
                          <div className="flex items-center space-x-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 shrink-0 self-start sm:self-auto">
                            <Avatar size="small" className="bg-emerald-600 font-extrabold text-[10px] text-white flex items-center justify-center">
                              {(decision.decided_by_detail.first_name || decision.decided_by_detail.full_name || decision.decided_by_detail.username || 'D')[0].toUpperCase()}
                            </Avatar>
                            <span>Decided by: <strong>{decision.decided_by_detail.full_name || decision.decided_by_detail.first_name || decision.decided_by_detail.username}</strong></span>
                          </div>
                        )}
                      </div>
                      {decision.reason && (
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-400 uppercase block">Reason & Discussion Point:</span>
                          <p className="text-sm italic text-slate-600 dark:text-slate-300 m-0 break-words">&ldquo;{decision.reason}&rdquo;</p>
                        </div>
                      )}
                    </div>
                  )}

                  {decision && decision.status === 'DECISION_MADE' && (
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 w-full min-w-0">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3 w-full min-w-0">
                        <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                          Follow-Up Action Items ({decisionActions.length})
                        </span>
                        <Button
                          size="small"
                          type="dashed"
                          icon={<PlusOutlined />}
                          onClick={() => setActiveDecisionForAction(decision)}
                          className="text-blue-600 border-blue-400 dark:text-blue-400 dark:border-blue-500 text-xs self-start sm:self-auto"
                        >
                          Add Action Item
                        </Button>
                      </div>

                      {decisionActions.length === 0 ? (
                        <p className="text-xs text-slate-400 italic m-0">No action items assigned to this decision yet.</p>
                      ) : (
                        <div className="space-y-2 w-full min-w-0">
                          {decisionActions.map((action) => (
                            <div
                              key={action.id}
                              onClick={() => setViewingDetailAction({
                                ...action,
                                meeting_title: meeting.title,
                                meeting_id: meeting.id,
                                meeting_date: meeting.meeting_date
                              })}
                              className={`p-3 rounded-lg border transition-all w-full min-w-0 overflow-hidden cursor-pointer hover:shadow-md ${
                                action.is_overdue
                                  ? 'bg-rose-50/70 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800/60 hover:border-rose-400'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500'
                              }`}
                            >
                              <div className="flex justify-between items-start gap-2 w-full min-w-0">
                                <div className="space-y-1.5 min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="font-semibold text-slate-900 dark:text-white text-sm break-words">{action.title}</span>
                                    <StatusBadge type="priority" value={action.priority} />
                                    <StatusBadge type="actionStatus" value={action.status} />
                                    {action.is_overdue && <StatusBadge type="overdue" value={true} />}
                                  </div>

                                  {action.description && (
                                    <p className="text-xs text-slate-600 dark:text-slate-300 m-0 break-words">{action.description}</p>
                                  )}

                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 pt-1">
                                    <span className="flex items-center gap-1 flex-wrap">
                                      Assignee(s):
                                      {Array.isArray(action.assigned_to_detail) && action.assigned_to_detail.length > 0 ? (
                                        action.assigned_to_detail.map(u => (
                                          <Tag key={u.id} color="blue" className="text-[10px] font-bold m-0 px-1.5 py-0">
                                            {u.full_name || u.username}
                                          </Tag>
                                        ))
                                      ) : (
                                        <strong className="text-slate-700 dark:text-slate-300">
                                          {action.assigned_to_detail?.full_name || action.assigned_to_detail?.username || 'Unassigned'}
                                        </strong>
                                      )}
                                    </span>
                                    <span className="hidden sm:inline">•</span>
                                    <span>Due Date: <strong className={action.is_overdue ? 'text-rose-600 dark:text-rose-400' : ''}>{action.due_date ? new Date(action.due_date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'N/A'}</strong></span>
                                    <span className="hidden sm:inline">•</span>
                                    <span>Created: <strong>{action.created_at ? dayjs(action.created_at).format('MMM DD, YYYY [at] h:mm A') : '—'}</strong></span>
                                  </div>

                                  {action.completion_notes && (
                                    <div className="mt-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-900 dark:text-emerald-200 break-words">
                                      <strong className="font-bold block mb-0.5 text-emerald-700 dark:text-emerald-300">✅ Work Done / Outcome Delivered:</strong>
                                      <span>{action.completion_notes}</span>
                                    </div>
                                  )}

                                  {action.dependency_details && action.dependency_details.length > 0 && (
                                    <div className="mt-2 pt-1 flex flex-wrap items-center gap-1.5 text-xs">
                                      <span className="font-bold text-slate-500 dark:text-slate-400">Prerequisites:</span>
                                      {action.dependency_details.map((dep) => (
                                        <Tag key={dep.id} color={dep.is_completed ? 'success' : 'error'} className="mr-0 mb-1">
                                          {dep.is_completed ? '✓ ' : '🔒 '}{dep.title} ({dep.status})
                                        </Tag>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <Button
                                  size="small"
                                  type="text"
                                  icon={<EditOutlined />}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingAction(action);
                                    setActiveDecisionForAction(decision);
                                  }}
                                  className="shrink-0"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </Card>
            );
          })
        )}

        {/* General & Unlinked Action Items for this Meeting */}
        {(() => {
          const allDiscussionDecisionIds = discussions.map(d => d.decision?.id).filter(Boolean);
          const generalMeetingActions = allActions.filter(a => {
            if (!a) return false;
            const aDecisionId = typeof a.decision === 'object' ? a.decision?.id : a.decision;
            return !aDecisionId || !allDiscussionDecisionIds.map(Number).includes(Number(aDecisionId));
          });

          if (generalMeetingActions.length === 0) return null;

          return (
            <Card className="shadow-sm rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 overflow-hidden w-full min-w-0 mt-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 border-b border-slate-100 dark:border-slate-700 gap-2 mb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white m-0 flex items-center space-x-2">
                    <CheckSquareOutlined className="text-blue-600 dark:text-blue-400" />
                    <span>General Meeting Action Items ({generalMeetingActions.length})</span>
                  </h3>
                  <p className="text-xs text-slate-400 m-0">Action items logged directly for this meeting</p>
                </div>
                <Button
                  size="small"
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setEditingAction(null);
                    setActiveDecisionForAction({ id: null });
                  }}
                  className="text-blue-600 border-blue-400 dark:text-blue-400 dark:border-blue-500 text-xs"
                >
                  Add Action Item
                </Button>
              </div>

              <div className="space-y-2 w-full min-w-0">
                {generalMeetingActions.map((action) => (
                  <div
                    key={action.id}
                    onClick={() => setViewingDetailAction({
                      ...action,
                      meeting_title: meeting.title,
                      meeting_id: meeting.id,
                      meeting_date: meeting.meeting_date
                    })}
                    className={`p-3 rounded-lg border transition-all w-full min-w-0 overflow-hidden cursor-pointer hover:shadow-md ${
                      action.is_overdue
                        ? 'bg-rose-50/70 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800/60 hover:border-rose-400'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2 w-full min-w-0">
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-semibold text-slate-900 dark:text-white text-sm break-words">{action.title}</span>
                          <StatusBadge type="priority" value={action.priority} />
                          <StatusBadge type="actionStatus" value={action.status} />
                          {action.is_overdue && <StatusBadge type="overdue" value={true} />}
                        </div>

                        {action.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 m-0 break-words">{action.description}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 pt-1">
                          <span className="flex items-center gap-1 flex-wrap">
                            Assignee(s):
                            {Array.isArray(action.assigned_to_detail) && action.assigned_to_detail.length > 0 ? (
                              action.assigned_to_detail.map(u => (
                                <Tag key={u.id} color="blue" className="text-[10px] font-bold m-0 px-1.5 py-0">
                                  {u.full_name || u.username}
                                </Tag>
                              ))
                            ) : (
                              <strong className="text-slate-700 dark:text-slate-300">
                                {action.assigned_to_detail?.full_name || action.assigned_to_detail?.username || 'Unassigned'}
                              </strong>
                            )}
                          </span>
                          <span className="hidden sm:inline">•</span>
                          <span>Due Date: <strong className={action.is_overdue ? 'text-rose-600 dark:text-rose-400' : ''}>{action.due_date ? new Date(action.due_date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'N/A'}</strong></span>
                          <span className="hidden sm:inline">•</span>
                          <span>Created: <strong>{action.created_at ? dayjs(action.created_at).format('MMM DD, YYYY [at] h:mm A') : '—'}</strong></span>
                        </div>
                      </div>

                      <Button
                        size="small"
                        type="text"
                        icon={<EditOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingAction(action);
                          setActiveDecisionForAction({ id: null });
                        }}
                        className="shrink-0"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })()}
      </div>

      <DiscussionModal
        open={showDiscussionModal}
        onClose={() => setShowDiscussionModal(false)}
        meetingId={meetingId}
        onSuccess={loadData}
      />

      <DecisionModal
        open={Boolean(activeDiscussionForDecision)}
        onClose={() => {
          setActiveDiscussionForDecision(null);
          setInitialDecisionStatus('DECISION_MADE');
        }}
        discussionId={activeDiscussionForDecision?.id || 0}
        existingDecision={activeDiscussionForDecision?.decision}
        initialStatus={initialDecisionStatus}
        onSuccess={loadData}
      />

      <ActionFormModal
        open={Boolean(activeDecisionForAction)}
        onClose={() => {
          setActiveDecisionForAction(null);
          setEditingAction(null);
        }}
        decisionId={activeDecisionForAction?.id || 0}
        meetingId={meetingId}
        existingAction={editingAction}
        availableActions={allActions}
        onSuccess={loadData}
      />

      <DecisionHistoryModal
        open={Boolean(activeHistoryDecisionId)}
        onClose={() => setActiveHistoryDecisionId(null)}
        decisionId={activeHistoryDecisionId}
      />

      <EditMeetingModal
        open={showEditMeetingModal}
        onClose={() => setShowEditMeetingModal(false)}
        meeting={meeting}
        onSuccess={loadData}
      />

      <ParticipantProfileModal
        open={Boolean(selectedParticipantUser)}
        onClose={() => setSelectedParticipantUser(null)}
        user={selectedParticipantUser}
      />

      <ActionDetailModal
        open={Boolean(viewingDetailAction)}
        onClose={() => setViewingDetailAction(null)}
        actionItem={viewingDetailAction}
        onStatusChange={async (item, newStatus) => {
          await actionService.updateActionStatus(item.id, newStatus);
          setViewingDetailAction((prev) => (prev ? { ...prev, status: newStatus } : null));
          loadData();
        }}
      />
    </div>
  );
}
