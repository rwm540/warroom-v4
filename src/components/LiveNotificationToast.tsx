import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  X, 
  ExternalLink, 
  ShieldAlert, 
  Target, 
  Award, 
  Zap, 
  Users, 
  Megaphone, 
  ChevronLeft 
} from 'lucide-react';
import { AppNotification } from '../types';
import { playNotificationSound } from '../utils/audioAlert';

interface LiveNotificationToastProps {
  notification: AppNotification | null;
  onDismiss: () => void;
  onOpenCenter: () => void;
  onActionClick: (tab: string) => void;
}

export default function LiveNotificationToast({
  notification,
  onDismiss,
  onOpenCenter,
  onActionClick
}: LiveNotificationToastProps) {
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!notification) return;

    // Play synthesized cyber tone based on notification type
    playNotificationSound(notification.type);

    setProgress(100);
    const duration = 7500; // 7.5 seconds
    const intervalTime = 50;
    const step = (intervalTime / duration) * 100;

    const timer = setInterval(() => {
      if (!isPaused) {
        setProgress((prev) => {
          if (prev <= step) {
            clearInterval(timer);
            onDismiss();
            return 0;
          }
          return prev - step;
        });
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [notification, isPaused]);

  if (!notification) return null;

  const getTypeStyle = (type: AppNotification['type']) => {
    switch (type) {
      case 'urgent':
        return {
          icon: ShieldAlert,
          gradient: 'from-rose-600 via-red-600 to-amber-600',
          border: 'border-rose-500/50',
          glow: 'shadow-[0_0_35px_rgba(225,29,72,0.6)]',
          badgeBg: 'bg-rose-950 text-rose-300 border-rose-600/60',
          iconBg: 'bg-rose-950 text-rose-400 border-rose-700',
          titleColor: 'text-rose-300',
          typeLabel: 'پیام فوری و اضطراری ستاد'
        };
      case 'mission':
        return {
          icon: Target,
          gradient: 'from-cyan-500 via-blue-600 to-indigo-600',
          border: 'border-cyan-500/50',
          glow: 'shadow-[0_0_35px_rgba(6,182,212,0.5)]',
          badgeBg: 'bg-cyan-950 text-cyan-300 border-cyan-500/50',
          iconBg: 'bg-cyan-950 text-cyan-400 border-cyan-700',
          titleColor: 'text-cyan-300',
          typeLabel: 'مأموریت جدید عملیاتی'
        };
      case 'medal':
        return {
          icon: Award,
          gradient: 'from-amber-500 via-yellow-600 to-orange-600',
          border: 'border-amber-500/50',
          glow: 'shadow-[0_0_35px_rgba(245,158,11,0.5)]',
          badgeBg: 'bg-amber-950 text-amber-300 border-amber-500/50',
          iconBg: 'bg-amber-950 text-amber-400 border-amber-700',
          titleColor: 'text-amber-300',
          typeLabel: 'نشان و مدال افتخار'
        };
      case 'score':
        return {
          icon: Zap,
          gradient: 'from-emerald-500 via-teal-600 to-cyan-600',
          border: 'border-emerald-500/50',
          glow: 'shadow-[0_0_35px_rgba(16,185,129,0.5)]',
          badgeBg: 'bg-emerald-950 text-emerald-300 border-emerald-500/50',
          iconBg: 'bg-emerald-950 text-emerald-400 border-emerald-700',
          titleColor: 'text-emerald-300',
          typeLabel: 'امتیاز و ارزیابی پاسخ'
        };
      case 'squad':
        return {
          icon: Users,
          gradient: 'from-indigo-500 via-purple-600 to-pink-600',
          border: 'border-indigo-500/50',
          glow: 'shadow-[0_0_35px_rgba(99,102,241,0.5)]',
          badgeBg: 'bg-indigo-950 text-indigo-300 border-indigo-500/50',
          iconBg: 'bg-indigo-950 text-indigo-400 border-indigo-700',
          titleColor: 'text-indigo-300',
          typeLabel: 'اطلاعیه همرزمان جوخه'
        };
      case 'announcement':
      default:
        return {
          icon: Megaphone,
          gradient: 'from-purple-500 via-indigo-600 to-blue-600',
          border: 'border-purple-500/50',
          glow: 'shadow-[0_0_35px_rgba(168,85,247,0.5)]',
          badgeBg: 'bg-purple-950 text-purple-300 border-purple-500/50',
          iconBg: 'bg-purple-950 text-purple-400 border-purple-700',
          titleColor: 'text-purple-300',
          typeLabel: 'پیام رسمی فرماندهی'
        };
    }
  };

  const style = getTypeStyle(notification.type);
  const IconComponent = style.icon;

  return (
    <AnimatePresence>
      <motion.div
        key={notification.id}
        initial={{ opacity: 0, y: -60, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
        exit={{ opacity: 0, x: 300, scale: 0.9 }}
        transition={{ type: 'spring', damping: 24, stiffness: 320 }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.05, right: 0.85 }}
        onDragEnd={(_e, info) => {
          if (info.offset.x > 60 || info.velocity.x > 180) {
            onDismiss();
          }
        }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className={`fixed top-4 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-50 p-[1.5px] rounded-3xl bg-gradient-to-r ${style.gradient} ${style.glow} dir-rtl select-none cursor-grab active:cursor-grabbing font-sans`}
      >
        <div className={`p-4 rounded-[22px] bg-[#050818]/95 backdrop-blur-xl border ${style.border} space-y-3 relative overflow-hidden shadow-2xl`}>
          
          {/* Header Row: Sender / Type / Time / Close */}
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-9 h-9 rounded-2xl ${style.iconBg} border flex items-center justify-center shrink-0 shadow-inner`}>
                <IconComponent size={18} className="animate-pulse" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[9px] font-black px-1.5 py-0.2 rounded border font-mono ${style.badgeBg}`}>
                    {style.typeLabel}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">هم‌اکنون</span>
                </div>
                <p className="text-[11px] font-bold text-slate-300 truncate">
                  {notification.sender_name}
                </p>
              </div>
            </div>

            {/* Close 'X' Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              className="p-1 rounded-xl bg-slate-900/90 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition shrink-0"
              title="بستن اعلان"
            >
              <X size={15} />
            </button>
          </div>

          {/* Body Content */}
          <div className="space-y-1 pr-1">
            <h4 className={`text-xs sm:text-sm font-black ${style.titleColor}`}>
              {notification.title}
            </h4>
            <p className="text-xs text-slate-200 leading-relaxed line-clamp-3">
              {notification.message}
            </p>
          </div>

          {/* Actions Footer */}
          <div className="pt-1 flex items-center justify-between gap-2">
            
            {notification.action_tab ? (
              <button
                onClick={() => {
                  onActionClick(notification.action_tab!);
                  onDismiss();
                }}
                className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-95 text-slate-950 text-xs font-black px-3.5 py-1.5 rounded-xl shadow-md transition cursor-pointer"
              >
                <span>{notification.action_label || 'مشاهده و اقدام'}</span>
                <ExternalLink size={13} />
              </button>
            ) : (
              <button
                onClick={() => {
                  onOpenCenter();
                  onDismiss();
                }}
                className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 text-xs font-bold"
              >
                <span>مشاهده در پیام‌ها</span>
                <ChevronLeft size={14} />
              </button>
            )}

            <button
              onClick={() => {
                onOpenCenter();
                onDismiss();
              }}
              className="text-[11px] text-slate-400 hover:text-slate-200 transition underline underline-offset-4"
            >
              تمام اعلانات ستاد
            </button>
          </div>

          {/* Auto-dismiss progress line */}
          <div className="absolute bottom-0 inset-x-0 h-1 bg-slate-800/80">
            <div 
              className={`h-full bg-gradient-to-r ${style.gradient} transition-all duration-75`}
              style={{ width: `${progress}%` }}
            />
          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
}
