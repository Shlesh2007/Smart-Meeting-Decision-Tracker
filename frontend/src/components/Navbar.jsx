'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { ProfileModal } from './ProfileModal.jsx';
import { Button, Dropdown, Avatar, Tag, Drawer } from 'antd';
import {
  DashboardOutlined, CalendarOutlined, CheckSquareOutlined,
  TeamOutlined, UserOutlined, LogoutOutlined, MenuOutlined,
  ThunderboltOutlined, RightOutlined, SunOutlined, MoonOutlined
} from '@ant-design/icons';

export const Navbar = () => {
  const pathname = usePathname();
  const { user, logout, isAdmin } = useAuth();
  const { themeMode, toggleTheme } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  if (!user) return null;

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: <DashboardOutlined /> },
    { label: 'Meetings', path: '/meetings', icon: <CalendarOutlined /> },
    { label: 'My Actions', path: '/my-actions', icon: <CheckSquareOutlined /> },
    ...(isAdmin ? [{ label: 'Admin Management', path: '/admin', icon: <TeamOutlined /> }] : [])
  ];

  const userMenuItems = [
    {
      key: 'profile_info',
      label: (
        <div onClick={() => setShowProfileModal(true)} className="py-1.5 px-0.5 cursor-pointer">
          <p className="font-bold text-slate-900 dark:text-white m-0">{user.full_name}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 m-0">{user.email}</p>
          <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold block mt-1.5 hover:underline">
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
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 shadow-xs transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Logo & Brand */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-800 via-blue-700 to-slate-900 flex items-center justify-center text-white font-bold shadow-md">
                <ThunderboltOutlined className="text-xl" />
              </div>
              <Link href="/dashboard" className="no-underline">
                <span className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">SmartMeeting</span>
                <span className="text-xs text-blue-600 dark:text-blue-400 font-bold block -mt-1 tracking-wider uppercase">Tracker</span>
              </Link>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const isActive = pathname === item.path || (item.path !== '/dashboard' && pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all no-underline ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 font-semibold shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* User Info, Theme Toggle & Profile Menu */}
            <div className="hidden md:flex items-center space-x-3">
              
              {/* Smooth Desktop Theme Toggle Button */}
              <button
                type="button"
                aria-label="Toggle Theme"
                onClick={toggleTheme}
                className="relative w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center shadow-xs hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-300 ease-in-out cursor-pointer group focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                title={`Switch to ${themeMode === 'light' ? 'Dark' : 'Light'} Mode`}
              >
                <span className="transition-transform duration-500 ease-out group-hover:rotate-45 flex items-center justify-center">
                  {themeMode === 'light' ? (
                    <MoonOutlined className="text-slate-700 text-lg transition-colors duration-300" />
                  ) : (
                    <SunOutlined className="text-amber-400 text-lg transition-colors duration-300" />
                  )}
                </span>
              </button>

              <Tag color={isAdmin ? 'volcano' : 'blue'} className="uppercase font-bold cursor-default px-2.5 py-0.5 rounded-md">
                {user.role}
              </Tag>
              
              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click', 'hover']}>
                <div className="flex items-center space-x-2.5 cursor-pointer transition-all p-1.5 rounded-lg hover:bg-slate-100/80 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                  <Avatar icon={<UserOutlined />} className="bg-slate-700 font-bold shadow-xs" />
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{user.first_name || user.username}</span>
                </div>
              </Dropdown>
            </div>

            {/* Mobile Hamburger Toggle */}
            <div className="md:hidden flex items-center space-x-2">
              <button
                type="button"
                aria-label="Toggle Theme"
                onClick={toggleTheme}
                className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center active:scale-95 transition-all duration-300 cursor-pointer"
              >
                {themeMode === 'light' ? (
                  <MoonOutlined className="text-slate-700 text-lg" />
                ) : (
                  <SunOutlined className="text-amber-400 text-lg" />
                )}
              </button>

              <Button
                type="text"
                icon={<MenuOutlined className="text-lg text-slate-700 dark:text-slate-200" />}
                onClick={() => setDrawerOpen(true)}
              />
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        <Drawer
          title="Navigation"
          placement="right"
          onClose={() => setDrawerOpen(false)}
          open={drawerOpen}
        >
          <div className="flex flex-col space-y-3">
            <div
              className="pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center space-x-3 cursor-pointer"
              onClick={() => {
                setDrawerOpen(false);
                setShowProfileModal(true);
              }}
            >
              <Avatar icon={<UserOutlined />} className="bg-blue-600" />
              <div>
                <p className="font-semibold text-slate-900 dark:text-white m-0">{user.full_name}</p>
                <Tag color={isAdmin ? 'volcano' : 'blue'} className="mt-1 font-bold">
                  {user.role}
                </Tag>
              </div>
            </div>
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setDrawerOpen(false)}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-base font-medium no-underline ${
                  pathname === item.path
                    ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}

            <Button
              type="default"
              icon={themeMode === 'light' ? <MoonOutlined /> : <SunOutlined />}
              onClick={toggleTheme}
              className="mt-2 w-full flex items-center justify-center font-medium"
            >
              {themeMode === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            </Button>

            <Button
              type="default"
              icon={<UserOutlined />}
              onClick={() => {
                setDrawerOpen(false);
                setShowProfileModal(true);
              }}
              className="mt-4 w-full"
            >
              My Profile
            </Button>
            <Button
              type="primary"
              danger
              icon={<LogoutOutlined />}
              onClick={logout}
              className="w-full"
            >
              Logout
            </Button>
          </div>
        </Drawer>
      </header>

      {/* User Profile Modal */}
      <ProfileModal
        open={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={user}
      />
    </>
  );
};
