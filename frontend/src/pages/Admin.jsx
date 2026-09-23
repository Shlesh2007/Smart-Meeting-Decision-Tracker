import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { userService, teamService, departmentRequestService } from '../services/api.js';
import { LoadingSkeleton } from '../components/LoadingSkeleton.jsx';
import { ParticipantProfileModal } from '../components/ParticipantProfileModal.jsx';
import {
  Card, Table, Tag, Button, Select, Modal, Form, Input, message, Tabs, Alert, Avatar, Popconfirm, Tooltip
} from 'antd';
import {
  TeamOutlined, UserOutlined, PlusOutlined, SafetyOutlined, LockOutlined,
  EditOutlined, DeleteOutlined, UsergroupAddOutlined, CrownOutlined, CheckOutlined, CloseOutlined, SolutionOutlined, EyeOutlined
} from '@ant-design/icons';
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
  const { user, isOwner, isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [deptRequests, setDeptRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [selectedUserModal, setSelectedUserModal] = useState(null);
  const [teamForm] = Form.useForm();

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
          const statusCode = firstErr?.response?.status;
          const detailMsg = firstErr?.response?.data?.detail || firstErr?.response?.data?.error || firstErr?.message;

          if (statusCode === 403) {
            message.error('Access Restricted: You need an Admin or Owner role to view administrative data.');
          } else if (statusCode === 401) {
            message.error('Session expired. Please log in again.');
          } else if (!firstErr?.response) {
            message.error('Unable to connect to backend server. Please verify Django backend is running on port 8000.');
          } else {
            message.error(detailMsg || 'Failed to load admin data.');
          }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (isAdmin) loadData();
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
      message.error('Failed to delete team.');
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
      message.error('Failed to save team.');
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
      const errMsg = err.response?.data?.role?.[0] || err.response?.data?.detail || 'Failed to update user role.';
      message.error(errMsg);
    }
  };

  const handleDepartmentChange = async (targetUser, newDept) => {
    try {
      await userService.updateUserDepartment(targetUser.id, newDept || '');
      message.success(`Updated ${targetUser.username}'s department to ${newDept || 'General Team'}`);
      loadData();
    } catch (err) {
      const errMsg = err.response?.data?.department?.[0] || err.response?.data?.detail || 'Failed to update user department.';
      message.error(errMsg);
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
        const isDisabled = isSelf || (isTargetOwner && !isOwner) || (!isOwner && u.role === 'ADMIN');

        return (
          <Select
            id={`user_dept_${u.id}`}
            name={`user_dept_${u.id}`}
            value={u.department || undefined}
            placeholder="Assign Department..."
            onChange={(newDept) => handleDepartmentChange(u, newDept)}
            disabled={isDisabled}
            className="w-40 sm:w-44 text-xs font-medium"
            allowClear
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
        const isDisabled = isSelf || (isTargetOwner && !isOwner) || (!isOwner && u.role === 'ADMIN');

        if (isTargetOwner && !isOwner) {
          return (
            <Tooltip title="Organization Owner account is protected and cannot be modified by Admins">
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
            <SafetyOutlined className="text-blue-600 dark:text-blue-400" />
            <span>Admin & Role Management Portal</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 m-0 mt-1">Manage organization users, role hierarchy (Owner, Admin, Manager, Member), and teams.</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreateTeam}
          className="bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl border-none shadow-xs w-full sm:w-auto shrink-0"
        >
          Create New Team
        </Button>
      </div>

      <Card className="shadow-xs rounded-2xl dark:bg-slate-800 dark:border-slate-700/80 w-full max-w-full overflow-hidden" styles={{ body: { padding: '12px 16px', overflowX: 'hidden' } }}>
        <Tabs
          items={[
            {
              key: 'users',
              label: (
                <span className="font-semibold flex items-center space-x-2 text-xs sm:text-sm">
                  <UserOutlined />
                  <span>Users Directory ({users.length})</span>
                </span>
              ),
              children: loading ? (
                <LoadingSkeleton type="table" />
              ) : (
                <div className="overflow-x-auto w-full">
                  <Table columns={userColumns} dataSource={users} rowKey="id" pagination={{ pageSize: 8 }} scroll={{ x: 750 }} />
                </div>
              ),
            },
            {
              key: 'department_requests',
              label: (
                <span className="font-semibold flex items-center space-x-2 text-xs sm:text-sm">
                  <SolutionOutlined />
                  <span>Department Requests ({deptRequests.length})</span>
                  {pendingDeptCount > 0 && (
                    <Tag color="error" className="font-bold text-[10px] m-0 rounded-full">{pendingDeptCount} PENDING</Tag>
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
                <div className="overflow-x-auto w-full">
                  <Table columns={deptColumns} dataSource={deptRequests} rowKey="id" pagination={{ pageSize: 8 }} scroll={{ x: 750 }} />
                </div>
              ),
            },
            {
              key: 'teams',
              label: (
                <span className="font-semibold flex items-center space-x-2">
                  <TeamOutlined />
                  <span>Teams Directory ({teams.length})</span>
                </span>
              ),
              children: loading ? (
                <LoadingSkeleton type="card" />
              ) : teams.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <TeamOutlined className="text-4xl mb-2 text-slate-300" />
                  <p className="font-medium text-slate-700 dark:text-slate-300 m-0">No teams created yet.</p>
                  <Button type="primary" icon={<PlusOutlined />} onClick={openCreateTeam} className="mt-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl border-none">
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
                          <TeamOutlined className="text-blue-600 dark:text-blue-400" />
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
                              <UsergroupAddOutlined className="mr-1 text-blue-600 dark:text-blue-400" />
                              Team Members ({team.members_detail?.length || 0})
                            </span>
                          </div>

                          {team.members_detail && team.members_detail.length > 0 ? (
                            <div className="space-y-2 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700 max-h-40 overflow-y-auto">
                              {team.members_detail.map((m) => (
                                <div key={m.id} className="flex justify-between items-center text-xs bg-white dark:bg-slate-900 p-2 rounded border border-slate-100 dark:border-slate-700">
                                  <div className="flex items-center space-x-2">
                                    <Avatar size="small" icon={<UserOutlined />} className="bg-blue-600" />
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
    </div>
  );
}
