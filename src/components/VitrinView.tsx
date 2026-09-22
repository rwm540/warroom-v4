import React, { useState, useEffect, useRef, Dispatch, SetStateAction } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  Play, 
  MessageCircle, 
  Share2, 
  Sparkles, 
  X, 
  Bookmark, 
  Send, 
  Check, 
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  User as UserIcon,
  ThumbsUp,
  Loader2,
  ArrowDown,
  Video
} from 'lucide-react';
import { User } from '../types';
import { formatToPersianDigits } from '../utils/jalali';
import { playTacticalSound } from '../utils/epicBgmEngine';
import RadarLoading from './RadarLoading';
import SavedVitrinReelsModal from './SavedVitrinReelsModal';
import { 
  VitrinPost, 
  VitrinComment, 
  getSavedPostIds, 
  savePostId, 
  saveComment, 
  toggleCommentLike as vitrinToggleCommentLike 
} from '../data/vitrinData';

interface VitrinViewProps {
  currentUser: User | null;
  // 📡 داده‌های همگام با Supabase (از State سراسری App)
  posts: VitrinPost[];
  setPosts: Dispatch<SetStateAction<VitrinPost[]>>;
  commentsMap?: Record<string, VitrinComment[]>;
  triggerAlert: (msg: string) => void;
  onNavigate?: (tab: string) => void;
}

