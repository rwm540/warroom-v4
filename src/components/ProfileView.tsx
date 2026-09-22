import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, 
  Award, 
  Copy, 
  Check, 
  Users, 
  Lock,
  Bookmark,
  Play,
  Share2,
  Trash2,
  Eye,
  Heart,
  MessageCircle,
  ExternalLink,
  ArrowLeft,
  Sparkles,
  X,
  Video
} from 'lucide-react';
import { User, Group, Medal, UserMedal } from '../types';
import { formatToPersianDigits } from '../utils/jalali';
import { 
  VitrinPost, 
  getVitrinPostsFromStore,
  getSavedPostIds, 
  removeSavedPostId,
  getAllComments
} from '../data/vitrinData';
import SavedVitrinReelsModal from './SavedVitrinReelsModal';

interface ProfileViewProps {
  currentUser: User;
  groups: Group[];
  medals: Medal[];
  userMedals: UserMedal[];
  onNavigate?: (tab: string) => void;
  triggerAlert?: (msg: string) => void;
}

export default function ProfileView({
  currentUser,
  groups,
  medals,
  userMedals,
  onNavigate,
  triggerAlert
}: ProfileViewProps) {
  const [copied, setCopied] = useState(false);
  
  // Tab Switcher: 'credentials' (شناسنامه و مدال‌ها) vs 'saved_vitrin' (ذخیره‌های ویترین)
  const [activeSubTab, setActiveSubTab] = useState<'credentials' | 'saved_vitrin'>('credentials');
  
  // Saved Vitrin Posts state
  const [savedPostIds, setSavedPostIds] = useState<string[]>([]);
  const [selectedPost, setSelectedPost] = useState<VitrinPost | null>(null);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);
  const [showReelsModal, setShowReelsModal] = useState(false);

  useEffect(() => {
    if (showReelsModal || selectedPost) {
      window.dispatchEvent(new CustomEvent('warroom_modal_active_change', { detail: { active: true } }));
      return () => {
        window.dispatchEvent(new CustomEvent('warroom_modal_active_change', { detail: { active: false } }));
      };
    }
  }, [showReelsModal, selectedPost]);

  // Sync saved posts on mount and when sub-tab is opened
  useEffect(() => {
    if (currentUser?.id) {
      setSavedPostIds(getSavedPostIds(currentUser.id));
    }
  }, [currentUser?.id, activeSubTab, showReelsModal]);

  if (!currentUser) {
    return (
      <div className="dir-rtl max-w-2xl mx-auto py-12 px-4 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-950/80 border border-amber-600/60 flex items-center justify-center text-amber-400 mx-auto shadow-[0_0_20px_rgba(245,158,11,0.3)]">
          <UserIcon size={32} />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-white">شناسنامه و مدال‌های رزمنده</h2>
          <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
            برای مشاهده آمار انفرادی، کد ۹ رقمی اختصاصی، ذخیره‌های ویترین و مدال‌های کسب شده، ابتدا وارد حساب کاربری خود شوید.
          </p>
        </div>
      </div>
    );
  }

  // Filter medals earned by this user via personal_code
  const earnedUserMedals = userMedals.filter(um => um.personal_code === currentUser.personal_code);
  const earnedMedalIds = new Set(earnedUserMedals.map(um => um.medal_id));

  // User Squad if any
  const userGroup = groups.find(g => g.id === currentUser.group_id);

  // Filter saved Vitrin posts (📡 از داده‌های همگام‌شده با Supabase)
  const savedPosts = getVitrinPostsFromStore(currentUser.id).filter(p => savedPostIds.includes(p.id));
  const allComments = getAllComments();

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

  // Remove post from saved
  const handleRemoveSaved = (postId: string) => {
    removeSavedPostId(postId, currentUser.id);
    const nextIds = getSavedPostIds(currentUser.id);
    setSavedPostIds(nextIds);
    if (selectedPost?.id === postId) {
      setSelectedPost(null);
    }
    triggerAlert?.('اثر از ذخیره‌های ویترین شما حذف شد.');
  };

  // Share post
  const handleShareSaved = (post: VitrinPost) => {
    const shareUrl = `${window.location.origin}${window.location.pathname}#vitrin-post-${post.id}`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(shareUrl)
        .then(() => {
          setCopiedPostId(post.id);
          setTimeout(() => setCopiedPostId(null), 2500);
          triggerAlert?.(`لینک اشتراک «${post.title}» کپی شد!`);
        })
        .catch(() => {
          triggerAlert?.(`لینک اشتراک: ${shareUrl}`);
        });
    } else {
      triggerAlert?.(`لینک اشتراک: ${shareUrl}`);
    }
  };

  return (
    <div className="space-y-6 dir-rtl pb-16 max-w-4xl mx-auto px-2 sm:px-4 select-none">
      
      {/* Title Header with Sub-Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
            <UserIcon className="text-red-500" size={24} />
            پروفایل رزمنده و گنجینه اختصاصی
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            شناسنامه هویتی، وضعیت جوخه، نشان‌های افتخار و آثار ذخیره‌شده از ویترین
          </p>
        </div>

        {/* 2-Option Segmented Sub-Tabs */}
        <div className="flex items-center p-1 rounded-2xl bg-slate-950 border border-slate-800/80 shadow-inner w-full sm:w-auto">
          <button
            onClick={() => setActiveSubTab('credentials')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeSubTab === 'credentials'
                ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Award size={15} />
            <span>شناسنامه و مدال‌ها</span>
          </button>

          <button
            onClick={() => setActiveSubTab('saved_vitrin')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition relative ${
              activeSubTab === 'saved_vitrin'
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bookmark size={15} className={savedPosts.length > 0 ? 'fill-current' : ''} />
            <span>ذخیره‌های ویترین</span>
            {savedPosts.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                activeSubTab === 'saved_vitrin' ? 'bg-black/40 text-amber-200' : 'bg-amber-400 text-black'
              }`}>
                {formatToPersianDigits(savedPosts.length)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW A: CREDENTIALS & MEDALS VIEW                                        */}
      {/* ========================================================================= */}
      {activeSubTab === 'credentials' && (
        <div className="space-y-6">
          {/* Top Personal Profile Card */}
          <div className="bg-[#080d21] border border-slate-800 rounded-3xl p-5 md:p-6 space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
              <div className="flex items-center gap-4 text-center sm:text-right">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-red-600 to-black p-[1px] shadow-[0_0_20px_rgba(220,38,38,0.4)] flex-shrink-0">
                  <div className="w-full h-full bg-[#050816] rounded-[15px] flex items-center justify-center text-red-400 font-extrabold text-2xl">
                    {currentUser.first_name[0]}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-black text-white">
                    {currentUser.first_name} {currentUser.last_name}
                  </h3>
                  <p className="text-xs text-red-400 font-bold mt-0.5">
                    {currentUser.role === 'admin' ? 'فرماندهی ارشد ستاد' : currentUser.role === 'leader' ? 'فرمانده ارشد جوخه' : currentUser.role === 'member' ? 'عضو جوخه عملیاتی' : 'رزمنده انفرادی'}
                  </p>
                </div>
              </div>

              {/* 9-Digit Personal Code Card */}
              <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl flex items-center gap-4">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block">کد اختصاصی ۹ رقمی:</span>
                  <span className="text-base font-black text-red-400 font-mono tracking-widest">
                    {formatToPersianDigits(currentUser.personal_code)}
                  </span>
                </div>
                <button
                  onClick={copyCode}
                  className="bg-slate-900 hover:bg-slate-800 text-slate-300 p-2 rounded-xl border border-slate-700 transition"
                  title="کپی کد اختصاصی"
                >
                  {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 text-xs">
              <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-500 font-bold block mb-1">کد ملی ۱۰ رقمی:</span>
                <span className="font-mono text-slate-200 font-bold">{currentUser.national_code}</span>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-500 font-bold block mb-1">شماره تماس:</span>
                <span className="font-mono text-slate-200 font-bold">{currentUser.phone}</span>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-500 font-bold block mb-1">استان و شهر:</span>
                <span className="text-slate-200 font-bold">{currentUser.province} - {currentUser.city}</span>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-500 font-bold block mb-1">مدرسه و پایه:</span>
                <span className="text-slate-200 font-bold">{currentUser.school_name} ({currentUser.grade})</span>
              </div>
            </div>

            {/* Squad Details Banner if Squad Member */}
            {userGroup && (
              <div className="bg-red-950/20 border border-red-900/60 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Users className="text-red-400" size={24} />
                  <div>
                    <h4 className="text-xs font-black text-white">
                      عضویت در جوخه: <span className="text-red-400">{userGroup.name}</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      مقطع {userGroup.education_level} | استان {userGroup.province} - {userGroup.city}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-300 font-mono">
                  کد ثبت‌نام جوخه: <strong className="text-red-400">{userGroup.registration_code}</strong>
                </div>
              </div>
            )}
          </div>

          {/* Medals & Honors Showcase Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Award className="text-amber-400" size={20} />
                <h3 className="text-sm font-black text-white">ویترین نشان‌ها و مدال‌های افتخار کسب‌شده</h3>
              </div>
              <span className="text-xs text-amber-400 font-bold font-mono">
                {formatToPersianDigits(earnedUserMedals.length)} از {formatToPersianDigits(medals.length)} نشان کسب شده
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {medals.map(m => {
                const isEarned = earnedMedalIds.has(m.id);
                const userMedalRecord = earnedUserMedals.find(um => um.medal_id === m.id);

                return (
                  <div
                    key={m.id}
                    className={`p-4 rounded-2xl border transition shadow-md flex items-start gap-3 relative overflow-hidden ${
                      isEarned
                        ? 'bg-[#0b122b] border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                        : 'bg-[#060917] border-slate-800 opacity-60'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 border ${
                      isEarned ? 'bg-amber-950/80 border-amber-500 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-600'
                    }`}>
                      {m.image || '🎖️'}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className={`font-black text-xs ${isEarned ? 'text-amber-300' : 'text-slate-400'}`}>
                          {m.name}
                        </h4>
                        {!isEarned && <Lock size={12} className="text-slate-600" />}
                      </div>

                      <p className="text-[11px] text-slate-300 leading-relaxed">{m.description}</p>

                      {isEarned && userMedalRecord && (
                        <div className="pt-2 border-t border-amber-900/40 text-[10px] space-y-0.5">
                          {userMedalRecord.note && (
                            <p className="text-amber-200/90 italic">«{userMedalRecord.note}»</p>
                          )}
                          <p className="text-slate-400 font-mono">اهدا شده در: {userMedalRecord.awarded_at}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW B: SAVED VITRIN ITEMS (ذخیره‌های ویترین)                              */}
      {/* ========================================================================= */}
      {activeSubTab === 'saved_vitrin' && (
        <div className="space-y-6">
          
          {/* Sub Header */}
          <div className="bg-gradient-to-r from-[#171206] via-[#0e0b04] to-[#070502] p-5 rounded-3xl border border-amber-500/40 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 flex-shrink-0">
                <Bookmark size={24} className="fill-amber-400" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                  آثار ذخیره‌شده از ویترین
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-400 text-black">
                    {formatToPersianDigits(savedPosts.length)} اثر
                  </span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  مستندات و آثار برگزیده‌ای که برای الگوبرداری و مرور دوباره نشان کرده‌اید
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {savedPosts.length > 0 && (
                <button
                  onClick={() => setShowReelsModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 text-xs font-black shadow-lg transition"
                >
                  <Play size={15} className="fill-slate-950" />
                  <span>پخش فید ریلز</span>
                </button>
              )}
              <button
                onClick={() => onNavigate?.('Vitrin')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-black shadow-lg transition"
              >
                <span>رفتن به ویترین آثار</span>
                <ArrowLeft size={15} />
              </button>
            </div>
          </div>

          {/* Empty State if No Saved Posts */}
          {savedPosts.length === 0 ? (
            <div className="bg-[#080d21] border border-slate-800 rounded-3xl p-8 sm:p-12 text-center space-y-5 shadow-xl">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-[0_0_25px_rgba(245,158,11,0.2)]">
                <Bookmark size={32} />
              </div>
              <div className="space-y-2 max-w-md mx-auto">
                <h4 className="text-base font-black text-white">هنوز اثری در این بخش ذخیره نکرده‌اید</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  هنگام مرور آثار دانش‌آموزان در بخش «ویترین و آثار»، با کلیک روی آیکون نشان‌کردن (Bookmark)، آثار مورد علاقه، ماکت‌ها و ویدیوها را ذخیره کنید تا همیشه در اینجا در دسترس شما باشند.
                </p>
              </div>
              <button
                onClick={() => onNavigate?.('Vitrin')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black text-xs shadow-lg hover:brightness-110 transition"
              >
                <Sparkles size={16} />
                <span>مشاهده آثار در ویترین</span>
              </button>
            </div>
          ) : (
            /* Saved Posts Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              {savedPosts.map((post) => {
                const postComments = allComments[post.id] || [];

                return (
                  <div 
                    key={post.id}
                    className="bg-[#080d1e] border border-slate-800 hover:border-amber-500/50 rounded-3xl overflow-hidden shadow-xl transition duration-300 flex flex-col justify-between"
                  >
                    <div>
                      {/* Media Cover */}
                      <div className="relative aspect-video bg-black overflow-hidden group">
                        <img 
                          src={post.mediaUrl} 
                          alt={post.title} 
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        />
                        
                        {post.mediaType === 'video' && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <div className="p-3 rounded-full bg-amber-500 text-black shadow-lg">
                              <Play size={20} className="fill-black mr-0.5" />
                            </div>
                          </div>
                        )}

                        {/* Top Stage Tag */}
                        <div className="absolute top-2.5 right-2.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-black/70 text-amber-300 border border-amber-500/30 backdrop-blur-md">
                            {post.stageTag}
                          </span>
                        </div>

                        {/* Top Quick Delete Button */}
                        <button
                          onClick={() => handleRemoveSaved(post.id)}
                          className="absolute top-2.5 left-2.5 p-1.5 rounded-lg bg-black/70 hover:bg-rose-950 text-slate-300 hover:text-rose-400 border border-white/20 transition backdrop-blur-md"
                          title="حذف از ذخیره‌ها"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Content Details */}
                      <div className="p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <img 
                            src={post.authorAvatar} 
                            alt={post.authorName} 
                            className="w-7 h-7 rounded-full object-cover border border-amber-500/40"
                          />
                          <div>
                            <span className="text-xs font-black text-white block">{post.authorName}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{post.squadName}</span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <h4 className="text-xs sm:text-sm font-black text-white leading-snug">
                            {post.title}
                          </h4>
                          <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                            {post.description}
                          </p>
                        </div>

                        {/* Stats Bar */}
                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Heart size={13} className="text-rose-400" />
                              <span className="font-mono font-bold text-slate-200">{formatToPersianDigits(post.likesCount)}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageCircle size={13} className="text-cyan-400" />
                              <span className="font-mono font-bold text-slate-200">{formatToPersianDigits(postComments.length || post.commentsCount)}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="p-4 pt-0 flex items-center gap-2">
                      <button
                        onClick={() => setSelectedPost(post)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold transition"
                      >
                        <Eye size={14} />
                        <span>مشاهده کامل</span>
                      </button>

                      <button
                        onClick={() => handleShareSaved(post)}
                        className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition"
                        title="اشتراک‌گذاری"
                      >
                        {copiedPostId === post.id ? (
                          <Check size={16} className="text-emerald-400" />
                        ) : (
                          <Share2 size={16} />
                        )}
                      </button>

                      <button
                        onClick={() => handleRemoveSaved(post.id)}
                        className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-700 transition"
                        title="حذف از ذخیره‌ها"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* Full Preview Modal for Saved Post */}
      {selectedPost && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 dir-rtl overflow-y-auto">
          <div className="bg-[#090e21] border border-amber-500/40 rounded-3xl max-w-2xl w-full overflow-hidden text-white shadow-2xl relative flex flex-col max-h-[85vh] sm:max-h-[88vh] my-auto">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img 
                  src={selectedPost.authorAvatar} 
                  alt={selectedPost.authorName} 
                  className="w-9 h-9 rounded-full object-cover border-2 border-amber-400" 
                />
                <div>
                  <h3 className="text-sm font-black text-white">{selectedPost.authorName}</h3>
                  <span className="text-[10px] text-amber-300 font-mono">{selectedPost.squadName}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleRemoveSaved(selectedPost.id)}
                  className="px-3 py-1 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/40 text-xs font-bold transition flex items-center gap-1"
                >
                  <Trash2 size={13} />
                  <span>حذف از ذخیره‌ها</span>
                </button>

                <button
                  onClick={() => setSelectedPost(null)}
                  className="p-1.5 rounded-full bg-slate-900 text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Media Box */}
            <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
              {selectedPost.mediaType === 'video' && playingVideoId === selectedPost.id ? (
                <video 
                  src={selectedPost.videoSourceUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'} 
                  controls 
                  autoPlay 
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <>
                  <img 
                    src={selectedPost.mediaUrl} 
                    alt={selectedPost.title}
                    className="w-full h-full object-contain"
                  />
                  {selectedPost.mediaType === 'video' && (
                    <button
                      onClick={() => setPlayingVideoId(selectedPost.id)}
                      className="absolute p-4 rounded-full bg-amber-500 text-black shadow-xl cursor-pointer hover:scale-110 transition"
                    >
                      <Play size={24} className="fill-black mr-0.5" />
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Content & Action */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-950 text-amber-300 border border-amber-500/30">
                    {selectedPost.stageTag}
                  </span>
                </div>
                <h2 className="text-base font-black text-white">{selectedPost.title}</h2>
                <p className="text-xs text-slate-300 leading-relaxed">{selectedPost.description}</p>
              </div>

              {/* View Comments Button -> Takes to Vitrin */}
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-300">
                  برای مشاهده و ارسال دیدگاه در ویترین:
                </span>
                <button
                  onClick={() => {
                    setSelectedPost(null);
                    onNavigate?.('Vitrin');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition"
                >
                  <MessageCircle size={14} />
                  <span>مشاهده در ویترین</span>
                  <ArrowLeft size={13} />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Saved Vitrin Reels Modal */}
      <SavedVitrinReelsModal
        isOpen={showReelsModal}
        onClose={() => setShowReelsModal(false)}
        currentUser={currentUser}
        triggerAlert={triggerAlert}
        onNavigateToVitrin={() => {
          setShowReelsModal(false);
          onNavigate?.('Vitrin');
        }}
      />

    </div>
  );
}
