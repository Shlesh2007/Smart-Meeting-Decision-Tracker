import React, { useState, useEffect } from 'react';
import { Logo } from './Logo.jsx';
import { ThunderboltOutlined } from '@ant-design/icons';

const LOADING_STAGES = [
  'Securing your workspace...',
  'Loading your meetings...',
  'Organizing action items...',
  'Preparing your dashboard...',
  'Almost ready...',
];

export function InitialSplashScreen({ children }) {
  const [showSplash, setShowSplash] = useState(true);
  const [stageIndex, setStageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Smooth progress fill over 1.2s
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 4;
      });
    }, 45);

    // Rotate loading text stages
    const stageInterval = setInterval(() => {
      setStageIndex((prev) => (prev < LOADING_STAGES.length - 1 ? prev + 1 : prev));
    }, 300);

    // Initiate smooth fade out at 1.3s
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 1300);

    // Unmount splash screen cleanly at 1.65s
    const unmountTimer = setTimeout(() => {
      setShowSplash(false);
    }, 1650);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stageInterval);
      clearTimeout(fadeTimer);
      clearTimeout(unmountTimer);
    };
  }, []);

  if (!showSplash) {
    return <>{children}</>;
  }

  return (
    <>
      <div
        role="status"
        aria-live="polite"
        className={`fixed inset-0 z-[99999] flex flex-col justify-center items-center bg-[#080D1F] text-slate-100 select-none px-4 transition-opacity duration-350 ease-out ${
          fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        {/* Subtle Blue Radial Background Glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        {/* Center Content Container */}
        <div className="relative z-10 flex flex-col items-center space-y-6 text-center max-w-sm w-full">
          
          {/* Application Logo Container with Subtle Scale & Fade */}
          <div className="relative flex items-center justify-center transition-all duration-500 transform">
            <div className="bg-[#0D1530] border border-slate-800/90 p-4 sm:p-5 rounded-2xl shadow-2xl backdrop-blur-md">
              <Logo variant="icon" height={54} />
            </div>
          </div>

          {/* Consistent Branding: Smart Meeting DECISION TRACKER */}
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white m-0 font-sans">
              Smart Meeting
            </h1>
            <p className="text-[10px] sm:text-xs font-bold tracking-[0.25em] text-blue-400/90 uppercase m-0">
              DECISION TRACKER
            </p>
          </div>

          {/* User-Friendly Loading Stage Header */}
          <div className="pt-1">
            <p className="text-xs text-slate-400 font-medium m-0">
              Preparing your workspace...
            </p>
          </div>

          {/* Premium Animated Progress Bar */}
          <div className="w-64 sm:w-72 space-y-2.5 pt-1">
            <div className="w-full h-1 bg-slate-800/80 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-100 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Status Indicator Below Progress Bar */}
            <div className="flex items-center justify-center space-x-1.5 text-[11px] font-medium text-slate-400">
              <ThunderboltOutlined className="text-blue-400 text-[10px]" />
              <span>{LOADING_STAGES[stageIndex]}</span>
            </div>
          </div>

        </div>
      </div>

      {/* Render Application Code Underneath */}
      {children}
    </>
  );
}
