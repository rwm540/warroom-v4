import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  HelpCircle, 
  Plus, 
  MessageSquare, 
  Send, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  ShieldAlert, 
  Tag, 
  User as UserIcon, 
  Phone,
  Mail,
  MapPin,
  Headphones,
  Home,
  ArrowRight,
  Sparkles,
  MessageCircle,
  Building2,
  Copy,
  Check
} from 'lucide-react';
import { User, SupportTicket, SupportReply, TicketType } from '../types';
import { createSupportTicketInSupabase } from '../lib/supabaseData';

interface SupportViewProps {
  currentUser?: User | null;
  tickets?: SupportTicket[];
  setTickets?: React.Dispatch<React.SetStateAction<SupportTicket[]>>;
  replies?: SupportReply[];
  setReplies?: React.Dispatch<React.SetStateAction<SupportReply[]>>;
  triggerAlert?: (msg: string) => void;
  onNavigate?: (tab: string) => void;
  siteSettings?: any;
}

export default function SupportView({
  currentUser,
  tickets = [],
  setTickets,
  triggerAlert,
  onNavigate,
  siteSettings
}: SupportViewProps) {
  const [fullName, setFullName] = useState(
    currentUser ? `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim() : ''
  );
  const [contactInfo, setContactInfo] = useState(
    currentUser?.phone || currentUser?.personal_code || ''
  );
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<'technical' | 'content' | 'judge' | 'other'>('technical');
  const [priority, setPriority] = useState<'normal' | 'important' | 'urgent'>('normal');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<SupportTicket | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(text);
      }
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
      if (triggerAlert) {
        triggerAlert(`«${text}» در حافظه کپی شد.`);
      }
    } catch {
      // ignore
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !contactInfo.trim() || !message.trim() || isSubmitting) return;

    setIsSubmitting(true);

    const now = new Date();
    const timeFormatted = now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    const dateFormatted = new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    const fullDateTimeStr = `${dateFormatted} - ${timeFormatted}`;

    const newTicket: SupportTicket = {
      id: `tick-${Date.now().toString().slice(-6)}`,
      user_id: currentUser?.id || `guest-${Date.now().toString().slice(-6)}`,
      user_name: fullName.trim(),
      personal_code: currentUser?.personal_code || contactInfo.trim(),
      subject: subject.trim() || 'درخواست پشتیبانی',
      message: message.trim(),
      type: category as TicketType,
      status: 'open',
      priority: priority,
      created_at: fullDateTimeStr,
      updated_at: fullDateTimeStr
    };

    try {
      await createSupportTicketInSupabase(newTicket);
    } catch (err) {
      console.warn('Supabase ticket save warning:', err);
    }

    if (setTickets) {
      setTickets(prev => [newTicket, ...(prev || [])]);
    }

    setSubmittedTicket(newTicket);
    setIsSubmitting(false);

    if (triggerAlert) {
      triggerAlert(`تیکت با شماره پیگیری ${newTicket.id} ثبت شد.`);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="space-y-6 dir-rtl pb-16 max-w-6xl mx-auto px-3 sm:px-6 text-slate-100"
    >
      {/* 1. Header Bar with Clear Back Button - 100% Solid Surface */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0f172a] border border-slate-700 rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3.5 rounded-xl bg-cyan-500/20 border border-cyan-500 text-cyan-300 shrink-0">
            <Headphones size={26} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white">سامانه پشتیبانی و پاسخگویی تیکت‌ها</h1>
            <p className="text-sm font-bold text-cyan-200 mt-1">ارتباط مستقیم با کارشناسان فنی، داوران و ستاد برگزاری مسابقات</p>
          </div>
        </div>

        {/* Return to Home Button */}
        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate('Home')}
            className="self-stretch sm:self-auto px-5 py-3 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-cyan-300 border border-cyan-500/80 font-black text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2.5 cursor-pointer active:scale-95"
          >
            <Home size={18} className="text-cyan-400" />
            <span className="text-white font-extrabold">بازگشت به صفحه اصلی</span>
            <ArrowRight size={16} className="text-cyan-400 rotate-180" />
          </button>
        )}
      </div>

      {/* 2. Direct Contact Cards Grid - 100% Solid Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: 'تلفن مستقیم ستاد',
            desc: 'پاسخگویی سریع کارشناسان',
            val: siteSettings?.contactPhone || '۰۲۱-۸۸۹۹۷۷۶۶',
            subVal: 'شنبه تا چهارشنبه ۹ الی ۱۷',
            icon: Phone,
            accentColor: 'text-cyan-400',
            badgeBg: 'bg-cyan-950 border-cyan-600',
            copyVal: '02188997766'
          },
          {
            title: 'پشتیبانی در پیام‌رسان‌ها',
            desc: 'ایتا، روبیکا و بله',
            val: '@WarRoom_Support',
            subVal: 'پاسخگویی آنلاین و فوری',
            icon: MessageCircle,
            accentColor: 'text-amber-400',
            badgeBg: 'bg-amber-950 border-amber-600',
            copyVal: '@WarRoom_Support'
          },
          {
            title: 'پست الکترونیک رسمی',
            desc: 'ارسال نامه‌ها و مدارک',
            val: siteSettings?.contactEmail || 'support@warroom.ir',
            subVal: 'پاسخگویی زیر ۲۴ ساعت',
            icon: Mail,
            accentColor: 'text-emerald-400',
            badgeBg: 'bg-emerald-950 border-emerald-600',
            copyVal: 'support@warroom.ir'
          },
          {
            title: 'نشانی ستاد مرکزی',
            desc: 'مراجعه حضوری با هماهنگی قبلی',
            val: 'تهران، م فردوسی، خ سپهبد قرنی',
            subVal: 'پلاک ۱۲۴، ساختمان مرکزی',
            icon: Building2,
            accentColor: 'text-purple-400',
            badgeBg: 'bg-purple-950 border-purple-600',
            copyVal: null
          }
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <div 
              key={idx}
              className="bg-[#0f172a] border border-slate-700 rounded-2xl p-5 space-y-3.5 shadow-lg hover:border-slate-600 transition"
            >
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-xl ${item.badgeBg} border ${item.accentColor}`}>
                  <Icon size={22} />
                </div>
                {item.copyVal && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(item.copyVal!, `supp-${idx}`)}
                    className="p-2 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-slate-300 hover:text-white border border-slate-700 text-xs flex items-center gap-1 transition"
                  >
                    {copiedKey === `supp-${idx}` ? (
                      <Check size={14} className="text-emerald-400" />
                    ) : (
                      <Copy size={14} />
                    )}
                    <span className="text-[11px] font-bold">کپی</span>
                  </button>
                )}
              </div>

              <div>
                <h3 className="text-base font-black text-white">{item.title}</h3>
                <p className="text-xs text-slate-200 font-semibold mt-0.5">{item.desc}</p>
              </div>

              <div className="pt-2 border-t border-slate-700 space-y-1">
                <p className="text-sm font-black text-cyan-300 font-mono dir-ltr text-right">{item.val}</p>
                <p className="text-xs text-slate-200 font-medium">{item.subVal}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Ticket Submission Form - 100% Solid Opaque */}
      <div className="bg-[#0f172a] border border-slate-700 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-700 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-cyan-950 border border-cyan-500 text-cyan-300">
              <MessageSquare size={22} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white">ثبت تیکت جدید پشتیبانی</h2>
              <p className="text-sm font-bold text-slate-200 mt-0.5">درخواست شما در اسرع وقت توسط کارشناسان ستاد بررسی و پاسخ داده می‌شود</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-950 border border-emerald-500 px-3 py-1.5 rounded-xl">
            <Sparkles size={14} />
            <span>پشتیبانی فعال</span>
          </div>
        </div>

        {submittedTicket ? (
          <div className="p-6 sm:p-8 rounded-2xl bg-[#0f2e1f] border border-emerald-500 text-emerald-100 text-center space-y-5 my-2 shadow-xl">
            <CheckCircle2 size={52} className="mx-auto text-emerald-400" />
            <div className="space-y-1.5">
              <h3 className="text-xl font-black text-white">تیکت شما با موفقیت ثبت گردید</h3>
              <p className="text-sm text-emerald-200 font-bold">
                شناسه پیگیری: <strong className="font-mono text-white text-base">{submittedTicket.id}</strong>
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSubject('');
                setMessage('');
                setSubmittedTicket(null);
              }}
              className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs sm:text-sm transition cursor-pointer"
            >
              ارسال تیکت دیگر
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-bold text-white mb-2 flex items-center gap-1.5">
                  <UserIcon size={16} className="text-cyan-400" />
                  <span>نام و نام خانوادگی *</span>
                </label>
                <input 
                  type="text" 
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="مثال: محمد حسینی"
                  className="w-full bg-[#1e293b] border-2 border-slate-600 focus:border-cyan-400 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-400 font-bold outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-white mb-2 flex items-center gap-1.5">
                  <Phone size={16} className="text-amber-400" />
                  <span>شماره تماس یا ایمیل *</span>
                </label>
                <input 
                  type="text" 
                  required
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  placeholder="۰۹۱۲۳۴۵۶۷۸۹ یا ایمیل"
                  className="w-full bg-[#1e293b] border-2 border-slate-600 focus:border-cyan-400 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-400 font-bold outline-none transition dir-ltr text-right"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-white mb-2 flex items-center gap-1.5">
                  <Tag size={16} className="text-emerald-400" />
                  <span>موضوع تیکت *</span>
                </label>
                <input 
                  type="text" 
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="مثال: سوال در خصوص آزمون آنلاین مرحله ۲"
                  className="w-full bg-[#1e293b] border-2 border-slate-600 focus:border-cyan-400 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-400 font-bold outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-white mb-2 flex items-center gap-1.5">
                  <ShieldAlert size={16} className="text-purple-400" />
                  <span>دپارتمان مربوطه *</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-[#1e293b] border-2 border-slate-600 focus:border-cyan-400 rounded-xl px-4 py-3 text-sm text-white font-bold outline-none transition"
                >
                  <option value="technical" className="bg-[#1e293b] text-white">پشتیبانی فنی و سامانه</option>
                  <option value="judge" className="bg-[#1e293b] text-white">داوری و امتیازات مسابقات</option>
                  <option value="content" className="bg-[#1e293b] text-white">محتوا و آموزه‌ها</option>
                  <option value="other" className="bg-[#1e293b] text-white">عمومی و پیشنهادات</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-white mb-2 flex items-center gap-1.5">
                <MessageSquare size={16} className="text-cyan-400" />
                <span>متن کامل تیکت یا سوال *</span>
              </label>
              <textarea 
                rows={6}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="لطفاً پیام خود را به صورت دقیق و شفاف بنویسید..."
                className="w-full bg-[#1e293b] border-2 border-slate-600 focus:border-cyan-400 rounded-xl p-4 text-sm text-white placeholder-slate-400 font-semibold outline-none transition resize-none leading-relaxed"
              />
            </div>

            <div className="p-4 rounded-xl bg-[#1e293b] border border-amber-500/60 text-sm text-amber-200 flex items-center gap-3">
              <AlertCircle size={20} className="text-amber-400 shrink-0" />
              <span className="font-bold leading-relaxed">
                پاسخ کارشناسان ستاد از طریق همین سامانه یا شماره تماس درج شده به اطلاع شما خواهد رسید.
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-4 rounded-xl text-slate-950 font-black text-sm sm:text-base shadow-xl transition flex items-center justify-center gap-2 ${
                isSubmitting 
                  ? 'bg-cyan-800 cursor-not-allowed text-slate-300' 
                  : 'bg-cyan-500 hover:bg-cyan-400 active:scale-[0.99] cursor-pointer'
              }`}
            >
              <Send size={18} className={isSubmitting ? 'animate-spin' : ''} />
              <span>{isSubmitting ? 'در حال ثبت...' : 'ارسال قطعی تیکت به ستاد پشتیبانی'}</span>
            </button>
          </form>
        )}
      </div>
    </motion.div>
  );
}
