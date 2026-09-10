import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { MainLayout } from './components/MainLayout.jsx';

import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Meetings from './pages/Meetings.jsx';
import CreateMeeting from './pages/CreateMeeting.jsx';
import MeetingDetail from './pages/MeetingDetail.jsx';
import MyActions from './pages/MyActions.jsx';
import Admin from './pages/Admin.jsx';
import OAuthCallback from './pages/OAuthCallback.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <MainLayout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/meetings" element={<Meetings />} />
              <Route path="/meetings/new" element={<CreateMeeting />} />
              <Route path="/meetings/:id" element={<MeetingDetail />} />
              <Route path="/my-actions" element={<MyActions />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/oauth-callback" element={<OAuthCallback />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </MainLayout>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
