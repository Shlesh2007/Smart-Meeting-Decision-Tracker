import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { userService, teamService } from '../services/api.js';
import { LoadingSkeleton } from '../components/LoadingSkeleton.jsx';
import {
  Card, Table, Tag, Button, Select, Modal, Form, Input, message, Tabs, Alert, Avatar, Popconfirm, Tooltip
} from 'antd';
import {
  TeamOutlined, UserOutlined, PlusOutlined, SafetyOutlined, LockOutlined,
  EditOutlined, DeleteOutlined, UsergroupAddOutlined, CrownOutlined
} from '@ant-design/icons';
import { format } from 'date-fns';

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
  const [loading, setLoading] = useState(true);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [teamForm] = Form.useForm();

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([
      userService.getUsers(),
      teamService.getTeams()
    ])
      .then(([uRes, tRes]) => {
        setUsers(uRes.results || uRes);
        setTeams(tRes.results || tRes);
      })
      .catch(() => message.error('Failed to load admin data.'))
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
      render: (_, u) => (
        <div>
          <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            {u.full_name}
            {u.role === 'OWNER' && <CrownOutlined className="text-amber-500 text-xs" />}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">{u.username}</span>
        </div>
      ),
    },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Department', dataIndex: 'department', key: 'department', render: (val) => val || '—' },
    {
      title: 'Current Role',
      dataIndex: 'role',
      key: 'role',
      render: (role) => getRoleTag(role),
    },
    {
      title: 'Joined Date',
      dataIndex: 'date_joined',
      key: 'date_joined',
      render: (dateStr) => dateStr ? format(new Date(dateStr), 'MMM dd, yyyy') : '—',
    },
    {
      title: 'Manage Role',
      key: 'action',
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

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex justify-between items-center transition-colors duration-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white m-0 flex items-center space-x-2">
            <SafetyOutlined className="text-blue-600 dark:text-blue-400" />
            <span>Admin & Role Management Portal</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 m-0">Manage organization users, role hierarchy (Owner, Admin, Manager, Member), and teams.</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateTeam} className="bg-blue-600 hover:bg-blue-700 font-semibold rounded-xl border-none shadow-xs">
          Create New Team
        </Button>
      </div>

      <Card className="shadow-xs rounded-2xl dark:bg-slate-800 dark:border-slate-700/80">
        <Tabs
          items={[
            {
              key: 'users',
              label: (
                <span className="font-semibold flex items-center space-x-2">
                  <UserOutlined />
                  <span>Users Directory ({users.length})</span>
                </span>
              ),
              children: loading ? (
                <LoadingSkeleton type="table" />
              ) : (
                <Table columns={userColumns} dataSource={users} rowKey="id" pagination={{ pageSize: 8 }} scroll={{ x: 'max-content' }} />
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
                  <Button type="primary" icon={<PlusOutlined />} onClick={openCreateTeam} className="mt-3 bg-blue-600 hover:bg-blue-700 font-semibold rounded-xl border-none">
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
                          <span>{team.created_at ? format(new Date(team.created_at), 'MMM dd, yyyy') : ''}</span>
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
            <Input placeholder="e.g. Engineering Lead Team" />
          </Form.Item>

          <Form.Item name="description" label="Team Description">
            <Input.TextArea rows={2} placeholder="Describe the purpose of this team..." />
          </Form.Item>

          <Form.Item name="member_ids" label="Assign Team Members">
            <Select
              mode="multiple"
              placeholder="Select team members to include"
              options={users.map(u => ({ label: `${u.full_name} (${u.email}) - ${u.role}`, value: u.id }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