export default function VitrinView({
  currentUser,
  posts,
  setPosts,
  commentsMap: commentsMapProp,
  triggerAlert,
  onNavigate
}: VitrinViewProps) {
  const isGirls = currentUser?.gender === 'دختر' || localStorage.getItem('hisstory_theme_mode') === 'girls';

  // 📡 پست‌ها: مستقیماً از State همگام‌شده با Supabase (پنل مدیریت + تأیید آثار)
  // (Prop از App دریافت می‌شود؛ تغییرات این صفحه با setPosts به دیتابیس همگام می‌شوند)

  // 📡 نظرات: آینه‌ی State همگام‌شده با Supabase
  // (تغییرات از طریق saveComment/toggleCommentLike → رویداع → App → این Prop)
  const [commentsMap, setCommentsMap] = useState<Record<string, VitrinComment[]>>(commentsMapProp || {});
  useEffect(() => {
    if (commentsMapProp) setCommentsMap(commentsMapProp);
  }, [commentsMapProp]);

  // Lazy Loading for Vitrin Feed: Display 1 post initially, load 1 next post per scroll/trigger
  const [visiblePostsCount, setVisiblePostsCount] = useState<number>(1);
  const [isLoadingNextPost, setIsLoadingNextPost] = useState<boolean>(false);
  const bottomSentinelRef = useRef<HTMLDivElement | null>(null);

  // Lazy Loading for Comments: Display 5 comments at a time per post
  const [visibleCommentsCountMap, setVisibleCommentsCountMap] = useState<Record<string, number>>({});
  const [loadingCommentsPostId, setLoadingCommentsPostId] = useState<string | null>(null);

  const getVisibleCommentsCount = (postId: string) => visibleCommentsCountMap[postId] || 5;

  const loadMoreComments = (postId: string) => {
    setLoadingCommentsPostId(postId);
    setTimeout(() => {
      setVisibleCommentsCountMap(prev => ({
        ...prev,
        [postId]: (prev[postId] || 5) + 5
      }));
      setLoadingCommentsPostId(null);
    }, 280);
  };

  const loadNextPost = () => {
    if (visiblePostsCount >= posts.length || isLoadingNextPost) return;
    setIsLoadingNextPost(true);
    setTimeout(() => {
      setVisiblePostsCount(prev => Math.min(posts.length, prev + 1));
      setIsLoadingNextPost(false);
    }, 450);
  };

  // IntersectionObserver to auto-load next post when scrolling to the bottom sentinel
  useEffect(() => {
    const sentinel = bottomSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry && entry.isIntersecting && visiblePostsCount < posts.length && !isLoadingNextPost) {
        loadNextPost();
      }
    }, {
      rootMargin: '160px',
      threshold: 0.1
    });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visiblePostsCount, posts.length, isLoadingNextPost]);

  // Window scroll event listener to guarantee smooth auto-loading on all devices
  useEffect(() => {
    const handleScroll = () => {
      if (isLoadingNextPost || visiblePostsCount >= posts.length) return;
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      if (scrollY + windowHeight >= docHeight - 250) {
        loadNextPost();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [visiblePostsCount, posts.length, isLoadingNextPost]);

  const [showSavedReelsModal, setShowSavedReelsModal] = useState(false);
  const savedPostsCount = posts.filter(p => p.isBookmarked).length;

  // Active expandable comments section on feed cards
  const [expandedCommentsPostId, setExpandedCommentsPostId] = useState<string | null>(null);
  
  // Comment draft inputs per post
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  const [selectedPost, setSelectedPost] = useState<VitrinPost | null>(null);
  const [heartAnimId, setHeartAnimId] = useState<string | null>(null);
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedPost) {
      window.dispatchEvent(new CustomEvent('warroom_modal_active_change', { detail: { active: true } }));
      return () => {
        window.dispatchEvent(new CustomEvent('warroom_modal_active_change', { detail: { active: false } }));
      };
    }
  }, [selectedPost]);

  // Double Click / Double Tap to Like implementation
  const [lastTap, setLastTap] = useState<{ [key: string]: number }>({});

  const handleDoubleTap = (post: VitrinPost) => {
    const now = Date.now();
    const prevTap = lastTap[post.id] || 0;

    if (now - prevTap < 300) {
      toggleLike(post.id, true);
      setHeartAnimId(post.id);
      setTimeout(() => setHeartAnimId(null), 800);
    }
    setLastTap({ ...lastTap, [post.id]: now });
  };

  const toggleLike = (postId: string, forceLike = false) => {
    playTacticalSound('like');
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const nextLiked = forceLike ? true : !p.isLikedByUser;
        return {
          ...p,
          isLikedByUser: nextLiked,
          likesCount: nextLiked ? p.likesCount + 1 : Math.max(0, p.likesCount - 1)
        };
      }
      return p;
    }));

    if (selectedPost && selectedPost.id === postId) {
      setSelectedPost(prev => prev ? {
        ...prev,
        isLikedByUser: forceLike ? true : !prev.isLikedByUser,
        likesCount: (forceLike || !prev.isLikedByUser) ? prev.likesCount + 1 : Math.max(0, prev.likesCount - 1)
      } : null);
    }
  };

  // Toggle Bookmark & Persist into Saved Vitrin Posts
  const toggleBookmark = (postId: string) => {
    const isAdded = savePostId(postId, currentUser?.id);
    
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return { ...p, isBookmarked: isAdded };
      }
      return p;
    }));

    if (selectedPost && selectedPost.id === postId) {
      setSelectedPost(prev => prev ? { ...prev, isBookmarked: isAdded } : null);
    }

    if (isAdded) {
      triggerAlert('اثر در بخش «ذخیره‌های ویترین» پروفایل شما ذخیره شد.');
    } else {
      triggerAlert('اثر از ذخیره‌های ویترین حذف شد.');
    }
  };

  // Real Share Link Copy to Clipboard
  const handleSharePost = (post: VitrinPost) => {
    const shareUrl = `${window.location.origin}${window.location.pathname}#vitrin-post-${post.id}`;
    
    const fallbackCopy = (text: string) => {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopiedPostId(post.id);
        setTimeout(() => setCopiedPostId(null), 2500);
        triggerAlert(`لینک اثر «${post.title}» کپی شد!`);
      } catch (err) {
        triggerAlert(`لینک اشتراک: ${text}`);
      }
    };

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(shareUrl)
        .then(() => {
          setCopiedPostId(post.id);
          setTimeout(() => setCopiedPostId(null), 2500);
          triggerAlert(`لینک اثر «${post.title}» کپی شد!`);
        })
        .catch(() => {
          fallbackCopy(shareUrl);
        });
    } else {
      fallbackCopy(shareUrl);
    }
  };

  // 1 to 5 Star Rating System
  const handleRatePost = (postId: string, stars: number) => {
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          userRating: stars,
          ratingAverage: Number(((p.ratingAverage * 4 + stars) / 5).toFixed(1))
        };
      }
      return p;
    }));

    if (selectedPost && selectedPost.id === postId) {
      setSelectedPost(prev => prev ? {
        ...prev,
        userRating: stars,
        ratingAverage: Number(((prev.ratingAverage * 4 + stars) / 5).toFixed(1))
      } : null);
    }

    triggerAlert(`امتیاز ${stars} ستاره برای این اثر ثبت شد.`);
  };

  // Add a new comment
  const handleAddComment = (postId: string) => {
    const content = (commentInputs[postId] || '').trim();
    if (!content) {
      triggerAlert('لطفاً متن نظر خود را بنویسید.');
      return;
    }

    const authorName = currentUser 
      ? `${currentUser.first_name} ${currentUser.last_name}` 
      : 'رزمنده مهمان';

    const authorSquad = currentUser?.role === 'admin' 
      ? 'ستاد فرماندهی' 
      : (currentUser?.gender === 'دختر' ? 'جوخه نسترن' : 'جوخه صاعقه');

    const defaultAvatar = currentUser?.gender === 'دختر'
      ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
      : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80';

    const newComment: VitrinComment = {
      id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      postId,
      authorName,
      authorAvatar: currentUser?.avatar_url || defaultAvatar,
      authorSquad,
      content,
      createdAt: 'هم‌اکنون',
      likesCount: 0,
      isLiked: false
    };

    const updatedComments = saveComment(newComment);
    setCommentsMap(updatedComments);
    setCommentInputs(prev => ({ ...prev, [postId]: '' }));

    // Ensure newly added comment is visible
    setVisibleCommentsCountMap(prev => ({
      ...prev,
      [postId]: Math.max(prev[postId] || 5, 5)
    }));

    // Update comments count on post
    const currentCount = updatedComments[postId]?.length || 1;
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, commentsCount: currentCount } : p));
    if (selectedPost && selectedPost.id === postId) {
      setSelectedPost(prev => prev ? { ...prev, commentsCount: currentCount } : null);
    }

    playTacticalSound('comment');
    triggerAlert('دیدگاه شما با موفقیت ثبت و منتشر شد.');
  };

  // Like a comment (📡 همگام با Supabase از طریق ابزار sync‌شده)
  const handleToggleCommentLike = (postId: string, commentId: string) => {
    const updated = vitrinToggleCommentLike(postId, commentId);
    setCommentsMap(updated);
  };

  // Total saved count for user
  const savedCount = posts.filter(p => p.isBookmarked).length;

  return (
    <div className="space-y-5 dir-rtl pb-28 max-w-4xl mx-auto px-2.5 sm:px-4 pt-1 font-sans select-none">
      
      {/* 1. Header Section with Saved Button */}
      <div className="flex items-center justify-between bg-slate-950/40 p-4 rounded-3xl border border-slate-800 shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-2xl border shadow-md ${
            isGirls 
              ? 'bg-pink-950/80 text-pink-400 border-pink-700/50' 
              : 'bg-cyan-950/80 text-cyan-400 border-cyan-700/50'
          }`}>
            <Sparkles size={22} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-black text-white">ویترین آثار و دست‌سازه‌ها</h1>
            <p className="text-[10px] text-slate-400 mt-0.5">نمایش برترین مأموریت‌های انجام‌شده توسط رزمندگان</p>
          </div>
        </div>

        <button
          onClick={() => {
            playTacticalSound('click');
            setShowSavedReelsModal(true);
          }}
          className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-amber-500/20 to-rose-500/20 border border-amber-500/40 text-amber-300 hover:text-white hover:border-amber-400 text-xs font-bold transition shadow-sm group cursor-pointer"
          title="مشاهده ویدیوها و آثار ذخیره‌شده"
        >
          <Bookmark size={16} className="fill-amber-400 text-amber-400 group-hover:scale-110 transition" />
          <span className="hidden sm:inline">ذخیره‌های ویترین</span>
          {savedPostsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-black bg-amber-400 text-black">
              {formatToPersianDigits(savedPostsCount)}
            </span>
          )}
        </button>
      </div>

      {/* 2. Instagram Feed / Timeline Stream with 1-by-1 Post Lazy Loading */}
      <div className="max-w-xl mx-auto space-y-6">
        {posts.length === 0 && (
          <div className={`p-10 rounded-3xl border border-dashed text-center space-y-3 ${
            isGirls ? 'border-fuchsia-500/30 bg-[#150220]/50' : 'border-blue-500/30 bg-[#060c20]/50'
          }`}>
            <Sparkles className={`mx-auto ${isGirls ? 'text-fuchsia-400' : 'text-cyan-400'}`} size={36} />
            <p className="text-sm font-black text-white">ویترین آثار هنوز خالی است</p>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
              آثار ارسالی رزمندگان پس از ارزیابی و تأیید ستاد داوری، در این بخش به نمایش عمومی درمی‌آید. شما هم می‌توانید پاسخ مأموریت‌های خود را ارسال کنید تا اثر شما در ویترین منتشر شود.
            </p>
          </div>
        )}
        {posts.slice(0, visiblePostsCount).map((post, postIndex) => {
          const isPlaying = playingVideoId === post.id;
          const postComments = commentsMap[post.id] || [];
          const isCommentsExpanded = expandedCommentsPostId === post.id;
          const currentVisibleLimit = getVisibleCommentsCount(post.id);
          const visibleComments = postComments.slice(0, currentVisibleLimit);
          const hasMoreComments = postComments.length > currentVisibleLimit;

          return (
            <motion.div 
              key={post.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="bg-[#080d1a] border border-slate-800 rounded-3xl overflow-hidden shadow-xl"
            >
              {/* Feed Header (Author Info & Badge) */}
              <div className="p-3.5 flex items-center justify-between border-b border-slate-800/80">
                <div className="flex items-center gap-2.5">
                  <div className="p-0.5 rounded-full bg-gradient-to-tr from-rose-500 to-amber-400">
                    <img 
                      src={post.authorAvatar} 
                      alt={post.authorName} 
                      loading="lazy"
                      className="w-9 h-9 rounded-full object-cover border border-[#080d1a]"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-white">{post.authorName}</span>
                      {post.badge && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-500/40">
                          {post.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{post.squadName}</span>
                  </div>
                </div>

                <span className="text-[10px] text-slate-400 font-mono">
                  {post.timeAgo || 'امروز'}
                </span>
              </div>

              {/* Feed Media with Lazy Loading & Double Tap */}
              <div 
                onClick={() => handleDoubleTap(post)}
                className="relative aspect-square sm:aspect-[4/3] bg-black flex items-center justify-center overflow-hidden cursor-pointer group select-none"
              >
                {post.mediaType === 'video' && isPlaying ? (
                  <video 
                    src={post.videoSourceUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'} 
                    controls 
                    autoPlay 
                    playsInline
                    preload="none"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <>
                    <img 
                      src={post.mediaUrl} 
                      alt={post.title} 
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-102 transition duration-500"
                    />
                    {post.mediaType === 'video' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlayingVideoId(post.id);
                        }}
                        className="absolute p-3.5 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 text-white backdrop-blur-md shadow-2xl transition transform hover:scale-110"
                        title="پخش ویدیو"
                      >
                        <Play size={24} className="fill-white mr-0.5" />
                      </button>
                    )}
                  </>
                )}

                {/* Stage Tag */}
                <div className="absolute top-3 left-3 pointer-events-none">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-black/70 text-amber-300 border border-amber-500/30 backdrop-blur-md">
                    {post.stageTag}
                  </span>
                </div>

                {/* Double Tap Floating Animated Heart */}
                <AnimatePresence>
                  {heartAnimId === post.id && (
                    <motion.div 
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1.4, opacity: 1 }}
                      exit={{ scale: 2, opacity: 0 }}
                      transition={{ duration: 0.5 }}
                      className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
                    >
                      <Heart size={80} className="fill-rose-500 text-rose-500 drop-shadow-[0_0_30px_rgba(244,63,94,0.9)]" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Feed Actions (Like, Comment, Share Link, Bookmark) */}
              <div className="p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Heart Like */}
                    <button
                      onClick={() => toggleLike(post.id)}
                      className="p-1 text-slate-300 hover:text-rose-500 transition transform active:scale-125"
                      title={post.isLikedByUser ? 'حذف لایک' : 'پسندیدن اثر'}
                    >
                      <Heart 
                        size={22} 
                        className={post.isLikedByUser ? 'fill-rose-500 text-rose-500' : ''} 
                      />
                    </button>

                    {/* Comment Toggle - Only clicking this icon opens view & add comments */}
                    <button
                      onClick={() => {
                        playTacticalSound('click');
                        setExpandedCommentsPostId(isCommentsExpanded ? null : post.id);
                      }}
                      className={`p-1 transition flex items-center gap-1 cursor-pointer ${
                        isCommentsExpanded 
                          ? isGirls ? 'text-pink-400 font-bold' : 'text-cyan-400 font-bold'
                          : 'text-slate-300 hover:text-cyan-400'
                      }`}
                      title={isCommentsExpanded ? 'بستن بخش نظرات' : 'مشاهده و ثبت نظر'}
                    >
                      <MessageCircle size={21} className={isCommentsExpanded ? (isGirls ? 'fill-pink-400/30' : 'fill-cyan-400/30') : ''} />
                      <span className="text-xs font-bold font-mono">
                        {formatToPersianDigits(postComments.length)}
                      </span>
                    </button>

                    {/* Share Link */}
                    <button
                      onClick={() => handleSharePost(post)}
                      className="p-1 text-slate-300 hover:text-cyan-400 transition"
                      title="کپی لینک اختصاصی این اثر"
                    >
                      {copiedPostId === post.id ? (
                        <Check size={21} className="text-emerald-400" />
                      ) : (
                        <Share2 size={20} />
                      )}
                    </button>
                  </div>

                  {/* Bookmark Button */}
                  <button
                    onClick={() => toggleBookmark(post.id)}
                    className="p-1 text-slate-300 hover:text-amber-400 transition transform active:scale-125"
                    title={post.isBookmarked ? 'حذف از ذخیره‌ها' : 'ذخیره در ذخیره‌های ویترین'}
                  >
                    <Bookmark 
                      size={21} 
                      className={post.isBookmarked ? 'fill-amber-400 text-amber-400' : ''} 
                    />
                  </button>
                </div>

                {/* Likes Count */}
                <div className="text-xs font-black text-white">
                  {formatToPersianDigits(post.likesCount)} پسند (لایک)
                </div>

                {/* Caption & Title */}
                <div className="text-xs text-slate-200 leading-relaxed space-y-0.5">
                  <span className="font-black text-white ml-1.5">{post.authorName}:</span>
                  <strong className="text-white block sm:inline font-bold">{post.title} - </strong>
                  <span className="text-slate-300">{post.description}</span>
                </div>

                {/* ========================================================================= */}
                {/* EXPANDABLE COMMENTS STREAM & INPUT FORM (Opened only via comment icon)    */}
                {/* ========================================================================= */}
                <AnimatePresence>
                  {isCommentsExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mt-3 pt-3 border-t border-slate-800 space-y-3 overflow-hidden"
                    >
                      {/* Comments List Header */}
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-bold text-slate-300">
                          نظرات و دیدگاه‌های همرزمان ({formatToPersianDigits(Math.min(currentVisibleLimit, postComments.length))} از {formatToPersianDigits(postComments.length)})
                        </span>
                        <span className="text-[10px] text-slate-500">لیزی لود ۵ تایی</span>
                      </div>

                      {/* Comments Scrollable Area */}
                      <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1 text-xs">
                        {postComments.length === 0 ? (
                          <div className="py-4 text-center text-slate-500 text-[11px]">
                            هنوز دیدگاهی برای این اثر ثبت نشده است. اولین نظر را شما بنویسید!
                          </div>
                        ) : (
                          <>
                            {visibleComments.map((comment) => (
                              <div 
                                key={comment.id}
                                className="p-2.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-start justify-between gap-2.5"
                              >
                                <div className="flex items-start gap-2">
                                  <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[11px] font-bold text-slate-200 overflow-hidden flex-shrink-0">
                                    {comment.authorAvatar ? (
                                      <img src={comment.authorAvatar} alt={comment.authorName} className="w-full h-full object-cover" />
                                    ) : (
                                      comment.authorName[0] || 'ر'
                                    )}
                                  </div>
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-black text-white text-[11px]">{comment.authorName}</span>
                                      {comment.authorSquad && (
                                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 font-mono">
                                          {comment.authorSquad}
                                        </span>
                                      )}
                                      <span className="text-[9px] text-slate-500 font-mono">{comment.createdAt}</span>
                                    </div>
                                    <p className="text-slate-300 text-[11px] leading-relaxed">
                                      {comment.content}
                                    </p>
                                  </div>
                                </div>

                                {/* Comment Like Button */}
                                <button
                                  onClick={() => handleToggleCommentLike(post.id, comment.id)}
                                  className="flex flex-col items-center justify-center p-1 text-slate-500 hover:text-rose-400 transition"
                                  title="پسندیدن این دیدگاه"
                                >
                                  <Heart 
                                    size={13} 
                                    className={comment.isLiked ? 'fill-rose-500 text-rose-500' : ''} 
                                  />
                                  {(comment.likesCount || 0) > 0 && (
                                    <span className="text-[9px] font-mono mt-0.5">
                                      {formatToPersianDigits(comment.likesCount)}
                                    </span>
                                  )}
                                </button>
                              </div>
                            ))}

                            {/* Lazy load 5 more comments button */}
                            {hasMoreComments && (
                              <div className="pt-1.5 pb-0.5">
                                <button
                                  type="button"
                                  onClick={() => loadMoreComments(post.id)}
                                  disabled={loadingCommentsPostId === post.id}
                                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 ${
                                    isGirls
                                      ? 'bg-pink-950/40 hover:bg-pink-900/60 border-pink-500/40 text-pink-200'
                                      : 'bg-cyan-950/40 hover:bg-cyan-900/60 border-cyan-500/40 text-cyan-200'
                                  }`}
                                >
                                  {loadingCommentsPostId === post.id ? (
                                    <>
                                      <Loader2 size={13} className="animate-spin text-cyan-400" />
                                      <span>در حال بارگذاری ۵ دیدگاه بعدی...</span>
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown size={14} />
                                      <span>
                                        بارگذاری ۵ دیدگاه بیشتر (نمایش {formatToPersianDigits(Math.min(currentVisibleLimit, postComments.length))} از {formatToPersianDigits(postComments.length)})
                                      </span>
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Comment Input Box */}
                      <div className="flex items-center gap-2 pt-1">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-black text-white flex-shrink-0">
                          {currentUser ? currentUser.first_name[0] : <UserIcon size={14} />}
                        </div>
                        <div className="flex-1 relative">
                          <input 
                            type="text"
                            value={commentInputs[post.id] || ''}
                            onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleAddComment(post.id);
                              }
                            }}
                            placeholder="دیدگاه خود را درباره این اثر بنویسید..."
                            className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition"
                          />
                        </div>
                        <button
                          onClick={() => handleAddComment(post.id)}
                          className={`p-2 rounded-xl text-black font-bold transition flex items-center justify-center ${
                            isGirls 
                              ? 'bg-gradient-to-r from-pink-400 to-rose-500 hover:brightness-110' 
                              : 'bg-gradient-to-r from-cyan-400 to-blue-500 hover:brightness-110'
                          }`}
                          title="ارسال دیدگاه"
                        >
                          <Send size={15} className="mr-0.5" />
                        </button>
                      </div>

                    </motion.div>
                  )}
                </AnimatePresence>

              </div>

            </motion.div>
          );
        })}

        {/* Lazy Loading Sentinel and Next Video Controller */}
        {visiblePostsCount < posts.length ? (
          <div 
            ref={bottomSentinelRef} 
            className="py-6 flex flex-col items-center justify-center gap-3 transition-all"
          >
            {/* Status counter pill */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs text-slate-300 font-mono shadow-sm">
              <span>در حال نمایش اثر {formatToPersianDigits(visiblePostsCount)} از {formatToPersianDigits(posts.length)}</span>
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            </div>

            {/* Loading Indicator or Action Button */}
            {isLoadingNextPost ? (
              <div className="flex flex-col items-center justify-center py-2">
                <RadarLoading size="sm" label="در حال پویش و دریافت ویدیوی بعدی..." subLabel="سامانه ویترین اتاق جنگ" />
              </div>
            ) : (
              <button
                type="button"
                onClick={loadNextPost}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition shadow-lg border group ${
                  isGirls 
                    ? 'bg-gradient-to-r from-pink-950/70 to-purple-950/70 border-pink-500/40 text-pink-200 hover:border-pink-400' 
                    : 'bg-gradient-to-r from-cyan-950/70 to-blue-950/70 border-cyan-500/40 text-cyan-200 hover:border-cyan-400'
                }`}
              >
                <ArrowDown size={15} className="group-hover:translate-y-1 transition duration-200" />
                <span>برای نمایش اثر بعدی به پایین اسکرول کنید یا کلیک نمایید</span>
              </button>
            )}
          </div>
        ) : (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-center text-slate-500 text-xs">
            <div className="flex items-center gap-2 text-emerald-400 bg-emerald-950/30 border border-emerald-500/30 px-4 py-1.5 rounded-full font-bold">
              <CheckCircle2 size={14} />
              <span>تمام {formatToPersianDigits(posts.length)} اثر ویترین بارگذاری شدند</span>
            </div>
            <span className="text-[10px] text-slate-500">برای مشاهده مجدد به بالای صفحه اسکرول کنید.</span>
          </div>
        )}
      </div>

      <SavedVitrinReelsModal
        isOpen={showSavedReelsModal}
        onClose={() => setShowSavedReelsModal(false)}
        currentUser={currentUser}
        triggerAlert={triggerAlert}
        onNavigateToVitrin={() => setShowSavedReelsModal(false)}
      />

      {/* 3. Full-Screen Interactive Media Modal with 1-5 Star Rating & Comments */}
      {selectedPost && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 dir-rtl overflow-y-auto">
          <div className="bg-[#090e21] border border-cyan-500/40 rounded-3xl max-w-2xl w-full overflow-hidden text-white shadow-2xl relative flex flex-col max-h-[85vh] sm:max-h-[88vh] my-auto">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img 
                  src={selectedPost.authorAvatar} 
                  alt={selectedPost.authorName} 
                  loading="lazy"
                  className="w-9 h-9 rounded-full object-cover border-2 border-cyan-400" 
                />
                <div>
                  <h3 className="text-sm font-black text-white">{selectedPost.authorName}</h3>
                  <span className="text-[10px] text-cyan-300 font-mono">{selectedPost.squadName}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleBookmark(selectedPost.id)}
                  className={`p-1.5 rounded-full border transition ${
                    selectedPost.isBookmarked 
                      ? 'bg-amber-400 text-black border-amber-300' 
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                  title={selectedPost.isBookmarked ? 'حذف از ذخیره‌ها' : 'ذخیره در پروفایل'}
                >
                  <Bookmark size={16} className={selectedPost.isBookmarked ? 'fill-black' : ''} />
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
            <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden flex-shrink-0">
              <img 
                src={selectedPost.mediaUrl} 
                alt={selectedPost.title}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-contain"
              />
              {selectedPost.mediaType === 'video' && (
                <div 
                  onClick={() => {
                    const post = selectedPost;
                    setSelectedPost(null);
                    setPlayingVideoId(post.id);
                  }}
                  className="absolute p-4 rounded-full bg-cyan-500/80 text-slate-950 shadow-xl cursor-pointer hover:scale-110 transition"
                >
                  <Play size={24} className="fill-slate-950" />
                </div>
              )}
            </div>

            {/* Details, Rating & Full Comment Stream */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              <div className="space-y-1">
                <h2 className="text-base font-black text-white">{selectedPost.title}</h2>
                <p className="text-xs text-slate-300 leading-relaxed">{selectedPost.description}</p>
              </div>

              {/* Actions (Like & Share) */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleLike(selectedPost.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                      selectedPost.isLikedByUser 
                        ? 'bg-rose-950 border-rose-500 text-rose-300' 
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                    }`}
                  >
                    <Heart size={15} className={selectedPost.isLikedByUser ? 'fill-rose-500' : ''} />
                    <span>{formatToPersianDigits(selectedPost.likesCount)} لایک</span>
                  </button>

                  <button
                    onClick={() => handleSharePost(selectedPost)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-900 border border-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5 transition"
                  >
                    {copiedPostId === selectedPost.id ? (
                      <Check size={14} className="text-emerald-400" />
                    ) : (
                      <Share2 size={14} />
                    )}
                    <span>{copiedPostId === selectedPost.id ? 'کپی شد!' : 'کپی لینک اشتراک'}</span>
                  </button>
                </div>

                <span className="text-[10px] text-slate-400 font-mono">
                  شناسه: #{selectedPost.id}
                </span>
              </div>

              {/* Comments Section in Modal (5-at-a-time Lazy Loading) */}
              {(() => {
                const modalComments = commentsMap[selectedPost.id] || [];
                const modalLimit = getVisibleCommentsCount(selectedPost.id);
                const modalVisible = modalComments.slice(0, modalLimit);
                const modalHasMore = modalComments.length > modalLimit;

                return (
                  <div className="pt-3 border-t border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-300 font-bold">
                      <span>
                        دیدگاه‌های ثبت‌شده ({formatToPersianDigits(Math.min(modalLimit, modalComments.length))} از {formatToPersianDigits(modalComments.length)})
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">نمایش ۵ دیدگاه در هر نوبت</span>
                    </div>

                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {modalVisible.length === 0 ? (
                        <div className="py-4 text-center text-slate-500 text-xs">
                          هنوز دیدگاهی ثبت نشده است. اولین نظر را شما بنویسید!
                        </div>
                      ) : (
                        modalVisible.map((comment) => (
                          <div 
                            key={comment.id}
                            className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-start justify-between gap-2.5 text-xs transition hover:border-slate-750"
                          >
                            <div className="flex items-start gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-slate-800 border border-cyan-500/40 ring-1 ring-cyan-500/20 overflow-hidden shrink-0 shadow-sm">
                                <img 
                                  src={comment.authorAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'} 
                                  alt={comment.authorName} 
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80';
                                  }}
                                />
                              </div>
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-black text-white text-[11px]">{comment.authorName}</span>
                                  {comment.authorSquad && (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono">
                                      {comment.authorSquad}
                                    </span>
                                  )}
                                  <span className="text-[9px] text-slate-500 font-mono">{comment.createdAt}</span>
                                </div>
                                <p className="text-slate-300 text-[11px] leading-relaxed pr-0.5">{comment.content}</p>
                              </div>
                            </div>

                            <button
                              onClick={() => handleToggleCommentLike(selectedPost.id, comment.id)}
                              className="flex flex-col items-center p-1 text-slate-500 hover:text-rose-400 transition shrink-0"
                            >
                              <Heart size={13} className={comment.isLiked ? 'fill-rose-500 text-rose-500' : ''} />
                              {(comment.likesCount || 0) > 0 && (
                                <span className="text-[9px] font-mono mt-0.5">{formatToPersianDigits(comment.likesCount)}</span>
                              )}
                            </button>
                          </div>
                        ))
                      )}

                      {/* Modal Load 5 More Comments Button */}
                      {modalHasMore && (
                        <div className="pt-2 text-center">
                          <button
                            type="button"
                            onClick={() => loadMoreComments(selectedPost.id)}
                            disabled={loadingCommentsPostId === selectedPost.id}
                            className={`w-full py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 ${
                              isGirls
                                ? 'bg-pink-950/40 hover:bg-pink-900/60 border-pink-500/40 text-pink-200'
                                : 'bg-cyan-950/40 hover:bg-cyan-900/60 border-cyan-500/40 text-cyan-200'
                            }`}
                          >
                            {loadingCommentsPostId === selectedPost.id ? (
                              <>
                                <Loader2 size={13} className="animate-spin text-cyan-400" />
                                <span>در حال بارگذاری ۵ دیدگاه بعدی...</span>
                              </>
                            ) : (
                              <>
                                <ChevronDown size={14} />
                                <span>
                                  بارگذاری ۵ دیدگاه بیشتر (نمایش {formatToPersianDigits(Math.min(modalLimit, modalComments.length))} از {formatToPersianDigits(modalComments.length)})
                                </span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Input in modal */}
                    <div className="flex items-center gap-2 pt-1">
                      <input 
                        type="text"
                        value={commentInputs[selectedPost.id] || ''}
                        onChange={(e) => setCommentInputs({ ...commentInputs, [selectedPost.id]: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddComment(selectedPost.id);
                          }
                        }}
                        placeholder="دیدگاه خود را درباره این اثر بنویسید..."
                        className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition"
                      />
                      <button
                        onClick={() => handleAddComment(selectedPost.id)}
                        className="p-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-bold transition flex items-center justify-center"
                      >
                        <Send size={15} />
                      </button>
                    </div>
                  </div>
                );
              })()}

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
