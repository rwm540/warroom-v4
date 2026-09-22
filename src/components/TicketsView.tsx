import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Headphones, 
  Plus, 
  Send, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  MessageSquare, 
  ShieldAlert, 
  Tag, 
  User as UserIcon, 
  Sparkles, 
  CheckCircle, 
  HelpCircle, 
  Filter, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  ArrowLeft,
  XCircle,
  RefreshCw,
  FileQuestion,
  ShieldCheck,
  AlertTriangle,
  Info,
  Check
} from 'lucide-react';
import { User, SupportTicket, SupportReply, TicketType, TicketStatus, TicketPriority } from '../types';
import { formatToPersianDigits } from '../utils/jalali';

interface TicketsViewProps {
  currentUser: User;
  tickets: SupportTicket[];
  setTickets: React.Dispatch<React.SetStateAction<SupportTicket[]>>;
  replies: SupportReply[];
  setReplies: React.Dispatch<React.SetStateAction<SupportReply[]>>;
  triggerAlert?: (msg: string) => void;
  onNavigate?: (tab: string) => void;
  isEmbedded?: boolean;
}

export default function TicketsView({
  currentUser,
  tickets = [],
  setTickets,
  replies = [],
  setReplies,
  triggerAlert,
  onNavigate,
  isEmbedded = false
}: TicketsViewProps) {
  // Filter tickets of current user
  const userTickets = tickets.filter(t => t.user_id === currentUser.id);

  // States
  const [selectedTicketId, setSelectedTicketId] = useState<string>(userTickets[0]?.id || '');
  const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showNewModal, setShowNewModal] = useState<boolean>(false);

  React.useEffect(() => {
    if (showNewModal) {
      window.dispatchEvent(new CustomEvent('warroom_modal_active_change', { detail: { active: true } }));
      return () => {
        window.dispatchEvent(new CustomEvent('warroom_modal_active_change', { detail: { active: false } }));
      };
    }
  }, [showNewModal]);
  
  // New ticket form
  const [newSubject, setNewSubject] = useState<string>('');
  const [newType, setNewType] = useState<TicketType>('technical');
  const [newPriority, setNewPriority] = useState<TicketPriority>('normal');
  const [newMessage, setNewMessage] = useState<string>('');
  const [newAttachment, setNewAttachment] = useState<string>('');

  // Reply form
  const [replyText, setReplyText] = useState<string>('');
  const [isSubmittingReply, setIsSubmittingReply] = useState<boolean>(false);

  // Filtered tickets
  const filteredTickets = userTickets.filter(t => {
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesSearch = !searchQuery.trim() || 
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const selectedTicket = userTickets.find(t => t.id === selectedTicketId) || filteredTickets[0] || userTickets[0];
  const currentReplies = replies.filter(r => r.ticket_id === selectedTicket?.id);

  // Statistics
  const openCount = userTickets.filter(t => t.status === 'open').length;
  const inProgressCount = userTickets.filter(t => t.status === 'in_progress').length;
  const answeredCount = userTickets.filter(t => t.status === 'answered').length;
  const closedCount = userTickets.filter(t => t.status === 'closed').length;

  const getCategoryLabel = (type: TicketType) => {
    switch (type) {
      case 'technical':
        return 'پشتیبانی فنی و سامانه';
      case 'content':
        return 'آموزه‌ها و محتوا';
      case 'judge':
        return 'داوری و امتیاز مأموریت';
      case 'other':
      default:
        return 'عمومی / تغییر اطلاعات';
    }
  };

  const getCategoryBadgeClass = (type: TicketType) => {
    switch (type) {
      case 'technical':
        return 'bg-cyan-950/70 text-cyan-300 border-cyan-500/40';
      case 'judge':
        return 'bg-amber-950/70 text-amber-300 border-amber-500/40';
      case 'content':
        return 'bg-purple-950/70 text-purple-300 border-purple-500/40';
      case 'other':
      default:
        return 'bg-slate-900 text-slate-300 border-slate-700';
    }
  };

  const getPriorityBadge = (priority?: TicketPriority) => {
    switch (priority) {
      case 'urgent':
        return <span className="bg-rose-950/80 text-rose-300 border border-rose-500/50 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><AlertTriangle size={10} /> فوری</span>;
      case 'important':
        return <span className="bg-amber-950/80 text-amber-300 border border-amber-500/50 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><Sparkles size={10} /> مهم</span>;
      case 'normal':
      default:
        return <span className="bg-slate-900 text-slate-400 border border-slate-700 text-[10px] font-medium px-2 py-0.5 rounded-full">عادی</span>;
    }
  };

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'open':
        return (
          <span className="bg-amber-950/80 text-amber-300 border border-amber-500/60 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 shadow-[0_0_10px_rgba(245,158,11,0.3)]">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            <span>در انتظار بررسی ستاد</span>
          </span>
        );
      case 'in_progress':
        return (
          <span className="bg-blue-950/80 text-blue-300 border border-blue-500/60 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 shadow-[0_0_10px_rgba(59,130,246,0.3)]">
            <RefreshCw size={11} className="animate-spin text-blue-400" />
            <span>در حال بررسی توسط مدیر</span>
          </span>
        );
      case 'answered':
        return (
          <span className="bg-emerald-950/90 text-emerald-300 border border-emerald-400/80 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 shadow-[0_0_15px_rgba(16,185,129,0.4)] animate-pulse">
            <CheckCircle size={12} className="text-emerald-400" />
            <span>پاسخ داده شده ✓</span>
          </span>
        );
      case 'closed':
        return (
          <span className="bg-slate-900/90 text-slate-400 border border-slate-800 text-[10px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1">
            <Check size={11} />
            <span>بسته شده / حل شد</span>
          </span>
        );
    }
  };

  const getStatusStepIndex = (status: TicketStatus) => {
    switch (status) {
      case 'open': return 1;
      case 'in_progress': return 2;
      case 'answered': return 3;
      case 'closed': return 4;
      default: return 1;
    }
  };

  // Submit new ticket
  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newMessage.trim()) return;

    const timeStr = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    const dateStr = '۱۴۰۳/۰۴/۱۸ - ' + timeStr;

    const newTicket: SupportTicket = {
      id: `tick-${Date.now().toString().slice(-6)}`,
      user_id: currentUser.id,
      user_name: `${currentUser.first_name} ${currentUser.last_name}`,
      personal_code: currentUser.personal_code,
      subject: newSubject.trim(),
      message: newMessage.trim(),
      type: newType,
      priority: newPriority,
      status: 'open',
      attachment_url: newAttachment.trim() || undefined,
      created_at: dateStr,
      updated_at: dateStr
    };

    setTickets(prev => [newTicket, ...prev]);
    setSelectedTicketId(newTicket.id);
    setNewSubject('');
    setNewMessage('');
    setNewAttachment('');
    setShowNewModal(false);

    if (triggerAlert) {
      triggerAlert(`تیکت شماره ${formatToPersianDigits(newTicket.id)} با موفقیت برای مدیر ستاد ارسال شد و در نوبت بررسی قرار گرفت.`);
    }
  };

  // Send reply
  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;

    setIsSubmittingReply(true);
    const timeStr = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    const dateStr = '۱۴۰۳/۰۴/۱۸ - ' + timeStr;

    const newReply: SupportReply = {
      id: `rep-${Date.now().toString().slice(-6)}`,
      ticket_id: selectedTicket.id,
      user_id: currentUser.id,
      user_name: `${currentUser.first_name} ${currentUser.last_name}`,
      message: replyText.trim(),
      is_admin: false,
      created_at: dateStr
    };

    setReplies(prev => [...prev, newReply]);

    // Update ticket status back to 'open' (user replied) and update time
    setTickets(prev => prev.map(t => 
      t.id === selectedTicket.id 
        ? { ...t, status: 'open', updated_at: dateStr } 
        : t
    ));

    setReplyText('');
    setIsSubmittingReply(false);

    if (triggerAlert) {
      triggerAlert('پاسخ شما به پیام مدیر ارسال شد و وضعیت تیکت به در انتظار بررسی بروزرسانی گردید.');
    }
  };

  // Close ticket by user
  const handleCloseTicket = (ticketId: string) => {
    const timeStr = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    const dateStr = '۱۴۰۳/۰۴/۱۸ - ' + timeStr;

    setTickets(prev => prev.map(t => 
      t.id === ticketId ? { ...t, status: 'closed', updated_at: dateStr } : t
    ));

    if (triggerAlert) {
      triggerAlert('تیکت با موفقیت بسته شد و به عنوان مشکل حل‌شده ثبت گردید.');
    }
  };

  return (
    <div className="space-y-4 dir-rtl text-right">
      
      {/* 1. Header Bar with Statistics & Create Button - 100% Solid Opaque */}
      <div className="bg-[#0f172a] p-4 sm:p-5 rounded-2xl border border-slate-700 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-cyan-400">
              <Headphones size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-white">سامانه تیکت و پیام مستقیم به مدیر ستاد</h3>
                <span className="bg-emerald-950 text-emerald-300 border border-emerald-500/50 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                  پاسخگویی ریل‌تایم
                </span>
              </div>
              <p className="text-xs text-slate-200 font-semibold mt-0.5">
                ارسال مشکلات فنی، سوالات داوری مأموریت‌ها، درخواست‌های جوخه و پیگیری وضعیت تا دریافت پاسخ نهایی
              </p>
            </div>
          </div>

          {/* New Ticket Button */}
          <button
            onClick={() => setShowNewModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs shadow-[0_0_20px_rgba(6,182,212,0.4)] transition flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <Plus size={16} />
            <span>ثبت تیکت / ارسال مشکل جدید</span>
          </button>
        </div>

        {/* Real-time Status Metric Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div 
            onClick={() => setStatusFilter('all')}
            className={`p-3 rounded-xl border text-center cursor-pointer transition ${
              statusFilter === 'all' 
                ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.2)]' 
                : 'bg-[#050818] border-slate-800/80 hover:border-slate-700'
            }`}
          >
            <span className="text-[10px] text-slate-400 block font-bold">کل تیکت‌های شما</span>
            <span className="text-base font-black text-white font-mono mt-0.5 block">{formatToPersianDigits(userTickets.length)}</span>
          </div>

          <div 
            onClick={() => setStatusFilter('open')}
            className={`p-3 rounded-xl border text-center cursor-pointer transition ${
              statusFilter === 'open' 
                ? 'bg-amber-950/40 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.2)]' 
                : 'bg-[#050818] border-slate-800/80 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              <span className="text-[10px] text-amber-300 font-bold">در انتظار بررسی</span>
            </div>
            <span className="text-base font-black text-amber-400 font-mono mt-0.5 block">{formatToPersianDigits(openCount)}</span>
          </div>

          <div 
            onClick={() => setStatusFilter('in_progress')}
            className={`p-3 rounded-xl border text-center cursor-pointer transition ${
              statusFilter === 'in_progress' 
                ? 'bg-blue-950/40 border-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.2)]' 
                : 'bg-[#050818] border-slate-800/80 hover:border-slate-700'
            }`}
          >
            <span className="text-[10px] text-blue-300 block font-bold">در حال بررسی مدیر</span>
            <span className="text-base font-black text-blue-400 font-mono mt-0.5 block">{formatToPersianDigits(inProgressCount)}</span>
          </div>

          <div 
            onClick={() => setStatusFilter('answered')}
            className={`p-3 rounded-xl border text-center cursor-pointer transition ${
              statusFilter === 'answered' 
                ? 'bg-emerald-950/40 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]' 
                : 'bg-[#050818] border-slate-800/80 hover:border-slate-700'
            }`}
          >
            <span className="text-[10px] text-emerald-300 block font-bold">پاسخ داده شده (جدید)</span>
            <span className="text-base font-black text-emerald-400 font-mono mt-0.5 block">{formatToPersianDigits(answeredCount)}</span>
          </div>
        </div>
      </div>

      {/* 2. Main Ticket Split View (Tickets List & Detailed Interactive Chat) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Left Column: Tickets List */}
        <div className="lg:col-span-5 space-y-3">
          
          {/* Search & Filter Bar */}
          <div className="bg-[#05091a] p-2.5 rounded-2xl border border-slate-800 space-y-2">
            <div className="relative">
              <Search size={14} className="absolute right-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو در موضوع یا متن تیکت‌ها..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-8 pl-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            {/* Quick Status Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-1 text-[11px] font-bold">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg shrink-0 transition ${
                  statusFilter === 'all' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white bg-slate-900'
                }`}
              >
                همه ({formatToPersianDigits(userTickets.length)})
              </button>
              <button
                onClick={() => setStatusFilter('open')}
                className={`px-2.5 py-1 rounded-lg shrink-0 transition ${
                  statusFilter === 'open' ? 'bg-amber-500 text-slate-950 font-black' : 'text-amber-300/70 hover:text-amber-300 bg-slate-900'
                }`}
              >
                در انتظار ({formatToPersianDigits(openCount)})
              </button>
              <button
                onClick={() => setStatusFilter('in_progress')}
                className={`px-2.5 py-1 rounded-lg shrink-0 transition ${
                  statusFilter === 'in_progress' ? 'bg-blue-500 text-slate-950 font-black' : 'text-blue-300/70 hover:text-blue-300 bg-slate-900'
                }`}
              >
                در بررسی ({formatToPersianDigits(inProgressCount)})
              </button>
              <button
                onClick={() => setStatusFilter('answered')}
                className={`px-2.5 py-1 rounded-lg shrink-0 transition ${
                  statusFilter === 'answered' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-emerald-300/70 hover:text-emerald-300 bg-slate-900'
                }`}
              >
                پاسخ داده شده ({formatToPersianDigits(answeredCount)})
              </button>
            </div>
          </div>

          {/* Tickets Cards List */}
          <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
            {filteredTickets.map(ticket => {
              const isSelected = ticket.id === selectedTicket?.id;
              const hasAdminReplies = replies.some(r => r.ticket_id === ticket.id && r.is_admin);

              return (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className={`p-3.5 rounded-2xl border text-right cursor-pointer transition relative group ${
                    isSelected 
                      ? 'bg-gradient-to-r from-[#0c1838] to-[#070e24] border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)]' 
                      : 'bg-[#060a1c] border-slate-800/80 hover:border-slate-700 hover:bg-[#080d24]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono text-[10px] text-slate-500 font-bold shrink-0">#{ticket.id}</span>
                      <h4 className="text-xs font-black text-white truncate">{ticket.subject}</h4>
                    </div>
                    {getStatusBadge(ticket.status)}
                  </div>

                  <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed mb-2.5">
                    {ticket.message}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/60 pt-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-md border font-bold ${getCategoryBadgeClass(ticket.type)}`}>
                        {getCategoryLabel(ticket.type)}
                      </span>
                      {getPriorityBadge(ticket.priority)}
                    </div>
                    <span className="font-mono text-[10px] text-slate-400">{ticket.created_at}</span>
                  </div>

                  {ticket.status === 'answered' && (
                    <div className="mt-2 pt-1.5 border-t border-emerald-900/50 flex items-center justify-between text-[10px] text-emerald-300 font-bold">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 size={12} className="text-emerald-400" />
                        <span>پاسخ مدیر ارسال شده است</span>
                      </span>
                      <span className="text-emerald-400 underline">مشاهده پیام</span>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredTickets.length === 0 && (
              <div className="p-8 text-center bg-[#060a1c] rounded-2xl border border-dashed border-slate-800 space-y-3">
                <FileQuestion size={32} className="mx-auto text-slate-600" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-300">هیچ تیکتی با این فیلتر یافت نشد</p>
                  <p className="text-[11px] text-slate-500">برای ارسال مشکل به مدیر کلیک کنید.</p>
                </div>
                <button
                  onClick={() => setShowNewModal(true)}
                  className="px-3.5 py-1.5 bg-cyan-950 border border-cyan-500/40 text-cyan-300 rounded-xl text-xs font-bold hover:bg-cyan-900 transition"
                >
                  ثبت تیکت جدید
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Active Ticket Conversation & Timeline Tracker */}
        <div className="lg:col-span-7 bg-[#060a1c] border border-cyan-500/20 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl flex flex-col justify-between min-h-[500px]">
          {selectedTicket ? (
            <div className="space-y-4 flex-1 flex flex-col justify-between">
              
              <div className="space-y-4">
                {/* Header of Active Ticket */}
                <div className="border-b border-slate-800 pb-3 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-black text-cyan-400">#{selectedTicket.id}</span>
                        <h3 className="text-sm font-black text-white">{selectedTicket.subject}</h3>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                        <span>دسته‌بندی: <strong className="text-slate-200">{getCategoryLabel(selectedTicket.type)}</strong></span>
                        <span>•</span>
                        <span>تاریخ ثبت: <strong className="text-slate-300 font-mono">{selectedTicket.created_at}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {getStatusBadge(selectedTicket.status)}
                      {selectedTicket.status !== 'closed' && (
                        <button
                          onClick={() => handleCloseTicket(selectedTicket.id)}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 text-[10px] font-bold rounded-lg transition"
                          title="اعلام حل مشکل و بستن تیکت"
                        >
                          بستن تیکت
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 4-Step Visual Progress Tracker */}
                  <div className="bg-[#030612] p-3 rounded-xl border border-slate-800/80 mt-2">
                    <div className="flex items-center justify-between text-[10px] font-bold mb-2">
                      <span className="text-slate-400">مراحل پیگیری و پاسخ‌دهی ستاد:</span>
                      <span className="text-cyan-400">
                        {selectedTicket.status === 'open' ? 'گام ۱: دریافت در صف بررسی' :
                         selectedTicket.status === 'in_progress' ? 'گام ۲: در حال بررسی کارشناسی' :
                         selectedTicket.status === 'answered' ? 'گام ۳: پاسخ داده شده' : 'گام ۴: فرآیند تکمیل و بسته شد'}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-1 relative">
                      {/* Step 1: Registered */}
                      <div className={`p-2 rounded-lg text-center border ${
                        getStatusStepIndex(selectedTicket.status) >= 1
                          ? 'bg-cyan-950/80 border-cyan-500/60 text-cyan-300 font-black'
                          : 'bg-slate-900 text-slate-500 border-slate-800'
                      }`}>
                        <div className="text-[10px]">۱. ثبت اولیه</div>
                        <span className="text-[8px] text-slate-400">ارسال شد</span>
                      </div>

                      {/* Step 2: Under Review */}
                      <div className={`p-2 rounded-lg text-center border ${
                        getStatusStepIndex(selectedTicket.status) >= 2
                          ? 'bg-blue-950/80 border-blue-500/60 text-blue-300 font-black'
                          : 'bg-slate-900 text-slate-500 border-slate-800'
                      }`}>
                        <div className="text-[10px]">۲. بررسی مدیر</div>
                        <span className="text-[8px] text-slate-400">
                          {selectedTicket.status === 'in_progress' ? 'در جریان' : 'تکمیل'}
                        </span>
                      </div>

                      {/* Step 3: Answered */}
                      <div className={`p-2 rounded-lg text-center border ${
                        getStatusStepIndex(selectedTicket.status) >= 3
                          ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 font-black shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                          : 'bg-slate-900 text-slate-500 border-slate-800'
                      }`}>
                        <div className="text-[10px]">۳. پاسخ ستاد</div>
                        <span className="text-[8px] text-slate-400">
                          {selectedTicket.status === 'answered' ? 'پاسخ داده شد' : 'در انتظار'}
                        </span>
                      </div>

                      {/* Step 4: Resolved */}
                      <div className={`p-2 rounded-lg text-center border ${
                        selectedTicket.status === 'closed'
                          ? 'bg-slate-800 border-slate-600 text-white font-black'
                          : 'bg-slate-900/50 text-slate-600 border-slate-800'
                      }`}>
                        <div className="text-[10px]">۴. پایان و بستن</div>
                        <span className="text-[8px] text-slate-500">حل مشکل</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Conversation Chat Stream */}
                <div className="space-y-3 max-h-[280px] overflow-y-auto p-2 bg-[#040716] rounded-xl border border-slate-800/80">
                  
                  {/* Original Initial User Message */}
                  <div className="p-3 rounded-2xl bg-[#0a122c] border border-cyan-500/30 text-right space-y-1.5 shadow-sm">
                    <div className="flex items-center justify-between text-[11px] text-cyan-300 font-bold border-b border-slate-800/60 pb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-6 h-6 rounded-full bg-cyan-900 text-cyan-300 flex items-center justify-center text-xs font-black">
                          {currentUser.first_name[0]}
                        </span>
                        <span>{selectedTicket.user_name} (پیام اولیه)</span>
                      </div>
                      <span className="text-slate-400 font-mono text-[10px]">{selectedTicket.created_at}</span>
                    </div>
                    <p className="text-xs text-slate-100 whitespace-pre-wrap leading-relaxed">
                      {selectedTicket.message}
                    </p>
                    {selectedTicket.attachment_url && (
                      <div className="pt-1">
                        <a 
                          href={selectedTicket.attachment_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-cyan-400 underline hover:text-cyan-300"
                        >
                          مشاهده فایل یا لینک ضمیمه‌شده
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Replies (Admin & User followup) */}
                  {currentReplies.map((rep) => (
                    <div
                      key={rep.id}
                      className={`p-3.5 rounded-2xl text-right space-y-1.5 transition ${
                        rep.is_admin 
                          ? 'bg-gradient-to-r from-amber-950/40 to-amber-900/20 border border-amber-500/60 mr-3 shadow-[0_0_15px_rgba(245,158,11,0.15)]' 
                          : 'bg-[#0a122c] border border-slate-700 ml-3'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold border-b border-slate-800/60 pb-1">
                        <div className="flex items-center gap-1.5">
                          {rep.is_admin ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[9px] font-black flex items-center gap-1">
                              <ShieldCheck size={11} />
                              پاسخ رسمی ستاد مدیریت
                            </span>
                          ) : (
                            <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-[10px]">
                              {rep.user_name[0]}
                            </span>
                          )}
                          <span className={rep.is_admin ? 'text-amber-300 font-black' : 'text-slate-300'}>
                            {rep.user_name}
                          </span>
                        </div>
                        <span className="text-slate-400 font-mono text-[10px]">{rep.created_at}</span>
                      </div>
                      <p className="text-xs text-slate-100 whitespace-pre-wrap leading-relaxed">
                        {rep.message}
                      </p>
                    </div>
                  ))}

                  {currentReplies.length === 0 && (
                    <div className="p-4 text-center text-xs text-slate-500">
                      تیکت شما در صف بررسی مدیر قرار دارد و به زودی پاسخ رسمی در این قسمت نمایش داده خواهد شد.
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Reply Box */}
              {selectedTicket.status !== 'closed' ? (
                <form onSubmit={handleSendReply} className="space-y-2 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold px-1">
                    <span>ارسال پاسخ تکمیلی به مدیر ستاد:</span>
                    <span className="text-[10px] text-cyan-400">پیام شما به صورت زنده ثبت می‌شود</span>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      required
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="پیام یا توضیحات تکمیلی خود را بنویسید..."
                      className="flex-1 bg-[#040716] border border-slate-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition placeholder-slate-500"
                    />
                    <button
                      type="submit"
                      disabled={isSubmittingReply || !replyText.trim()}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-slate-950 font-black text-xs transition shrink-0 flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-pointer"
                    >
                      <Send size={15} />
                      <span>ارسال پیام</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <CheckCircle size={14} className="text-emerald-400" />
                  <span>این تیکت به وضعیت بسته شده تغییر یافته است. برای موضوع جدید تیکت دیگری ثبت نمایید.</span>
                </div>
              )}

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
                <MessageSquare size={26} />
              </div>
              <h4 className="text-sm font-black text-white">تیکتی انتخاب نشده است</h4>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                لطفاً از ستون سمت راست یک تیکت را برای مشاهده جزئیات، وضعیت و گفتگو با مدیر انتخاب کنید، یا تیکت جدیدی ثبت نمایید.
              </p>
              <button
                onClick={() => setShowNewModal(true)}
                className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 transition"
              >
                + ثبت تیکت جدید
              </button>
            </div>
          )}
        </div>

      </div>

      {/* 3. Modal: New Ticket Submission Form */}
      <AnimatePresence>
        {showNewModal && (
          <div className="fixed inset-0 z-[100] bg-black/90 flex items-start justify-center p-3 pt-3 sm:pt-6 pb-28 dir-rtl overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="bg-[#070c22] border border-cyan-500/50 rounded-3xl p-4 sm:p-5 max-w-lg w-full shadow-[0_0_50px_rgba(6,182,212,0.35)] max-h-[82vh] flex flex-col relative"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-cyan-400">
                    <Plus size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">ثبت و ارسال تیکت مستقیم به مدیر</h3>
                    <p className="text-[10px] text-slate-400">پاسخ رسمی در همین بخش و پنل کاربری شما ثبت می‌شود</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowNewModal(false)}
                  className="p-1 rounded-lg bg-slate-900 text-slate-400 hover:text-white transition"
                >
                  <XCircle size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateTicket} className="flex flex-col flex-1 overflow-hidden mt-3">
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 pl-0.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">عنوان / موضوع مشکل *</label>
                    <input 
                      type="text" 
                      required
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      placeholder="مثال: عدم تایید ارسال مأموریت شماره ۳ یا مشکل در عضویت جوخه"
                      className="w-full bg-[#040716] border border-slate-700 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white outline-none transition"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">دسته‌بندی موضوع *</label>
                      <select
                        value={newType}
                        onChange={(e) => setNewType(e.target.value as TicketType)}
                        className="w-full bg-[#040716] border border-slate-700 focus:border-cyan-400 rounded-xl px-2.5 py-2 text-xs text-white outline-none transition"
                      >
                        <option value="technical">پشتیبانی فنی و سامانه</option>
                        <option value="judge">داوری و اعتراض به امتیاز</option>
                        <option value="content">محتوا، ویدیوها و آموزه‌ها</option>
                        <option value="other">تغییر اطلاعات جوخه / عمومی</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">اولویت رسیدگی *</label>
                      <select
                        value={newPriority}
                        onChange={(e) => setNewPriority(e.target.value as TicketPriority)}
                        className="w-full bg-[#040716] border border-slate-700 focus:border-cyan-400 rounded-xl px-2.5 py-2 text-xs text-white outline-none transition"
                      >
                        <option value="normal">عادی (پاسخ استاندارد)</option>
                        <option value="important">مهم (بررسی ویژه)</option>
                        <option value="urgent">فوری (خطای بحرانی یا داوری نهایی)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">شرح دقیق مشکل یا درخواست *</label>
                    <textarea 
                      rows={3}
                      required
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="لطفاً تمام جزئیات مربوط به مشکل، شماره مأموریت، نام عضو جوخه یا خطای مشاهده‌شده را با دقت بنویسید..."
                      className="w-full bg-[#040716] border border-slate-700 focus:border-cyan-400 rounded-xl p-2.5 text-xs text-white outline-none transition resize-none placeholder-slate-500 leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">لینک یا تصویر ضمیمه (اختیاری)</label>
                    <input 
                      type="text" 
                      value={newAttachment}
                      onChange={(e) => setNewAttachment(e.target.value)}
                      placeholder="https://... یا نشانی تصویر خطا"
                      className="w-full bg-[#040716] border border-slate-700 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white outline-none transition font-mono dir-ltr text-right"
                    />
                  </div>

                  <div className="bg-cyan-950/40 p-2.5 rounded-xl border border-cyan-500/20 text-[11px] text-cyan-300 flex items-start gap-2">
                    <Info size={16} className="shrink-0 mt-0.5 text-cyan-400" />
                    <p>تیکت شما بلافاصله در کارتابل داوران و مدیران ارشد قرار می‌گیرد و به محض پاسخ، در داشبورد شما اعلان داده می‌شود.</p>
                  </div>
                </div>

                {/* Sticky Always-Visible Footer Action Buttons */}
                <div className="pt-3 border-t border-slate-800/90 flex items-center justify-end gap-2.5 shrink-0 mt-2 bg-[#070c22]">
                  <button
                    type="button"
                    onClick={() => setShowNewModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white font-bold text-xs transition cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs shadow-[0_0_20px_rgba(6,182,212,0.4)] transition flex items-center gap-2 cursor-pointer"
                  >
                    <Send size={15} />
                    <span>ارسال نهایی تیکت به مدیر</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
