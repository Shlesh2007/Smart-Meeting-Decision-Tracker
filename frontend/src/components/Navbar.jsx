'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext.jsx';
import { ProfileModal } from './ProfileModal.jsx';
import { Logo } from './Logo.jsx';
import { analyticsService } from '../services/api.js';
import { Button, Dropdown, Avatar, Tag, Drawer, Input, Popover, Badge } from 'antd';
import {
  DashboardOutlined,
  CalendarOutlined,
  CheckSquareOutlined,
  TeamOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuOutlined,
  RightOutlined,
  SearchOutlined,
  BellOutlined,
  ExclamationCircleOutlined,
  CheckOutlined,
  FireOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { format } from 'date-fns';

export const Navbar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAdmin } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

  const currentDateStr = format(new Date(), 'EEEE, MMM d');

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: <DashboardOutlined /> },
    { label: 'Meetings', path: '/meetings', icon: <CalendarOutlined /> },
    { label: 'Action Items', path: '/my-actions', icon: <CheckSquareOutlined /> },
    ...(isAdmin ? [{ label: 'Admin Management', path: '/admin', icon: <TeamOutlined /> }] : []),
  ];

  const handleNavigation = (path) => {
    setDrawerOpen(false);
    if (pathname !== path) {
      router.push(path);
    }
  };

  const markAllAsRead = () => {
    setHasUnread(false);
  };

  const notificationPopoverContent = (
    <div className="w-80 max-w-sm">
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
                router.push(n.link);
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
            router.push('/my-actions');
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
      <aside className="hidden lg:flex flex-col fixed top-0 left-0 bottom-0 w-64 bg-white text-slate-900 z-40 border-r border-slate-200 shadow-xs transition-colors duration-200 select-none">
        
        {/* Sidebar Brand Header */}
        <div className="p-4 border-b border-slate-200/80 flex items-center">
          <Link href="/dashboard" className="no-underline flex items-center">
            <Logo variant="full" height={42} />
          </Link>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] uppercase font-extrabold tracking-wider text-slate-400">
            Navigation
          </div>

          {navItems.map((item) => {
            const isActive =
              pathname === item.path ||
              (item.path !== '/dashboard' && pathname.startsWith(item.path));

            return (
              <button
                key={item.path}
                type="button"
                onClick={() => handleNavigation(item.path)}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 text-xs font-bold transition-all border-0 cursor-pointer ${
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

        {/* Bottom Sidebar User Profile Card */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/80 m-3 rounded-xl space-y-2">
          <div
            onClick={() => setShowProfileModal(true)}
            className="flex items-center space-x-2.5 cursor-pointer p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <Avatar icon={<UserOutlined />} className="bg-blue-600 font-bold shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-xs text-slate-900 m-0 truncate">
                {user.first_name || user.username}
              </p>
              <p className="text-[10px] text-slate-500 m-0 truncate">{user.email}</p>
            </div>
            <Tag color={isAdmin ? 'volcano' : 'blue'} className="text-[9px] uppercase font-bold m-0 px-1">
              {user.role}
            </Tag>
          </div>

          <div className="pt-1">
            <button
              type="button"
              onClick={logout}
              className="w-full flex items-center justify-center space-x-2 py-1.5 rounded-lg bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white border border-rose-200 text-xs font-bold transition-all cursor-pointer"
            >
              <LogoutOutlined />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Top Navigation Header Bar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-xs lg:pl-64 transition-all">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          
          {/* Mobile Logo Brand */}
          <div className="flex items-center lg:hidden">
            <Link href="/dashboard" className="no-underline flex items-center">
              <Logo variant="full" height={32} />
            </Link>
          </div>

          {/* Search Bar Input (Desktop) */}
          <div className="hidden sm:flex items-center max-w-md flex-1">
            <Input
              prefix={<SearchOutlined className="text-slate-400" />}
              placeholder="Search meetings, actions, decisions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-100 border-slate-200 rounded-xl px-3 py-1 text-xs text-slate-900 hover:border-blue-400 focus:border-blue-500"
            />
          </div>

          {/* Right Controls: Date Badge, Notifications & Profile */}
          <div className="flex items-center space-x-2.5">
            {/* Live Date Badge */}
            <span className="hidden md:inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/80">
              <CalendarOutlined className="text-blue-500" />
              <span>{currentDateStr}</span>
            </span>

            {/* Interactive Notification Bell Popover */}
            <Popover
              content={notificationPopoverContent}
              trigger="click"
              placement="bottomRight"
              arrow={false}
              open={popoverOpen}
              onOpenChange={(newOpen) => setPopoverOpen(newOpen)}
            >
              <div className="relative cursor-pointer p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors">
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
              <div className="flex items-center space-x-2 cursor-pointer p-1 rounded-lg hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200">
                <Avatar icon={<UserOutlined />} className="bg-slate-800 font-bold shadow-xs text-xs" size="small" />
                <span className="hidden md:inline-block text-xs font-bold text-slate-800">
                  {user.first_name || user.username}
                </span>
              </div>
            </Dropdown>

            {/* Mobile Navigation Hamburger */}
            <div className="lg:hidden">
              <Button
                type="text"
                icon={<MenuOutlined className="text-lg text-slate-700" />}
                onClick={() => setDrawerOpen(true)}
              />
            </div>
          </div>

        </div>
      </header>

      {/* Clean Light Mobile Offcanvas Navigation Drawer */}
      <Drawer
        title={
          <Link href="/dashboard" className="no-underline flex items-center" onClick={() => setDrawerOpen(false)}>
            <Logo variant="full" height={36} />
          </Link>
        }
        placement="left"
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        styles={{
          header: {
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            padding: '16px 20px',
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
            className="flex items-center space-x-3 cursor-pointer p-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors"
          >
            <Avatar icon={<UserOutlined />} className="bg-blue-600 font-bold shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-xs text-slate-900 m-0 truncate">
                {user.full_name || user.username}
              </p>
              <p className="text-[10px] text-slate-500 m-0 truncate">{user.email}</p>
            </div>
            <Tag color={isAdmin ? 'volcano' : 'blue'} className="text-[9px] uppercase font-bold m-0 px-1">
              {user.role}
            </Tag>
          </div>

          <div>
            <button
              type="button"
              onClick={logout}
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
