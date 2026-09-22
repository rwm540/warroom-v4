import React, { useState } from 'react';
import { 
  Gift, 
  Sparkles, 
  Gem, 
  Lock, 
  Trophy
} from 'lucide-react';
import { User, Group, Medal, UserMedal, PrizeItem } from '../types';
import { formatToPersianDigits } from '../utils/jalali';
import RewardsLeaderboardView from './RewardsLeaderboardView';

interface PrizesPointsViewProps {
  currentUser: User | null;
  users?: User[];
  groups?: Group[];
  medals?: Medal[];
  userMedals?: UserMedal[];
  prizes?: PrizeItem[];
  initialSubTab?: 'prizes' | 'leaderboard';
  triggerAlert: (msg: string) => void;
  onNavigate?: (tab: string) => void;
}

export default function PrizesPointsView({
  currentUser,
  users = [],
  groups = [],
  medals = [],
  userMedals = [],
  prizes = [],
  initialSubTab = 'prizes',
  triggerAlert,
  onNavigate
}: PrizesPointsViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'prizes' | 'leaderboard'>(initialSubTab === 'leaderboard' ? 'leaderboard' : 'prizes');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPrize, setSelectedPrize] = useState<PrizeItem | null>(null);

  React.useEffect(() => {
    if (selectedPrize) {
      window.dispatchEvent(new CustomEvent('warroom_modal_active_change', { detail: { active: true } }));
      return () => {
        window.dispatchEvent(new CustomEvent('warroom_modal_active_change', { detail: { active: false } }));
      };
    }
  }, [selectedPrize]);

  const isGirls = currentUser?.gender === 'دختر' || localStorage.getItem('hisstory_theme_mode') === 'girls';
  const userPoints = currentUser?.points || 0;

  // فیلتر کردن جوایز پیش‌فرض قدیمی هاردکد شده — نمایش صرفاً جوایز واقعی تعریف شده توسط ادمین در Supabase
  const effectivePrizes = prizes.filter(p => !['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9'].includes(p.id));

  const filteredPrizes = selectedCategory === 'all' 
    ? effectivePrizes 
    : effectivePrizes.filter(p => p.category === selectedCategory);

  const handleClaimPrize = (prize: PrizeItem) => {
    if (userPoints < prize.requiredPoints) {
      triggerAlert(`امتیاز فعلی شما (${formatToPersianDigits(userPoints)}) برای دریافت این جایزه (${formatToPersianDigits(prize.requiredPoints)}) کافی نیست. مراحل بعدی را تکمیل کنید!`);
      return;
    }
    triggerAlert(`درخواست دریافت «${prize.title}» ثبت شد و برای تایید داوری ارسال گردید.`);
    setSelectedPrize(null);
  };

  return (
    <div className="space-y-6 dir-rtl pb-28 max-w-5xl mx-auto px-3 sm:px-6 pt-4 font-sans select-none">
      
      {/* 2. Main Tab Switcher: "ویترین جایزه‌ها" vs "جدول رده‌بندی" */}
      <div className="grid grid-cols-2 gap-2 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
        <button
          onClick={() => setActiveSubTab('prizes')}
          className={`py-2.5 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-1.5 sm:gap-2 ${
            activeSubTab === 'prizes'
              ? isGirls
                ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-900/50'
                : 'bg-gradient-to-r from-cyan-400 to-blue-600 text-slate-950 shadow-lg shadow-cyan-900/50'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Gift size={16} />
          <span className="truncate">ویترین جایزه‌ها {effectivePrizes.length > 0 ? `(${formatToPersianDigits(effectivePrizes.length)})` : ''}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('leaderboard')}
          className={`py-2.5 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-1.5 sm:gap-2 ${
            activeSubTab === 'leaderboard'
              ? isGirls
                ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-900/50'
                : 'bg-gradient-to-r from-cyan-400 to-blue-600 text-slate-950 shadow-lg shadow-cyan-900/50'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Trophy size={16} />
          <span className="truncate">جدول رده‌بندی</span>
        </button>
      </div>

      {/* 3. Sub Tab 1: Prizes Grid */}
      {activeSubTab === 'prizes' && (
        <div className="space-y-4">
          
          {/* Categories Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            {[
              { id: 'all', label: effectivePrizes.length > 0 ? `همه جایزه‌ها (${formatToPersianDigits(effectivePrizes.length)})` : 'همه جایزه‌ها' },
              { id: 'gaming', label: 'گیمینگ و کنسول' },
              { id: 'digital', label: 'تبلت و دوربین' },
              { id: 'gadgets', label: 'گجت‌های هوشمند' },
              { id: 'gear', label: 'تجهیزات و رصد' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition border ${
                  selectedCategory === cat.id
                    ? isGirls 
                      ? 'bg-pink-950 border-pink-500 text-pink-200' 
                      : 'bg-cyan-950 border-cyan-400 text-cyan-200'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Prizes Grid or Empty State */}
          {filteredPrizes.length === 0 ? (
            <div className="text-center py-16 px-4 bg-[#091126]/60 rounded-3xl border border-slate-800/80 space-y-3">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                <Gift size={32} />
              </div>
              <h3 className="text-base font-black text-white">هنوز جایزه‌ای ثبت نشده است</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                جوایز و کریستال‌های لازم توسط مدیر سامانه در پنل مدیریت تعریف و فعال می‌شوند.
              </p>
              {currentUser?.role === 'admin' && onNavigate && (
                <button
                  onClick={() => onNavigate('admin')}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow-lg cursor-pointer"
                >
                  <Trophy size={14} />
                  <span>تعریف و مدیریت جوایز در پنل ادمین</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {filteredPrizes.map((prize) => {
              const isUnlocked = userPoints >= prize.requiredPoints;
              return (
                <div
                  key={prize.id}
                  className={`rounded-3xl p-4 border transition-all duration-300 flex flex-col justify-between group relative overflow-hidden ${
                    isGirls
                      ? 'bg-[#150718]/90 border-pink-500/30 hover:border-pink-400 hover:shadow-[0_0_25px_rgba(244,63,94,0.3)]'
                      : 'bg-[#060e22]/90 border-cyan-400/30 hover:border-cyan-300 hover:shadow-[0_0_25px_rgba(6,182,212,0.3)]'
                  }`}
                >
                  {/* Tag badge */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      {prize.tag}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      موجودی: {formatToPersianDigits(prize.stockCount)} عدد
                    </span>
                  </div>

                  {/* Prize Image */}
                  <div className="relative aspect-video rounded-2xl overflow-hidden mb-3 bg-slate-950 border border-slate-800">
                    <img 
                      src={prize.imageUrl} 
                      alt={prize.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {!isUnlocked && (
                      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] flex items-center justify-center gap-1.5 text-slate-300 text-xs font-bold">
                        <Lock size={16} className="text-amber-400" />
                        <span>قفل تا سقف امتیاز</span>
                      </div>
                    )}
                  </div>

                  {/* Title & Points Info */}
                  <div className="space-y-2 mb-4">
                    <h3 className="text-sm font-black text-white group-hover:text-amber-300 transition line-clamp-1">
                      {prize.title}
                    </h3>
                    
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">امتیاز لازم:</span>
                      <div className="flex items-center gap-1 text-amber-300 font-black font-mono text-sm">
                        <Sparkles size={14} className="text-amber-400" />
                        <span>{formatToPersianDigits(prize.requiredPoints)}</span>
                        <span className="text-[10px] font-sans">امتیاز</span>
                      </div>
                    </div>

                    {/* Progress Bar towards this prize */}
                    <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div 
                        className={`h-full ${isGirls ? 'bg-pink-500' : 'bg-cyan-400'}`}
                        style={{ width: `${Math.min(100, (userPoints / prize.requiredPoints) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => setSelectedPrize(prize)}
                    className={`w-full py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-md ${
                      isUnlocked
                        ? isGirls
                          ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white hover:from-pink-400 hover:to-rose-400 cursor-pointer'
                          : 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 hover:from-cyan-300 hover:to-blue-400 cursor-pointer'
                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {isUnlocked ? (
                      <>
                        <Gift size={14} />
                        <span>درخواست تحویل جایزه</span>
                      </>
                    ) : (
                      <>
                        <Lock size={14} />
                        <span>
                          {formatToPersianDigits(prize.requiredPoints - userPoints)} امتیاز تا بازگشایی
                        </span>
                      </>
                    )}
                  </button>

                </div>
              );
            })}
          </div>
          )}

        </div>
      )}

      {/* 3. Sub Tab 2: Leaderboard (جدول رده‌بندی) */}
      {activeSubTab === 'leaderboard' && (
        <div className="pt-1">
          <RewardsLeaderboardView 
            users={users}
            groups={groups}
            medals={medals}
            userMedals={userMedals}
            triggerAlert={triggerAlert}
            onNavigate={onNavigate}
          />
        </div>
      )}

      {/* Modal for Claiming Prize */}
      {selectedPrize && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 dir-rtl overflow-y-auto">
          <div className="bg-[#0b1226] border border-amber-500/40 rounded-3xl p-5 sm:p-6 max-w-md w-full space-y-4 text-white shadow-2xl relative my-auto max-h-[85vh] sm:max-h-[88vh] overflow-y-auto">
            <h3 className="text-base font-black text-amber-300">
              تایید درخواست جایزه {selectedPrize.title}
            </h3>
            <p className="text-xs text-slate-300">
              با تایید نهایی، مقدار {formatToPersianDigits(selectedPrize.requiredPoints)} کریستال از حساب شما کسر شده و فرم آدرس پستی برای ارسال رایگان فعال خواهد شد.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedPrize(null)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-300 hover:bg-slate-700"
              >
                انصراف
              </button>
              <button
                onClick={() => handleClaimPrize(selectedPrize)}
                className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black"
              >
                تایید نهایی و کسر کریستال
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
