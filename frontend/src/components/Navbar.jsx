import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ProfileModal } from './ProfileModal.jsx';
import { ActionFormModal } from './ActionFormModal.jsx';
import { Logo } from './Logo.jsx';
import { notificationService } from '../services/api.js';
import {
  Button,
  Dropdown,
  Avatar,
  Tag,
  Drawer,
  Popover,
  Badge,
  Tooltip,
  Menu,
  Segmented,
  Space,
  Flex,
  Grid
} from 'antd';
import {
  DashboardOutlined,
  CalendarOutlined,
  CheckSquareOutlined,
  TeamOutlined,
  UserOutlined,
  LogoutOutlined,
  RightOutlined,
  BellOutlined,
  ExclamationCircleOutlined,
  CheckOutlined,
  FireOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PlusOutlined,
  SafetyOutlined,
  ThunderboltOutlined,
  FormOutlined,
} from '@ant-design/icons';

const { useBreakpoint } = Grid;

export const Navbar = ({ collapsed = false, onToggleSidebar, onCollapseSidebar }) => {
  const location = useLocation();
  const pathname = location.pathname;
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const screens = useBreakpoint();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAddActionModal, setShowAddActionModal] = useState(false);

  const quickActionItems = [
    {
      key: 'schedule_meeting',
      icon: <PlusOutlined className="text-blue-500 font-bold" />,
      label: (
        <div onClick={() => navigate('/meetings/new')} className="py-1 px-0.5 cursor-pointer">
          <p className="font-bold text-xs text-slate-900 dark:text-white m-0">Schedule Meeting</p>
          <p className="text-[10px] text-slate-400 m-0">Create session & set agenda</p>
        </div>
      ),
    },
    {
      key: 'add_action_item',
      icon: <FormOutlined className="text-amber-500 font-bold" />,
      label: (
        <div onClick={() => setShowAddActionModal(true)} className="py-1 px-0.5 cursor-pointer">
          <p className="font-bold text-xs text-slate-900 dark:text-white m-0">Add Action Item</p>
          <p className="text-[10px] text-slate-400 m-0">Log task & assign team member</p>
        </div>
      ),
    },
    {
      key: 'view_calendar',
      icon: <CalendarOutlined className="text-indigo-500 font-bold" />,
      label: (
        <div onClick={() => navigate('/meetings?view=calendar')} className="py-1 px-0.5 cursor-pointer">
          <p className="font-bold text-xs text-slate-900 dark:text-white m-0">View Calendar</p>
          <p className="text-[10px] text-slate-400 m-0">Monthly schedule overview</p>
        </div>
      ),
    },
  ];

  // Notification state & controlled popover visibility
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [notificationTab, setNotificationTab] = useState('unread');

  const fetchNotifications = () => {
    if (!user) return;
    setLoadingNotifications(true);
    notificationService
      .getNotifications()
      .then((data) => {
        const rawList = Array.isArray(data) ? data : (data.results || []);
        const list = rawList.map((n) => {
          let icon = <BellOutlined className="text-blue-500" />;
          const nType = n.notification_type || n.type;
          if (nType === 'overdue') {
            icon = <ExclamationCircleOutlined className="text-rose-500" />;
          } else if (nType === 'critical') {
            icon = <FireOutlined className="text-red-500" />;
          } else if (nType === 'upcoming') {
            icon = <ClockCircleOutlined className="text-blue-500" />;
          }
          return { ...n, icon };
        });
        setNotifications(list);
      })
      .catch((err) => {
        console.error('Failed to fetch notifications:', err);
        setNotifications([]);
      })
      .finally(() => setLoadingNotifications(false));
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  const unreadNotifications = notifications.filter((n) => !n.is_read);
  const hasUnread = unreadNotifications.length > 0;
  const displayedNotifications = notificationTab === 'unread' ? unreadNotifications : notifications;

  const handleNotificationClick = (n) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === n.id ? { ...item, is_read: true } : item))
    );
    setPopoverOpen(false);
    notificationService.markAsRead(n.id).catch((err) => {
      console.error('Failed to mark notification as read:', err);
    });
    if (n.link) {
      navigate(n.link);
    }
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
    notificationService.markAllAsRead().catch((err) => {
      console.error('Failed to mark all notifications as read:', err);
    });
  };

  const isAuthPage = pathname === '/login' || pathname === '/register';
  if (!user || isAuthPage) return null;

  const now = new Date();
  const fullDateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  const shortDateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const getActiveKey = () => {
    if (pathname === '/dashboard') return '/dashboard';
    if (pathname.startsWith('/meetings')) return '/meetings';
    if (pathname.startsWith('/my-actions')) return '/my-actions';
    if (pathname.startsWith('/admin')) return '/admin';
    return pathname;
  };

  const handleNavigation = (path) => {
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
    setDrawerOpen(false);
    if (onCollapseSidebar) {
      onCollapseSidebar();
    }
    window.scrollTo(0, 0);
    if (pathname !== path) {
      navigate(path);
    }
  };

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined className="text-base" />,
      label: 'Dashboard',
      onClick: () => handleNavigation('/dashboard'),
    },
    {
      key: '/meetings',
      icon: <CalendarOutlined className="text-base" />,
      label: 'Meetings',
      onClick: () => handleNavigation('/meetings'),
    },
    {
      key: '/my-actions',
      icon: <CheckSquareOutlined className="text-base" />,
      label: 'Action Items',
      onClick: () => handleNavigation('/my-actions'),
    },
    ...(isAdmin ? [
      {
        key: '/admin',
        icon: <TeamOutlined className="text-base" />,
        label: 'Admin Management',
        onClick: () => handleNavigation('/admin'),
      },
    ] : []),
  ];

  const formattedMenuItems = menuItems.map((item) => ({
    ...item,
    title: item.label,
    label: collapsed ? undefined : item.label,
  }));

  const notificationPopoverContent = (
    <div className="w-80 max-w-[calc(100vw-32px)] sm:w-80 select-none">
      <Flex align="center" justify="space-between" className="pb-2.5 border-b border-slate-100 dark:border-slate-800">
        <Space size={6}>
          <BellOutlined className="text-blue-600 font-bold" />
          <h4 className="font-extrabold text-xs text-slate-900 dark:text-white m-0">Notifications</h4>
          {hasUnread && <Badge count={unreadNotifications.length} size="small" />}
        </Space>
        <Space size={4}>
          {hasUnread && (
            <Button
              type="link"
              size="small"
              onClick={markAllAsRead}
              className="p-0 text-[10px] font-bold text-blue-600 hover:text-blue-700 h-auto border-none"
            >
              Mark all read
            </Button>
          )}
          <Button
            type="text"
            shape="circle"
            size="small"
            icon={<CloseOutlined className="text-xs text-slate-400" />}
            onClick={() => setPopoverOpen(false)}
          />
        </Space>
      </Flex>

      <div className="my-2">
        <Segmented
          value={notificationTab}
          onChange={setNotificationTab}
          options={[
            {
              label: unreadNotifications.length > 0 ? `Unread (${unreadNotifications.length})` : 'Unread',
              value: 'unread'
            },
            {
              label: `All (${notifications.length})`,
              value: 'all'
            }
          ]}
          block
          size="small"
          className="font-bold text-[11px]"
        />
      </div>

      <div className="my-2 max-h-64 overflow-y-auto space-y-2 pr-1">
        {loadingNotifications ? (
          <p className="text-center text-slate-400 py-4 text-xs">Loading alerts...</p>
        ) : displayedNotifications.length === 0 ? (
          <div className="py-6 text-center space-y-2">
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-sm">
              <CheckOutlined />
            </div>
            <p className="font-bold text-xs text-slate-800 dark:text-slate-200 m-0">
              {notificationTab === 'unread' ? 'All Caught Up!' : 'No Notifications'}
            </p>
            <p className="text-[10px] text-slate-400 m-0">
              {notificationTab === 'unread'
                ? 'No new unread notifications at this time.'
                : 'No notification records found.'}
            </p>
            {notificationTab === 'unread' && notifications.length > 0 && (
              <Button
                type="link"
                size="small"
                onClick={() => setNotificationTab('all')}
                className="text-xs text-blue-600 dark:text-blue-400 font-bold p-0 h-auto"
              >
                View All Notifications ({notifications.length}) →
              </Button>
            )}
          </div>
        ) : (
          displayedNotifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-start space-x-2.5 group ${
                !n.is_read
                  ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-500'
                  : 'bg-slate-50 dark:bg-slate-800/80 border-slate-100 dark:border-slate-700 opacity-75 hover:opacity-100 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <div className="mt-0.5 shrink-0 text-sm">{n.icon}</div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center justify-between gap-1">
                  <p className={`font-bold text-xs m-0 leading-tight transition-colors ${
                    !n.is_read
                      ? 'text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400'
                      : 'text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white'
                  }`}>
                    {n.title}
                  </p>
                  {!n.is_read && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" title="Unread" />
                  )}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 m-0 truncate">
                  {n.subtitle}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <Flex justify="end" className="pt-2 border-t border-slate-100 dark:border-slate-800">
        <Button
          type="link"
          size="small"
          onClick={() => {
            setPopoverOpen(false);
            navigate('/my-actions');
          }}
          className="text-blue-600 dark:text-blue-400 font-bold p-0 text-[10px] h-auto"
        >
          View Actions →
        </Button>
      </Flex>
    </div>
  );

  const userMenuItems = [
    {
      key: 'profile_info',
      label: (
        <div onClick={() => setShowProfileModal(true)} className="py-1 px-0.5 cursor-pointer">
          <p className="font-bold text-slate-900 dark:text-white m-0">{user.full_name || user.username}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 m-0">{user.email}</p>
          <span className="text-[11px] text-blue-600 font-semibold block mt-1 hover:underline">
            View Profile Details <RightOutlined className="text-[9px]" />
          </span>
        </div>
      ),
    },
    ...(isAdmin ? [
      { type: 'divider' },
      {
        key: 'admin_portal',
        icon: <TeamOutlined className="text-blue-600" />,
        label: <span className="font-bold text-slate-800 dark:text-slate-200">Admin Management Portal</span>,
        onClick: () => navigate('/admin'),
      },
    ] : []),
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      danger: true,
      onClick: logout,
    },
  ];

  return (
    <>
      {/* Desktop Left Sidebar powered by AntD Menu & Grid */}
      <aside className={`hidden lg:flex flex-col fixed top-0 left-0 bottom-0 z-40 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-700 shadow-xs transition-all duration-300 select-none overflow-x-hidden ${collapsed ? 'w-16' : 'w-64'}`}>
        
        {/* Sidebar Brand Header */}
        <Flex align="center" justify={collapsed ? 'center' : 'space-between'} className="h-16 px-4 border-b border-slate-200/80 dark:border-slate-700/80 shrink-0 overflow-x-hidden">
          {!collapsed && (
            <Link to="/dashboard" className="no-underline flex items-center">
              <Logo variant="full" height={46} />
            </Link>
          )}
          {onToggleSidebar && (
            <Button
              type="text"
              size="small"
              icon={collapsed ? <MenuUnfoldOutlined className="text-slate-500 text-base" /> : <MenuFoldOutlined className="text-slate-500 text-base" />}
              onClick={onToggleSidebar}
              title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              className="p-1 rounded-lg"
            />
          )}
        </Flex>

        {/* AntD Navigation Menu */}
        <div className="flex-1 px-1.5 pt-2 pb-4 overflow-y-auto overflow-x-hidden">
          {!collapsed && (
            <div className="px-3 pb-2 text-[10px] uppercase font-extrabold tracking-wider text-slate-400">
              Navigation
            </div>
          )}
          <Menu
            mode="inline"
            inlineCollapsed={collapsed}
            selectedKeys={[getActiveKey()]}
            items={menuItems}
            overflowedIndicator={null}
            className="border-none bg-transparent font-bold text-xs w-full max-w-full overflow-x-hidden"
          />
        </div>

        {/* Bottom Sidebar User Profile Card */}
        <div className={`p-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80 m-2 rounded-xl space-y-2 overflow-x-hidden ${collapsed ? 'flex flex-col items-center' : ''}`}>
          <Tooltip title={user.email} placement="right">
            <div
              onClick={() => setShowProfileModal(true)}
              className={`flex items-center cursor-pointer p-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors ${collapsed ? 'justify-center' : 'space-x-2'}`}
            >
              <Avatar size={28} shape="circle" className="bg-blue-600 font-extrabold text-[11px] text-white shrink-0 flex items-center justify-center !w-7 !h-7 !min-w-[28px] !min-h-[28px] !rounded-full !aspect-square">
                {(user?.first_name || user?.username || 'U')[0].toUpperCase()}
              </Avatar>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-1.5 min-w-0">
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                      {user.first_name || user.username}
                    </span>
                    <Tag color={isAdmin ? 'volcano' : 'blue'} className="text-[9px] uppercase font-bold m-0 px-1 shrink-0">
                      {user.role}
                    </Tag>
                  </div>
                  <p className="text-[9.5px] tracking-tight text-slate-600 dark:text-slate-400 m-0 font-medium whitespace-nowrap leading-tight mt-0.5 truncate">
                    {user.email}
                  </p>
                </div>
              )}
            </div>
          </Tooltip>

          <div className="pt-1 w-full flex justify-center">
            {collapsed ? (
              <Tooltip title="Logout" placement="right">
                <Button
                  type="text"
                  danger
                  icon={<LogoutOutlined />}
                  onClick={logout}
                  className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white border border-rose-200"
                />
              </Tooltip>
            ) : (
              <Button
                type="default"
                danger
                icon={<LogoutOutlined />}
                onClick={logout}
                block
                className="rounded-lg bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white border-rose-200 text-xs font-bold"
              >
                Logout
              </Button>
            )}
          </div>
        </div>
      </aside>

      {/* Top Navigation Header Bar */}
      <header className={`sticky top-0 lg:relative z-30 w-full max-w-full bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-700/80 shadow-xs transition-all duration-300 ${collapsed ? 'lg:pl-16' : 'lg:pl-64'}`}>
        <Flex align="center" justify="space-between" className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 gap-2 sm:gap-4">

          {/* Logo Brand Header */}
          <Flex align="center" size={8} className="shrink-0">
            <div className={`items-center shrink-0 ${collapsed ? 'flex' : 'flex lg:hidden'}`}>
              <Link to="/dashboard" className="no-underline flex items-center">
                <Logo variant="full" height={46} />
              </Link>
            </div>
          </Flex>

          {/* Right Controls: Date Badge, Notifications & Profile */}
          <Space size={screens.md ? 12 : 8} className="ml-auto shrink-0">
            {/* Quick Actions Header Dropdown Button */}
            <Dropdown menu={{ items: quickActionItems }} placement="bottomRight" trigger={['click']}>
              <Button
                type="default"
                icon={<FormOutlined className="text-amber-500 text-xs font-bold" />}
                className="h-9 px-3 font-bold rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80 flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <span className="hidden xs:inline text-xs font-bold">Quick Actions</span>
              </Button>
            </Dropdown>

            {/* Live Date Badge */}
            <span className="hidden sm:inline-flex items-center space-x-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700 shrink-0">
              <CalendarOutlined className="text-blue-500 text-xs shrink-0" />
              <span className="sm:hidden">{shortDateStr}</span>
              <span className="hidden sm:inline">{fullDateStr}</span>
            </span>

            {/* Admin Panel Quick Access Button (Mobile/Tablet screens only) */}
            {isAdmin && (
              <span className="lg:hidden">
                <Tooltip title="Admin Management Panel">
                  <Button
                    type={pathname === '/admin' ? 'primary' : 'default'}
                    icon={<SafetyOutlined className={pathname === '/admin' ? 'text-white dark:text-slate-900' : 'text-slate-700 dark:text-slate-300'} />}
                    onClick={() => navigate('/admin')}
                    className={`h-9 px-3 font-bold rounded-xl border-none ${pathname === '/admin' ? 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900' : 'bg-slate-100/70 dark:bg-slate-700/50'}`}
                  >
                    <span className="hidden sm:inline text-xs font-bold">Admin Panel</span>
                  </Button>
                </Tooltip>
              </span>
            )}

            {/* Interactive Notification Bell Popover */}
            <Popover
              content={notificationPopoverContent}
              trigger="click"
              placement="bottomRight"
              arrow={false}
              open={popoverOpen}
              onOpenChange={(newOpen) => {
                setPopoverOpen(newOpen);
                if (newOpen) {
                  fetchNotifications();
                }
              }}
              overlayClassName="notification-popover"
            >
              <Button
                type="text"
                className="w-9 h-9 p-0 flex items-center justify-center rounded-xl bg-slate-100/70 dark:bg-slate-700/50 border border-slate-200/60 dark:border-slate-700/60"
              >
                <Badge dot={hasUnread} offset={[-1, 1]}>
                  <BellOutlined className="text-base text-slate-700 dark:text-slate-200" />
                </Badge>
              </Button>
            </Popover>

            {/* User Profile Dropdown */}
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
              <Flex align="center" size={8} className="cursor-pointer p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/70 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700 shrink-0">
                <Avatar size={32} shape="circle" className="bg-blue-600 font-extrabold text-xs text-white shadow-xs ring-2 ring-blue-500/20 shrink-0 flex items-center justify-center !w-8 !h-8 !min-w-[32px] !min-h-[32px] !rounded-full !aspect-square">
                   {(user?.first_name || user?.username || 'U')[0].toUpperCase()}
                </Avatar>
                <span className="hidden md:inline-block text-xs font-bold text-slate-800 dark:text-slate-200 px-1">
                   {user.first_name || user.username}
                </span>
              </Flex>
            </Dropdown>
          </Space>

        </Flex>
      </header>

      {/* Clean Offcanvas Mobile Navigation Drawer powered by AntD Drawer & Menu */}
      <Drawer
        title={
          <Link to="/dashboard" className="no-underline flex items-center" onClick={() => setDrawerOpen(false)}>
            <Logo variant="full" height={46} />
          </Link>
        }
        placement="left"
        width={280}
        closable={true}
        maskClosable={true}
        closeIcon={<CloseOutlined className="text-slate-500 hover:text-slate-800 text-base" />}
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        styles={{
          header: {
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            padding: '8px 20px 12px 20px',
          },
          body: {
            background: '#ffffff',
            color: '#0f172a',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          },
        }}
      >
        <div className="flex flex-col space-y-4">
          <div className="px-1 text-[10px] uppercase font-extrabold tracking-wider text-slate-400">
            Navigation
          </div>

          <Menu
            mode="inline"
            selectedKeys={[getActiveKey()]}
            items={menuItems}
            className="border-none bg-transparent font-bold text-xs"
          />
        </div>

        {/* Offcanvas Footer Profile Card */}
        <div className="pt-4 border-t border-slate-200 space-y-3">
          <Flex
            align="center"
            size={8}
            onClick={() => {
              setDrawerOpen(false);
              setShowProfileModal(true);
            }}
            className="cursor-pointer p-1.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors"
          >
            <Avatar className="bg-blue-600 font-extrabold text-[11px] text-white shrink-0 flex items-center justify-center w-7 h-7">
              {(user?.first_name || user?.username || 'U')[0].toUpperCase()}
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-1.5 min-w-0">
                <span className="font-bold text-xs text-slate-900 truncate">
                  {user.first_name || user.username || user.full_name}
                </span>
                <Tag color={isAdmin ? 'volcano' : 'blue'} className="text-[9px] uppercase font-bold m-0 px-1 shrink-0">
                  {user.role}
                </Tag>
              </div>
              <p className="text-[9.5px] tracking-tight text-slate-600 dark:text-slate-400 m-0 font-medium whitespace-nowrap leading-tight mt-0.5">
                {user.email}
              </p>
            </div>
          </Flex>

          <div>
            <Button
              type="default"
              danger
              icon={<LogoutOutlined />}
              onClick={() => {
                setDrawerOpen(false);
                logout();
              }}
              block
              className="rounded-lg bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white border-rose-200 text-xs font-bold"
            >
              Logout
            </Button>
          </div>
        </div>
      </Drawer>

      {/* Bottom Navigation Bar for Mobile / Responsive Screens powered by AntD Buttons & Badge */}
      <nav className="mobile-bottom-nav lg:hidden fixed bottom-0 left-0 right-0 w-full z-50 select-none !overflow-visible pointer-events-none">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/90 dark:border-slate-800 shadow-2xl rounded-t-2xl px-3 pt-1.5 pb-2.5 flex items-center justify-between relative z-10 pointer-events-auto !overflow-visible">
          
          {/* Item 1: Home (Dashboard) */}
          <Button
            type="text"
            onClick={() => handleNavigation('/dashboard')}
            className="flex-1 flex flex-col items-center justify-center h-auto py-1 border-none hover:bg-transparent"
          >
            <div className={`p-1.5 rounded-xl transition-all ${
              pathname === '/dashboard'
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold scale-110'
                : 'text-slate-400 dark:text-slate-500'
            }`}>
              <DashboardOutlined className="text-lg" />
            </div>
            <span className={`text-[10px] font-semibold mt-0.5 transition-colors ${
              pathname === '/dashboard'
                ? 'text-slate-900 dark:text-white font-extrabold'
                : 'text-slate-500 dark:text-slate-400'
            }`}>
              Dashboard
            </span>
          </Button>

          {/* Item 2: Meetings */}
          <Button
            type="text"
            onClick={() => handleNavigation('/meetings')}
            className="flex-1 flex flex-col items-center justify-center h-auto py-1 border-none hover:bg-transparent"
          >
            <div className={`p-1.5 rounded-xl transition-all ${
              pathname === '/meetings' || (pathname.startsWith('/meetings/') && pathname !== '/meetings/new')
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold scale-110'
                : 'text-slate-400 dark:text-slate-500'
            }`}>
              <CalendarOutlined className="text-lg" />
            </div>
            <span className={`text-[10px] font-semibold mt-0.5 transition-colors ${
              pathname === '/meetings' || (pathname.startsWith('/meetings/') && pathname !== '/meetings/new')
                ? 'text-slate-900 dark:text-white font-extrabold'
                : 'text-slate-500 dark:text-slate-400'
            }`}>
              Meetings
            </span>
          </Button>

          {/* Item 3 Center Spacer & Create Button Label */}
          <div
            onClick={() => handleNavigation('/meetings/new')}
            className="flex-1 flex flex-col items-center justify-center py-1 cursor-pointer group"
          >
            <div className="w-10 h-7 pointer-events-none" />
            <span className={`text-[9.5px] font-extrabold mt-0.5 uppercase tracking-tight transition-colors ${
              pathname === '/meetings/new'
                ? 'text-slate-900 dark:text-white font-black'
                : 'text-slate-500 dark:text-slate-400'
            }`}>
              CREATE
            </span>
          </div>

          {/* Item 4: Action Items */}
          <Button
            type="text"
            onClick={() => handleNavigation('/my-actions')}
            className="flex-1 flex flex-col items-center justify-center h-auto py-1 border-none hover:bg-transparent"
          >
            <div className={`p-1.5 rounded-xl transition-all ${
              pathname === '/my-actions'
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold scale-110'
                : 'text-slate-400 dark:text-slate-500'
            }`}>
              <CheckSquareOutlined className="text-lg" />
            </div>
            <span className={`text-[10px] font-semibold mt-0.5 transition-colors ${
              pathname === '/my-actions'
                ? 'text-slate-900 dark:text-white font-extrabold'
                : 'text-slate-500 dark:text-slate-400'
            }`}>
              Actions
            </span>
          </Button>

          {/* Item 5: Profile Modal */}
          <Button
            type="text"
            onClick={() => setShowProfileModal(true)}
            className="flex-1 flex flex-col items-center justify-center h-auto py-1 border-none hover:bg-transparent"
          >
            <div className={`p-1.5 rounded-xl transition-all ${
              showProfileModal
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold scale-110'
                : 'text-slate-400 dark:text-slate-500'
            }`}>
              <UserOutlined className="text-lg" />
            </div>
            <span className={`text-[10px] font-semibold mt-0.5 transition-colors ${
              showProfileModal
                ? 'text-slate-900 dark:text-white font-extrabold'
                : 'text-slate-500 dark:text-slate-400'
            }`}>
              Profile
            </span>
          </Button>

        </div>

        {/* Floating AntD Primary CREATE (+) Button */}
        <Button
          type="primary"
          shape="circle"
          icon={<PlusOutlined className="text-xl font-black" />}
          onClick={() => handleNavigation('/meetings/new')}
          title="Create Meeting"
          style={{
            width: '52px',
            height: '52px',
            position: 'absolute',
            left: '50%',
            top: '-26px',
            transform: 'translateX(-50%)',
            zIndex: 50,
            pointerEvents: 'auto',
          }}
          className={`border-none flex items-center justify-center shadow-lg pointer-events-auto cursor-pointer ${
            pathname === '/meetings/new'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 ring-4 ring-slate-400/50 scale-105'
              : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 active:scale-95'
          }`}
        />
      </nav>

      {/* User Profile Modal */}
      <ProfileModal
        open={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={user}
      />

      {/* Global Quick Actions Add Action Item Modal */}
      <ActionFormModal
        open={showAddActionModal}
        onClose={() => setShowAddActionModal(false)}
        onSuccess={() => setShowAddActionModal(false)}
      />
    </>
  );
};
