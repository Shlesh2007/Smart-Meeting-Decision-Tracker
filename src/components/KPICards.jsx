import React from 'react';
import { Calendar, Clock, Zap, CheckCircle2, AlertCircle, Flame } from 'lucide-react';

export default function KPICards({ stats }) {
  const cards = [
    {
      title: "TOTAL MEETINGS",
      value: stats?.totalMeetings ?? 68,
      icon: Calendar,
      iconColor: "text-blue-500",
      iconBg: "bg-blue-50",
      badge: "Logged",
      badgeBg: "bg-blue-50 text-blue-700 border-blue-100",
      subtitle: "All time meetings"
    },
    {
      title: "UPCOMING MEETINGS",
      value: stats?.upcomingMeetings ?? 0,
      icon: Clock,
      iconColor: "text-indigo-500",
      iconBg: "bg-indigo-50",
      badge: "Scheduled",
      badgeBg: "bg-indigo-50 text-indigo-700 border-indigo-100",
      subtitle: "Upcoming sched..."
    },
    {
      title: "OPEN ACTIONS",
      value: stats?.openActions ?? 24,
      icon: Zap,
      iconColor: "text-amber-500",
      iconBg: "bg-amber-50",
      badge: "Active",
      badgeBg: "bg-amber-50 text-amber-700 border-amber-100",
      subtitle: "Pending resolution"
    },
    {
      title: "COMPLETED",
      value: stats?.completedActions ?? 24,
      icon: CheckCircle2,
      iconColor: "text-emerald-500",
      iconBg: "bg-emerald-50",
      badge: "Done",
      badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-100",
      subtitle: "Successfully closed"
    },
    {
      title: "OVERDUE ACTIONS",
      value: stats?.overdueActions ?? 13,
      icon: AlertCircle,
      iconColor: "text-rose-500",
      iconBg: "bg-rose-50",
      badge: "Needs Action",
      badgeBg: "bg-rose-50 text-rose-700 border-rose-100",
      subtitle: "Past target date"
    },
    {
      title: "CRITICAL ACTIONS",
      value: stats?.criticalActions ?? 7,
      icon: Flame,
      iconColor: "text-red-500",
      iconBg: "bg-red-50",
      badge: "Urgent",
      badgeBg: "bg-red-50 text-red-700 border-rose-100",
      subtitle: "High priority risk"
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
      {cards.map((card, idx) => {
        const IconComponent = card.icon;
        return (
          <div
            key={idx}
            className="relative group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-[14px] shadow-xs transition-all duration-200 ease-out hover:scale-105 hover:-translate-y-0.5 hover:shadow-md text-center"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                  {card.title}
                </span>
                <div className={`p-1.5 rounded-lg ${card.iconBg}`}>
                  <IconComponent className={`w-4 h-4 ${card.iconColor}`} />
                </div>
              </div>

              <div className="text-3xl font-extrabold text-slate-800 dark:text-white text-center py-2">
                {card.value}
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${card.badgeBg}`}>
                {card.badge}
              </span>
              <span className="text-[11px] text-slate-400 truncate">
                {card.subtitle}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
