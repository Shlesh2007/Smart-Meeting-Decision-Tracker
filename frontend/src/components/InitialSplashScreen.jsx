import React, { useState, useEffect } from 'react';
import { Logo } from './Logo.jsx';

// Loading messages sequence matched to progress ranges
const STATUS_SEQUENCES = [
  { min: 0, max: 20, message: 'Preparing your workspace...' },
  { min: 20, max: 45, message: 'Loading meeting data...' },
  { min: 45, max: 70, message: 'Organizing action items...' },
  { min: 70, max: 90, message: 'Syncing decisions...' },
  { min: 90, max: 99, message: 'Almost ready...' },
  { min: 100, max: 100, message: 'Workspace ready' },
];

/**
 * 1. BackgroundDecor Sub-Component
 * Sleek Dark Slate & Blue SaaS atmosphere matching the rest of Smart Meeting site.
 */
function BackgroundDecor() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
      {/* Dark Slate / Navy Base Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#080D1F] via-[#0F172A] to-[#182238]" />

      {/* Subtle Blue Radial Lighting Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] sm:w-[900px] sm:h-[900px] bg-radial from-blue-600/20 via-indigo-600/10 to-transparent blur-3xl opacity-80 animate-warm-pulse" />
      <div className="absolute top-[-10%] right-[-5%] w-[450px] h-[450px] bg-radial from-blue-500/15 to-transparent blur-3xl" />

      {/* Dot Grid Texture */}
      <div className="absolute inset-0 bg-[radial-gradient(#334155_1.2px,transparent_1.2px)] [background-size:28px_28px] opacity-35" />

      {/* Abstract Flowing Vector Curves */}
      <svg className="absolute inset-0 w-full h-full opacity-30" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="siteCurveGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#1D4ED8" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="siteCurveGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#475569" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#1E293B" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        <path
          d="M 600 -100 C 900 100, 1100 400, 950 800 C 800 1200, 1300 1000, 1500 1200"
          fill="none"
          stroke="url(#siteCurveGrad1)"
          strokeWidth="1.5"
        />
        <path
          d="M -200 400 C 100 200, 300 600, 100 900 C -100 1200, 400 1100, 600 1300"
          fill="none"
          stroke="url(#siteCurveGrad2)"
          strokeWidth="1.5"
        />
      </svg>

      {/* Workspace Edge Accents */}
      <div className="hidden md:block absolute left-0 top-0 bottom-0 w-48 opacity-40">
        <div className="absolute top-0 left-0 w-64 h-96 bg-gradient-to-br from-blue-500/20 via-indigo-500/5 to-transparent blur-2xl transform -rotate-12" />
        <div className="absolute left-[-20px] top-1/3 w-28 h-40 blur-[4px] opacity-30">
          <svg viewBox="0 0 100 150" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 80 C 40 20, 90 40, 70 90 C 50 140, 20 120, 10 80 Z" fill="#3B82F6" />
          </svg>
        </div>
      </div>

      <div className="hidden md:block absolute right-0 top-0 bottom-0 w-48 opacity-40">
        <div className="absolute top-10 right-0 w-72 h-72 bg-gradient-to-bl from-blue-600/20 via-slate-800/10 to-transparent blur-3xl" />
        <div className="absolute right-4 top-1/3 w-24 h-36 border border-slate-700/60 rounded-xl bg-slate-800/30 blur-[2px] transform rotate-6" />
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#080D1F]/80 to-transparent blur-md" />
    </div>
  );
}

/**
 * 2. ConnectingPaths Sub-Component
 * Sleek blue & slate dotted paths.
 */
function ConnectingPaths() {
  return (
    <svg
      className="hidden md:block absolute inset-0 w-full h-full pointer-events-none z-0 opacity-40"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1000 1000"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="pathGradBlue" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#2563EB" stopOpacity="0.3" />
        </linearGradient>
      </defs>

      <path
        d="M 220 260 Q 360 330, 450 380"
        fill="none"
        stroke="#334155"
        strokeWidth="2"
        strokeDasharray="6 6"
        className="animate-warm-dash"
      />
      <path
        d="M 780 260 Q 640 330, 550 380"
        fill="none"
        stroke="url(#pathGradBlue)"
        strokeWidth="2"
        strokeDasharray="6 6"
        className="animate-warm-dash"
      />
      <path
        d="M 220 740 Q 360 670, 450 600"
        fill="none"
        stroke="url(#pathGradBlue)"
        strokeWidth="2"
        strokeDasharray="6 6"
        className="animate-warm-dash"
      />
      <path
        d="M 780 740 Q 640 670, 550 600"
        fill="none"
        stroke="#334155"
        strokeWidth="2"
        strokeDasharray="6 6"
        className="animate-warm-dash"
      />
    </svg>
  );
}

