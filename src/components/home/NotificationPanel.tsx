import React, { useEffect, useRef } from 'react';
import { HomeAnnouncement } from '../../data/home';
import { Bell, X, Calendar as CalendarIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  announcements: HomeAnnouncement[];
}

export default function NotificationPanel({
  isOpen,
  onClose,
  announcements
}: NotificationPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const activeAnnouncements = announcements.filter(a => a.isActive);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          />

          {/* Drawer / Popover Container */}
          <motion.div
            ref={panelRef}
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-w-[480px] mx-auto bg-[#0a0f24] border-t-2 border-cyan-400 rounded-t-3xl shadow-[0_-10px_40px_rgba(6,182,212,0.3)] flex flex-col max-h-[85vh] dir-rtl"
          >
            {/* Header Handle & Title */}
            <div className="p-4 border-b border-cyan-500/25 flex items-center justify-between bg-cyan-950/20 rounded-t-3xl">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-950/80 border border-cyan-400/50 flex items-center justify-center text-cyan-400">
                  <Bell size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">
                    اطلاعیه‌های قرارگاه
                  </h3>
                  <span className="text-[10px] text-cyan-300 font-mono">
                    {activeAnnouncements.length} پیام فعال در سیستم
                  </span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-xl bg-[#0e1738] hover:bg-[#13204c] text-slate-300 hover:text-white border border-cyan-500/30 transition-colors"
                aria-label="بستن پنل اطلاعیه‌ها"
              >
                <X size={16} />
              </button>
            </div>

            {/* List Content */}
            <div className="p-4 space-y-3 overflow-y-auto flex-1">
              {activeAnnouncements.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center justify-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Bell size={20} />
                  </div>
                  <p className="text-xs font-bold text-slate-300">
                    هیچ اطلاعیه جدیدی در قرارگاه ثبت نشده است
                  </p>
                  <p className="text-[10px] text-slate-400 max-w-xs">
                    دستورالعمل‌ها و اخبار بعدی به محض صدور در همین بخش نمایش داده خواهند شد.
                  </p>
                </div>
              ) : (
                activeAnnouncements.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-[#0d1533]/80 border border-cyan-500/25 hover:border-cyan-400/50 transition-all flex items-start gap-3 relative group"
                  >
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-cyan-500/40"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div className="flex-1 space-y-1 text-right min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-black text-slate-100 truncate group-hover:text-cyan-300 transition-colors">
                          {item.title}
                        </h4>
                        {item.isNew && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-600 text-white flex-shrink-0 shadow-[0_0_8px_rgba(225,29,72,0.8)]">
                            جدید
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                        {item.message}
                      </p>
                      <div className="flex items-center gap-1 text-[9px] text-cyan-400/80 pt-1 font-mono">
                        <CalendarIcon size={10} className="text-cyan-400" />
                        <span>{item.createdAt}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Bottom Footer Note */}
            <div className="p-3 bg-[#060a1a] border-t border-cyan-500/15 text-center text-[10px] text-slate-400 font-mono">
              سامانه اطلاع‌رسانی پدافند و امور عملیاتی اتاق جنگ
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
