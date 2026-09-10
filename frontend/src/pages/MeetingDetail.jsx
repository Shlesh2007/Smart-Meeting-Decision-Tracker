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
import {
  Button, Card, Tag, Avatar, Tooltip, Alert, message, Breadcrumb, Select
} from 'antd';
import {
  CalendarOutlined, ClockCircleOutlined, EnvironmentOutlined, UserOutlined,
  PlusOutlined, HistoryOutlined, ArrowLeftOutlined, EditOutlined, MessageOutlined, FileTextOutlined,
  MailOutlined, SafetyCertificateOutlined
} from '@ant-design/icons';
import { format } from 'date-fns';

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
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [showDiscussionModal, setShowDiscussionModal] = useState(false);
  const [showEditMeetingModal, setShowEditMeetingModal] = useState(false);
  const [activeDiscussionForDecision, setActiveDiscussionForDecision] = useState(null);
  const [activeDecisionForAction, setActiveDecisionForAction] = useState(null);
  const [activeHistoryDecisionId, setActiveHistoryDecisionId] = useState(null);
  const [editingAction, setEditingAction] = useState(null);

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([
      meetingService.getMeetingById(meetingId),
      discussionService.getDiscussions(meetingId),
      actionService.getActions()
    ])
      .then(([m, d, aRes]) => {
        setMeeting(m);
        setDiscussions(d);
        setAllActions(aRes.results || aRes);
      })
      .catch(() => {
        message.error('Failed to load meeting details.');
      })
      .finally(() => setLoading(false));
  }, [meetingId]);

  useEffect(() => {
    if (meetingId) loadData();
  }, [meetingId, loadData]);

  const handleStatusChange = async (newStatus) => {
    setUpdatingStatus(true);
    try {
      await meetingService.updateMeeting(meetingId, { status: newStatus });
      message.success(`Meeting status changed to ${newStatus}`);
      loadData();
    } catch (err) {
      const msg = err.response?.data?.status?.[0] || err.response?.data?.detail || 'Failed to update meeting status.';
      message.error(msg);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const isMeetingPastOrEnded = Boolean(
    meeting && (
      meeting.status === 'COMPLETED' ||
      meeting.status === 'CANCELLED' ||
      new Date(meeting.meeting_date) < new Date(new Date().setHours(0, 0, 0, 0))
    )
  );

  const isStatusLocked = Boolean(
    meeting && (meeting.status === 'COMPLETED' || meeting.status === 'CANCELLED') && !isAdmin
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

  const handleSendOTP = async () => {
    setSendingOtp(true);
    try {
      const res = await meetingService.sendMeetingOTP(meetingId);
      message.success(res.message || `Meeting OTP code (${res.otp_code}) sent!`);
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to send meeting OTP code.';
      message.error(errMsg);
    } finally {
      setSendingOtp(false);
    }
  };

  if (loading) return <LoadingSkeleton type="detail" />;

  if (!meeting) {
    return (
      <div className="py-12 text-center">
        <Alert type="error" message="Meeting Not Found" description="The requested meeting does not exist." showIcon />
        <Link to="/meetings" className="mt-4 inline-block no-underline">
          <Button type="primary">Back to Meetings</Button>
        </Link>
      </div>
    );
  }

  const canEditMeeting = Boolean(
    meeting && (isAdmin || meeting.created_by === user?.id || meeting.created_by_detail?.id === user?.id)
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Breadcrumb items={[
          { title: <Link to="/meetings" className="no-underline">Meetings</Link> },
          { title: meeting.title }
        ]} />
        <Link to="/meetings" className="no-underline">
          <Button icon={<ArrowLeftOutlined />}>Back to Directory</Button>
        </Link>
      </div>

      <Card className="shadow-sm rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <StatusBadge type="meetingType" value={meeting.meeting_type} />
              <StatusBadge type="meetingStatus" value={meeting.status} />
              <Tooltip title={isStatusLocked ? 'Completed or Cancelled meetings are locked. Only Admins can modify status.' : ''}>
                <Select
                  value={meeting.status}
                  onChange={handleStatusChange}
                  loading={updatingStatus}
                  disabled={isStatusLocked}
                  size="small"
                  className="w-36 font-semibold"
                  options={[
                    { label: '🕒 Scheduled', value: 'SCHEDULED' },
                    { label: '🔄 In Progress', value: 'IN_PROGRESS' },
                    { label: '✅ Completed', value: 'COMPLETED' },
                    { label: '🚫 Cancelled', value: 'CANCELLED' }
                  ]}
                />
              </Tooltip>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white m-0 tracking-tight">
              {meeting.title}
            </h1>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {canEditMeeting && (
              <Button
                icon={<EditOutlined />}
                onClick={() => setShowEditMeetingModal(true)}
                className="font-medium"
              >
                Edit Meeting Details
              </Button>
            )}

            <Tooltip title={isMeetingPastOrEnded ? 'Reminders can only be sent for upcoming active meetings' : ''}>
              <Button
                icon={<MailOutlined />}
                onClick={handleSendReminder}
                loading={sendingReminder}
                disabled={isMeetingPastOrEnded}
                className="font-medium"
              >
                Send Reminder Email
              </Button>
            </Tooltip>

            <Tooltip title={isMeetingPastOrEnded ? 'OTP verification can only be sent for upcoming active meetings' : ''}>
              <Button
                icon={<SafetyCertificateOutlined className={isMeetingPastOrEnded ? '' : 'text-blue-600 dark:text-blue-400'} />}
                onClick={handleSendOTP}
                loading={sendingOtp}
                disabled={isMeetingPastOrEnded}
                className="font-medium"
              >
                Send Meeting OTP
              </Button>
            </Tooltip>

            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setShowDiscussionModal(true)}
              className="bg-blue-600 hover:bg-blue-700 font-semibold rounded-xl border-none shadow-xs"
            >
              Add Discussion Point
            </Button>
          </div>
        </div>

        {meeting.description && (
          <p className="text-slate-600 dark:text-slate-300 text-sm mt-3 mb-4 leading-relaxed">
            {meeting.description}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-sm text-slate-600 dark:text-slate-300">
          <div className="flex items-center space-x-2">
            <CalendarOutlined className="text-blue-600 dark:text-blue-400 text-base" />
            <span>Date: <strong>{format(new Date(meeting.meeting_date), 'EEEE, MMMM dd, yyyy')}</strong></span>
          </div>
          <div className="flex items-center space-x-2">
            <ClockCircleOutlined className="text-blue-600 dark:text-blue-400 text-base" />
            <span>Time: <strong>{meeting.start_time} - {meeting.end_time}</strong></span>
          </div>
          <div className="flex items-center space-x-2">
            <EnvironmentOutlined className="text-blue-600 dark:text-blue-400 text-base" />
            <span>Location: <strong>{meeting.location}</strong></span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-bold uppercase text-slate-400 dark:text-slate-400">
              Participants ({meeting.participants_detail?.length || (meeting.created_by_detail ? 1 : 0)}):
            </span>
            <Avatar.Group maxCount={6}>
              {(meeting.participants_detail && meeting.participants_detail.length > 0
                ? meeting.participants_detail
                : meeting.created_by_detail
                ? [meeting.created_by_detail]
                : []
              ).map((p) => (
                <Tooltip key={p.id} title={`${p.full_name} (${p.role})`}>
                  <Avatar icon={<UserOutlined />} className="bg-blue-600 font-bold" />
                </Tooltip>
              ))}
            </Avatar.Group>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
            Organized by: <strong className="text-slate-900 dark:text-slate-200">{meeting.created_by_detail?.full_name || 'Admin'}</strong>
          </span>
        </div>
      </Card>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
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
            const decisionActions = allActions.filter(a => decision && a.decision === decision.id);

            return (
              <Card key={disc.id} className="shadow-sm rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 overflow-hidden">
                <div className="flex justify-between items-start pb-3 border-b border-slate-100 dark:border-slate-700">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <Tag color="geekblue" className="font-bold">Discussion #{idx + 1}</Tag>
                      <StatusBadge type="priority" value={disc.priority} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white m-0">{disc.title}</h3>
                    {disc.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-300 m-0 mt-1">{disc.description}</p>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">
                    Raised by: {disc.created_by_detail?.full_name || 'Participant'}
                  </span>
                </div>

                <div className="mt-4 bg-slate-50/80 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-slate-800 uppercase tracking-wide">Decision Status:</span>
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

                    <div className="flex space-x-2">
                      {decision ? (
                        <>
                          <Button
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => setActiveDiscussionForDecision(disc)}
                          >
                            Update Decision
                          </Button>
                          <Button
                            size="small"
                            icon={<HistoryOutlined />}
                            onClick={() => setActiveHistoryDecisionId(decision.id)}
                            className="text-blue-600 border-blue-200 bg-blue-50 dark:bg-slate-700/80 dark:border-slate-600 dark:text-blue-300 hover:bg-blue-100"
                          >
                            Version History (Audit)
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="small"
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={() => setActiveDiscussionForDecision(disc)}
                          className="bg-blue-600 hover:bg-blue-700 font-medium rounded-lg border-none"
                        >
                          Record Decision
                        </Button>
                      )}
                    </div>
                  </div>

                  {decision && decision.status === 'DECISION_MADE' && (
                    <div className="space-y-2 mt-3 bg-white dark:bg-slate-900 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase block">Decision Text:</span>
                        <p className="font-semibold text-slate-900 dark:text-slate-100 text-base m-0 mt-0.5">{decision.decision}</p>
                      </div>
                      {decision.reason && (
                        <div>
                          <span className="text-xs font-bold text-slate-400 uppercase block">Reason:</span>
                          <p className="text-sm italic text-slate-600 dark:text-slate-300 m-0">"{decision.reason}"</p>
                        </div>
                      )}
                    </div>
                  )}

                  {decision && decision.status === 'DECISION_MADE' && (
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                          Follow-Up Action Items ({decisionActions.length})
                        </span>
                        <Button
                          size="small"
                          type="dashed"
                          icon={<PlusOutlined />}
                          onClick={() => setActiveDecisionForAction(decision)}
                          className="text-blue-600 border-blue-400 dark:text-blue-400 dark:border-blue-500"
                        >
                          Add Action Item
                        </Button>
                      </div>

                      {decisionActions.length === 0 ? (
                        <p className="text-xs text-slate-400 italic m-0">No action items assigned to this decision yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {decisionActions.map((action) => (
                            <div
                              key={action.id}
                              className={`p-3 rounded-lg border transition-all ${
                                action.is_overdue
                                  ? 'bg-rose-50/70 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800/60'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500'
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-semibold text-slate-900 text-sm">{action.title}</span>
                                    <StatusBadge type="priority" value={action.priority} />
                                    <StatusBadge type="actionStatus" value={action.status} />
                                    {action.is_overdue && <StatusBadge type="overdue" value={true} />}
                                  </div>

                                  {action.description && (
                                    <p className="text-xs text-slate-600 m-0">{action.description}</p>
                                  )}

                                  <div className="flex items-center space-x-3 text-xs text-slate-500 pt-1">
                                    <span>Owner: <strong>{action.assigned_to_detail?.full_name || 'Unassigned'}</strong></span>
                                    <span>•</span>
                                    <span>Due Date: <strong className={action.is_overdue ? 'text-rose-600' : ''}>{format(new Date(action.due_date), 'MMM dd, yyyy')}</strong></span>
                                  </div>

                                  {action.dependency_details && action.dependency_details.length > 0 && (
                                    <div className="mt-2 pt-1 flex items-center space-x-2 text-xs">
                                      <span className="font-bold text-slate-500">Prerequisites:</span>
                                      {action.dependency_details.map((dep) => (
                                        <Tag key={dep.id} color={dep.is_completed ? 'success' : 'error'}>
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
                                  onClick={() => {
                                    setEditingAction(action);
                                    setActiveDecisionForAction(decision);
                                  }}
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
      </div>

      <DiscussionModal
        open={showDiscussionModal}
        onClose={() => setShowDiscussionModal(false)}
        meetingId={meetingId}
        onSuccess={loadData}
      />

      <DecisionModal
        open={Boolean(activeDiscussionForDecision)}
        onClose={() => setActiveDiscussionForDecision(null)}
        discussionId={activeDiscussionForDecision?.id || 0}
        existingDecision={activeDiscussionForDecision?.decision}
        onSuccess={loadData}
      />

      <ActionFormModal
        open={Boolean(activeDecisionForAction)}
        onClose={() => {
          setActiveDecisionForAction(null);
          setEditingAction(null);
        }}
        decisionId={activeDecisionForAction?.id || 0}
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
    </div>
  );
}
