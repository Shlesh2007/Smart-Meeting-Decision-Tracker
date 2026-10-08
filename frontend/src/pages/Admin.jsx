import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { userService, teamService, departmentRequestService, authService } from '../services/api.js';
import { LoadingSkeleton } from '../components/LoadingSkeleton.jsx';
import { ParticipantProfileModal } from '../components/ParticipantProfileModal.jsx';
import { getErrorMessage } from '../utils/errorHandler.js';
import {
  Card, Table, Tag, Button, Select, Modal, Form, Input, message, Tabs, Alert, Avatar, Popconfirm, Tooltip, App
} from 'antd';
import {
  TeamOutlined, UserOutlined, PlusOutlined, SafetyOutlined, LockOutlined,
  EditOutlined, DeleteOutlined, UsergroupAddOutlined, CrownOutlined, CheckOutlined, CloseOutlined, SolutionOutlined, EyeOutlined,
  WarningOutlined, ExclamationCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

const getRoleTag = (role) => {
  switch (role) {
    case 'OWNER':
      return <Tag color="gold" className="font-bold border-amber-400 bg-amber-50 text-amber-900"><CrownOutlined className="mr-1 text-amber-600" />OWNER</Tag>;
    case 'ADMIN':
      return <Tag color="volcano" className="font-bold">ADMIN</Tag>;
    case 'MANAGER':
      return <Tag color="cyan" className="font-bold">MANAGER</Tag>;
    case 'MEMBER':
    default:
      return <Tag color="blue" className="font-bold">MEMBER</Tag>;
  }
};

export default function Admin() {
  const { user, isOwner, isAdmin, logout } = useAuth();
  const { message: antMessage } = App.useApp();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [deptRequests, setDeptRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [selectedUserModal, setSelectedUserModal] = useState(null);
  const [teamForm] = Form.useForm();
  const fetchedRef = useRef(false);

  // Organization Deletion State
  const [showOrgDeleteModal, setShowOrgDeleteModal] = useState(false);
  const [orgDeleteConfirmText, setOrgDeleteConfirmText] = useState('');
  const [orgDeletePassword, setOrgDeletePassword] = useState('');
  const [orgDeleteLoading, setOrgDeleteLoading] = useState(false);
  const [orgDeleteError, setOrgDeleteError] = useState('');

  const resetOrgDeleteForm = () => {
    setShowOrgDeleteModal(false);
    setOrgDeleteConfirmText('');
    setOrgDeletePassword('');
    setOrgDeleteError('');
  };

  const handleDeleteOrganization = async () => {
    setOrgDeleteError('');
    setOrgDeleteLoading(true);
    try {
      await authService.deleteOrganization({
        password: orgDeletePassword,
        confirmation: orgDeleteConfirmText.trim().toUpperCase(),
      });
      antMessage.success('Your organization and all associated data have been permanently deleted.');
      resetOrgDeleteForm();
      logout();
      navigate('/login');
    } catch (err) {
      setOrgDeleteError(getErrorMessage(err, 'Failed to delete organization.'));
    } finally {
      setOrgDeleteLoading(false);
    }
  };

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.allSettled([
      userService.getUsers(),
      teamService.getTeams(),
      departmentRequestService.getRequests()
    ])
      .then(([uRes, tRes, dRes]) => {
        const rejected = [];

        if (uRes.status === 'fulfilled') {
          const val = uRes.value;
          setUsers(Array.isArray(val) ? val : (val.results || []));
        } else {
          rejected.push({ source: 'users', reason: uRes.reason });
        }

        if (tRes.status === 'fulfilled') {
          const val = tRes.value;
          setTeams(Array.isArray(val) ? val : (val.results || []));
        } else {
          rejected.push({ source: 'teams', reason: tRes.reason });
        }

        if (dRes.status === 'fulfilled') {
          const val = dRes.value;
          setDeptRequests(Array.isArray(val) ? val : (val.results || []));
        } else {
          rejected.push({ source: 'department requests', reason: dRes.reason });
        }

        if (rejected.length > 0) {
          const firstErr = rejected[0].reason;
          message.error(getErrorMessage(firstErr, 'Failed to load administrative data.'));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (isAdmin && !fetchedRef.current) {
      fetchedRef.current = true;
      loadData();
    }
  }, [isAdmin, loadData]);


  const openCreateTeam = () => {
    setEditingTeam(null);
    teamForm.resetFields();
    setShowTeamModal(true);
  };

  const openEditTeam = (team) => {
    setEditingTeam(team);
    teamForm.setFieldsValue({
      name: team.name,
      description: team.description,
      member_ids: team.members || []
    });
    setShowTeamModal(true);
  };

  const handleDeleteTeam = async (teamId) => {
    try {
      await teamService.deleteTeam(teamId);
      message.success('Team deleted successfully!');
      loadData();
    } catch (err) {
      message.error(getErrorMessage(err, 'Failed to delete team.'));
    }
  };

  const handleSaveTeam = async (values) => {
    const payload = {
      name: values.name,
      description: values.description,
      member_ids: values.member_ids || []
    };

    try {
      if (editingTeam) {
        await teamService.updateTeam(editingTeam.id, payload);
        message.success('Team updated successfully!');
      } else {
        await teamService.createTeam(payload);
        message.success('Team created successfully!');
      }
      teamForm.resetFields();
      setShowTeamModal(false);
      setEditingTeam(null);
      loadData();
    } catch (err) {
      message.error(getErrorMessage(err, 'Failed to save team. Please check fields.'));
    }
  };

  if (!isAdmin) {
    return (
      <div className="py-16 max-w-xl mx-auto text-center">
        <Alert
          type="error"
          showIcon
          icon={<LockOutlined className="text-2xl" />}
          message="Access Restricted (Admin / Owner Only)"
          description="You must have an Admin or Owner role to access the User & Team Management Portal."
        />
      </div>
    );
  }

  const handleRoleChange = async (targetUser, newRole) => {
    try {
      await userService.updateUserRole(targetUser.id, newRole);
      message.success(`Updated ${targetUser.username}'s role to ${newRole}`);
      loadData();
    } catch (err) {
      message.error(getErrorMessage(err, 'Failed to update user role.'));
    }
  };

  const handleDepartmentChange = async (targetUser, newDept) => {
    try {
      await userService.updateUserDepartment(targetUser.id, newDept || '');
      message.success(`Updated ${targetUser.username}'s department to ${newDept || 'General Team'}`);
      loadData();
    } catch (err) {
      message.error(getErrorMessage(err, 'Failed to update user department.'));
    }
  };

  // Role options available based on caller role
  const allowedRoleOptions = isOwner ? [
    { label: 'Member', value: 'MEMBER' },
    { label: 'Manager', value: 'MANAGER' },
    { label: 'Admin', value: 'ADMIN' },
  ] : [
    { label: 'Member', value: 'MEMBER' },
    { label: 'Manager', value: 'MANAGER' },
  ];

  const userColumns = [
    {
      title: 'Name & Username',
      key: 'name',
      width: 195,
      render: (_, u) => (
        <div 
          onClick={() => setSelectedUserModal(u)}
          className="cursor-pointer group flex items-center justify-between p-1 -m-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
          title="Tap/click to view detailed member profile"
        >
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-xs sm:text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
              {u.full_name || u.username}
              {u.role === 'OWNER' && <CrownOutlined className="text-amber-500 text-xs shrink-0" />}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 block truncate">{u.username}</span>
          </div>
          <EyeOutlined className="text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 text-xs ml-2 shrink-0" />
        </div>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      width: 200,
      render: (email) => <span className="text-xs sm:text-sm break-all">{email}</span>
    },
    {
      title: 'Department',
      key: 'department',
      width: 180,
      render: (_, u) => {
        const isTargetOwner = u.role === 'OWNER';
        const isSelf = u.id === user?.id;
        const isDisabled = isSelf || isTargetOwner || (!isOwner && u.role === 'ADMIN');

        return (
          <Select
            id={`user_dept_${u.id}`}
            name={`user_dept_${u.id}`}
            value={u.department || 'General Team'}
            placeholder="Assign Department..."
            onChange={(newDept) => handleDepartmentChange(u, newDept)}
            disabled={isDisabled}
            className="w-40 sm:w-44 text-xs font-medium"
            options={[
              { label: 'Executive & Strategy', value: 'Executive & Strategy' },
              { label: 'Engineering & Tech Lead', value: 'Engineering & Tech Lead' },
              { label: 'Operations & Governance', value: 'Operations & Governance' },
              { label: 'Backend Infrastructure', value: 'Backend Infrastructure' },
              { label: 'Frontend & Mobile Guild', value: 'Frontend & Mobile Guild' },
              { label: 'DevOps & Cloud Systems', value: 'DevOps & Cloud Systems' },
              { label: 'QA & Security Assurance', value: 'QA & Security Assurance' },
              { label: 'Product & Analytics', value: 'Product & Analytics' },
              { label: 'General Team', value: 'General Team' }
            ]}
          />
        );
      }
    },
    {
      title: 'Current Role',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (role) => getRoleTag(role),
    },
    {
      title: 'Joined Date',
      dataIndex: 'date_joined',
      key: 'date_joined',
      width: 130,
      render: (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '—',
    },
    {
      title: 'Manage Role',
      key: 'action',
      width: 140,
      render: (_, u) => {
        const isTargetOwner = u.role === 'OWNER';
        const isSelf = u.id === user?.id;
        const isDisabled = isSelf || isTargetOwner || (!isOwner && u.role === 'ADMIN');

        if (isTargetOwner) {
          return (
            <Tooltip title="Organization Owner accounts are protected and cannot be modified or demoted by anyone">
              <span className="text-xs text-slate-400 italic flex items-center gap-1 font-semibold">
                <LockOutlined className="text-amber-600" /> Protected Owner
              </span>
            </Tooltip>
          );
        }

        return (
          <Select
            id={`user_role_${u.id}`}
            name={`user_role_${u.id}`}
            value={u.role}
            onChange={(newRole) => handleRoleChange(u, newRole)}
            disabled={isDisabled}
            className="w-32"
            options={allowedRoleOptions}
          />
        );
      },
    },
  ];

  const handleApproveDeptRequest = async (reqId) => {
    setActionLoadingId(reqId);
    try {
      const res = await departmentRequestService.approveRequest(reqId);
      message.success(res.message || 'Department change request approved!');
      loadData();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to approve request.';
      message.error(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectDeptRequest = async (reqId) => {
    setActionLoadingId(reqId);
    try {
      const res = await departmentRequestService.rejectRequest(reqId);
      message.success(res.message || 'Department change request rejected.');
      loadData();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to reject request.';
      message.error(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const deptColumns = [
    {
      title: 'Member Details',
      key: 'user',
      render: (_, r) => (
        <div>
          <span className="font-semibold text-slate-900 dark:text-slate-100 block text-xs sm:text-sm">
            {r.user_detail?.full_name || r.user_detail?.username}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 block">{r.user_detail?.email}</span>
        </div>
      )
    },
    {
      title: 'Current Dept',
      key: 'current_dept',
      render: (_, r) => <span className="text-xs">{r.user_detail?.department || 'General Team'}</span>
    },
    {
      title: 'Requested Target Dept',
      dataIndex: 'requested_department',
      key: 'requested_department',
      render: (val) => <Tag color="blue" className="font-bold text-xs">{val}</Tag>
    },
    {
      title: 'Reason / Justification',
      dataIndex: 'reason',
      key: 'reason',
      render: (val) => <span className="text-xs italic text-slate-600 dark:text-slate-300">{val || '—'}</span>
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        if (status === 'APPROVED') return <Tag color="success" className="font-bold">APPROVED</Tag>;
        if (status === 'REJECTED') return <Tag color="error" className="font-bold">REJECTED</Tag>;
        return <Tag color="warning" className="font-bold">PENDING</Tag>;
      }
    },
    {
      title: 'Submitted Date',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (d) => d ? dayjs(d).format('MMM DD, YYYY') : '—'
    },
    {
      title: 'Review Action',
      key: 'action',
      render: (_, r) => {
        if (r.status !== 'PENDING') {
          return <span className="text-xs text-slate-400 font-medium">Reviewed by {r.reviewed_by_detail?.full_name || 'Admin'}</span>;
        }

        return (
          <div className="flex items-center space-x-2">
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined />}
              loading={actionLoadingId === r.id}
              onClick={() => handleApproveDeptRequest(r.id)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs border-none"
            >
              Approve
            </Button>
            <Button
              danger
              size="small"
              icon={<CloseOutlined />}
              loading={actionLoadingId === r.id}
              onClick={() => handleRejectDeptRequest(r.id)}
              className="font-bold text-xs"
            >
              Reject
            </Button>
          </div>
        );
      }
    }
  ];

  const pendingDeptCount = deptRequests.filter(r => r.status === 'PENDING').length;

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden">
      <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 transition-colors duration-200">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white m-0 flex items-center space-x-2">
            <SafetyOutlined className="text-slate-900 dark:text-slate-100" />
            <span>Admin & Role Management Portal</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 m-0 mt-1">Manage organization users, role hierarchy (Owner, Admin, Manager, Member), and teams.</p>
        </div>
        <Button
          type="primary"
          size="middle"
          icon={<PlusOutlined />}
          onClick={openCreateTeam}
          className="h-9 px-4 text-xs font-bold rounded-xl border-none bg-slate-900 hover:bg-slate-800 text-white shadow-xs w-full sm:w-auto shrink-0 flex items-center justify-center"
        >
          Create New Team
        </Button>
      </div>

      <Card className="shadow-xs rounded-2xl dark:bg-slate-800 dark:border-slate-700/80 w-full max-w-full" styles={{ body: { padding: '12px 16px' } }}>
        <Tabs
          items={[
            {
              key: 'users',
              label: (
                <span className="font-semibold flex items-center space-x-1 sm:space-x-2 text-[11px] sm:text-sm whitespace-nowrap">
                  <UserOutlined />
                  <span className="hidden sm:inline">Users Directory ({users.length})</span>
                  <span className="inline sm:hidden">Users ({users.length})</span>
                </span>
              ),
              children: loading ? (
                <LoadingSkeleton type="table" />
              ) : (
                <>
                  {/* Desktop Table View (>= 1024px) */}
                  <div className="hidden lg:block w-full overflow-x-auto">
                    <Table columns={userColumns} dataSource={users} rowKey="id" pagination={{ pageSize: 8 }} scroll={{ x: 750 }} />
                  </div>

                  {/* Responsive Cards Grid View (< 1024px) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 block lg:hidden py-1.5">
                    {users.map((u) => {
                      const isTargetOwner = u.role === 'OWNER';
                      const isSelf = u.id === user?.id;
                      const isDisabled = isSelf || isTargetOwner || (!isOwner && u.role === 'ADMIN');

                      return (
                        <Card
                          key={u.id}
                          className="shadow-xs rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 hover:border-blue-400 transition-all"
                          styles={{ body: { padding: '10px 12px' } }}
                        >
                          {/* Header: Name, Username, Email, Role Tag */}
                          <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-700/60">
                            <div className="min-w-0 flex-1">
                              <div
                                onClick={() => setSelectedUserModal(u)}
                                className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate leading-tight"
                              >
                                <span className="truncate">{u.full_name || u.username}</span>
                                {u.role === 'OWNER' && <CrownOutlined className="text-amber-500 text-[10px] shrink-0" />}
                              </div>
                              <span className="text-[10.5px] text-slate-400 block truncate leading-tight">{u.email}</span>
                            </div>
                            <div className="shrink-0">{getRoleTag(u.role)}</div>
                          </div>

                          {/* 2-Column Controls Grid: Department & Role */}
                          <div className="grid grid-cols-2 gap-2 pt-1.5">
                            <div className="min-w-0">
                              <span className="text-[9.5px] uppercase font-bold text-slate-400 block mb-0.5">Department</span>
                              <Select
                                id={`card_user_dept_${u.id}`}
                                name={`card_user_dept_${u.id}`}
                                size="small"
                                value={u.department || 'General Team'}
                                placeholder="Dept..."
                                onChange={(newDept) => handleDepartmentChange(u, newDept)}
                                disabled={isDisabled}
                                className="w-full text-[11px]"
                                options={[
                                  { label: 'Executive & Strategy', value: 'Executive & Strategy' },
                                  { label: 'Engineering & Tech Lead', value: 'Engineering & Tech Lead' },
                                  { label: 'Operations & Governance', value: 'Operations & Governance' },
                                  { label: 'Backend Infrastructure', value: 'Backend Infrastructure' },
                                  { label: 'Frontend & Mobile Guild', value: 'Frontend & Mobile Guild' },
                                  { label: 'DevOps & Cloud Systems', value: 'DevOps & Cloud Systems' },
                                  { label: 'QA & Security Assurance', value: 'QA & Security Assurance' },
                                  { label: 'Product & Analytics', value: 'Product & Analytics' },
                                  { label: 'General Team', value: 'General Team' }
                                ]}
                              />
                            </div>

                            <div className="min-w-0">
                              <span className="text-[9.5px] uppercase font-bold text-slate-400 block mb-0.5">Manage Role</span>
                              {isTargetOwner ? (
                                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block pt-1 truncate">
                                  🔒 Protected Owner
                                </span>
                              ) : (
                                <Select
                                  id={`card_user_role_${u.id}`}
                                  name={`card_user_role_${u.id}`}
                                  size="small"
                                  value={u.role}
                                  onChange={(newRole) => handleRoleChange(u, newRole)}
                                  disabled={isDisabled}
                                  className="w-full text-[11px] font-bold"
                                  options={allowedRoleOptions}
                                />
                              )}
                            </div>
                          </div>

                          {/* Footer: Date & Profile */}
                          <div className="pt-1.5 mt-1.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[10.5px] text-slate-400">
                            <span>Joined: {u.date_joined ? new Date(u.date_joined).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '—'}</span>
                            <Button
                              type="link"
                              size="small"
                              icon={<EyeOutlined className="text-[9px]" />}
                              onClick={() => setSelectedUserModal(u)}
                              className="text-blue-600 dark:text-blue-400 font-bold p-0 text-[10.5px] h-auto"
                            >
                              Profile
                            </Button>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </>
              ),
            },
            {
              key: 'department_requests',
              label: (
                <span className="font-semibold flex items-center space-x-1 sm:space-x-2 text-[11px] sm:text-sm whitespace-nowrap">
                  <SolutionOutlined />
                  <span className="hidden sm:inline">Department Requests ({deptRequests.length})</span>
                  <span className="inline sm:hidden">Requests ({deptRequests.length})</span>
                  {pendingDeptCount > 0 && (
                    <Tag color="error" className="font-bold text-[9px] sm:text-[10px] m-0 rounded-full px-1 sm:px-1.5 py-0">
                      {pendingDeptCount} <span className="hidden sm:inline">PENDING</span>
                    </Tag>
                  )}
                </span>
              ),
              children: loading ? (
                <LoadingSkeleton type="table" />
              ) : deptRequests.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <SolutionOutlined className="text-4xl mb-2 text-slate-300" />
                  <p className="font-medium text-slate-700 dark:text-slate-300 m-0">No department change requests submitted yet.</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table View (>= 1024px) */}
                  <div className="hidden lg:block w-full overflow-x-auto">
                    <Table columns={deptColumns} dataSource={deptRequests} rowKey="id" pagination={{ pageSize: 8 }} scroll={{ x: 750 }} />
                  </div>

                  {/* Responsive Cards Grid View (< 1024px) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 block lg:hidden py-1.5">
                    {deptRequests.map((r) => {
                      const isPending = r.status === 'PENDING';
                      const statusTag = r.status === 'APPROVED' ? (
                        <Tag color="success" className="font-bold text-[10px] m-0 px-1 py-0">APPROVED</Tag>
                      ) : r.status === 'REJECTED' ? (
                        <Tag color="error" className="font-bold text-[10px] m-0 px-1 py-0">REJECTED</Tag>
                      ) : (
                        <Tag color="warning" className="font-bold text-[10px] m-0 px-1 py-0">PENDING</Tag>
                      );

                      return (
                        <Card
                          key={r.id}
                          className="shadow-xs rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 hover:border-blue-400 transition-all"
                          styles={{ body: { padding: '10px 12px' } }}
                        >
                          {/* Header: Member info & Status tag */}
                          <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-100 dark:border-slate-700/60">
                            <div className="min-w-0 flex-1">
                              <span className="font-bold text-xs text-slate-900 dark:text-white block truncate leading-tight">
                                {r.user_detail?.full_name || r.user_detail?.username}
                              </span>
                              <span className="text-[10.5px] text-slate-400 block truncate leading-tight">{r.user_detail?.email}</span>
                            </div>
                            <div className="shrink-0">{statusTag}</div>
                          </div>

                          {/* Department Transfer & Reason */}
                          <div className="py-1 space-y-0.5">
                            <div className="flex items-center gap-1 text-[11px] flex-wrap">
                              <Tag color="default" className="m-0 text-[10px] px-1 py-0">{r.user_detail?.department || 'General'}</Tag>
                              <span className="text-slate-400 text-[10px]">➔</span>
                              <Tag color="blue" className="m-0 text-[10px] font-bold px-1 py-0">{r.requested_department}</Tag>
                            </div>
                            {r.reason && (
                              <p className="text-[10.5px] italic text-slate-500 dark:text-slate-400 m-0 truncate leading-tight">
                                "{r.reason}"
                              </p>
                            )}
                          </div>

                          {/* Footer: Date & Actions */}
                          <div className="pt-1.5 mt-1 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[10.5px]">
                            <span className="text-slate-400">
                              {r.created_at ? dayjs(r.created_at).format('MMM DD, YYYY') : '—'}
                            </span>

                            {isPending ? (
                              <div className="flex items-center space-x-1.5">
                                <Button
                                  type="primary"
                                  size="small"
                                  icon={<CheckOutlined className="text-[9px]" />}
                                  loading={actionLoadingId === r.id}
                                  onClick={() => handleApproveDeptRequest(r.id)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] border-none rounded-md h-6 px-2.5"
                                >
                                  Approve
                                </Button>
                                <Button
                                  danger
                                  size="small"
                                  icon={<CloseOutlined className="text-[9px]" />}
                                  loading={actionLoadingId === r.id}
                                  onClick={() => handleRejectDeptRequest(r.id)}
                                  className="font-bold text-[10px] rounded-md h-6 px-2.5"
                                >
                                  Reject
                                </Button>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[10px]">
                                Reviewed by {r.reviewed_by_detail?.full_name || 'Admin'}
                              </span>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </>
              ),
            },
            {
              key: 'teams',
              label: (
                <span className="font-semibold flex items-center space-x-1 sm:space-x-2 text-[11px] sm:text-sm whitespace-nowrap">
                  <TeamOutlined />
                  <span className="hidden sm:inline">Teams Directory ({teams.length})</span>
                  <span className="inline sm:hidden">Teams ({teams.length})</span>
                </span>
              ),
              children: loading ? (
                <LoadingSkeleton type="card" />
              ) : teams.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <TeamOutlined className="text-4xl mb-2 text-slate-300" />
                  <p className="font-medium text-slate-700 dark:text-slate-300 m-0">No teams created yet.</p>
                  <Button type="primary" size="middle" icon={<PlusOutlined />} onClick={openCreateTeam} className="mt-3 h-9 px-4 text-xs font-bold rounded-xl border-none bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center mx-auto">
                    Create First Team
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-2">
                  {teams.map((team) => (
                    <Card
                      key={team.id}
                      className="shadow-xs border border-slate-200 dark:border-slate-700 rounded-2xl dark:bg-slate-900 hover:shadow-md transition-all"
                      title={
                        <div className="flex items-center space-x-2">
                          <TeamOutlined className="text-slate-900 dark:text-slate-100" />
                          <span className="font-bold text-slate-900 dark:text-white text-base">{team.name}</span>
                        </div>
                      }
                      extra={
                        <div className="flex space-x-2">
                          <Button
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => openEditTeam(team)}
                          >
                            Edit
                          </Button>
                          <Popconfirm
                            title="Delete Team"
                            description="Are you sure you want to delete this team?"
                            onConfirm={() => handleDeleteTeam(team.id)}
                            okText="Yes, Delete"
                            okButtonProps={{ danger: true }}
                          >
                            <Button size="small" danger icon={<DeleteOutlined />} />
                          </Popconfirm>
                        </div>
                      }
                    >
                      {team.description && (
                        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700 italic">
                          "{team.description}"
                        </p>
                      )}

                      <div className="space-y-3 pt-2">
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 flex items-center">
                              <UsergroupAddOutlined className="mr-1 text-slate-700 dark:text-slate-300" />
                              Team Members ({team.members_detail?.length || 0})
                            </span>
                          </div>

                          {team.members_detail && team.members_detail.length > 0 ? (
                            <div className="space-y-2 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700 max-h-40 overflow-y-auto">
                              {team.members_detail.map((m) => (
                                <div key={m.id} className="flex justify-between items-center text-xs bg-white dark:bg-slate-900 p-2 rounded border border-slate-100 dark:border-slate-700">
                                  <div className="flex items-center space-x-2">
                                    <Avatar size="small" icon={<UserOutlined />} className="bg-slate-900 dark:bg-slate-700" />
                                    <div>
                                      <span className="font-semibold text-slate-800 dark:text-slate-200 block">{m.full_name}</span>
                                      <span className="text-slate-400">{m.email}</span>
                                    </div>
                                  </div>
                                  {getRoleTag(m.role)}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic m-0">No members assigned to this team.</p>
                          )}
                        </div>

                        <div className="flex justify-between items-center text-xs text-slate-400 pt-3 border-t border-slate-100">
                          <span>Created by: <strong>{team.created_by_detail?.full_name || 'Admin'}</strong></span>
                          <span>{team.created_at ? new Date(team.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : ''}</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ),
            },
          ]}
        />
      </Card>


      <Modal
        title={editingTeam ? `Edit Team: ${editingTeam.name}` : 'Create New Team'}
        open={showTeamModal}
        onCancel={() => {
          setShowTeamModal(false);
          setEditingTeam(null);
        }}
        onOk={() => teamForm.submit()}
        okText={editingTeam ? 'Update Team' : 'Create Team'}
        style={{ maxWidth: 'calc(100vw - 24px)', margin: '12px auto' }}
      >
        <Form form={teamForm} layout="vertical" onFinish={handleSaveTeam}>
          <Form.Item
            name="name"
            label="Team Name"
            rules={[{ required: true, message: 'Please enter team name' }]}
          >
            <Input id="name" name="name" placeholder="e.g. Engineering Lead Team" />
          </Form.Item>

          <Form.Item name="member_ids" label="Assign Team Members">
            <Select
              id="member_ids"
              name="member_ids"
              mode="multiple"
              placeholder="Select team members to include"
              options={users.map(u => ({ label: `${u.full_name} (${u.email}) - ${u.role}`, value: u.id }))}
            />
          </Form.Item>

          <Form.Item name="description" label="Team Description">
            <Input.TextArea id="description" name="description" rows={2} placeholder="Describe the purpose of this team..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Participant / Member Profile Details Modal */}
      <ParticipantProfileModal
        open={Boolean(selectedUserModal)}
        onClose={() => setSelectedUserModal(null)}
        user={selectedUserModal}
      />

      {/* Organization Danger Zone — Owner Only */}
      {isOwner && (
        <div className="mt-6 bg-red-50/80 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-2xl p-4 sm:p-5">
          <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
            <div className="flex items-start space-x-3">
              <WarningOutlined className="text-red-600 dark:text-red-400 text-xl shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-red-900 dark:text-red-300 text-sm m-0 leading-tight">Organization Danger Zone</h3>
                <p className="text-xs text-red-700 dark:text-red-400 m-0 mt-0.5 leading-relaxed max-w-md">
                  Permanently delete the organization and all its shared data — meetings, decisions, action items, teams, and all members. <strong>This cannot be undone.</strong>
                </p>
              </div>
            </div>
            <Button
              danger
              type="primary"
              icon={<DeleteOutlined />}
              size="small"
              className="font-bold shrink-0 px-3 h-8 rounded-lg"
              onClick={() => {
                setOrgDeleteConfirmText('');
                setOrgDeletePassword('');
                setOrgDeleteError('');
                setShowOrgDeleteModal(true);
              }}
            >
              Delete Organization
            </Button>
          </div>
        </div>
      )}

      {/* Organization Deletion Confirmation Modal */}
      <Modal
        title={
          <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
            <ExclamationCircleOutlined className="text-xl" />
            <span className="font-bold text-lg">Delete organization?</span>
          </div>
        }
        open={showOrgDeleteModal}
        onCancel={resetOrgDeleteForm}
        footer={null}
        width={520}
        destroyOnHidden
        closable={false}
      >
        <div className="py-3 space-y-4">
          <Alert
            message="This action is irreversible and permanent."
            description="This permanently deletes the organization and all its shared data, including meetings, decisions, action items, teams, members, and related records. All users will lose access immediately."
            type="error"
            showIcon
            icon={<WarningOutlined />}
          />

          {orgDeleteError && (
            <Alert message={orgDeleteError} type="error" showIcon closable onClose={() => setOrgDeleteError('')} />
          )}

          <div className="space-y-3">
            {!user?.is_oauth_user && (
              <div>
                <label htmlFor="org_delete_password" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Owner Password
                </label>
                <Input.Password
                  id="org_delete_password"
                  name="org_delete_password"
                  prefix={<LockOutlined className="text-slate-400" />}
                  placeholder="Enter your owner password"
                  size="large"
                  value={orgDeletePassword}
                  onChange={(e) => setOrgDeletePassword(e.target.value)}
                  className="rounded-lg"
                  autoFocus
                />
              </div>
            )}

            <div>
              <label htmlFor="org_delete_confirm" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Type <strong className="text-red-600 dark:text-red-400">SMART MEETING</strong> to confirm
              </label>
              <Input
                id="org_delete_confirm"
                name="org_delete_confirm"
                placeholder="SMART MEETING"
                size="large"
                value={orgDeleteConfirmText}
                onChange={(e) => setOrgDeleteConfirmText(e.target.value)}
                className="rounded-lg font-mono tracking-widest"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button icon={<CloseOutlined />} onClick={resetOrgDeleteForm}>
              Cancel
            </Button>
            <Button
              type="primary"
              danger
              icon={<DeleteOutlined />}
              loading={orgDeleteLoading}
              disabled={
                orgDeleteLoading ||
                orgDeleteConfirmText.trim().toUpperCase() !== 'SMART MEETING' ||
                (!user?.is_oauth_user && !orgDeletePassword)
              }
              onClick={handleDeleteOrganization}
              className="font-bold"
            >
              Delete Organization
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
