'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext.jsx';
import { authService } from '../../services/api.js';
import { Spin, message } from 'antd';

export default function OAuthCallbackPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const hash = window.location.hash;

    if (code) {
      authService.loginWithGithub({ code })
        .then(async (data) => {
          await refreshUser();
          message.success(data.message || 'Logged in with GitHub successfully!');
          router.push('/dashboard');
        })
        .catch((err) => {
          message.error('GitHub authentication failed.');
          router.push('/login');
        });
    } else if (hash && hash.includes('access_token')) {
      const hashParams = new URLSearchParams(hash.replace('#', '?'));
      const token = hashParams.get('access_token') || hashParams.get('id_token');
      if (token) {
        authService.loginWithGoogle({ credential: token })
          .then(async (data) => {
            await refreshUser();
            message.success(data.message || 'Logged in with Google successfully!');
            router.push('/dashboard');
          })
          .catch((err) => {
            message.error('Google authentication failed.');
            router.push('/login');
          });
      }
    } else {
      router.push('/login');
    }
  }, [router, refreshUser]);

  return (
    <div className="min-h-[70vh] flex flex-col justify-center items-center">
      <Spin size="large" tip="Completing OAuth Sign-In..." />
    </div>
  );
}
