import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  Send, 
  MessageSquare, 
  CheckCircle2, 
  Headphones, 
  Home, 
  ArrowRight, 
  Sparkles, 
  MessageCircle, 
  Building2, 
  Tag, 
  User as UserIcon, 
  ShieldCheck, 
  AlertCircle,
  Copy,
  Check,
  Search,
  ListOrdered,
  PlusCircle,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { User, SupportTicket, TicketType } from '../types';
import { createSupportTicketInSupabase } from '../lib/supabaseData';
import { formatToPersianDigits } from '../utils/jalali';

interface ContactViewProps {
  currentUser?: User | null;
  tickets?: SupportTicket[];
  setTickets?: React.Dispatch<React.SetStateAction<SupportTicket[]>>;
  onNavigate?: (tab: string) => void;
  triggerAlert?: (msg: string) => void;
  siteSettings?: any;
}

export default function ContactView({ 
  currentUser,
  tickets = [],
  setTickets,
  onNavigate, 
  triggerAlert, 
  siteSettings 
}: ContactViewProps) {
  const [activeTab, setActiveTab] = useState<'create' | 'history' | 'channels'>('create');
  
  // Form State
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
  const [ticketSearch, setTicketSearch] = useState('');

  useEffect(() => {
    if (currentUser) {
      if (!fullName) {
        setFullName(`${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim());
      }
      if (!contactInfo) {
        setContactInfo(currentUser.phone || currentUser.personal_code || '');
      }
    }
  }, [currentUser]);

  const copyToClipboard = (text: string, key: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
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

  const getCategoryTitle = (cat: string) => {
    switch (cat) {
      case 'technical': return 'پشتیبانی فنی و سامانه';
      case 'content': return 'محتوا و آموزه‌ها';
      case 'judge': return 'داوری و امتیاز مسابقات';
      case 'other': 
      default: return 'عمومی و پیشنهادات';
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

    const newTicketId = `tick-${Date.now().toString().slice(-6)}`;
    const newTicket: SupportTicket = {
      id: newTicketId,
      user_id: currentUser?.id || `guest-${Date.now().toString().slice(-6)}`,
      user_name: fullName.trim(),
      personal_code: currentUser?.personal_code || contactInfo.trim(),
      subject: subject.trim() || `تیکت پشتیبانی: ${getCategoryTitle(category)}`,
      message: message.trim(),
      type: category as TicketType,
      status: 'open',
      priority: priority,
      created_at: fullDateTimeStr,
      updated_at: fullDateTimeStr
    };

    // 1. Save directly to Supabase
    try {
      await createSupportTicketInSupabase(newTicket);
    } catch (err) {
      console.warn('Supabase ticket create warning:', err);
    }

    // 2. Update local state
    if (setTickets) {
      setTickets(prev => [newTicket, ...(prev || [])]);
    }

    setSubmittedTicket(newTicket);
    setIsSubmitting(false);

    if (triggerAlert) {
      triggerAlert(`تیکت پشتیبانی با شناسه ${newTicket.id} با موفقیت در سامانه ثبت شد.`);
    }
  };

  const handleResetForm = () => {
    setSubject('');
    setMessage('');
    setSubmittedTicket(null);
  };

  // User tickets list
  const userTickets = tickets.filter(t => {
    if (currentUser) {
      return t.user_id === currentUser.id || t.personal_code === currentUser.personal_code;
    }
    return false;
  });

  const filteredTickets = (userTickets.length > 0 ? userTickets : tickets).filter(t => {
    if (!ticketSearch.trim()) return true;
    const q = ticketSearch.toLowerCase();
    return t.subject.toLowerCase().includes(q) || t.id.toLowerCase().includes(q) || t.message.toLowerCase().includes(q);
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return (
          <span className="bg-amber-950 text-amber-300 border border-amber-500 text-xs font-black px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>در انتظار بررسی ستاد</span>
          </span>
        );
      case 'in_progress':
        return (
          <span className="bg-blue-950 text-blue-300 border border-blue-500 text-xs font-black px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
            <RefreshCw size={13} className="animate-spin text-blue-400" />
            <span>در حال بررسی توسط کارشناس</span>
          </span>
        );
      case 'answered':
        return (
          <span className="bg-emerald-950 text-emerald-300 border border-emerald-500 text-xs font-black px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span>پاسخ داده شده ✓</span>
          </span>
        );
      case 'closed':
      default:
        return (
          <span className="bg-slate-800 text-slate-300 border border-slate-600 text-xs font-bold px-3 py-1 rounded-full">
            <span>بسته شده</span>
          </span>
        );
    }
  };

  const contactMethods = [
    {
      title: 'تماس تلفنی مستقیم',
      desc: 'پاسخگویی سریع کارشناسان ستاد',
      val: siteSettings?.contactPhone || '۰۲۱-۸۸۹۹۷۷۶۶',
      subVal: 'خط ویژه پشتیبانی: ۰۲۱-۸۸۹۹۷۷۶۷',
      icon: Phone,
      accentColor: 'text-cyan-400',
      badgeBg: 'bg-cyan-950 border-cyan-600',
      copyVal: '02188997766'
    },
    {
      title: 'کانال‌ها و پیام‌رسان‌ها',
      desc: 'پشتیبانی در پیام‌رسان‌های داخلی',
      val: siteSettings?.telegram ? `@${siteSettings.telegram.replace('@', '')}` : '@WarRoom_Support',
      subVal: 'در ایتا، روبیکا، بله و شاد',
      icon: MessageCircle,
      accentColor: 'text-amber-400',
      badgeBg: 'bg-amber-950 border-amber-600',
      copyVal: '@WarRoom_Support'
    },
    {
      title: 'پست الکترونیک (ایمیل)',
      desc: 'مکاتبات رسمی و سازمانی',
      val: siteSettings?.contactEmail || 'info@warroom.ir',
      subVal: 'پشتیبانی فنی: support@warroom.ir',
      icon: Mail,
      accentColor: 'text-emerald-400',
      badgeBg: 'bg-emerald-950 border-emerald-600',
      copyVal: 'support@warroom.ir'
    },
    {
      title: 'ساعات کاری و پاسخگویی',
      desc: 'زمان حضور کارشناسان در ستاد',
      val: 'شنبه تا چهارشنبه: ۸:۳۰ الی ۱۷:۰۰',
      subVal: 'پنج‌شنبه‌ها: ۸:۳۰ الی ۱۳:۰۰',
      icon: Clock,
      accentColor: 'text-purple-400',
      badgeBg: 'bg-purple-950 border-purple-600',
      copyVal: null
    }
  ];

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
            <h1 className="text-xl sm:text-2xl font-black text-white">مرکز پشتیبانی و ارسال تیکت</h1>
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

      {/* 2. Quick Contact Cards Grid - 100% Solid Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {contactMethods.map((method, idx) => {
          const Icon = method.icon;
          return (
            <div 
              key={idx}
              className="bg-[#0f172a] border border-slate-700 rounded-2xl p-5 space-y-3.5 shadow-lg hover:border-slate-600 transition"
            >
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-xl ${method.badgeBg} border ${method.accentColor}`}>
                  <Icon size={22} />
                </div>
                {method.copyVal && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(method.copyVal!, `method-${idx}`)}
                    className="p-2 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-slate-300 hover:text-white border border-slate-700 text-xs flex items-center gap-1 transition"
                    title="کپی در حافظه"
                  >
                    {copiedKey === `method-${idx}` ? (
                      <Check size={14} className="text-emerald-400" />
                    ) : (
                      <Copy size={14} />
                    )}
                    <span className="text-[11px] font-bold">کپی</span>
                  </button>
                )}
              </div>

              <div>
                <h3 className="text-base font-black text-white">{method.title}</h3>
                <p className="text-xs text-slate-200 font-semibold mt-0.5">{method.desc}</p>
              </div>

              <div className="pt-2 border-t border-slate-700 space-y-1">
                <p className="text-sm font-black text-cyan-300 font-mono dir-ltr text-right">{method.val}</p>
                <p className="text-xs text-slate-200 font-medium">{method.subVal}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Navigation Tabs: Submit Ticket / History / Office & Channels */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[#0f172a] border border-slate-700 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('create')}
          className={`flex-1 min-w-[160px] py-3 px-4 rounded-xl font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'create'
              ? 'bg-cyan-500 text-slate-950 shadow-md'
              : 'text-slate-200 hover:text-white hover:bg-[#1e293b]'
          }`}
        >
          <PlusCircle size={18} />
          <span>ثبت تیکت پشتیبانی جدید</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex-1 min-w-[160px] py-3 px-4 rounded-xl font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer relative ${
            activeTab === 'history'
              ? 'bg-cyan-500 text-slate-950 shadow-md'
              : 'text-slate-200 hover:text-white hover:bg-[#1e293b]'
          }`}
        >
          <ListOrdered size={18} />
          <span>پیگیری تیکت‌های ارسالی</span>
          {userTickets.length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
              activeTab === 'history' ? 'bg-slate-950 text-cyan-300' : 'bg-cyan-950 text-cyan-300 border border-cyan-500'
            }`}>
              {formatToPersianDigits(userTickets.length)}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('channels')}
          className={`flex-1 min-w-[160px] py-3 px-4 rounded-xl font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'channels'
              ? 'bg-cyan-500 text-slate-950 shadow-md'
              : 'text-slate-200 hover:text-white hover:bg-[#1e293b]'
          }`}
        >
          <Building2 size={18} />
          <span>نشانی، کانال‌ها و پیام‌رسان‌ها</span>
        </button>
      </div>

      {/* 4. Tab 1: Submit Ticket Form - 100% Solid Opaque */}
      {activeTab === 'create' && (
        <div className="bg-[#0f172a] border border-slate-700 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-700 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-cyan-950 border border-cyan-500 text-cyan-300">
                <MessageSquare size={22} />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white">فرم ثبت رسمی تیکت پشتیبانی</h2>
                <p className="text-sm font-bold text-slate-200 mt-0.5">درخواست شما به طور مستقیم در پایگاه داده ذخیره شده و توسط ستاد بررسی می‌گردد</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-950 border border-emerald-500 px-3 py-1.5 rounded-xl">
              <Sparkles size={14} />
              <span>پاسخگویی سریع</span>
            </div>
          </div>

          {submittedTicket ? (
            <div className="p-6 sm:p-8 rounded-2xl bg-[#0f2e1f] border border-emerald-500 text-emerald-100 text-center space-y-5 my-2 shadow-xl">
              <CheckCircle2 size={52} className="mx-auto text-emerald-400" />
              <div className="space-y-1.5">
                <h3 className="text-xl font-black text-white">تیکت شما با موفقیت در سامانه ثبت شد</h3>
                <p className="text-sm text-emerald-200 font-bold">
                  کارشناسان پشتیبانی ستاد مرکزی تیکت شما را بررسی نموده و پاسخ لازم را ارسال خواهند کرد.
                </p>
              </div>

              <div className="bg-[#0f172a] border border-emerald-500/80 rounded-2xl p-5 text-right space-y-3 text-sm text-slate-100 font-semibold max-w-lg mx-auto">
                <div className="flex justify-between items-center border-b border-slate-700 pb-2.5">
                  <span className="text-slate-200 font-bold">شناسه پیگیری تیکت:</span>
                  <span className="font-mono text-emerald-300 font-black text-base">{submittedTicket.id}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-700 pb-2.5">
                  <span className="text-slate-200 font-bold">نام فرستنده:</span>
                  <span className="text-white font-bold">{submittedTicket.user_name}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-700 pb-2.5">
                  <span className="text-slate-200 font-bold">موضوع درخواست:</span>
                  <span className="text-white font-bold">{submittedTicket.subject}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-200 font-bold">زمان ثبت تیکت:</span>
                  <span className="text-cyan-300 font-mono font-bold">{submittedTicket.created_at}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-6 py-3 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-white border border-slate-600 font-bold text-xs sm:text-sm transition cursor-pointer"
                >
                  ارسال تیکت دیگر
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs sm:text-sm transition shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <ListOrdered size={16} />
                  <span>مشاهده تیکت‌های من</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-white mb-2 flex items-center gap-1.5">
                    <UserIcon size={16} className="text-cyan-400" />
                    <span>نام و نام خانوادگی فرستنده *</span>
                  </label>
                  <input 
                    type="text" 
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="مثال: علی رضایی"
                    className="w-full bg-[#1e293b] border-2 border-slate-600 focus:border-cyan-400 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-400 font-bold outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-white mb-2 flex items-center gap-1.5">
                    <Phone size={16} className="text-amber-400" />
                    <span>شماره تماس یا ایمیل معتبر جهت پاسخگویی *</span>
                  </label>
                  <input 
                    type="text" 
                    required
                    value={contactInfo}
                    onChange={(e) => setContactInfo(e.target.value)}
                    placeholder="۰۹۱۲۳۴۵۶۷۸۹ یا info@example.com"
                    className="w-full bg-[#1e293b] border-2 border-slate-600 focus:border-cyan-400 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-400 font-bold outline-none transition dir-ltr text-right"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-white mb-2 flex items-center gap-1.5">
                    <Tag size={16} className="text-emerald-400" />
                    <span>موضوع یا عنوان تیکت *</span>
                  </label>
                  <input 
                    type="text" 
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="مثال: سوال در خصوص داوری مرحله سوم بازی"
                    className="w-full bg-[#1e293b] border-2 border-slate-600 focus:border-cyan-400 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-400 font-bold outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-white mb-2 flex items-center gap-1.5">
                    <ShieldCheck size={16} className="text-purple-400" />
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
                <label className="block text-sm font-bold text-white mb-2">
                  اولویت رسیدگی:
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPriority('normal')}
                    className={`flex-1 py-2.5 rounded-xl border text-xs sm:text-sm font-bold transition ${
                      priority === 'normal'
                        ? 'bg-slate-800 border-cyan-400 text-white shadow-sm'
                        : 'bg-[#1e293b] border-slate-700 text-slate-300'
                    }`}
                  >
                    عادی
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriority('important')}
                    className={`flex-1 py-2.5 rounded-xl border text-xs sm:text-sm font-bold transition ${
                      priority === 'important'
                        ? 'bg-amber-950 border-amber-400 text-amber-200 shadow-sm'
                        : 'bg-[#1e293b] border-slate-700 text-slate-300'
                    }`}
                  >
                    مهم
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriority('urgent')}
                    className={`flex-1 py-2.5 rounded-xl border text-xs sm:text-sm font-bold transition ${
                      priority === 'urgent'
                        ? 'bg-rose-950 border-rose-400 text-rose-200 shadow-sm'
                        : 'bg-[#1e293b] border-slate-700 text-slate-300'
                    }`}
                  >
                    فوری
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-white mb-2 flex items-center gap-1.5">
                  <MessageSquare size={16} className="text-cyan-400" />
                  <span>متن و شرح کامل پیام یا مشکل *</span>
                </label>
                <textarea 
                  rows={6}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="لطفاً شرح کامل سوال، ایراد فنی، درخواست یا اعتراض خود را با جزئیات دقیق بنویسید..."
                  className="w-full bg-[#1e293b] border-2 border-slate-600 focus:border-cyan-400 rounded-xl p-4 text-sm text-white placeholder-slate-400 font-semibold outline-none transition resize-none leading-relaxed"
                />
              </div>

              <div className="p-4 rounded-xl bg-[#1e293b] border border-amber-500/60 text-sm text-amber-200 flex items-center gap-3">
                <AlertCircle size={20} className="text-amber-400 shrink-0" />
                <span className="font-bold leading-relaxed">
                  تیکت شما بلافاصله در پایگاه داده ابری ثبت شده و توسط مدیران و داوران ستاد پیگیری و پاسخ داده خواهد شد.
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
                <span>{isSubmitting ? 'در حال ثبت در پایگاه داده...' : 'ثبت و ارسال رسمی تیکت به ستاد پشتیبانی'}</span>
              </button>
            </form>
          )}
        </div>
      )}

      {/* 5. Tab 2: Ticket History & Status Tracking - 100% Solid Cards */}
      {activeTab === 'history' && (
        <div className="bg-[#0f172a] border border-slate-700 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700 pb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white">پیگیری و وضعیت تیکت‌های پشتیبانی</h2>
              <p className="text-sm font-bold text-slate-200 mt-0.5">مشاهده پاسخ‌های ستاد مرکزی و وضعیت روند رسیدگی به تیکت‌ها</p>
            </div>

            <div className="relative min-w-[240px]">
              <Search size={16} className="absolute right-3.5 top-3.5 text-slate-400" />
              <input 
                type="text"
                value={ticketSearch}
                onChange={(e) => setTicketSearch(e.target.value)}
                placeholder="جستجو در تیکت‌ها..."
                className="w-full bg-[#1e293b] border border-slate-600 focus:border-cyan-400 rounded-xl pr-10 pl-3 py-2.5 text-xs sm:text-sm text-white font-bold placeholder-slate-400 outline-none"
              />
            </div>
          </div>

          {filteredTickets.length > 0 ? (
            <div className="space-y-4">
              {filteredTickets.map((tick) => (
                <div 
                  key={tick.id}
                  className="bg-[#1e293b] border border-slate-700 rounded-2xl p-5 sm:p-6 space-y-4 shadow-md hover:border-slate-600 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700 pb-3.5">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-black text-cyan-300 bg-[#0f172a] px-3 py-1 rounded-lg border border-slate-700">
                        {tick.id}
                      </span>
                      <h3 className="text-base font-black text-white">{tick.subject}</h3>
                    </div>
                    <div>{getStatusBadge(tick.status)}</div>
                  </div>

                  <p className="text-sm text-slate-100 font-semibold leading-relaxed">
                    {tick.message}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs font-bold text-slate-300">
                    <div className="flex items-center gap-4">
                      <span>دپارتمان: <strong className="text-white">{getCategoryTitle(tick.type)}</strong></span>
                      <span>فرستنده: <strong className="text-white">{tick.user_name}</strong></span>
                    </div>
                    <span className="text-slate-400 font-mono">{tick.created_at}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl bg-[#1e293b] border border-slate-700 space-y-3">
              <MessageSquare size={36} className="mx-auto text-slate-400" />
              <p className="text-base font-bold text-white">تیکتی در این بخش یافت نشد.</p>
              <p className="text-sm text-slate-200">
                در صورت نیاز به راهنمایی یا ثبت سوال جدید، می‌توانید از طریق تب «ثبت تیکت پشتیبانی جدید» اقدام فرمایید.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('create')}
                className="mt-3 px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs sm:text-sm transition cursor-pointer"
              >
                ثبت اولین تیکت
              </button>
            </div>
          )}
        </div>
      )}

      {/* 6. Tab 3: Office Address, Map & Social Channels - 100% Solid Cards */}
      {activeTab === 'channels' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Office Address & Location Card */}
          <div className="bg-[#0f172a] border border-slate-700 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
            <div className="flex items-center gap-3.5 border-b border-slate-700 pb-4">
              <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500 text-amber-300">
                <Building2 size={24} />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">نشانی ستاد مرکزی و دبیرخانه</h2>
                <p className="text-sm font-bold text-slate-200">مرکز فرماندهی، ارزیابی و مسابقات اتاق جنگ</p>
              </div>
            </div>

            <div className="space-y-3 text-sm text-slate-100 font-semibold leading-relaxed">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-[#1e293b] border border-slate-700">
                <MapPin size={20} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block text-sm mb-1">آدرس پستی:</strong>
                  <span>تهران، خیابان انقلاب اسلامی، میدان فردوسی، خیابان سپهبد قرنی، پلاک ۱۲۴، ساختمان مرکزی رویداد اتاق جنگ</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#1e293b] border border-slate-700 flex justify-between items-center">
                <span className="text-slate-200 font-bold">کد پستی ده رقمی:</span>
                <span className="font-mono text-cyan-300 font-bold text-sm">۱۴۱۵۵ - ۷۸۹۳۴</span>
              </div>
            </div>

            {/* Map visual card */}
            <div className="rounded-2xl overflow-hidden border border-slate-700 bg-[#1e293b] p-5 text-center space-y-2">
              <MapPin size={32} className="mx-auto text-cyan-400" />
              <p className="text-sm font-bold text-white">موقعیت مکانی ستاد روی نقشه</p>
              <p className="text-xs text-slate-300">دسترسی آسان از طریق ایستگاه مترو فردوسی و خطوط بی‌آرتی انقلاب</p>
            </div>
          </div>

          {/* Social Messengers Card */}
          <div className="bg-[#0f172a] border border-slate-700 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
            <div className="flex items-center gap-3.5 border-b border-slate-700 pb-4">
              <div className="p-3 rounded-xl bg-cyan-500/20 border border-cyan-500 text-cyan-300">
                <MessageCircle size={24} />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">کانال‌های رسمی در پیام‌رسان‌ها</h2>
                <p className="text-sm font-bold text-slate-200">اطلاع‌رسانی آخرین اطلاعیه‌ها، نتایج داوری و آموزش‌ها</p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { name: 'کانال رسمی در ایتا', handle: '@WarRoom_ir', link: 'https://eitaa.com/WarRoom_ir', badge: 'ایتا' },
                { name: 'کانال رسمی در روبیکا', handle: '@WarRoom_official', link: 'https://rubika.ir/WarRoom_official', badge: 'روبیکا' },
                { name: 'کانال و بازوی رسمی در بله', handle: '@WarRoom_bot', link: 'https://ble.ir/WarRoom_bot', badge: 'بله' },
                { name: 'کانال رسمی در شاد', handle: '@WarRoom_shad', link: 'https://shad.ir/WarRoom_shad', badge: 'شاد' },
              ].map((channel, i) => (
                <div 
                  key={i}
                  className="flex items-center justify-between p-4 rounded-xl bg-[#1e293b] border border-slate-700 hover:border-slate-600 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-lg bg-cyan-950 border border-cyan-500 text-cyan-300 text-xs font-bold font-mono">
                      {channel.badge}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-white">{channel.name}</h4>
                      <p className="text-xs text-cyan-300 font-mono dir-ltr text-right">{channel.handle}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => copyToClipboard(channel.handle, `chan-${i}`)}
                    className="p-2 rounded-lg bg-[#0f172a] hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    {copiedKey === `chan-${i}` ? (
                      <Check size={14} className="text-emerald-400" />
                    ) : (
                      <Copy size={14} />
                    )}
                    <span>کپی</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
