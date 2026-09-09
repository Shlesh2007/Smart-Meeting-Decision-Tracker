import axios from 'axios';

const getApiBaseUrl = () => {
  const envUrl = (process.env.NEXT_PUBLIC_API_URL || '').trim();
  if (envUrl && envUrl.startsWith('http')) {
    let sanitized = envUrl.replace(/\/+$/, '');
    if (!sanitized.endsWith('/api')) sanitized += '/api';
    return sanitized;
  }
  // When running on live Vercel/deployed host, fallback to Render live backend URL
  if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
    return 'https://smart-meeting-tracker-backend.onrender.com/api';
  }
  return 'http://localhost:8000/api';
};

const API_URL = getApiBaseUrl();

export const api = axios.create({
  baseURL: API_URL,
  timeout: 45000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject JWT Access Token and sanitize relative endpoint URLs
api.interceptors.request.use(
  (config) => {
    // Ensure relative URL doesn't strip /api from baseURL
    if (config.url && config.url.startsWith('/') && config.baseURL && config.baseURL.endsWith('/api')) {
      config.url = config.url.substring(1);
    }
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth Service
export const authService = {
  login: async (credentials) => {
    const res = await api.post('/auth/token/', credentials);
    if (res.data.access) {
      localStorage.setItem('access_token', res.data.access);
      localStorage.setItem('refresh_token', res.data.refresh);
    }
    return res.data;
  },
  register: async (payload) => {
    const res = await api.post('/auth/register/', payload);
    if (res.data.access) {
      localStorage.setItem('access_token', res.data.access);
      localStorage.setItem('refresh_token', res.data.refresh);
    }
    return res.data;
  },
  getProfile: async () => {
    const res = await api.get('/auth/profile/');
    return res.data;
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  },
  requestResetOTP: async (account) => {
    const res = await api.post('/auth/password-reset/request-otp/', { account });
    return res.data;
  },
  verifyResetOTP: async (email, otp_code) => {
    const res = await api.post('/auth/password-reset/verify-otp/', { email, otp_code });
    return res.data;
  },
  confirmPasswordReset: async (email, otp_code, new_password) => {
    const res = await api.post('/auth/password-reset/confirm/', { email, otp_code, new_password });
    return res.data;
  },
  loginWithGoogle: async (payload) => {
    const res = await api.post('/auth/oauth/google/', payload);
    if (res.data.access) {
      localStorage.setItem('access_token', res.data.access);
      localStorage.setItem('refresh_token', res.data.refresh);
    }
    return res.data;
  },
  loginWithGithub: async (payload) => {
    const res = await api.post('/auth/oauth/github/', payload);
    if (res.data.access) {
      localStorage.setItem('access_token', res.data.access);
      localStorage.setItem('refresh_token', res.data.refresh);
    }
    return res.data;
  }
};

// Users & Teams
export const userService = {
  getUsers: async (params) => {
    const res = await api.get('/auth/users/', { params });
    return res.data;
  },
  updateUserRole: async (userId, role) => {
    const res = await api.patch(`/auth/users/${userId}/`, { role });
    return res.data;
  }
};

export const teamService = {
  getTeams: async () => {
    const res = await api.get('/teams/');
    return res.data;
  },
  createTeam: async (payload) => {
    const res = await api.post('/teams/', payload);
    return res.data;
  },
  updateTeam: async (id, payload) => {
    const res = await api.patch(`/teams/${id}/`, payload);
    return res.data;
  },
  deleteTeam: async (id) => {
    await api.delete(`/teams/${id}/`);
  }
};

// Meetings Service
export const meetingService = {
  getMeetings: async (params) => {
    const res = await api.get('/meetings/', { params });
    return res.data;
  },
  getMeetingById: async (id) => {
    const res = await api.get(`/meetings/${id}/`);
    return res.data;
  },
  createMeeting: async (payload) => {
    const res = await api.post('/meetings/', payload);
    return res.data;
  },
  updateMeeting: async (id, payload) => {
    const res = await api.patch(`/meetings/${id}/`, payload);
    return res.data;
  },
  deleteMeeting: async (id) => {
    await api.delete(`/meetings/${id}/`);
  },
  sendMeetingOTP: async (id) => {
    const res = await api.post(`/meetings/${id}/send-otp/`);
    return res.data;
  },
  sendMeetingReminder: async (id) => {
    const res = await api.post(`/meetings/${id}/send-reminder/`);
    return res.data;
  }
};


// Discussions Service
export const discussionService = {
  getDiscussions: async (meetingId) => {
    const res = await api.get('/discussions/', { params: { meeting: meetingId } });
    return res.data.results || res.data;
  },
  createDiscussion: async (payload) => {
    const res = await api.post('/discussions/', payload);
    return res.data;
  }
};

// Decisions & History Service
export const decisionService = {
  createDecision: async (payload) => {
    const res = await api.post('/decisions/', payload);
    return res.data;
  },
  updateDecision: async (id, payload) => {
    const res = await api.put(`/decisions/${id}/`, payload);
    return res.data;
  },
  getDecisionHistory: async (id) => {
    const res = await api.get(`/decisions/${id}/history/`);
    return res.data;
  }
};

// Action Items Service
export const actionService = {
  getActions: async (params) => {
    const res = await api.get('/actions/', { params });
    return res.data;
  },
  getMyActions: async (params) => {
    const res = await api.get('/actions/my_actions/', { params });
    return res.data;
  },
  createAction: async (payload) => {
    const res = await api.post('/actions/', payload);
    return res.data;
  },
  updateActionStatus: async (id, status, payload) => {
    const res = await api.patch(`/actions/${id}/`, { status, ...payload });
    return res.data;
  },
  updateAction: async (id, payload) => {
    const res = await api.put(`/actions/${id}/`, payload);
    return res.data;
  }
};

// Analytics Service
export const analyticsService = {
  getDashboard: async () => {
    const res = await api.get('/analytics/dashboard/');
    return res.data;
  }
};
