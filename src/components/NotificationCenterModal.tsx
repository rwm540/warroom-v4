import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  X, 
  CheckCheck, 
  Trash2, 
  Search, 
  ExternalLink, 
  Radio, 
  AlertTriangle, 
  Target, 
  Award, 
  Zap, 
  Users, 
  Megaphone, 
  Sparkles,
  ChevronLeft,
  Clock,
  ShieldAlert
} from 'lucide-react';
import { AppNotification, User } from '../types';
import { formatToPersianDigits } from '../utils/jalali';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>;
  currentUser: User | null;
  onNavigate: (tab: string) => void;
}

export default function NotificationCenterModal({
  isOpen,
  onClose,
  notifications,
  setNotifications,
  currentUser,
  onNavigate
}: NotificationCenterModalProps) {
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'urgent' | 'missions'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      window.dispatchEvent(new CustomEvent('warroom_modal_active_change', { detail: { active: true } }));
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.dispatchEvent(new CustomEvent('warroom_modal_active_change', { detail: { active: false } }));
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filter notifications relevant to current user:
  // target can be 'all', 'girls', 'boys', 'leaders', 'users', 'specific_user', 'specific_squad'
  const userRelevantNotifications = notifications.filter(n => {
    if (!currentUser) return n.target === 'all';
    if (n.target === 'all') return true;
    if (n.target === 'girls' && currentUser.gender === 'دختر') return true;
    if (n.target === 'boys' && currentUser.gender === 'پسر') return true;
    if (n.target === 'leaders' && currentUser.role === 'leader') return true;
    if (n.target === 'users' && currentUser.role === 'user') return true;
    if (n.target === 'specific_user' && (n.target_user_id === currentUser.id || n.target_personal_code === currentUser.personal_code)) return true;
    if (n.target === 'specific_squad' && currentUser.group_id && n.target_group_id === currentUser.group_id) return true;
    if (currentUser.role === 'admin') return true; // Admins can see all
    return false;
  });

  const isRead = (notif: AppNotification) => {
    if (!currentUser) return false;
    return notif.is_read_by.includes(currentUser.id);
  };

  const unreadCount = userRelevantNotifications.filter(n => !isRead(n)).length;

  const markAsRead = (id: string) => {
    if (!currentUser) return;
    setNotifications(prev => prev.map(n => {
      if (n.id === id) {
        if (!n.is_read_by.includes(currentUser.id)) {
          return { ...n, is_read_by: [...n.is_read_by, currentUser.id] };
        }
      }
      return n;
    }));
  };

  const markAllAsRead = () => {
    if (!currentUser) return;
    setNotifications(prev => prev.map(n => {
      if (!n.is_read_by.includes(currentUser.id)) {
        return { ...n, is_read_by: [...n.is_read_by, currentUser.id] };
      }
      return n;
    }));
  };

  const deleteNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    if (currentUser?.role === 'admin') {
      setNotifications([]);
    } else if (currentUser) {
      // Mark all as read for normal user
      markAllAsRead();
    }
  };

  const handleNotificationClick = (notif: AppNotification) => {
    markAsRead(notif.id);
    if (expandedId === notif.id) {
      setExpandedId(null);
    } else {
      setExpandedId(notif.id);
    }
  };

  const handleActionClick = (notif: AppNotification, e: React.MouseEvent) => {
    e.stopPropagation();
    markAsRead(notif.id);
    if (notif.action_tab) {
      onNavigate(notif.action_tab);
      onClose();
    }
  };

  // Filtered by sub-tab and search query
  const filteredList = userRelevantNotifications.filter(n => {
    const unread = !isRead(n);
    if (filterType === 'unread' && !unread) return false;
    if (filterType === 'urgent' && n.type !== 'urgent') return false;
    if (filterType === 'missions' && !(n.type === 'mission' || n.type === 'score' || n.type === 'medal')) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = n.title.toLowerCase().includes(q);
      const matchMsg = n.message.toLowerCase().includes(q);
      const matchSender = n.sender_name.toLowerCase().includes(q);
      if (!matchTitle && !matchMsg && !matchSender) return false;
    }

    return true;
  });

  const getTypeBadge = (type: AppNotification['type']) => {
    switch (type) {
      case 'urgent':
        return {
          icon: ShieldAlert,
          bg: 'bg-rose-950/80',
          border: 'border-rose-600/60',
          text: 'text-rose-400',
          label: 'فوری و اضطراری',
          glow: 'shadow-[0_0_12px_rgba(225,29,72,0.4)]'
        };
      case 'mission':
        return {
          icon: Target,
          bg: 'bg-cyan-950/80',
          border: 'border-cyan-500/50',
          text: 'text-cyan-300',
          label: 'مأموریت جدید',
          glow: 'shadow-[0_0_12px_rgba(6,182,212,0.4)]'
        };
      case 'medal':
        return {
          icon: Award,
          bg: 'bg-amber-950/80',
          border: 'border-amber-500/50',
          text: 'text-amber-300',
          label: 'نشان و مدال',
          glow: 'shadow-[0_0_12px_rgba(245,158,11,0.4)]'
        };
      case 'score':
        return {
          icon: Zap,
          bg: 'bg-emerald-950/80',
          border: 'border-emerald-500/50',
          text: 'text-emerald-300',
          label: 'امتیاز و ارزیابی',
          glow: 'shadow-[0_0_12px_rgba(16,185,129,0.4)]'
        };
      case 'squad':
        return {
          icon: Users,
          bg: 'bg-indigo-950/80',
          border: 'border-indigo-500/50',
          text: 'text-indigo-300',
          label: 'اطلاعیه جوخه',
          glow: 'shadow-[0_0_12px_rgba(99,102,241,0.4)]'
        };
      case 'announcement':
      default:
        return {
          icon: Megaphone,
          bg: 'bg-purple-950/80',
          border: 'border-purple-500/50',
          text: 'text-purple-300',
          label: 'پیام ستاد',
          glow: 'shadow-[0_0_12px_rgba(168,85,247,0.4)]'
        };
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 dir-rtl font-sans overflow-y-auto">
      
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/85 backdrop-blur-md"
      />

      {/* Center Modal Container */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        transition={{ type: 'spring', damping: 25, stiffness: 320 }}
        className="relative z-10 w-full max-w-2xl bg-[#060a1e] border border-cyan-500/40 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.9),0_0_30px_rgba(6,182,212,0.15)] flex flex-col max-h-[85vh] sm:max-h-[88vh] overflow-hidden my-auto"
      >
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-gradient-to-r from-cyan-950/40 via-slate-900 to-indigo-950/40 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-inner">
              <Bell size={20} className="animate-pulse" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center border-2 border-slate-950 font-mono animate-bounce">
                  {formatToPersianDigits(unreadCount)}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight">مرکز پیام‌ها و اعلانات هوشمند ستاد</h3>
                <span className="bg-cyan-950 text-cyan-400 text-[10px] font-mono px-2 py-0.5 rounded-md border border-cyan-500/30">
                  زنده (Real-time)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {unreadCount > 0 
                  ? `شما ${formatToPersianDigits(unreadCount)} پیام خوانده نشده در اتاق جنگ دارید`
                  : 'تمام پیام‌ها و دستورالعمل‌های ستاد تا این لحظه خوانده شده‌اند'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                title="علامت‌گذاری همه به عنوان خوانده شده"
                className="flex items-center gap-1 bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-xs px-2.5 py-1.5 rounded-xl transition font-bold"
              >
                <CheckCheck size={14} />
                <span className="hidden sm:inline">خوانده شدن همه</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition"
              title="بستن پنجره"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filter Bar & Search */}
        <div className="p-3 sm:px-5 sm:py-3 bg-[#040716] border-b border-slate-800/80 space-y-2.5 shrink-0">
          
          <div className="flex items-center gap-2 flex-wrap justify-between">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 text-xs font-bold overflow-x-auto no-scrollbar py-0.5">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap border ${
                  filterType === 'all'
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black shadow-sm'
                    : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                همه پیام‌ها ({formatToPersianDigits(userRelevantNotifications.length)})
              </button>

              <button
                onClick={() => setFilterType('unread')}
                className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap border flex items-center gap-1.5 ${
                  filterType === 'unread'
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black shadow-sm'
                    : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <span>خوانده نشده</span>
                {unreadCount > 0 && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    filterType === 'unread' ? 'bg-slate-950 text-cyan-300' : 'bg-rose-500 text-white'
                  }`}>
                    {formatToPersianDigits(unreadCount)}
                  </span>
                )}
              </button>

              <button
                onClick={() => setFilterType('urgent')}
                className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap border flex items-center gap-1 ${
                  filterType === 'urgent'
                    ? 'bg-rose-600 text-white border-rose-400 font-black shadow-sm'
                    : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-rose-400'
                }`}
              >
                <ShieldAlert size={13} />
                <span>فوری و آماده‌باش</span>
              </button>

              <button
                onClick={() => setFilterType('missions')}
                className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap border flex items-center gap-1 ${
                  filterType === 'missions'
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black shadow-sm'
                    : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-cyan-300'
                }`}
              >
                <Target size={13} />
                <span>مأموریت‌ها و نتایج</span>
              </button>
            </div>

            {/* Clear button */}
            {userRelevantNotifications.length > 0 && (
              <button
                onClick={clearAllNotifications}
                className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center gap-1 transition px-2 py-1 rounded-lg hover:bg-rose-950/30"
                title="پاکسازی اعلان‌ها"
              >
                <Trash2 size={13} />
                <span className="hidden sm:inline">پاکسازی</span>
              </button>
            )}
          </div>

          {/* Search input */}
          <div className="relative">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="جستجو در عنوان یا متن پیام‌های ستاد..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800/90 rounded-xl pr-9 pl-8 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X size={13} />
              </button>
            )}
          </div>

        </div>

        {/* Notifications List Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 custom-scrollbar">
          {filteredList.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-slate-900/80 border border-slate-800 flex items-center justify-center mx-auto text-slate-600">
                <Bell size={28} />
              </div>
              <h4 className="text-sm font-bold text-slate-300">هیچ پیامی در این دسته‌بندی یافت نشد</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery 
                  ? 'پیامی مطابق عبارت جستجوی شما پیدا نشد.' 
                  : 'تمام اطلاعیه‌ها و پیام‌های ارسالی توسط فرماندهی در این بخش نگهداری می‌شوند.'}
              </p>
            </div>
          ) : (
            filteredList.map((notif) => {
              const read = isRead(notif);
              const badge = getTypeBadge(notif.type);
              const BadgeIcon = badge.icon;
              const isExpanded = expandedId === notif.id;

              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`relative p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer group ${
                    !read
                      ? 'bg-gradient-to-r from-slate-900/90 to-[#0b122c] border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.12)]'
                      : 'bg-[#050818]/80 hover:bg-slate-900/70 border-slate-800/80 opacity-90'
                  }`}
                >
                  
                  {/* Unread Glow Indicator */}
                  {!read && (
                    <div className="absolute top-4 left-4 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                      <span className="text-[10px] font-bold text-cyan-400 font-mono hidden sm:inline">جدید</span>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    
                    {/* Type Icon Badge */}
                    <div className={`w-10 h-10 rounded-2xl ${badge.bg} ${badge.border} ${badge.text} ${badge.glow} border flex items-center justify-center shrink-0 shadow-sm mt-0.5`}>
                      <BadgeIcon size={19} />
                    </div>

                    {/* Content Details */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      
                      {/* Meta Top: Sender, Type, Time */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-lg border ${badge.bg} ${badge.border} ${badge.text}`}>
                          {badge.label}
                        </span>

                        <span className="text-[10px] text-slate-400 font-bold">
                          از طرف: <span className="text-slate-200">{notif.sender_name}</span>
                        </span>

                        <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mr-auto">
                          <Clock size={11} />
                          {notif.created_at}
                        </span>
                      </div>

                      {/* Title */}
                      <h4 className={`text-xs sm:text-sm font-black ${!read ? 'text-white' : 'text-slate-200'}`}>
                        {notif.title}
                      </h4>

                      {/* Message body (truncated or expanded) */}
                      <p className={`text-xs text-slate-300 leading-relaxed ${
                        isExpanded ? '' : 'line-clamp-2'
                      }`}>
                        {notif.message}
                      </p>

                      {/* Action Bar inside Card */}
                      <div className="pt-2 flex items-center justify-between gap-2 flex-wrap">
                        {notif.action_tab ? (
                          <button
                            onClick={(e) => handleActionClick(notif, e)}
                            className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 text-slate-950 text-xs font-black px-3 py-1.5 rounded-xl shadow-md transition"
                          >
                            <span>{notif.action_label || 'مشاهده و بررسی'}</span>
                            <ExternalLink size={13} />
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-500">
                            {isExpanded ? 'برای جمع شدن کلیک کنید' : 'برای مشاهده کامل متن کلیک کنید'}
                          </span>
                        )}

                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => deleteNotification(notif.id, e)}
                            className="text-slate-500 hover:text-rose-400 p-1 rounded-lg hover:bg-slate-800 transition"
                            title="حذف این پیام"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>

                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:px-5 border-t border-slate-800/80 bg-[#040716] flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px]">اتصال زنده به شبکه فرماندهی اتاق جنگ فعال است</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold transition"
          >
            بستن
          </button>
        </div>

      </motion.div>
    </div>
  );
}
