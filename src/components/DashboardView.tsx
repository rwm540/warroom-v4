import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Award, 
  Target, 
  Users, 
  Megaphone, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  BookOpen, 
  ChevronLeft,
  Copy,
  Check,
  Zap,
  Flame,
  Newspaper,
  Compass,
  Star,
  Sparkles,
  Lock,
  Flag,
  Heart,
  Shield,
  FileText,
  Video,
  Gift,
  Trophy,
  User as UserIcon,
  Search,
  Filter,
  Home,
  CheckCircle,
  Headphones,
  MessageSquare,
  ArrowRight,
  WalletCards,
  Gamepad2
} from 'lucide-react';
import { User, Group, Mission, MissionSubmission, Announcement, News, Medal, UserMedal, SupportTicket, SupportReply, JourneyStage } from '../types';
import { formatToPersianDigits } from '../utils/jalali';
import TicketsView from './TicketsView';

interface DashboardViewProps {
  currentUser: User;
  users: User[];
  groups: Group[];
  missions: Mission[];
  submissions: MissionSubmission[];
  announcements: Announcement[];
  news: News[];
  stages?: JourneyStage[];
  medals?: Medal[];
  userMedals?: UserMedal[];
  tickets?: SupportTicket[];
  setTickets?: React.Dispatch<React.SetStateAction<SupportTicket[]>>;
  replies?: SupportReply[];
  setReplies?: React.Dispatch<React.SetStateAction<SupportReply[]>>;
  triggerAlert?: (msg: string) => void;
  onNavigate: (tab: string) => void;
  onOpenSquadModal: () => void;
  initialCategory?: 'map_missions' | 'trainings' | 'rewards' | 'rankings' | 'tickets';
}

