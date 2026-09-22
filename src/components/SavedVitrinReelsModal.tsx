import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Bookmark, Heart, MessageCircle, Play, Pause, Volume2, VolumeX, 
  Send, Loader2, ChevronDown, Share2, Sparkles, Video, ArrowLeft, CheckCircle2
} from 'lucide-react';
import { VitrinPost, VitrinComment, getAllComments, saveComment, toggleCommentLike, getVitrinPostsFromStore, getSavedPostIds, savePostId } from '../data/vitrinData';
import { formatToPersianDigits } from '../utils/jalali';
import { User } from '../types';

interface SavedVitrinReelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: User | null;
  onNavigateToVitrin?: () => void;
  triggerAlert?: (msg: string) => void;
}

export default function SavedVitrinReelsModal({
  isOpen,
  onClose,
  currentUser,
  onNavigateToVitrin,
  triggerAlert = () => {}
}: SavedVitrinReelsModalProps) {
  const [savedPosts, setSavedPosts] = useState<VitrinPost[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [doubleTapHeartPostId, setDoubleTapHeartPostId] = useState<string | null>(null);
  const [lastTapTime, setLastTapTime] = useState<Record<string, number>>({});
  
  // Comments state
  const [commentsMap, setCommentsMap] = useState<Record<string, VitrinComment[]>>({});
  const [expandedCommentsPostId, setExpandedCommentsPostId] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [visibleCommentsCount, setVisibleCommentsCount] = useState<Record<string, number>>({});
  const [loadingCommentsPostId, setLoadingCommentsPostId] = useState<string | null>(null);

  // User ratings & likes
  const [userRatings, setUserRatings] = useState<Record<string, number>>({});
  const [userLikedMap, setUserLikedMap] = useState<Record<string, boolean>>({});

  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  const isGirls = currentUser?.gender === 'دختر';

  // Notify global app layout to hide bottom navigation menu while modal is open
  useEffect(() => {
    if (isOpen) {
      window.dispatchEvent(new CustomEvent('warroom_modal_active_change', { detail: { active: true } }));
      return () => {
        window.dispatchEvent(new CustomEvent('warroom_modal_active_change', { detail: { active: false } }));
      };
    }
  }, [isOpen]);

  // Load saved posts whenever modal opens or saved IDs change
  useEffect(() => {
    if (isOpen) {
      const ids = getSavedPostIds(currentUser?.id);
      setSavedIds(ids);

      // 📡 Filter from the shared vitrin store (synced with Supabase via App state)
      const matched = getVitrinPostsFromStore(currentUser?.id).filter(post => ids.includes(post.id));
      setSavedPosts(matched);

      // Load comments
      const comments = getAllComments();
      setCommentsMap(comments);

      // Set initial playing video to first saved post if available
      if (matched.length > 0 && matched[0].mediaType === 'video') {
        setPlayingVideoId(matched[0].id);
      }
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleTogglePlay = (postId: string) => {
    const video = videoRefs.current[postId];
    if (!video) return;

    if (playingVideoId === postId && !video.paused) {
      video.pause();
      setPlayingVideoId(null);
    } else {
      // Pause others
      Object.values(videoRefs.current).forEach((v) => {
        if (v && v !== video) {
          (v as HTMLVideoElement).pause();
        }
      });
      video.play().catch(() => {});
      setPlayingVideoId(postId);
    }
  };

  const handleDoubleTap = (postId: string) => {
    const now = Date.now();
    const last = lastTapTime[postId] || 0;
    if (now - last < 350) {
      // Trigger like
      setUserLikedMap(prev => ({ ...prev, [postId]: true }));
      setDoubleTapHeartPostId(postId);
      triggerAlert('اثر پسندیده شد! ❤️');
      setTimeout(() => setDoubleTapHeartPostId(null), 900);
    }
    setLastTapTime(prev => ({ ...prev, [postId]: now }));
  };

  const handleToggleBookmark = (postId: string) => {
    const isAdded = savePostId(postId, currentUser?.id);
    const updatedIds = getSavedPostIds(currentUser?.id);
    setSavedIds(updatedIds);
    setSavedPosts(getVitrinPostsFromStore(currentUser?.id).filter(p => updatedIds.includes(p.id)));

    if (isAdded) {
      triggerAlert('به آثار ذخیره‌شده افزوده شد.');
    } else {
      triggerAlert('اثر از فهرست ذخیره‌ها حذف گردید.');
    }
  };

  const handleRate = (postId: string, rating: number) => {
    setUserRatings(prev => ({ ...prev, [postId]: rating }));
    triggerAlert(`امتیاز ${formatToPersianDigits(rating)} ستاره برای این اثر ثبت شد.`);
  };

  // Like a comment in saved reels modal (📡 همگام با Supabase)
  const handleToggleCommentLike = (postId: string, commentId: string) => {
    const updated = toggleCommentLike(postId, commentId);
    setCommentsMap(updated);
  };

  const handleAddComment = (postId: string) => {
    const text = (commentInputs[postId] || '').trim();
    if (!text) return;

    const newComment: VitrinComment = {
      id: 'c_' + Date.now(),
      postId,
      authorName: currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : 'رزمنده دلاور',
      authorAvatar: currentUser?.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      authorSquad: currentUser?.role === 'leader' ? 'فرمانده جوخه' : 'جوخه صاعقه ۱۲',
      content: text,
      createdAt: 'هم‌اکنون',
      likesCount: 0,
      isLiked: false
    };

    const updated = saveComment(newComment);
    setCommentsMap(updated);
    setCommentInputs(prev => ({ ...prev, [postId]: '' }));
    triggerAlert('دیدگاه شما با موفقیت ثبت و منتشر گردید.');
  };

  const getVisibleLimit = (postId: string) => visibleCommentsCount[postId] || 5;

  const loadMoreComments = (postId: string) => {
    setLoadingCommentsPostId(postId);
    setTimeout(() => {
      setVisibleCommentsCount(prev => ({
        ...prev,
        [postId]: (prev[postId] || 5) + 5
      }));
      setLoadingCommentsPostId(null);
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 dir-rtl overflow-y-auto font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ duration: 0.25 }}
        className="bg-[#070b16] border border-cyan-500/40 rounded-3xl max-w-xl w-full max-h-[85vh] sm:max-h-[88vh] flex flex-col shadow-2xl overflow-hidden relative my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-800/80 bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl border shadow-md ${
              isGirls 
                ? 'bg-pink-950/80 text-pink-400 border-pink-700/50' 
                : 'bg-cyan-950/80 text-cyan-400 border-cyan-700/50'
            }`}>
              <Bookmark size={20} className="fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-white">
                  ویدیوها و آثار ذخیره‌شده ویترین
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {formatToPersianDigits(savedPosts.length)} اثر
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                فید ریلز و پخش اختصاصی دست‌سازه‌ها و ویدیوهای نشان‌گذاری شده شما
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-6">
          {savedPosts.length === 0 ? (
            /* Empty State */
            <div className="py-14 px-4 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-slate-900/90 border border-slate-800 flex items-center justify-center text-slate-500 shadow-inner">
                <Bookmark size={36} className="text-slate-600" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h3 className="text-base font-black text-white">
                  هنوز هیچ اثری را ذخیره نکرده‌اید
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  هنگام تماشای ویدیوها و دست‌سازه‌ها در بخش ویترین، با کلیک روی آیکون بوکمارک (ذخیره) می‌توانید آثار منتخب را برای تماشای مجدد در این بخش داشته باشید.
                </p>
              </div>

              {onNavigateToVitrin && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateToVitrin();
                  }}
                  className={`mt-3 flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black shadow-lg transition ${
                    isGirls
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:from-pink-400 hover:to-purple-500'
                      : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 hover:from-cyan-400 hover:to-blue-500'
                  }`}
                >
                  <Video size={16} />
                  <span>رفتن به ویترین و مشاهده آثار</span>
                  <ArrowLeft size={14} />
                </button>
              )}
            </div>
          ) : (
            /* Reels / Feed Stream of Saved Posts */
            <div className="space-y-6 max-w-md mx-auto">
              {savedPosts.map((post) => {
                const isPlaying = playingVideoId === post.id;
                const postComments = commentsMap[post.id] || [];
                const isCommentsExpanded = expandedCommentsPostId === post.id;
                const currentLimit = getVisibleLimit(post.id);
                const visibleComments = postComments.slice(0, currentLimit);
                const hasMoreComments = postComments.length > currentLimit;
                const isLiked = userLikedMap[post.id] || post.isLikedByUser;
                const userRating = userRatings[post.id] || post.userRating || 0;

                return (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#080d1a] border border-slate-800/90 rounded-3xl overflow-hidden shadow-xl"
                  >
                    {/* Author Bar */}
                    <div className="p-3.5 flex items-center justify-between bg-slate-950/60 border-b border-slate-800/60">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-full ring-2 ring-cyan-500/50 p-0.5 overflow-hidden bg-slate-900">
                          <img src={post.authorAvatar} alt={post.authorName} className="w-full h-full object-cover rounded-full" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-xs text-white">{post.authorName}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-800/60 text-cyan-300 font-mono">
                              {post.stageTag}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-0.5">{post.squadName}</span>
                        </div>
                      </div>

                      {/* Remove from Saved Bookmark button */}
                      <button
                        type="button"
                        onClick={() => handleToggleBookmark(post.id)}
                        className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40 transition flex items-center gap-1 text-[11px] font-bold"
                        title="حذف از ذخیره‌ها"
                      >
                        <Bookmark size={15} className="fill-amber-400 text-amber-400" />
                        <span>ذخیره‌شده</span>
                      </button>
                    </div>

                    {/* Media / Video Stage with Reel Controls */}
                    <div 
                      className="relative aspect-video bg-black flex items-center justify-center overflow-hidden cursor-pointer select-none"
                      onClick={() => handleDoubleTap(post.id)}
                    >
                      {post.mediaType === 'video' ? (
                        <>
                          <video
                            ref={(el) => { videoRefs.current[post.id] = el; }}
                            src={post.videoSourceUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'}
                            poster={post.mediaUrl}
                            playsInline
                            loop
                            muted={isMuted}
                            className="w-full h-full object-cover"
                          />

                          {/* Play/Pause Overlay Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTogglePlay(post.id);
                            }}
                            className={`absolute inset-0 m-auto w-14 h-14 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 text-white flex items-center justify-center transition-all ${
                              isPlaying ? 'opacity-0 hover:opacity-90' : 'opacity-90 scale-100'
                            }`}
                          >
                            {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
                          </button>

                          {/* Volume Toggle */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsMuted(!isMuted);
                            }}
                            className="absolute bottom-3 left-3 p-2 rounded-xl bg-black/60 backdrop-blur-sm border border-white/20 text-white hover:bg-black/80 transition"
                          >
                            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                          </button>
                        </>
                      ) : (
                        <img 
                          src={post.mediaUrl} 
                          alt={post.title} 
                          className="w-full h-full object-cover" 
                        />
                      )}

                      {/* Double Tap Heart Pop */}
                      <AnimatePresence>
                        {doubleTapHeartPostId === post.id && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1.4, opacity: 1 }}
                            exit={{ scale: 1.8, opacity: 0 }}
                            className="absolute inset-0 m-auto flex items-center justify-center pointer-events-none z-30"
                          >
                            <Heart size={80} className="fill-rose-500 text-rose-500 drop-shadow-[0_0_20px_rgba(244,63,94,0.8)]" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Post Details, Caption & Rating */}
                    <div className="p-4 space-y-3">
                      <div>
                        <h3 className="font-black text-sm text-white">{post.title}</h3>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">{post.description}</p>
                      </div>

                      {/* Action Bar: Like, Comments Toggle, Share, Rating */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                        <div className="flex items-center gap-3">
                          {/* Like */}
                          <button
                            type="button"
                            onClick={() => {
                              setUserLikedMap(prev => ({ ...prev, [post.id]: !isLiked }));
                              triggerAlert(isLiked ? 'پسند پس گرفته شد.' : 'اثر پسندیده شد! ❤️');
                            }}
                            className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-rose-400 transition font-bold"
                          >
                            <Heart size={18} className={isLiked ? 'fill-rose-500 text-rose-500' : ''} />
                            <span>{formatToPersianDigits(post.likesCount + (isLiked ? 1 : 0))}</span>
                          </button>

                          {/* Comments */}
                          <button
                            type="button"
                            onClick={() => setExpandedCommentsPostId(isCommentsExpanded ? null : post.id)}
                            className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-cyan-400 transition font-bold"
                          >
                            <MessageCircle size={18} />
                            <span>{formatToPersianDigits(postComments.length)}</span>
                          </button>
                        </div>
                      </div>

                      {/* Expandable Comments Drawer */}
                      {isCommentsExpanded && (
                        <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span className="font-bold text-slate-300">
                              دیدگاه‌ها ({formatToPersianDigits(Math.min(currentLimit, postComments.length))} از {formatToPersianDigits(postComments.length)})
                            </span>
                            <span className="text-[10px] text-slate-500">لیزی لود ۵ تایی</span>
                          </div>

                          <div className="max-h-56 overflow-y-auto space-y-2.5 pr-1 text-xs">
                            {visibleComments.length === 0 ? (
                              <p className="text-center py-4 text-slate-500 text-xs">هنوز دیدگاهی ثبت نشده است. اولین نظر را شما بنویسید!</p>
                            ) : (
                              visibleComments.map((c) => (
                                <div key={c.id} className="p-2.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5 transition hover:border-slate-700">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      {/* User Avatar */}
                                      <div className="w-7 h-7 rounded-full bg-slate-800 border border-cyan-500/40 ring-1 ring-cyan-500/20 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                                        {c.authorAvatar ? (
                                          <img 
                                            src={c.authorAvatar} 
                                            alt={c.authorName} 
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                              // Fallback if image fails
                                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80';
                                            }} 
                                          />
                                        ) : (
                                          <span className="text-[11px] font-black text-cyan-300">
                                            {c.authorName ? c.authorName[0] : 'ر'}
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-black text-white text-[11px]">{c.authorName}</span>
                                        {c.authorSquad && (
                                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-900 border border-slate-750 text-slate-400 font-mono">
                                            {c.authorSquad}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <span className="text-[9px] text-slate-500 font-mono">{c.createdAt}</span>
                                      {/* Comment Like */}
                                      <button
                                        type="button"
                                        onClick={() => handleToggleCommentLike(post.id, c.id)}
                                        className="flex items-center gap-1 text-slate-500 hover:text-rose-400 transition"
                                        title="پسندیدن نظر"
                                      >
                                        <Heart size={12} className={c.isLiked ? 'fill-rose-500 text-rose-500' : ''} />
                                        {(c.likesCount || 0) > 0 && (
                                          <span className="text-[9px] font-mono">{formatToPersianDigits(c.likesCount || 0)}</span>
                                        )}
                                      </button>
                                    </div>
                                  </div>

                                  <p className="text-slate-300 text-[11px] leading-relaxed pr-9 pl-1">
                                    {c.content}
                                  </p>
                                </div>
                              ))
                            )}

                            {hasMoreComments && (
                              <button
                                type="button"
                                onClick={() => loadMoreComments(post.id)}
                                disabled={loadingCommentsPostId === post.id}
                                className="w-full py-1.5 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-cyan-200 text-xs font-bold transition flex items-center justify-center gap-1.5 hover:bg-cyan-900/40"
                              >
                                {loadingCommentsPostId === post.id ? (
                                  <Loader2 size={13} className="animate-spin text-cyan-400" />
                                ) : (
                                  <>
                                    <ChevronDown size={14} />
                                    <span>بارگذاری ۵ دیدگاه بیشتر</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>

                          {/* Comment Input with current user avatar */}
                          <div className="flex items-center gap-2 pt-1.5">
                            <div className="w-7 h-7 rounded-full bg-slate-800 border border-cyan-500/50 overflow-hidden shrink-0 shadow-sm">
                              <img
                                src={currentUser?.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80'}
                                alt="آواتار شما"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <input
                              type="text"
                              value={commentInputs[post.id] || ''}
                              onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                              onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                              placeholder="دیدگاه خود را بنویسید..."
                              className="w-full bg-slate-950 border border-slate-750 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddComment(post.id)}
                              className="p-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-bold transition shadow-md shrink-0"
                              title="ارسال دیدگاه"
                            >
                              <Send size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800/80 bg-slate-950/80 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-400">
            {savedPosts.length > 0 ? `نمایش ${formatToPersianDigits(savedPosts.length)} اثر ذخیره‌شده` : 'بدون اثر ذخیره‌شده'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold transition border border-slate-700"
          >
            بستن
          </button>
        </div>
      </motion.div>
    </div>
  );
}
