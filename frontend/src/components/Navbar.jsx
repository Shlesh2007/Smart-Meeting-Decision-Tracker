import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ProfileModal } from './ProfileModal.jsx';
import { Logo } from './Logo.jsx';
import { analyticsService, meetingService, actionService, notificationService } from '../services/api.js';
import { Button, Dropdown, Avatar, Tag, Drawer, Input, Popover, Badge, Spin, Tooltip } from 'antd';
import {
  DashboardOutlined,
  CalendarOutlined,
  CheckSquareOutlined,
  TeamOutlined,
  UserOutlined,
  LogoutOutlined,
  RightOutlined,
  SearchOutlined,
  BellOutlined,
  ExclamationCircleOutlined,
  CheckOutlined,
  FireOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MenuOutlined,
  PlusOutlined,
} from '@ant-design/icons';

export const Navbar = ({ collapsed = false, onToggleSidebar }) => {
  const location = useLocation();
  const pathname = location.pathname;
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

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
  const currentDateStr = fullDateStr;

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: <DashboardOutlined /> },
    { label: 'Meetings', path: '/meetings', icon: <CalendarOutlined /> },
    { label: 'Action Items', path: '/my-actions', icon: <CheckSquareOutlined /> },
    ...(isAdmin ? [{ label: 'Admin Management', path: '/admin', icon: <TeamOutlined /> }] : []),
  ];

  const handleNavigation = (path) => {
    setDrawerOpen(false);
    window.scrollTo(0, 0);
    if (pathname !== path) {
      navigate(path);
    }
  };

  const notificationPopoverContent = (
    <div className="w-80 max-w-[calc(100vw-32px)] sm:w-80 select-none">
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-2">
          <BellOutlined className="text-blue-600 font-bold" />
          <h4 className="font-extrabold text-xs text-slate-900 dark:text-white m-0">Notifications</h4>
          {hasUnread && (
            <Badge count={unreadNotifications.length} className="ml-1" size="small" />
          )}
        </div>
        <div className="flex items-center space-x-2">
          {hasUnread && (
            <button
              type="button"
              id="notification_mark_read_btn"
              name="notification_mark_read_btn"
              onClick={markAllAsRead}
              className="text-[10px] text-blue-600 hover:underline font-bold bg-transparent border-0 cursor-pointer"
            >
              Mark all read
            </button>
          )}
          <button
            type="button"
            id="notification_close_btn"
            name="notification_close_btn"
            onClick={() => setPopoverOpen(false)}
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors bg-transparent border-0 cursor-pointer"
            aria-label="Close Notifications"
            title="Close Notifications"
          >
            <CloseOutlined className="text-xs" />
          </button>
        </div>
      </div>

      {/* Filter Tabs: Unread vs All */}
      <div className="flex items-center space-x-1 mt-2.5 mb-2 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[11px] font-semibold">
        <button
          type="button"
          id="notif_tab_unread"
          onClick={() => setNotificationTab('unread')}
          className={`flex-1 py-1 px-2 text-center rounded-md transition-all border-0 cursor-pointer text-[11px] font-bold ${
            notificationTab === 'unread'
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white bg-transparent'
          }`}
        >
          Unread {unreadNotifications.length > 0 && `(${unreadNotifications.length})`}
        </button>
        <button
          type="button"
          id="notif_tab_all"
          onClick={() => setNotificationTab('all')}
          className={`flex-1 py-1 px-2 text-center rounded-md transition-all border-0 cursor-pointer text-[11px] font-bold ${
            notificationTab === 'all'
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white bg-transparent'
          }`}
        >
          All ({notifications.length})
        </button>
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
              <button
                type="button"
                onClick={() => setNotificationTab('all')}
                className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline bg-transparent border-0 cursor-pointer mt-1"
              >
                View All Notifications ({notifications.length}) →
              </button>
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

      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex justify-end items-center">
        <button
          type="button"
          id="notification_view_actions_btn"
          name="notification_view_actions_btn"
          onClick={() => {
            setPopoverOpen(false);
            navigate('/my-actions');
          }}
          className="no-underline text-blue-600 dark:text-blue-400 font-bold hover:underline bg-transparent border-0 cursor-pointer text-[10px]"
        >
          View Actions →
        </button>
      </div>
    </div>
  );

  const userMenuItems = [
    {
      key: 'profile_info',
      label: (
        <div onClick={() => setShowProfileModal(true)} className="py-1.5 px-0.5 cursor-pointer">
          <p className="font-bold text-slate-900 dark:text-white m-0">{user.full_name || user.username}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 m-0">{user.email}</p>
          <span className="text-[11px] text-blue-600 font-semibold block mt-1.5 hover:underline">
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
      {/* Light Clean Left Sidebar for Desktop */}
      <aside className={`hidden lg:flex flex-col fixed top-0 left-0 bottom-0 z-40 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-700 shadow-xs transition-all duration-300 select-none ${collapsed ? 'w-16' : 'w-64'}`}>
        
        {/* Sidebar Brand Header */}
        <div className={`h-11 px-3.5 border-b border-slate-200/80 dark:border-slate-700/80 flex items-center ${collapsed ? 'flex-col gap-2.5 justify-center' : 'justify-between'}`}>
          {!collapsed && (
            <Link to="/dashboard" className="no-underline flex items-center">
              <Logo variant="full" height={32} />
            </Link>
          )}
          {onToggleSidebar && (
            <Button
              type="text"
              size="small"
              icon={collapsed ? <MenuUnfoldOutlined className="text-slate-500 hover:text-slate-800" /> : <MenuFoldOutlined className="text-slate-500 hover:text-slate-800" />}
              onClick={onToggleSidebar}
              title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              className="p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
            />
          )}
        </div>

        {/* Navigation Items */}
        <div className="flex-1 px-2.5 pt-0 pb-4 space-y-1 overflow-y-auto">
          {!collapsed && (
            <div className="px-3 pb-2 text-[10px] uppercase font-extrabold tracking-wider text-slate-400">
              Navigation
            </div>
          )}

          {navItems.map((item) => {
            const isActive =
              pathname === item.path ||
              (item.path !== '/dashboard' && pathname.startsWith(item.path));

            const buttonContent = (
              <button
                key={item.path}
                type="button"
                onClick={() => handleNavigation(item.path)}
                className={`w-full flex items-center transition-all border-0 cursor-pointer ${
                  collapsed ? 'justify-center p-2.5 rounded-xl' : 'space-x-3 px-3 py-2.5 text-xs font-bold rounded-lg'
                } ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-extrabold border-l-4 border-blue-600'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 bg-transparent'
                }`}
              >
                <span className={`text-base ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`}>{item.icon}</span>
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );

            return collapsed ? (
              <Tooltip key={item.path} title={item.label} placement="right">
                {buttonContent}
              </Tooltip>
            ) : (
              buttonContent
            );
          })}
        </div>

        {/* Bottom Sidebar User Profile Card */}
        <div className={`p-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80 m-2 rounded-xl space-y-2 ${collapsed ? 'flex flex-col items-center' : ''}`}>
          <Tooltip title={user.email} placement="right">
            <div
              onClick={() => setShowProfileModal(true)}
              className={`flex items-center cursor-pointer p-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors ${collapsed ? 'justify-center' : 'space-x-2'}`}
            >
              <Avatar className="bg-blue-600 font-extrabold text-[11px] text-white shrink-0 flex items-center justify-center w-7 h-7">
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
                <button
                  type="button"
                  onClick={logout}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white border border-rose-200 text-xs font-bold transition-all cursor-pointer"
                >
                  <LogoutOutlined />
                </button>
              </Tooltip>
            ) : (
              <button
                type="button"
                onClick={logout}
                className="w-full flex items-center justify-center space-x-2 py-1.5 rounded-lg bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white border border-rose-200 text-xs font-bold transition-all cursor-pointer"
              >
                <LogoutOutlined />
                <span>Logout</span>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Top Navigation Header Bar */}
      <header className={`sticky top-0 z-30 w-full max-w-full bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-700/80 shadow-xs transition-all duration-300 ${collapsed ? 'lg:pl-16' : 'lg:pl-64'}`}>
        <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 h-11 flex items-center justify-between gap-2 sm:gap-4">

          {/* Logo Brand Header */}
          <div className="flex items-center space-x-2 shrink-0">
            <div className={`items-center shrink-0 ${collapsed ? 'flex' : 'flex lg:hidden'}`}>
              <Link to="/dashboard" className="no-underline flex items-center">
                <Logo variant="full" height={28} />
              </Link>
            </div>
          </div>

          {/* Right Controls: Date Badge, Notifications & Profile */}
          <div className="flex items-center space-x-1.5 sm:space-x-2.5 ml-auto shrink-0">
            {/* Live Date Badge (Visible on sm and up) */}
            <span className="hidden sm:inline-flex items-center space-x-1 text-[10px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-200/80 dark:border-slate-700 shrink-0">
              <CalendarOutlined className="text-blue-500 text-[11px] shrink-0" />
              <span className="sm:hidden">{shortDateStr}</span>
              <span className="hidden sm:inline">{fullDateStr}</span>
            </span>

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
              <div className="cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg text-slate-700 dark:text-slate-200 bg-slate-100/70 dark:bg-slate-700/50 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 transition-all border border-slate-200/60 dark:border-slate-700/60 shrink-0">
                <Badge dot={hasUnread} offset={[-1, 1]} className="flex items-center justify-center">
                  <BellOutlined className="text-base text-slate-700 dark:text-slate-200" />
                </Badge>
              </div>
            </Popover>

            {/* User Profile Dropdown */}
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
              <div className="flex items-center space-x-1.5 cursor-pointer p-0.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/70 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700 shrink-0">
                <Avatar className="bg-blue-600 font-extrabold text-[11px] text-white shadow-xs ring-2 ring-blue-500/20 shrink-0 flex items-center justify-center w-7 h-7">
                  {(user?.first_name || user?.username || 'U')[0].toUpperCase()}
                </Avatar>
                <span className="hidden md:inline-block text-xs font-bold text-slate-800 dark:text-slate-200">
                  {user.first_name || user.username}
                </span>
              </div>
            </Dropdown>
          </div>

        </div>
      </header>

      {/* Clean Light Mobile Offcanvas Navigation Drawer */}
      <Drawer
        title={
          <Link to="/dashboard" className="no-underline flex items-center" onClick={() => setDrawerOpen(false)}>
            <Logo variant="full" height={36} />
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
            justify: 'space-between',
          },
        }}
      >
        <div className="flex flex-col space-y-4">
          <div className="px-1 text-[10px] uppercase font-extrabold tracking-wider text-slate-400">
            Navigation
          </div>

          {/* Navigation Items */}
          <div className="space-y-1.5">
            {navItems.map((item) => {
              const isActive =
                pathname === item.path ||
                (item.path !== '/dashboard' && pathname.startsWith(item.path));

              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => handleNavigation(item.path)}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 text-xs font-bold transition-all border-0 text-left cursor-pointer ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 font-extrabold border-l-4 border-blue-600 rounded-r-lg'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 bg-transparent rounded-lg'
                  }`}
                >
                  <span className={`text-base ${isActive ? 'text-blue-600' : ''}`}>{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Offcanvas Footer Profile Card */}
        <div className="pt-4 border-t border-slate-200 space-y-3">
          <div
            onClick={() => {
              setDrawerOpen(false);
              setShowProfileModal(true);
            }}
            className="flex items-center space-x-2 cursor-pointer p-1.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors"
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
          </div>

          <div>
            <button
              type="button"
              onClick={() => {
                setDrawerOpen(false);
                logout();
              }}
              className="w-full flex items-center justify-center space-x-2 py-2 rounded-lg bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white border border-rose-200 text-xs font-bold transition-all cursor-pointer"
            >
              <LogoutOutlined />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </Drawer>



      {/* Bottom Navigation Bar for Mobile / Responsive Screens */}
      <nav className="mobile-bottom-nav lg:hidden fixed bottom-0 left-0 right-0 w-full z-50 select-none !overflow-visible pointer-events-none">
        
        {/* Navbar Background & Tab Items Row (z-10) */}
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/90 dark:border-slate-800 shadow-2xl rounded-t-2xl px-3 pt-1.5 pb-2.5 flex items-center justify-between relative z-10 pointer-events-auto !overflow-visible">
          
          {/* Item 1: Home (Dashboard) */}
          <button
            type="button"
            id="mobile_nav_home"
            name="mobile_nav_home"
            onClick={() => handleNavigation('/dashboard')}
            className="flex-1 flex flex-col items-center justify-center py-1 transition-all border-0 bg-transparent cursor-pointer group"
          >
            <div className={`p-1.5 rounded-xl transition-all ${
              pathname === '/dashboard'
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold scale-110'
                : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'
            }`}>
              <DashboardOutlined className="text-lg" />
            </div>
            <span className={`text-[10px] font-semibold mt-0.5 transition-colors ${
              pathname === '/dashboard'
                ? 'text-slate-900 dark:text-white font-extrabold'
                : 'text-slate-500 dark:text-slate-400'
            }`}>
              Home
            </span>
          </button>

          {/* Item 2: Meetings */}
          <button
            type="button"
            id="mobile_nav_meetings"
            name="mobile_nav_meetings"
            onClick={() => handleNavigation('/meetings')}
            className="flex-1 flex flex-col items-center justify-center py-1 transition-all border-0 bg-transparent cursor-pointer group"
          >
            <div className={`p-1.5 rounded-xl transition-all ${
              pathname === '/meetings' || (pathname.startsWith('/meetings/') && pathname !== '/meetings/new')
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold scale-110'
                : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'
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
          </button>

          {/* Item 3 Center Column Spacer & Label */}
          <div
            onClick={() => handleNavigation('/meetings/new')}
            className="flex-1 flex flex-col items-center justify-center py-1 cursor-pointer group"
          >
            {/* Invisible height spacer for top half of button spacing */}
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
          <button
            type="button"
            id="mobile_nav_actions"
            name="mobile_nav_actions"
            onClick={() => handleNavigation('/my-actions')}
            className="flex-1 flex flex-col items-center justify-center py-1 transition-all border-0 bg-transparent cursor-pointer group"
          >
            <div className={`p-1.5 rounded-xl transition-all ${
              pathname === '/my-actions'
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold scale-110'
                : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'
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
          </button>

          {/* Item 5: Profile Modal */}
          <button
            type="button"
            id="mobile_nav_profile"
            name="mobile_nav_profile"
            onClick={() => setShowProfileModal(true)}
            className="flex-1 flex flex-col items-center justify-center py-1 transition-all border-0 bg-transparent cursor-pointer group"
          >
            <div className={`p-1.5 rounded-xl transition-all ${
              showProfileModal
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold scale-110'
                : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'
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
          </button>

        </div>

        {/* Floating CREATE (+) Button Positioned OUTSIDE the Backdrop Container (z-50) */}
        <button
          type="button"
          id="mobile_nav_create_meeting"
          name="mobile_nav_create_meeting"
          onClick={() => handleNavigation('/meetings/new')}
          title="Create Meeting"
          style={{
            width: '52px',
            height: '52px',
            minWidth: '52px',
            minHeight: '52px',
            maxWidth: '52px',
            maxHeight: '52px',
            borderRadius: '9999px',
            position: 'absolute',
            left: '50%',
            top: '-26px',
            transform: 'translateX(-50%)',
            zIndex: 50,
            padding: 0,
            margin: 0,
            boxSizing: 'border-box'
          }}
          className={`!rounded-full shrink-0 aspect-square !p-0 flex items-center justify-center text-white shadow-2xl transition-all duration-200 cursor-pointer border-4 border-slate-100 dark:border-slate-800 pointer-events-auto ${
            pathname === '/meetings/new'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 ring-4 ring-slate-400/50 scale-105'
              : 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 active:scale-95'
          }`}
        >
          <PlusOutlined className="text-xl font-black" />
        </button>

      </nav>

      {/* User Profile Modal */}
      <ProfileModal
        open={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={user}
      />
    </>
  );
};
