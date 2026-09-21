import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ProfileModal } from './ProfileModal.jsx';
import { Logo } from './Logo.jsx';
import { analyticsService, meetingService, actionService } from '../services/api.js';
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
} from '@ant-design/icons';
import { format } from 'date-fns';

export const Navbar = ({ collapsed = false, onToggleSidebar }) => {
  const location = useLocation();
  const pathname = location.pathname;
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Notification state & controlled popover visibility
  const [notifications, setNotifications] = useState([]);
  const [hasUnread, setHasUnread] = useState(true);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  useEffect(() => {
    if (user) {
      setLoadingNotifications(true);
      analyticsService
        .getDashboard()
        .then((data) => {
          const list = [];
          if (data.overdue_list && data.overdue_list.length > 0) {
            data.overdue_list.forEach((item) => {
              list.push({
                id: `overdue-${item.id}`,
                type: 'overdue',
                title: `Overdue Action: ${item.title}`,
                subtitle: `Assigned to ${item.assigned_to} • Due ${item.due_date}`,
                link: '/my-actions?tab=OVERDUE',
                icon: <ExclamationCircleOutlined className="text-rose-500" />,
              });
            });
          }

          if (data.metrics?.critical_actions > 0) {
            list.push({
              id: 'critical-summary',
              type: 'critical',
              title: `${data.metrics.critical_actions} Critical Action Items`,
              subtitle: 'High priority tasks requiring urgent resolution',
              link: '/my-actions?tab=CRITICAL',
              icon: <FireOutlined className="text-red-500" />,
            });
          }

          if (data.metrics?.upcoming_meetings > 0) {
            list.push({
              id: 'upcoming-summary',
              type: 'upcoming',
              title: `${data.metrics.upcoming_meetings} Upcoming Meetings`,
              subtitle: 'Scheduled sessions pending completion',
              link: '/meetings',
              icon: <ClockCircleOutlined className="text-blue-500" />,
            });
          }

          setNotifications(list);
          if (list.length === 0) setHasUnread(false);
        })
        .catch(() => setNotifications([]))
        .finally(() => setLoadingNotifications(false));
    }
  }, [user]);

  const isAuthPage = pathname === '/login' || pathname === '/register';
  if (!user || isAuthPage) return null;

  const fullDateStr = format(new Date(), 'EEEE, MMM d, yyyy');
  const shortDateStr = format(new Date(), 'MMM d, yyyy');
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

  const markAllAsRead = () => {
    setHasUnread(false);
  };

  const notificationPopoverContent = (
    <div className="w-full sm:w-80 max-w-sm">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center space-x-2">
          <BellOutlined className="text-blue-600 font-bold" />
          <h4 className="font-extrabold text-xs text-slate-900 m-0">Notifications</h4>
          {hasUnread && notifications.length > 0 && (
            <Badge count={notifications.length} className="ml-1" size="small" />
          )}
        </div>
        {hasUnread && notifications.length > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            className="text-[10px] text-blue-600 hover:underline font-bold bg-transparent border-0 cursor-pointer"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="my-2 max-h-64 overflow-y-auto space-y-2 pr-1">
        {loadingNotifications ? (
          <p className="text-center text-slate-400 py-4 text-xs">Loading alerts...</p>
        ) : notifications.length === 0 || !hasUnread ? (
          <div className="py-6 text-center space-y-1">
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-sm">
              <CheckOutlined />
            </div>
            <p className="font-bold text-xs text-slate-800 m-0">All Caught Up!</p>
            <p className="text-[10px] text-slate-400 m-0">No new unread notifications at this time.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => {
                setHasUnread(false);
                setPopoverOpen(false);
                navigate(n.link);
              }}
              className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 hover:border-blue-300 transition-all cursor-pointer flex items-start space-x-2.5 group"
            >
              <div className="mt-0.5 shrink-0 text-sm">{n.icon}</div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="font-bold text-xs text-slate-900 m-0 leading-tight group-hover:text-blue-600 transition-colors">
                  {n.title}
                </p>
                <p className="text-[10px] text-slate-500 m-0 truncate">
                  {n.subtitle}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 flex justify-between items-center">
        <span>SmartMeeting Alerts</span>
        <button
          type="button"
          onClick={() => {
            setPopoverOpen(false);
            navigate('/my-actions');
          }}
          className="no-underline text-blue-600 font-bold hover:underline bg-transparent border-0 cursor-pointer text-[10px]"
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
          <p className="font-bold text-slate-900 m-0">{user.full_name}</p>
          <p className="text-xs text-slate-500 m-0">{user.email}</p>
          <span className="text-[11px] text-blue-600 font-semibold block mt-1.5 hover:underline">
            View Profile Details <RightOutlined className="text-[9px]" />
          </span>
        </div>
      ),
    },
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
        <div className={`pt-0 pb-3 px-3.5 border-b border-slate-200/80 dark:border-slate-700/80 flex items-center ${collapsed ? 'flex-col gap-2.5 justify-center' : 'justify-between'}`}>
          {!collapsed && (
            <Link to="/dashboard" className="no-underline flex items-center">
              <Logo variant="full" height={42} />
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
      <header className={`sticky top-0 z-30 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 shadow-xs transition-all duration-300 ${collapsed ? 'lg:pl-16' : 'lg:pl-64'}`}>
        <div className="max-w-[1600px] mx-auto px-2.5 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Logo Brand & Mobile/Tablet Drawer Toggle */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            <Button
              type="text"
              icon={<MenuUnfoldOutlined className="text-slate-600 dark:text-slate-300 text-lg" />}
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden flex items-center justify-center p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
              title="Open Navigation Menu"
            />
            <div className={`items-center shrink-0 ${collapsed ? 'flex' : 'flex lg:hidden'}`}>
              <Link to="/dashboard" className="no-underline flex items-center">
                <Logo variant="icon" height={28} className="sm:hidden" />
                <Logo variant="full" height={30} className="hidden sm:block" />
              </Link>
            </div>
          </div>

          {/* Right Controls: Date Badge, Notifications & Profile */}
          <div className="flex items-center space-x-1.5 sm:space-x-2.5 ml-auto shrink-0">
            {/* Live Date Badge (Visible on sm and up) */}
            <span className="hidden sm:inline-flex items-center space-x-1 sm:space-x-1.5 text-[10px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 sm:px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700 shrink-0">
              <CalendarOutlined className="text-blue-500 text-xs shrink-0" />
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
              onOpenChange={(newOpen) => setPopoverOpen(newOpen)}
              overlayClassName="notification-popover"
            >
              <div className="relative cursor-pointer p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0">
                <BellOutlined className="text-base" />
                {hasUnread && (
                  <>
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-500" />
                  </>
                )}
              </div>
            </Popover>

            {/* User Profile Dropdown */}
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
              <div className="flex items-center space-x-1.5 cursor-pointer p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700 shrink-0">
                <Avatar className="bg-slate-800 font-extrabold text-xs text-white shadow-xs shrink-0 flex items-center justify-center" size="small">
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



      {/* User Profile Modal */}
      <ProfileModal
        open={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={user}
      />
    </>
  );
};
