import React from 'react';
import { HomeAnnouncement } from '../../data/home';
import { Calendar as CalendarIcon, ChevronLeft, Sparkles } from 'lucide-react';

interface AnnouncementsListProps {
  announcements: HomeAnnouncement[];
  onOpenAll: () => void;
}

export default function AnnouncementsList({
  announcements,
  onOpenAll
}: AnnouncementsListProps) {
  const activeAnnouncements = announcements.filter(a => a.isActive).slice(0, 3);

  return (
    <div className="mx-4 my-5 space-y-3 dir-rtl">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles size={15} className="text-cyan-400 animate-pulse" />
          <h2 className="text-sm font-black text-white">
            اطلاعیه‌های قرارگاه
          </h2>
        </div>
        <button
          onClick={onOpenAll}
          className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5 transition-colors"
        >
          <span>همه اطلاعیه‌ها</span>
          <ChevronLeft size={13} />
        </button>
      </div>

      {/* Announcements List */}
      <div className="space-y-2.5">
        {activeAnnouncements.length === 0 ? (
          <div className="p-4 rounded-2xl bg-[#0a0f24]/80 backdrop-blur-xl border border-cyan-500/20 text-center text-xs text-slate-400">
            اطلاعیه فعالی یافت نشد
          </div>
        ) : (
          activeAnnouncements.map((item) => (
            <div
              key={item.id}
              onClick={onOpenAll}
              className="p-3.5 rounded-2xl bg-[#0a0f24]/80 backdrop-blur-xl border border-cyan-500/25 hover:border-cyan-400/50 cursor-pointer transition-all flex items-start gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.5)] group"
            >
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-cyan-500/40 group-hover:scale-105 transition-transform"
                  referrerPolicy="no-referrer"
                />
              )}
              <div className="flex-1 min-w-0 space-y-1 text-right">
                <div className="flex items-center justify-between gap-1">
                  <h3 className="text-xs font-bold text-slate-100 truncate group-hover:text-cyan-300 transition-colors">
                    {item.title}
                  </h3>
                  {item.isNew && (
                    <span className="px-2 py-0.2 rounded-full text-[9px] font-black bg-rose-600 text-white flex-shrink-0 shadow-[0_0_8px_rgba(225,29,72,0.8)]">
                      جدید
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                  {item.message}
                </p>
                <div className="flex items-center gap-1 text-[9px] text-cyan-400/80 font-mono">
                  <CalendarIcon size={10} className="text-cyan-400" />
                  <span>{item.createdAt}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
