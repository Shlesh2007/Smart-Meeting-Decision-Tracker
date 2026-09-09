'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext.jsx';
import { authService } from '../../services/api.js';
import { Spin, message } from 'antd';

export default function OAuthCallbackPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();

  const processedRef = React.useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (processedRef.current) return;

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const hash = window.location.hash;

    if (code) {
      processedRef.current = true;
      window.history.replaceState({}, document.title, window.location.pathname);

      authService.loginWithGithub({ code })
        .then(async (data) => {
          await refreshUser();
          message.success(data.message || 'Logged in with GitHub successfully!');
          router.push('/dashboard');
        })
        .catch((err) => {
          const errMsg = err.response?.data?.error || 'GitHub authentication failed.';
          message.error(errMsg);
          router.push('/login');
        });
    } else if (hash && hash.includes('access_token')) {
      processedRef.current = true;
      window.history.replaceState({}, document.title, window.location.pathname);

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
            const errMsg = err.response?.data?.error || 'Google authentication failed.';
            message.error(errMsg);
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
