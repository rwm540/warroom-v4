import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Heart, 
  Eye, 
  Tag, 
  User as UserIcon, 
  Users, 
  MapPin, 
  Filter, 
  ExternalLink,
  ChevronLeft,
  X,
  Share2,
  Award
} from 'lucide-react';
import { StudentShowcase, Gender } from '../../types';
import { initialStudentShowcases } from '../../data/showcase';
import { formatToPersianDigits } from '../../utils/jalali';

interface StudentShowcaseSectionProps {
  onOpenAuth?: (mode: 'login' | 'register_individual' | 'register_group') => void;
}

export default function StudentShowcaseSection({ onOpenAuth }: StudentShowcaseSectionProps) {
  const [showcases, setShowcases] = useState<StudentShowcase[]>(initialStudentShowcases);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedGender, setSelectedGender] = useState<'all' | Gender>('all');
  const [activeItem, setActiveItem] = useState<StudentShowcase | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  // اگر هیچ اثری ثبت نشده باشد، کل بخش مخفی می‌شود (تا صفحه اصلی خالی به نظر نرسد)
  const hideSection = showcases.length === 0;

  useEffect(() => {
    if (activeItem) {
      window.dispatchEvent(new CustomEvent('warroom_modal_active_change', { detail: { active: true } }));
      return () => {
        window.dispatchEvent(new CustomEvent('warroom_modal_active_change', { detail: { active: false } }));
      };
    }
  }, [activeItem]);

  if (hideSection) return null;

  const categories = [
    'all',
    'سناریو و استراتژی',
    'طراحی و گرافیک',
    'ویدیو و پادکست',
    'فنی و کدنویسی',
    'شبیه‌سازی تاکتیکی'
  ];

  const handleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setShowcases(items => items.map(it => it.id === id ? { ...it, likes_count: it.likes_count - 1 } : it));
      } else {
        next.add(id);
        setShowcases(items => items.map(it => it.id === id ? { ...it, likes_count: it.likes_count + 1 } : it));
      }
      return next;
    });
  };

  const filteredShowcases = showcases.filter(item => {
    const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
    const matchGender = selectedGender === 'all' || item.gender === selectedGender;
    return matchCat && matchGender;
  });

  return (
    <div className="mx-4 my-6 dir-rtl space-y-4" id="student-showcase-section">
      
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cyan-500/20 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Award size={18} className="animate-pulse" />
            </span>
            <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
              نمونه‌کارها و شاهکارهای دانش‌آموزان و جوخه‌ها
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            آثار منتخب، سناریوهای خلاقانه و پروژه‌های برتر رزمندگان در دوره‌های پیشین
          </p>
        </div>

        {/* Gender Filter Quick Pills */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-[#070b1a] p-1 rounded-xl border border-slate-800 text-xs font-bold">
          <button
            onClick={() => setSelectedGender('all')}
            className={`px-2.5 py-1 rounded-lg transition ${selectedGender === 'all' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'}`}
          >
            همه
          </button>
          <button
            onClick={() => setSelectedGender('پسر')}
            className={`px-2.5 py-1 rounded-lg transition ${selectedGender === 'پسر' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'}`}
          >
            آثار پسران
          </button>
          <button
            onClick={() => setSelectedGender('دختر')}
            className={`px-2.5 py-1 rounded-lg transition ${selectedGender === 'دختر' ? 'bg-rose-500 text-white font-black' : 'text-slate-400 hover:text-white'}`}
          >
            آثار دختران
          </button>
        </div>
      </div>

      {/* Category Filter Scrollable Bar */}
      <div className="w-full overflow-x-auto no-scrollbar flex items-center gap-2 py-1 touch-pan-x">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
              selectedCategory === cat
                ? 'bg-cyan-950/80 text-cyan-300 border-cyan-400/80 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                : 'bg-[#060a1c] text-slate-400 border-slate-800/80 hover:text-white hover:border-slate-700'
            }`}
          >
            {cat === 'all' ? 'همه رشته‌ها' : cat}
          </button>
        ))}
      </div>

      {/* Showcase Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredShowcases.map(item => {
          const isLiked = likedIds.has(item.id);
          const isGirl = item.gender === 'دختر';

          return (
            <div
              key={item.id}
              onClick={() => setActiveItem(item)}
              className="cyber-card-3d rounded-2xl overflow-hidden group cursor-pointer flex flex-col justify-between transition-all duration-300 hover:translate-y-[-2px]"
            >
              {/* Image & Badge Overlay */}
              <div className="relative h-40 w-full overflow-hidden bg-slate-900">
                <img 
                  src={item.cover_image} 
                  alt={item.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#080d22] via-transparent to-transparent opacity-85" />
                
                {/* Category Badge */}
                <div className="absolute top-2.5 right-2.5">
                  <span className="bg-slate-950/80 backdrop-blur-sm text-cyan-300 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-cyan-500/40">
                    {item.category}
                  </span>
                </div>

                {/* Gender indicator tag */}
                <div className="absolute top-2.5 left-2.5">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm border ${
                    isGirl 
                      ? 'bg-rose-950/80 text-rose-300 border-rose-600/50' 
                      : 'bg-cyan-950/80 text-cyan-300 border-cyan-600/50'
                  }`}>
                    {isGirl ? 'جوخه دخترانه' : 'جوخه پسرانه'}
                  </span>
                </div>

                {/* Squad & Author Floating Tag */}
                <div className="absolute bottom-2 right-2 left-2 flex items-center justify-between text-[11px] text-slate-200">
                  <span className="font-bold truncate drop-shadow">{item.squad_name || item.student_name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">پایه {item.grade}</span>
                </div>
              </div>

              {/* Content Body */}
              <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-extrabold text-xs text-white line-clamp-1 group-hover:text-cyan-300 transition">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mt-1">
                    {item.description}
                  </p>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {item.tags.slice(0, 2).map((t, i) => (
                    <span key={i} className="text-[9px] bg-slate-900/90 text-slate-400 px-1.5 py-0.5 rounded-md border border-slate-800">
                      #{t}
                    </span>
                  ))}
                </div>

                {/* Bottom Footer Stats */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                    <button
                      onClick={(e) => handleLike(item.id, e)}
                      className={`flex items-center gap-1 transition ${isLiked ? 'text-rose-400 font-bold' : 'hover:text-rose-300'}`}
                    >
                      <Heart size={13} className={isLiked ? 'fill-rose-500 text-rose-500' : ''} />
                      <span className="font-mono">{formatToPersianDigits(item.likes_count)}</span>
                    </button>

                    <span className="flex items-center gap-1">
                      <Eye size={13} />
                      <span className="font-mono">{formatToPersianDigits(item.views_count)}</span>
                    </span>
                  </div>

                  <span className="text-[10px] text-cyan-400 group-hover:translate-x-[-3px] transition font-bold flex items-center gap-0.5">
                    مشاهده اثر <ChevronLeft size={12} />
                  </span>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Detail Modal */}
      {activeItem && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 dir-rtl overflow-y-auto">
          <div className="bg-[#070b1e] border border-cyan-500/40 rounded-3xl p-4 sm:p-6 max-w-lg w-full space-y-4 text-right shadow-[0_0_50px_rgba(6,182,212,0.3)] relative overflow-hidden max-h-[85vh] sm:max-h-[88vh] overflow-y-auto my-auto">
            
            <button
              onClick={() => setActiveItem(null)}
              className="absolute top-4 left-4 p-1.5 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800 z-10 transition"
            >
              <X size={18} />
            </button>

            {/* Modal Image */}
            <div className="relative h-48 w-full rounded-2xl overflow-hidden border border-cyan-500/30">
              <img 
                src={activeItem.cover_image} 
                alt={activeItem.title} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#070b1e] via-transparent to-transparent opacity-80" />
              <div className="absolute bottom-3 right-3">
                <span className="bg-cyan-950/90 text-cyan-300 text-xs font-black px-3 py-1 rounded-full border border-cyan-500/40">
                  {activeItem.category}
                </span>
              </div>
            </div>

            {/* Title & Author Info */}
            <div className="space-y-1">
              <h3 className="text-base font-black text-white">{activeItem.title}</h3>
              <div className="flex items-center gap-3 text-xs text-slate-300 flex-wrap">
                <span className="text-cyan-400 font-bold">پدیدآورنده: {activeItem.student_name}</span>
                {activeItem.squad_name && <span>• جوخه: {activeItem.squad_name}</span>}
                <span>• استان {activeItem.province}</span>
                <span>• مقطع {activeItem.education_level} (پایه {activeItem.grade})</span>
              </div>
            </div>

            {/* Description */}
            <div className="bg-[#050818] p-3.5 rounded-2xl border border-slate-800/80 text-xs text-slate-200 leading-relaxed space-y-2">
              <p>{activeItem.description}</p>
              <p className="text-[11px] text-slate-400">
                این اثر در چارچوب مأموریت‌های استراتژیک اتاق جنگ تولید شده و به تایید هیئت داوران ستاد مسابقات رسیده است.
              </p>
            </div>

            {/* Tags & Stats */}
            <div className="flex items-center justify-between text-xs pt-1">
              <div className="flex gap-1.5 flex-wrap">
                {activeItem.tags.map((t, idx) => (
                  <span key={idx} className="bg-slate-900 text-cyan-300 text-[10px] px-2 py-0.5 rounded-lg border border-slate-800">
                    #{t}
                  </span>
                ))}
              </div>
              <span className="text-[10px] text-slate-400 font-mono">تاریخ ثبت: {activeItem.created_at}</span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={(e) => handleLike(activeItem.id, e)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition ${
                  likedIds.has(activeItem.id)
                    ? 'bg-rose-950/80 text-rose-300 border-rose-600/60'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
                }`}
              >
                <Heart size={15} className={likedIds.has(activeItem.id) ? 'fill-rose-500 text-rose-500' : ''} />
                <span>پسندیدم ({formatToPersianDigits(activeItem.likes_count)})</span>
              </button>

              {onOpenAuth && (
                <button
                  onClick={() => {
                    setActiveItem(null);
                    onOpenAuth('register_individual');
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-xs shadow-[0_0_15px_rgba(6,182,212,0.4)] transition hover:opacity-95 text-center"
                >
                  ثبت‌نام برای ارسال اثر شما
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
