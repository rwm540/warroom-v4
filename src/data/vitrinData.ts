/**
 * ویترین آثار (Showcase) — مدل داده و ابزارهای کمکی
 * ---------------------------------------------------------------
 * منبع اصلی داده‌ها: پایگاه داده Supabase و State سراسری App.tsx
 * هیچ داده‌ای در localStorage ذخیره نمی‌شود.
 */

export interface VitrinComment {
  id: string;
  postId: string;
  authorName: string;
  authorAvatar?: string;
  authorSquad?: string;
  authorRole?: string;
  content: string;
  createdAt: string;
  likesCount: number;
  isLiked?: boolean;
}

export interface VitrinPost {
  id: string;
  authorName: string;
  authorAvatar: string;
  squadName: string;
  title: string;
  description: string;
  mediaUrl: string;
  videoSourceUrl?: string;
  mediaType: 'image' | 'video';
  likesCount: number;
  isLikedByUser: boolean;
  isBookmarked?: boolean;
  ratingAverage: number; // 1 to 5
  userRating?: number;
  commentsCount: number;
  stageTag: string;
  badge?: string;
  timeAgo?: string;
  createdAtTimestamp?: number;
}

export const initialVitrinPosts: VitrinPost[] = [];

// حافظه موقت در هنگام اجرا (In-Memory)
let memorySavedPostIds: Record<string, string[]> = {};
let memoryComments: VitrinComment[] = [];

// ---------------------------------------------------------------------------
// ذخیره‌های کاربری (Bookmark)
// ---------------------------------------------------------------------------
export function getSavedPostIds(userId?: string): string[] {
  const key = userId || 'default';
  return memorySavedPostIds[key] || [];
}

export function savePostId(postId: string, userId?: string): boolean {
  const key = userId || 'default';
  const current = memorySavedPostIds[key] || [];
  let next: string[];
  let isAdded = false;
  if (current.includes(postId)) {
    next = current.filter(id => id !== postId);
    isAdded = false;
  } else {
    next = [...current, postId];
    isAdded = true;
  }
  memorySavedPostIds[key] = next;

  // اطلاع به App برای همگام‌سازی با Supabase
  try {
    window.dispatchEvent(new CustomEvent('warroom_saved_posts_changed', { detail: { userId, ids: next } }));
  } catch {}
  return isAdded;
}

export function removeSavedPostId(postId: string, userId?: string): void {
  const key = userId || 'default';
  const current = memorySavedPostIds[key] || [];
  const next = current.filter(id => id !== postId);
  memorySavedPostIds[key] = next;

  try {
    window.dispatchEvent(new CustomEvent('warroom_saved_posts_changed', { detail: { userId, ids: next } }));
  } catch {}
}

export function setMemorySavedPostIds(userId: string | undefined, ids: string[]) {
  const key = userId || 'default';
  memorySavedPostIds[key] = ids;
}

// ---------------------------------------------------------------------------
// خواندن و مدیریت پست‌ها و نظرات ویترین
// ---------------------------------------------------------------------------
export function getVitrinPostsFromStore(_userId?: string): VitrinPost[] {
  return [];
}

export function getAllVitrinComments(): VitrinComment[] {
  return memoryComments;
}

export function getAllComments(): Record<string, VitrinComment[]> {
  const map: Record<string, VitrinComment[]> = {};
  memoryComments.forEach(c => {
    (map[c.postId] = map[c.postId] || []).push(c);
  });
  return map;
}

export function setMemoryComments(comments: VitrinComment[]) {
  memoryComments = comments;
}

/**
 * افزودن/به‌روزرسانی یک نظر + انتشار رویداد برای همگام‌سازی مستقیم با Supabase
 */
export function saveComment(comment: VitrinComment): Record<string, VitrinComment[]> {
  const idx = memoryComments.findIndex(c => c.id === comment.id);
  const nextFlat = idx >= 0 ? memoryComments.map(c => (c.id === comment.id ? comment : c)) : [comment, ...memoryComments];
  memoryComments = nextFlat;

  window.dispatchEvent(new CustomEvent('warroom_vitrin_comments_updated', { detail: nextFlat }));
  const map: Record<string, VitrinComment[]> = {};
  nextFlat.forEach(c => { (map[c.postId] = map[c.postId] || []).push(c); });
  return map;
}

/**
 * تغییر لایک یک نظر + همگام‌سازی با Supabase
 */
export function toggleCommentLike(_postId: string, commentId: string): Record<string, VitrinComment[]> {
  const nextFlat = memoryComments.map(c => {
    if (c.id === commentId) {
      const nextLiked = !c.isLiked;
      return {
        ...c,
        isLiked: nextLiked,
        likesCount: nextLiked ? (c.likesCount || 0) + 1 : Math.max(0, (c.likesCount || 0) - 1)
      };
    }
    return c;
  });
  memoryComments = nextFlat;

  window.dispatchEvent(new CustomEvent('warroom_vitrin_comments_updated', { detail: nextFlat }));
  const map: Record<string, VitrinComment[]> = {};
  nextFlat.forEach(c => { (map[c.postId] = map[c.postId] || []).push(c); });
  return map;
}

/**
 * ساخت پست ویترین از یک اثر ارسالی رزمنده
 */
export function buildVitrinPostFromSubmission(sub: {
  id: string;
  user_name: string;
  personal_code: string;
  mission_title: string;
  file_path: string;
  file_name: string;
  file_type?: string;
  user_note?: string;
  awarded_score?: number;
}): VitrinPost {
  const fileName = sub.file_name || '';
  const fileType = sub.file_type || '';
  const isVideo = fileType.toLowerCase().includes('mp4') ||
                  fileName.toLowerCase().endsWith('.mp4') ||
                  fileName.toLowerCase().endsWith('.mov') ||
                  fileType.toLowerCase().includes('video');

  return {
    id: `sub_${sub.id}`,
    authorName: sub.user_name,
    authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    squadName: `رزمنده کد ${sub.personal_code}`,
    title: sub.mission_title,
    description: sub.user_note || `اثر ارسالی رزمنده ${sub.user_name} برای مأموریت ${sub.mission_title} که پس از ارزیابی داوران در ویترین منتخبین قرار گرفت.`,
    mediaUrl: sub.file_path && sub.file_path.startsWith('http')
      ? sub.file_path
      : isVideo
      ? 'https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=800&q=80'
      : 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=800&q=80',
    videoSourceUrl: isVideo
      ? (sub.file_path && sub.file_path.startsWith('http') ? sub.file_path : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4')
      : undefined,
    mediaType: isVideo ? 'video' : 'image',
    likesCount: 0,
    isLikedByUser: false,
    ratingAverage: 5.0,
    commentsCount: 0,
    stageTag: sub.mission_title,
    badge: 'تأیید شده داوران ستاد',
    timeAgo: 'به تازگی',
    createdAtTimestamp: Date.now()
  };
}