export default function DashboardView({
  currentUser,
  users,
  groups,
  missions,
  submissions,
  announcements,
  news,
  stages = [],
  medals = [],
  userMedals = [],
  tickets = [],
  setTickets,
  replies = [],
  setReplies,
  triggerAlert,
  onNavigate,
  onOpenSquadModal,
  initialCategory = 'map_missions'
}: DashboardViewProps) {
  const [copied, setCopied] = useState(false);
  const [dashboardCategory, setDashboardCategory] = useState<'map_missions' | 'trainings' | 'rewards' | 'rankings' | 'tickets'>(initialCategory);
  const [rankingMode, setRankingMode] = useState<'groups' | 'individuals'>('groups');
  const [searchRanking, setSearchRanking] = useState('');

  // Safety fallback
  if (!currentUser) {
    return (
      <div className="dir-rtl max-w-2xl mx-auto py-12 px-4 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-cyan-400 mx-auto shadow-[0_0_20px_rgba(6,182,212,0.3)]">
          <ShieldAlert size={32} className="animate-pulse" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-white">ورود به بخش اتاق جنگ</h2>
          <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
            برای مشاهده کامل داشبورد، نقشه مراحل و مأموریت‌ها لطفاً ابتدا وارد حساب کاربری خود شوید یا ثبت‌نام کنید.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => onNavigate('Home')}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-xs shadow-lg transition"
          >
            صفحه اصلی و ثبت‌نام
          </button>
        </div>
      </div>
    );
  }

  const isGirl = currentUser.gender === 'دختر';
  const rankTitle = currentUser.role === 'leader' ? 'فرمانده ارشد جوخه' : 'رزمنده جنگ استراتژیک';

  // Submissions calculation
  const userSubmissions = submissions.filter(s => s.user_id === currentUser.id);
  const totalScore = (currentUser.points || 0) + userSubmissions
    .filter(s => s.status === 'approved')
    .reduce((acc, curr) => acc + (curr.awarded_score || 0), 0);

  const approvedCount = userSubmissions.filter(s => s.status === 'approved').length;
  const activeMissions = missions.filter(m => m.is_active);
  const userGroup = groups.find(g => g.id === currentUser.group_id);
  const squadMembers = users.filter(u => u.group_id === currentUser.group_id);

  // Medals calculation (منحصراً بر اساس مدال‌های ثبت‌شده رزمنده در دیتابیس ابری Supabase)
  const earnedUserMedalsCount = userMedals.filter(um => um.user_id === currentUser.id || um.personal_code === currentUser.personal_code).length;

  // Tickets calculation
  const userTickets = tickets.filter(t => t.user_id === currentUser.id);
  const userOpenOrAnsweredTickets = userTickets.filter(t => t.status === 'open' || t.status === 'answered' || t.status === 'in_progress');
  const answeredTicketsCount = userTickets.filter(t => t.status === 'answered').length;

  const copyCode = () => {
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(currentUser.personal_code);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = currentUser.personal_code;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
    } catch (err) {
      console.warn('Clipboard copy error:', err);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Group Leaderboard data calculation
  const groupScores = groups.map(g => {
    const mems = users.filter(u => u.group_id === g.id);
    const memIds = mems.map(m => m.id);
    const gSubs = submissions.filter(s => memIds.includes(s.user_id) && s.status === 'approved');
    const score = gSubs.reduce((sum, s) => sum + (s.awarded_score || 0), 0) + (mems.length * 50);
    return {
      group: g,
      membersCount: mems.length,
      score,
      completedMissions: gSubs.length
    };
  }).sort((a, b) => b.score - a.score);

  // Individual Leaderboard data calculation
  const individualScores = users.map(u => {
    const uSubs = submissions.filter(s => s.user_id === u.id && s.status === 'approved');
    const score = uSubs.reduce((sum, s) => sum + (s.awarded_score || 0), 0);
    const g = groups.find(gr => gr.id === u.group_id);
    return {
      user: u,
      score,
      groupName: g?.name || 'انفرادی',
      completedMissions: uSubs.length
    };
  }).sort((a, b) => b.score - a.score);

  // Filtered Leaderboard
  const filteredGroups = groupScores.filter(g => {
    if (!g?.group) return false;
    const name = g.group.name || '';
    const province = g.group.province || '';
    const query = (searchRanking || '').trim().toLowerCase();
    return name.toLowerCase().includes(query) || province.toLowerCase().includes(query);
  });

  const filteredIndividuals = individualScores.filter(i => {
    if (!i?.user) return false;
    const firstName = i.user.first_name || '';
    const lastName = i.user.last_name || '';
    const gName = i.groupName || '';
    const query = (searchRanking || '').trim().toLowerCase();
    return firstName.toLowerCase().includes(query) || lastName.toLowerCase().includes(query) || gName.toLowerCase().includes(query);
  });

  // محاسبه پویای مراحل نقشه راه بر اساس دیتابیس Supabase و وضعیت رزمنده
  const userCompletedStageIds = Array.isArray(currentUser.completed_stages) ? currentUser.completed_stages : [];
  const stagesList = stages.map((st, idx) => {
    const isDone = userCompletedStageIds.includes(st.id);
    const prevDone = idx === 0 || userCompletedStageIds.includes(stages[idx - 1].id);
    const status = isDone ? 'completed' : ((prevDone || (currentUser.points || 0) >= st.requiredPoints) ? 'in_progress' : 'locked');
    return {
      id: st.id,
      title: st.title,
      subtitle: st.subtitle,
      status,
      icon: isDone ? CheckCircle : Flag,
      score: st.requiredPoints,
      customIconUrl: st.customIconUrl
    };
  });

  return (
    <div className={`space-y-4 md:space-y-5 dir-rtl pb-16 font-sans max-w-7xl mx-auto w-full px-2 sm:px-4 overflow-y-auto scroll-smooth ${isGirl ? 'girl-theme' : 'boy-theme'}`}>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
        <div>
          <h2 className="text-sm font-black text-white">مرکز عملیات کاربر</h2>
          <p className="mt-1 text-[10px] text-slate-500">دسترسی سریع به بازی‌ها، ارتباطات جوخه و امتیازها</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            type="button" 
            onClick={() => onNavigate('GamePortals')} 
            className="flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-950/40 px-3 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-900/60 transition shadow-sm cursor-pointer"
          >
            <Gamepad2 size={15} className="text-cyan-400 animate-pulse" />
            انتخاب بازی
          </button>
          <button type="button" onClick={() => onNavigate('Wallet')} className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-300"><WalletCards size={15} /> تراکنش‌ها و پرداختی‌ها</button>
        </div>
      </div>
      
      {/* 2. STANDARDIZED SQUARE METRIC CARDS (مربع‌های آماری استاندارد ۴ گانه در وب و اندروید) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Metric 1: Total XP / Score */}
        <div className="cyber-card-3d rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between aspect-square sm:aspect-auto sm:min-h-[135px] transition hover:scale-[1.02] relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center shrink-0 shadow-inner">
              <Zap size={20} className="fill-amber-400 text-amber-400" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/30 font-mono">
              سطح {formatToPersianDigits(currentUser.level || 1)}
            </span>
          </div>
          <div className="mt-2 space-y-0.5">
            <div className="text-base sm:text-xl font-black text-amber-400 font-mono tracking-tight flex items-baseline gap-1">
              <span>{formatToPersianDigits(totalScore.toLocaleString('fa-IR'))}</span>
              <span className="text-[10px] font-sans text-slate-400 font-normal">امتیاز</span>
            </div>
            <span className="text-[11px] sm:text-xs text-slate-300 font-bold block truncate">مجموع امتیاز کل رزمنده</span>
          </div>
        </div>

        {/* Metric 2: Missions Completed */}
        <div className="cyber-card-3d rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between aspect-square sm:aspect-auto sm:min-h-[135px] transition hover:scale-[1.02] relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
              isGirl
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
            }`}>
              <Target size={20} className={isGirl ? 'text-rose-400' : 'text-cyan-400'} />
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
              isGirl
                ? 'bg-rose-400/10 text-rose-300 border border-rose-400/30'
                : 'bg-cyan-400/10 text-cyan-300 border border-cyan-400/30'
            }`}>
              {formatToPersianDigits(activeMissions.length)} فعال
            </span>
          </div>
          <div className="mt-2 space-y-0.5">
            <div className={`text-base sm:text-xl font-black font-mono tracking-tight flex items-baseline gap-1 ${
              isGirl ? 'text-rose-300' : 'text-cyan-300'
            }`}>
              <span>{formatToPersianDigits(approvedCount)}</span>
              <span className="text-xs text-slate-400 font-normal">از {formatToPersianDigits(missions.length)}</span>
            </div>
            <span className="text-[11px] sm:text-xs text-slate-300 font-bold block truncate">مأموریت‌های انجام‌شده</span>
          </div>
        </div>

        {/* Metric 3: Medals & Badges */}
        <div className="cyber-card-3d rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between aspect-square sm:aspect-auto sm:min-h-[135px] transition hover:scale-[1.02] relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center justify-center shrink-0 shadow-inner">
              <Award size={20} />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-400/10 text-rose-300 border border-rose-400/30">
              افتخار
            </span>
          </div>
          <div className="mt-2 space-y-0.5">
            <div className="text-base sm:text-xl font-black text-rose-300 font-mono tracking-tight flex items-baseline gap-1">
              <span>{formatToPersianDigits(earnedUserMedalsCount)}</span>
              <span className="text-[10px] font-sans text-slate-400 font-normal">مدال</span>
            </div>
            <span className="text-[11px] sm:text-xs text-slate-300 font-bold block truncate">نشان‌ها و مدال‌ها</span>
          </div>
        </div>

        {/* Metric 4: Squad Status */}
        <div className="cyber-card-3d rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between aspect-square sm:aspect-auto sm:min-h-[135px] transition hover:scale-[1.02] relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center shrink-0 shadow-inner">
              <Users size={20} />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-300 border border-emerald-400/30">
              {userGroup ? 'فعال' : 'در انتظار'}
            </span>
          </div>
          <div className="mt-2 space-y-0.5">
            <div className="text-sm sm:text-base font-black text-emerald-300 truncate">
              {userGroup ? userGroup.name : 'بدون جوخه'}
            </div>
            <span className="text-[11px] sm:text-xs text-slate-300 font-bold block truncate">
              {userGroup ? `${formatToPersianDigits(squadMembers.length || 4)} همرزم در جوخه` : 'عضویت در جوخه'}
            </span>
          </div>
        </div>

      </div>

      {/* 3. Main Game Categories Bar with Gender Dynamic Theming */}
      <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 p-1.5 rounded-2xl border shadow-inner text-xs font-bold backdrop-blur-md ${
        isGirl ? 'bg-[#120617]/90 border-rose-500/30' : 'bg-[#05091a]/90 border-cyan-500/30'
      }`}>
        <button
          onClick={() => setDashboardCategory('map_missions')}
          className={`py-2.5 sm:py-3 px-2 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
            dashboardCategory === 'map_missions'
              ? isGirl
                ? 'bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-600 text-white font-black shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black shadow-[0_0_15px_rgba(6,182,212,0.4)]'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Compass size={16} />
          <span>نقشه مأموریت‌ها</span>
        </button>

        <button
          onClick={() => setDashboardCategory('trainings')}
          className={`py-2.5 sm:py-3 px-2 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
            dashboardCategory === 'trainings'
              ? isGirl
                ? 'bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-600 text-white font-black shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black shadow-[0_0_15px_rgba(6,182,212,0.4)]'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <BookOpen size={16} />
          <span>آموزش‌ها</span>
        </button>

        <button
          onClick={() => setDashboardCategory('rewards')}
          className={`py-2.5 sm:py-3 px-2 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
            dashboardCategory === 'rewards'
              ? isGirl
                ? 'bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-600 text-white font-black shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black shadow-[0_0_15px_rgba(6,182,212,0.4)]'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Gift size={16} />
          <span>جوایز و مدال‌ها</span>
        </button>

        <button
          onClick={() => setDashboardCategory('rankings')}
          className={`py-2.5 sm:py-3 px-2 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
            dashboardCategory === 'rankings'
              ? isGirl
                ? 'bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-600 text-white font-black shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black shadow-[0_0_15px_rgba(6,182,212,0.4)]'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Trophy size={16} />
          <span>رتبه‌بندی</span>
        </button>

        <button
          onClick={() => setDashboardCategory('tickets')}
          className={`col-span-2 sm:col-span-1 py-2.5 sm:py-3 px-2 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer relative ${
            dashboardCategory === 'tickets'
              ? isGirl
                ? 'bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-600 text-white font-black shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black shadow-[0_0_15px_rgba(6,182,212,0.4)]'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Headphones size={16} />
          <span>تیکت و پشتیبانی</span>
          {answeredTicketsCount > 0 ? (
            <span className="bg-emerald-400 text-slate-950 font-mono text-[10px] font-black px-1.5 py-0.2 rounded-full animate-bounce">
              {formatToPersianDigits(answeredTicketsCount)} پاسخ
            </span>
          ) : userOpenOrAnsweredTickets.length > 0 ? (
            <span className="bg-amber-400 text-slate-950 font-mono text-[10px] font-black px-1.5 py-0.2 rounded-full">
              {formatToPersianDigits(userOpenOrAnsweredTickets.length)}
            </span>
          ) : null}
        </button>
      </div>

      {/* 4. DYNAMIC CATEGORY VIEWS */}

      {/* CATEGORY 1: Central Stage Map & Missions Pipeline */}
      {dashboardCategory === 'map_missions' && (
        <div className="space-y-4">
          
          {/* Stage Map Strip Header with Standard Square Stage Tiles */}
          <div className="cyber-card-3d p-3.5 sm:p-4 rounded-2xl border border-amber-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass size={18} className="text-amber-400 animate-spin-slow" />
                <h3 className="text-xs sm:text-sm font-black text-white">
                  نقشه مرکزی مراحل رشد ({formatToPersianDigits(stagesList.length)} مرحله سفر استراتژیک)
                </h3>
              </div>
              <button
                onClick={() => onNavigate('Journey')}
                className="text-xs font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1"
              >
                <span>مشاهده نقشه کامل</span>
                <ChevronLeft size={14} />
              </button>
            </div>

            {/* Visual Interactive Pipeline Standard Square Nodes */}
            {stagesList.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                مرحله‌ای در نقشه بازی ثبت نشده است (مدیر سامانه در پنل مدیریت می‌تواند مراحل را ثبت کند).
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 pt-1">
              {stagesList.map((st, i) => {
                const Icon = st.icon;
                const isCurrent = st.status === 'in_progress';
                const isDone = st.status === 'completed';
                return (
                  <div 
                    key={st.id} 
                    onClick={() => onNavigate('Journey')}
                    className={`cursor-pointer flex flex-col items-center justify-between text-center p-2.5 rounded-2xl border transition hover:scale-105 aspect-square ${
                      isDone 
                        ? 'bg-emerald-950/20 border-emerald-500/40' 
                        : isCurrent 
                        ? 'bg-amber-950/30 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/50' 
                        : 'bg-[#050818] border-slate-800 opacity-75'
                    }`}
                  >
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center mb-1 transition shadow-sm ${
                      isDone 
                        ? 'bg-emerald-500 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.5)]' 
                        : isCurrent 
                        ? 'bg-amber-400 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.8)] animate-pulse' 
                        : 'bg-slate-900 text-slate-500 border border-slate-800'
                    }`}>
                      <Icon size={18} />
                    </div>
                    <span className="text-[10px] sm:text-[11px] font-black text-white truncate max-w-full">{st.title}</span>
                    <span className={`text-[8px] sm:text-[9px] font-mono mt-0.5 px-1.5 py-0.2 rounded-full ${
                      isDone ? 'text-emerald-300 bg-emerald-950/60' : isCurrent ? 'text-amber-300 bg-amber-950/60' : 'text-slate-500 bg-slate-950'
                    }`}>
                      {st.score === 0 ? 'شروع' : `${formatToPersianDigits(st.score)} امتیاز`}
                    </span>
                  </div>
                );
              })}
            </div>
            )}
          </div>

          {/* Active Missions Grid with Standardized Card Formats */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target size={18} className={isGirl ? 'text-rose-400' : 'text-cyan-400'} />
                <h3 className="text-xs sm:text-sm font-black text-white">مأموریت‌های فعال و آماده ارسال</h3>
              </div>
              <button
                onClick={() => onNavigate('Missions')}
                className={`text-xs font-bold flex items-center gap-1 ${
                  isGirl ? 'text-rose-400 hover:text-rose-300' : 'text-cyan-400 hover:text-cyan-300'
                }`}
              >
                <span>مشاهده تمام مأموریت‌ها</span>
                <ChevronLeft size={14} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
              {activeMissions.map(m => {
                const userSub = userSubmissions.find(s => s.mission_id === m.id);
                return (
                  <div 
                    key={m.id}
                    className="cyber-card-3d rounded-2xl p-4 sm:p-5 flex flex-col justify-between min-h-[240px] h-full transition hover:translate-y-[-2px] border-slate-800/80 shadow-lg"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full font-mono border ${
                          isGirl
                            ? 'bg-rose-950 text-rose-300 border-rose-500/40'
                            : 'bg-cyan-950 text-cyan-300 border-cyan-500/40'
                        }`}>
                          حداکثر امتیاز: {formatToPersianDigits(m.max_score)}
                        </span>
                        {userSub ? (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            userSub.status === 'approved' 
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800' 
                              : userSub.status === 'rejected'
                              ? 'bg-rose-950 text-rose-300 border-rose-800'
                              : 'bg-amber-950 text-amber-300 border-amber-800'
                          }`}>
                            {userSub.status === 'approved' ? 'تأیید شده' : userSub.status === 'rejected' ? 'نیازمند اصلاح' : 'در انتظار داوری'}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold bg-slate-900 text-slate-400 px-2 py-0.5 rounded-full border border-slate-800">
                            آماده اقدام
                          </span>
                        )}
                      </div>

                      <h4 className="font-black text-sm text-white line-clamp-1">{m.title}</h4>
                      <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">{m.description}</p>
                    </div>

                    <button
                      onClick={() => onNavigate('Missions')}
                      className={`w-full mt-3 py-2.5 rounded-xl font-black text-xs transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer ${
                        userSub?.status === 'approved'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                          : isGirl
                          ? 'bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-600 hover:opacity-95 text-white shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                          : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-95 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                      }`}
                    >
                      <span>{userSub ? 'مشاهده پاسخ مأموریت' : 'بارگذاری پاسخ مأموریت'}</span>
                      <ChevronLeft size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* CATEGORY 2: Trainings & Educational Content with Standard Grid Cards */}
      {dashboardCategory === 'trainings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
            <div className="flex items-center gap-2">
              <BookOpen size={18} className="text-cyan-400" />
              <h3 className="text-xs sm:text-sm font-black text-white">دوره‌های آموزشی و محتوای استراتژیک</h3>
            </div>
            <button
              onClick={() => onNavigate('Trainings')}
              className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <span>مشاهده کتابخانه جامع</span>
              <ChevronLeft size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            <div className="cyber-card-3d p-4 rounded-2xl flex flex-col justify-between min-h-[260px] space-y-3">
              <div className="space-y-2.5">
                <div className="aspect-video w-full rounded-xl bg-slate-900 overflow-hidden relative shadow-inner">
                  <img 
                    src="https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=400&q=80" 
                    alt="دوره" 
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-2 right-2 bg-slate-950/85 text-[10px] text-cyan-300 px-2 py-0.5 rounded font-mono border border-cyan-500/30">۴ جلسه</span>
                </div>
                <h4 className="text-xs sm:text-sm font-black text-white line-clamp-1">مبانی امنیت شبکه و دفاع سایبری</h4>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">آشنایی با پروتکل‌های رمزگذاری و پدافند در فضای مجازی و مقابله با نفوذ.</p>
              </div>
              <button onClick={() => onNavigate('Trainings')} className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 text-xs font-bold border border-cyan-500/30 transition">
                مشاهده و شروع دوره
              </button>
            </div>

            <div className="cyber-card-3d p-4 rounded-2xl flex flex-col justify-between min-h-[260px] space-y-3">
              <div className="space-y-2.5">
                <div className="aspect-video w-full rounded-xl bg-slate-900 overflow-hidden relative shadow-inner">
                  <img 
                    src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=400&q=80" 
                    alt="دوره" 
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-2 right-2 bg-slate-950/85 text-[10px] text-cyan-300 px-2 py-0.5 rounded font-mono border border-cyan-500/30">۶ جلسه</span>
                </div>
                <h4 className="text-xs sm:text-sm font-black text-white line-clamp-1">تحلیل سناریوهای اتاق جنگ و تصمیم‌گیری</h4>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">تکنیک‌های مدیریت زمان و تصمیم‌گیری تحت فشار عملیاتی و حل بحران.</p>
              </div>
              <button onClick={() => onNavigate('Trainings')} className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 text-xs font-bold border border-cyan-500/30 transition">
                مشاهده و شروع دوره
              </button>
            </div>

            <div className="cyber-card-3d p-4 rounded-2xl flex flex-col justify-between min-h-[260px] space-y-3">
              <div className="space-y-2.5">
                <div className="aspect-video w-full rounded-xl bg-slate-900 overflow-hidden relative shadow-inner">
                  <img 
                    src="https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=400&q=80" 
                    alt="دوره" 
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-2 right-2 bg-slate-950/85 text-[10px] text-cyan-300 px-2 py-0.5 rounded font-mono border border-cyan-500/30">۳ جلسه</span>
                </div>
                <h4 className="text-xs sm:text-sm font-black text-white line-clamp-1">روایت فتح و رسانه‌های نوین</h4>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">ساخت پادکست، کلیپ مستند جهادی و تولید محتوای رسانه‌ای تأثیرگذار.</p>
              </div>
              <button onClick={() => onNavigate('Trainings')} className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 text-xs font-bold border border-cyan-500/30 transition">
                مشاهده و شروع دوره
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CATEGORY 3: Rewards & Medals with Standard Square Prize Cards */}
      {dashboardCategory === 'rewards' && (
        <div className="space-y-4">
          <div className="cyber-card-3d p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-amber-500/30 space-y-4">
            <div className="flex items-center gap-2 text-amber-400 font-black text-sm">
              <Trophy size={20} />
              <span>جوایز نقدی و هدایای مسابقات کشوری جوخه‌ها</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              جوخه‌های برتر کشوری بر اساس جدول رتبه‌بندی نهایی، علاوه بر دریافت لوح تقدیر رسمی ستاد و مدال‌های طلا، نقره و برنز، از جوایز نقدی و تجهیزات فناوری بهره‌مند می‌شوند.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
              
              <div className="cyber-card-3d p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-amber-500/50 text-center flex flex-col justify-between aspect-square sm:aspect-auto sm:min-h-[180px] space-y-2 shadow-lg hover:scale-[1.02] transition">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center mx-auto shadow-inner">
                  <Trophy size={24} />
                </div>
                <div>
                  <span className="text-xs text-slate-300 font-bold block">جوخه رتبه اول</span>
                  <span className="text-amber-400 font-black text-base sm:text-lg block mt-0.5 font-mono">۲۰ میلیون تومان</span>
                </div>
                <span className="text-[10px] text-amber-300/90 bg-amber-950/60 py-1 px-2 rounded-xl block font-bold border border-amber-500/30">+ مدال طلای نخبگی کشوری</span>
              </div>

              <div className="cyber-card-3d p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-600/80 text-center flex flex-col justify-between aspect-square sm:aspect-auto sm:min-h-[180px] space-y-2 shadow-lg hover:scale-[1.02] transition">
                <div className="w-12 h-12 rounded-2xl bg-slate-500/20 text-slate-300 border border-slate-500/40 flex items-center justify-center mx-auto shadow-inner">
                  <Award size={24} />
                </div>
                <div>
                  <span className="text-xs text-slate-300 font-bold block">جوخه رتبه دوم</span>
                  <span className="text-slate-200 font-black text-base sm:text-lg block mt-0.5 font-mono">۱۵ میلیون تومان</span>
                </div>
                <span className="text-[10px] text-slate-300 bg-slate-900/80 py-1 px-2 rounded-xl block font-bold border border-slate-700">+ مدال نقره افتخار ملی</span>
              </div>

              <div className="cyber-card-3d p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-amber-700/60 text-center flex flex-col justify-between aspect-square sm:aspect-auto sm:min-h-[180px] space-y-2 shadow-lg hover:scale-[1.02] transition">
                <div className="w-12 h-12 rounded-2xl bg-amber-700/20 text-amber-600 border border-amber-700/40 flex items-center justify-center mx-auto shadow-inner">
                  <Award size={24} />
                </div>
                <div>
                  <span className="text-xs text-slate-300 font-bold block">جوخه رتبه سوم</span>
                  <span className="text-amber-500 font-black text-base sm:text-lg block mt-0.5 font-mono">۱۰ میلیون تومان</span>
                </div>
                <span className="text-[10px] text-amber-500/90 bg-slate-900/80 py-1 px-2 rounded-xl block font-bold border border-amber-800/40">+ مدال برنز شجاعت و همت</span>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* CATEGORY 4: Dual Leaderboard (Group vs. Individual Rankings) */}
      {dashboardCategory === 'rankings' && (
        <div className="space-y-4">
          
          {/* Dual Toggle Bar & Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#05091a] p-2 rounded-2xl border border-cyan-500/20">
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <button
                onClick={() => setRankingMode('groups')}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black transition ${
                  rankingMode === 'groups'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                رتبه‌بندی جوخه‌ها (تیمی)
              </button>
              <button
                onClick={() => setRankingMode('individuals')}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black transition ${
                  rankingMode === 'individuals'
                    ? 'bg-cyan-400 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                رتبه‌بندی رزمندگان (انفرادی)
              </button>
            </div>

            {/* Search filter */}
            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute right-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="جستجوی نام جوخه یا رزمنده..."
                value={searchRanking}
                onChange={(e) => setSearchRanking(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-8 pl-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {/* GROUPS LEADERBOARD TABLE */}
          {rankingMode === 'groups' && (
            <div className="cyber-card-3d rounded-2xl overflow-hidden border border-amber-500/30">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#050818] text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3">رتبه</th>
                      <th className="p-3">نام جوخه</th>
                      <th className="p-3">استان</th>
                      <th className="p-3">تعداد اعضا</th>
                      <th className="p-3">مأموریت‌های انجام‌شده</th>
                      <th className="p-3 text-left">امتیاز کل جوخه</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredGroups.map((item, idx) => {
                      if (!item?.group) return null;
                      return (
                        <tr key={item.group.id || idx} className="hover:bg-slate-900/50 transition">
                          <td className="p-3 font-mono font-black">
                            {idx === 0 ? <span className="text-amber-400 font-bold">🥇 ۱</span> :
                             idx === 1 ? <span className="text-slate-300 font-bold">🥈 ۲</span> :
                             idx === 2 ? <span className="text-amber-600 font-bold">🥉 ۳</span> :
                             <span className="text-slate-400">{formatToPersianDigits(idx + 1)}</span>}
                          </td>
                          <td className="p-3 font-extrabold text-white">{item.group.name || 'بدون نام'}</td>
                          <td className="p-3 text-slate-300">{item.group.province || 'نامشخص'}</td>
                          <td className="p-3 font-mono text-slate-300">{formatToPersianDigits(item.membersCount)} نفر</td>
                          <td className="p-3 font-mono text-cyan-300">{formatToPersianDigits(item.completedMissions)}</td>
                          <td className="p-3 text-left font-mono font-black text-amber-300 text-sm">
                            {formatToPersianDigits(item.score)} <span className="text-[10px] text-slate-400 font-sans">امتیاز</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* INDIVIDUALS LEADERBOARD TABLE */}
          {rankingMode === 'individuals' && (
            <div className="cyber-card-3d rounded-2xl overflow-hidden border border-cyan-500/30">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#050818] text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3">رتبه</th>
                      <th className="p-3">نام و نام خانوادگی</th>
                      <th className="p-3">جوخه</th>
                      <th className="p-3">استان / مدرسه</th>
                      <th className="p-3">مقطع</th>
                      <th className="p-3 text-left">امتیاز انفرادی</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredIndividuals.map((item, idx) => (
                      <tr key={item.user.id} className="hover:bg-slate-900/50 transition">
                        <td className="p-3 font-mono font-black">
                          {idx === 0 ? <span className="text-cyan-400 font-bold">🥇 ۱</span> :
                           idx === 1 ? <span className="text-slate-300 font-bold">🥈 ۲</span> :
                           idx === 2 ? <span className="text-amber-600 font-bold">🥉 ۳</span> :
                           <span className="text-slate-400">{formatToPersianDigits(idx + 1)}</span>}
                        </td>
                        <td className="p-3 font-extrabold text-white">
                          {item.user.first_name} {item.user.last_name}
                        </td>
                        <td className="p-3 text-amber-300 font-bold">{item.groupName}</td>
                        <td className="p-3 text-slate-300">{item.user.province} - {item.user.school_name}</td>
                        <td className="p-3 text-slate-400">{item.user.education_level} (پایه {item.user.grade})</td>
                        <td className="p-3 text-left font-mono font-black text-cyan-300 text-sm">
                          {formatToPersianDigits(item.score)} <span className="text-[10px] text-slate-400 font-sans">امتیاز</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* CATEGORY 5: SUPPORT TICKETS & REAL-TIME ADMIN MESSAGES */}
      {dashboardCategory === 'tickets' && (
        <TicketsView
          currentUser={currentUser}
          tickets={tickets}
          setTickets={setTickets || (() => {})}
          replies={replies}
          setReplies={setReplies || (() => {})}
          triggerAlert={triggerAlert}
          onNavigate={onNavigate}
          isEmbedded={true}
        />
      )}

      {/* 5. BOTTOM NOTIFICATION & TICKER BAR */}
      <div className="bg-[#060a1c] border border-cyan-500/30 rounded-2xl p-3.5 space-y-2 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Megaphone size={16} className="text-amber-400 animate-pulse" />
            <h3 className="text-xs font-black text-white">نوار اعلانات و پیام‌های ستاد مرکزی</h3>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">بروزرسانی لحظه‌ای</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          {announcements.filter(a => a.is_active).slice(0, 2).map(a => (
            <div key={a.id} className="bg-[#030612] p-2.5 rounded-xl border border-slate-800/80 flex items-start gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 shrink-0 animate-ping" />
              <div>
                <span className="font-bold text-cyan-300 block">{a.title}</span>
                <p className="text-[11px] text-slate-300 leading-snug mt-0.5 line-clamp-1">{a.message}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
