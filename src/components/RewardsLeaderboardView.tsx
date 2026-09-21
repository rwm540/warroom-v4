import React, { useState, useMemo } from 'react';
import { 
  Trophy, 
  Users, 
  Crown, 
  Sparkles, 
  Search, 
  User as UserIcon,
  Shield, 
  Star,
  Award,
  Zap
} from 'lucide-react';
import { User, Group, Medal as MedalType, UserMedal } from '../types';
import { formatToPersianDigits } from '../utils/jalali';

interface RewardsLeaderboardViewProps {
  users: User[];
  groups: Group[];
  medals?: MedalType[];
  userMedals?: UserMedal[];
  triggerAlert: (msg: string) => void;
  onNavigate?: (tab: string) => void;
}

export default function RewardsLeaderboardView({
  users = [],
  groups = [],
  medals = [],
  userMedals = [],
  triggerAlert,
  onNavigate
}: RewardsLeaderboardViewProps) {
  const [rankingType, setRankingType] = useState<'squads' | 'individuals'>('squads');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Compute Squad Leaderboard
  const squadList = useMemo(() => {
    return groups.map((g) => {
      // Calculate group total points (either direct g.points or sum of group members' points)
      const groupUsers = users.filter((u) => u.group_id === g.id);
      const membersPointsSum = groupUsers.reduce((acc, curr) => acc + (curr.points || 0), 0);
      const totalScore = (g.points !== undefined && g.points !== null) ? g.points : membersPointsSum;

      const leader = users.find((u) => u.id === g.leader_id);
      const leaderName = leader ? `${leader.first_name || ''} ${leader.last_name || ''}`.trim() || 'فرمانده جوخه' : 'فرمانده جوخه';

      return {
        id: g.id,
        name: g.name || 'جوخه بدون نام',
        leader: leaderName,
        city: g.city || g.province || 'کشوری',
        membersCount: g.members_count || groupUsers.length || 1,
        score: totalScore,
        avatar: leader?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80'
      };
    }).sort((a, b) => b.score - a.score);
  }, [groups, users]);

  // 2. Compute Individuals Leaderboard
  const individualList = useMemo(() => {
    return users.map((u) => ({
      id: u.id,
      name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'رزمنده',
      city: u.city || u.province || 'کشوری',
      personalCode: u.personal_code,
      score: u.points || 0,
      avatar: u.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      role: u.role === 'admin' ? 'ادمین' : u.role === 'leader' ? 'فرمانده جوخه' : 'رزمنده'
    })).sort((a, b) => b.score - a.score);
  }, [users]);

  // Determine current active list
  const activeList = rankingType === 'squads' ? squadList : individualList;

  // Search filter
  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return activeList;
    const q = searchQuery.toLowerCase();
    return activeList.filter(
      item => (item?.name || '').toLowerCase().includes(q) || (item?.city || '').toLowerCase().includes(q)
    );
  }, [activeList, searchQuery]);

  // Top 3 for Podium
  const top1 = filteredList[0];
  const top2 = filteredList[1];
  const top3 = filteredList[2];
  const remainingList = filteredList.slice(3);

  return (
    <div className="space-y-6 dir-rtl pb-28 max-w-5xl mx-auto px-3 sm:px-6 pt-4 font-sans select-none">
      
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-[#0d1633] via-[#080d21] to-[#040612] border border-amber-500/40 p-5 sm:p-7 rounded-3xl relative overflow-hidden shadow-2xl">
        <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-right">
            <span className="bg-amber-950/80 text-amber-300 font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-600/40">
              WAR ROOM LEADERBOARD
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              جدول رده‌بندی و سکوی افتخار
            </h1>
            <p className="text-xs text-slate-300">
              رتبه‌بندی زنده و بدون واسطه بر اساس امتیازات کسب‌شده در ماموریت‌ها
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-900/80 p-1 rounded-2xl border border-slate-800">
            <button
              onClick={() => setRankingType('squads')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                rankingType === 'squads'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users size={14} />
              <span>جوخه‌ها ({formatToPersianDigits(squadList.length)})</span>
            </button>
            <button
              onClick={() => setRankingType('individuals')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                rankingType === 'individuals'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserIcon size={14} />
              <span>کاربران ({formatToPersianDigits(individualList.length)})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Empty State when no data */}
      {filteredList.length === 0 ? (
        <div className="text-center py-16 px-4 bg-[#080e22]/60 rounded-3xl border border-slate-800 space-y-3">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(245,158,11,0.2)]">
            <Trophy size={32} />
          </div>
          <h3 className="text-base font-black text-white">اطلاعات رده‌بندی هنوز ثبت نشده است</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {rankingType === 'squads' 
              ? 'هیچ جوخه یا گروهی در سامانه یافت نشد. ادمین می‌تواند در پنل مدیریت جوخه‌های جدید ایجاد کرده یا امتیازات را به‌روزرسانی کند.'
              : 'کاربری با امتیاز ثبت‌شده در سیستم یافت نشد.'}
          </p>
          {onNavigate && (
            <button
              onClick={() => onNavigate('admin')}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow-lg cursor-pointer"
            >
              <Shield size={14} />
              <span>مدیریت جوخه‌ها و امتیازات در پنل ادمین</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* 2. Top Podium Visual Display (If items exist) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-amber-300 flex items-center gap-2">
                <Crown size={18} className="text-amber-400" />
                <span>سکوی افتخار برترین‌های {rankingType === 'squads' ? 'جوخه‌ها' : 'رزمندگان'}</span>
              </h2>
              <span className="text-[10px] font-mono text-slate-400">به‌روزرسانی زنده</span>
            </div>

            {/* Podium Layout */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end pt-8 pb-4">
              
              {/* 2nd Place - Silver Podium */}
              <div className="flex flex-col items-center">
                {top2 ? (
                  <>
                    <div className="relative mb-2 flex flex-col items-center">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-300 text-slate-950 font-mono mb-1">
                        رتبه ۲
                      </span>
                      <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-2xl border-2 border-slate-300 p-0.5 shadow-[0_0_15px_rgba(203,213,225,0.5)]">
                        <img 
                          src={top2.avatar} 
                          alt={top2.name}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="w-full bg-gradient-to-b from-slate-800 to-slate-900 border-t-2 border-slate-400 rounded-t-2xl p-2.5 text-center h-28 sm:h-36 flex flex-col justify-between">
                      <div>
                        <h4 className="text-[11px] sm:text-xs font-black text-white line-clamp-1">{top2.name}</h4>
                        <span className="text-[9px] text-slate-400 block">{top2.city}</span>
                      </div>
                      <div className="text-xs font-mono font-black text-slate-200">
                        {formatToPersianDigits(top2.score)} <span className="text-[9px] font-sans">امتیاز</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-28 bg-slate-900/40 rounded-t-2xl border border-dashed border-slate-800 flex items-center justify-center text-[10px] text-slate-600">
                    خالی
                  </div>
                )}
              </div>

              {/* 1st Place - Gold Podium (Center Elevated) */}
              <div className="flex flex-col items-center -mt-6">
                {top1 ? (
                  <>
                    <div className="relative mb-2 flex flex-col items-center">
                      <div className="absolute -top-6 text-amber-400 animate-bounce">
                        <Crown size={24} className="fill-amber-400" />
                      </div>
                      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-mono mb-1 shadow-lg">
                        قهرمان ۱
                      </span>
                      <div className="w-18 h-18 sm:w-22 sm:h-22 rounded-2xl border-2 border-amber-400 p-1 shadow-[0_0_25px_rgba(245,158,11,0.8)] neon-box-cyan">
                        <img 
                          src={top1.avatar} 
                          alt={top1.name}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="w-full bg-gradient-to-b from-amber-950/90 via-amber-900/60 to-slate-900 border-t-2 border-amber-400 rounded-t-2xl p-3 text-center h-36 sm:h-44 flex flex-col justify-between shadow-[0_0_30px_rgba(245,158,11,0.3)]">
                      <div>
                        <h4 className="text-xs sm:text-sm font-black text-amber-200 line-clamp-1">{top1.name}</h4>
                        <span className="text-[10px] text-amber-400/80 block">{top1.city}</span>
                      </div>
                      <div className="text-sm font-mono font-black text-amber-300">
                        {formatToPersianDigits(top1.score)} <span className="text-[9px] font-sans">امتیاز</span>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>

              {/* 3rd Place - Bronze Podium */}
              <div className="flex flex-col items-center">
                {top3 ? (
                  <>
                    <div className="relative mb-2 flex flex-col items-center">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-700 text-white font-mono mb-1">
                        رتبه ۳
                      </span>
                      <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-2xl border-2 border-amber-600 p-0.5 shadow-[0_0_15px_rgba(217,119,6,0.5)]">
                        <img 
                          src={top3.avatar} 
                          alt={top3.name}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="w-full bg-gradient-to-b from-amber-950/40 to-slate-900 border-t-2 border-amber-600 rounded-t-2xl p-2.5 text-center h-24 sm:h-32 flex flex-col justify-between">
                      <div>
                        <h4 className="text-[11px] sm:text-xs font-black text-white line-clamp-1">{top3.name}</h4>
                        <span className="text-[9px] text-slate-400 block">{top3.city}</span>
                      </div>
                      <div className="text-xs font-mono font-black text-amber-500">
                        {formatToPersianDigits(top3.score)} <span className="text-[9px] font-sans">امتیاز</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-24 bg-slate-900/40 rounded-t-2xl border border-dashed border-slate-800 flex items-center justify-center text-[10px] text-slate-600">
                    خالی
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* 3. Remaining List (4th and below) */}
          {remainingList.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <h3 className="text-xs font-bold text-slate-300">
                  سایر رتبه‌ها:
                </h3>
                
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="جستجو نام یا شهر..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full py-1.5 px-3 pr-8 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                  />
                  <Search size={14} className="absolute right-2.5 top-2.5 text-slate-500" />
                </div>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {remainingList.map((item, index) => {
                  const rank = index + 4;
                  return (
                    <div
                      key={item.id}
                      className="bg-[#060b1c] border border-slate-800/80 hover:border-slate-700 rounded-2xl p-3 flex items-center justify-between transition"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-xl bg-slate-900 text-slate-400 font-mono font-bold text-xs flex items-center justify-center border border-slate-800">
                          #{formatToPersianDigits(rank)}
                        </span>
                        <img 
                          src={item.avatar} 
                          alt={item.name}
                          className="w-8 h-8 rounded-lg object-cover border border-slate-800" 
                        />
                        <div>
                          <h4 className="text-xs font-bold text-white">{item.name}</h4>
                          <span className="text-[10px] text-slate-400">{item.city}</span>
                        </div>
                      </div>

                      <div className="text-xs font-mono font-bold text-amber-300">
                        {formatToPersianDigits(item.score)} <span className="text-[9px] font-sans text-slate-400">امتیاز</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
}