/**
 * 3. FloatingWidget Sub-Component
 * Sleek glassmorphic floating tiles matching site theme.
 */
function FloatingWidget({ position, icon, title, subtitle, animationClass }) {
  const positionClasses = {
    topLeft: 'top-[18%] left-[6%] sm:left-[10%] md:left-[12%] lg:left-[16%]',
    topRight: 'top-[18%] right-[6%] sm:right-[10%] md:right-[12%] lg:right-[16%]',
    bottomLeft: 'bottom-[20%] left-[6%] sm:left-[10%] md:left-[12%] lg:left-[16%]',
    bottomRight: 'bottom-[20%] right-[6%] sm:right-[10%] md:right-[12%] lg:right-[16%]',
  };

  return (
    <div
      className={`hidden md:flex absolute z-10 items-center gap-3 p-3 sm:p-3.5 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-slate-700/80 shadow-2xl select-none transition-all duration-300 hover:scale-105 ${positionClasses[position]} ${animationClass}`}
    >
      <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400 relative shadow-inner">
        {icon}
        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500 shadow-xs" />
      </div>
      <div className="pr-1 hidden lg:block">
        <p className="text-xs font-semibold text-white m-0 leading-tight">{title}</p>
        <p className="text-[10px] font-medium text-slate-400 m-0 leading-tight pt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

/**
 * 4. AppIcon Sub-Component
 * Dynamic Calendar / Meeting Icon matched to site colors.
 */
function AppIcon() {
  return (
    <div className="relative z-10 animate-warm-float">
      {/* Soft Blue Glow Behind Icon */}
      <div className="absolute inset-0 bg-blue-600/25 rounded-3xl blur-xl" />

      {/* Main Container */}
      <div className="relative w-[84px] h-[84px] sm:w-[94px] sm:h-[94px] md:w-[100px] md:h-[100px] rounded-2xl sm:rounded-3xl bg-slate-900/90 backdrop-blur-md border border-slate-700/90 shadow-2xl flex items-center justify-center p-4">
        <svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <rect x="10" y="18" width="52" height="44" rx="10" stroke="#FFFFFF" strokeWidth="3.5" fill="#1E293B" />
          <path d="M10 28 H62" stroke="#FFFFFF" strokeWidth="3" />
          <rect x="22" y="12" width="4" height="10" rx="2" fill="#3B82F6" />
          <rect x="46" y="12" width="4" height="10" rx="2" fill="#3B82F6" />
          <circle cx="26" cy="42" r="3.5" fill="#94A3B8" />
          <path d="M 20 52 C 20 47, 32 47, 32 52" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="46" cy="42" r="3.5" fill="#94A3B8" />
          <path d="M 40 52 C 40 47, 52 47, 52 52" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="36" cy="38" r="4" fill="#3B82F6" />
          <path d="M 29 50 C 29 44, 43 44, 43 50" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" />
        </svg>

        {/* Small Circular Check Badge */}
        <div className="absolute -bottom-2 -right-2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-blue-600 border-2 border-[#0F172A] shadow-lg flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 sm:w-5 sm:h-5 text-white">
            <path d="M5 13L9 17L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}

/**
 * 5. BrandSection Sub-Component
 * Site Brand Logo & Subtitle.
 */
function BrandSection() {
  return (
    <div className="text-center space-y-1 select-none flex flex-col items-center">
      <h1 className="m-0 font-extrabold tracking-tight text-white leading-tight text-[30px] sm:text-[36px] md:text-[42px]">
        Smart <span className="text-blue-500">Meeting</span>
      </h1>
      <p className="m-0 font-medium uppercase text-slate-400 tracking-[0.28em] text-[11px] sm:text-[12px] md:text-[13px] pt-1">
        DECISION TRACKER
      </p>
    </div>
  );
}

/**
 * 6. ProgressSection Sub-Component
 * Sleek Blue Progress Bar matching site theme.
 */
function ProgressSection({ progress }) {
  return (
    <div className="w-full max-w-[520px] px-4 sm:px-0 pt-2 pb-1">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="flex-1 h-2.5 sm:h-3 bg-slate-800 border border-slate-700/80 rounded-full overflow-hidden relative shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-400 rounded-full transition-all duration-300 ease-out relative overflow-hidden"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent animate-warm-sheen" />
          </div>
        </div>
        <span className="text-xs sm:text-sm font-semibold text-slate-200 tabular-nums min-w-[38px] text-right">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
}

/**
 * 7. StatusMessage Sub-Component
 */
function StatusMessage({ message }) {
  return (
    <div className="h-7 flex items-center justify-center pt-1">
      <p className="m-0 text-base sm:text-[17px] font-medium text-slate-300 transition-opacity duration-300 ease-in-out text-center">
        {message}
      </p>
    </div>
  );
}

/**
 * 8. LoadingStages Sub-Component
 * Site Theme Stage Indicators.
 */
function LoadingStages({ progress }) {
  const isStage1Complete = progress >= 35;
  const isStage2Complete = progress >= 75;
  const isStage3Complete = progress >= 100;

  return (
    <div className="pt-4 sm:pt-6 w-full max-w-[540px]">
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 text-xs sm:text-[13px]">
        
        {/* STAGE 1 */}
        <div className="flex items-center gap-2">
          {isStage1Complete ? (
            <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-warm-spin" />
          )}
          <span className={`font-medium ${isStage1Complete ? 'text-white' : 'text-slate-200 font-semibold'}`}>
            Loading modules
          </span>
        </div>

        <div className="hidden sm:block w-8 h-[1.5px] bg-slate-800" />

        {/* STAGE 2 */}
        <div className="flex items-center gap-2">
          {isStage2Complete ? (
            <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ) : isStage1Complete ? (
            <div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-warm-spin" />
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-slate-700 text-slate-500 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
            </div>
          )}
          <span
            className={`font-medium ${
              isStage2Complete
                ? 'text-white'
                : isStage1Complete
                ? 'text-slate-200 font-semibold'
                : 'text-slate-500'
            }`}
          >
            Organizing action items
          </span>
        </div>

        <div className="hidden sm:block w-8 h-[1.5px] bg-slate-800" />

        {/* STAGE 3 */}
        <div className="flex items-center gap-2">
          {isStage3Complete ? (
            <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ) : isStage2Complete ? (
            <div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-warm-spin" />
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-slate-700 text-slate-500 flex items-center justify-center">
              <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="12" cy="12" r="9" strokeWidth="2" />
                <path d="M12 7v5l3 3" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          )}
          <span
            className={`font-medium ${
              isStage3Complete
                ? 'text-white'
                : isStage2Complete
                ? 'text-slate-200 font-semibold'
                : 'text-slate-500'
            }`}
          >
            Almost ready
          </span>
        </div>

      </div>
    </div>
  );
}

/**
 * Main LoadingScreen presentation component
 */
export function LoadingScreen({ progress, statusMessage }) {
  return (
    <div className="relative w-full h-full min-h-screen flex flex-col justify-center items-center px-4 py-8 select-none overflow-hidden">
      <BackgroundDecor />
      <ConnectingPaths />

      {/* FLOATING PRODUCTIVITY WIDGETS */}
      <FloatingWidget
        position="topLeft"
        title="Action Items"
        subtitle="4 Pending Sync"
        animationClass="animate-warm-widget-1"
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        }
      />

      <FloatingWidget
        position="topRight"
        title="Decisions"
        subtitle="12 Approved"
        animationClass="animate-warm-widget-2"
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      />

      <FloatingWidget
        position="bottomLeft"
        title="Participants"
        subtitle="8 Connected"
        animationClass="animate-warm-widget-3"
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        }
      />

      <FloatingWidget
        position="bottomRight"
        title="Analytics"
        subtitle="Real-time Tracking"
        animationClass="animate-warm-widget-4"
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        }
      />

      {/* CENTRAL UI COMPOSITION */}
      <div className="relative z-20 flex flex-col items-center max-w-lg w-full space-y-5 text-center">
        <AppIcon />
        <BrandSection />
        <ProgressSection progress={progress} />
        <StatusMessage message={statusMessage} />
        <LoadingStages progress={progress} />
      </div>
    </div>
  );
}

/**
 * InitialSplashScreen wrapper component managing loading timing and fade-out transition.
 */
export function InitialSplashScreen({ children }) {
  const [showSplash, setShowSplash] = useState(true);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Preparing your workspace...');
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const startTime = Date.now();
    const duration = 2400; // 2.4 seconds total animation duration

    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const currentProgress = Math.min(100, Math.round((elapsed / duration) * 100));

      setProgress(currentProgress);

      const activeSeq = STATUS_SEQUENCES.find(
        (s) => currentProgress >= s.min && currentProgress <= s.max
      );
      if (activeSeq) {
        setStatusMessage(activeSeq.message);
      }

      if (currentProgress >= 100) {
        clearInterval(progressInterval);

        setTimeout(() => {
          setFadeOut(true);
        }, 300);

        setTimeout(() => {
          setShowSplash(false);
        }, 850);
      }
    }, 35);

    return () => {
      clearInterval(progressInterval);
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
        className={`fixed inset-0 z-[99999] transition-all duration-500 ease-in-out ${
          fadeOut ? 'opacity-0 -translate-y-3 pointer-events-none' : 'opacity-100 translate-y-0'
        }`}
      >
        <LoadingScreen progress={progress} statusMessage={statusMessage} />
      </div>

      {children}
    </>
  );
}
