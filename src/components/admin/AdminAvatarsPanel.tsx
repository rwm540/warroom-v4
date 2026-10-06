import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Upload, 
  Trash2, 
  Edit3, 
  Plus, 
  Check, 
  Sparkles, 
  Image as ImageIcon, 
  ShieldCheck, 
  Heart, 
  Zap, 
  Eye, 
  Layers,
  Search,
  RefreshCw,
  Sliders,
  Camera,
  RotateCcw,
  X,
  Save,
  AlertTriangle,
  Cloud,
  CheckCircle2,
  Info
} from 'lucide-react';
import { 
  AvatarItem, 
  getAllAvatars,
  addAvatar,
  updateAvatar,
  deleteAvatar,
  resetToDefaultAvatars,
  syncAvatarsWithSupabase,
  initAvatarSupabaseRealtime
} from '../../data/avatars';
import { isSupabaseEnabled } from '../../lib/supabaseData';
import { PaginationControls } from '../common/PaginationControls';

interface AdminAvatarsPanelProps {
  triggerAlert: (msg: string) => void;
}

interface ToastMessage {
  id: string;
  type: 'success' | 'delete' | 'info' | 'error';
  title: string;
  description?: string;
}

export default function AdminAvatarsPanel({ triggerAlert }: AdminAvatarsPanelProps) {
  const [avatarsList, setAvatarsList] = useState<AvatarItem[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'custom' | 'girls' | 'boys'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [avatarsPage, setAvatarsPage] = useState<number>(1);
  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);
  
  // In-Panel Rich Toast Notification System
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (title: string, description?: string, type: 'success' | 'delete' | 'info' | 'error' = 'success') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastMessage = { id, type, title, description };
    setToasts(prev => [newToast, ...prev.slice(0, 3)]);
    // Trigger global parent alert as well
    triggerAlert(`${title}${description ? ` — ${description}` : ''}`);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };
  
  // Create / Upload Form State
  const [newAvatarName, setNewAvatarName] = useState('');
  const [newAvatarGender, setNewAvatarGender] = useState<'دختر' | 'پسر'>('پسر');
  const [newAvatarUrl, setNewAvatarUrl] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  
  // Edit State
  const [editingAvatar, setEditingAvatar] = useState<AvatarItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editGender, setEditGender] = useState<'دختر' | 'پسر'>('پسر');
  const [editUrl, setEditUrl] = useState('');
  const [editPreviewImage, setEditPreviewImage] = useState<string | null>(null);
  const [isProcessingEditUpload, setIsProcessingEditUpload] = useState(false);

  // Delete Confirmation Modal State
  const [deletingAvatar, setDeletingAvatar] = useState<AvatarItem | null>(null);
  const [isDeletingLoading, setIsDeletingLoading] = useState(false);

  // Reset Confirmation Modal State
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Preview Modal
  const [previewModalAvatar, setPreviewModalAvatar] = useState<AvatarItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Load avatars from centralized store & Supabase
  const loadAvatars = () => {
    setAvatarsList(getAllAvatars());
  };

  useEffect(() => {
    loadAvatars();
    initAvatarSupabaseRealtime();

    const handleUpdate = () => loadAvatars();
    window.addEventListener('warroom_custom_avatars_changed', handleUpdate);
    return () => window.removeEventListener('warroom_custom_avatars_changed', handleUpdate);
  }, []);

  const handleManualSupabaseSync = async () => {
    setIsSyncingSupabase(true);
    try {
      const refreshed = await syncAvatarsWithSupabase();
      setAvatarsList(refreshed);
      showToast('همگام‌سازی ابری انجام شد', 'فهرست آواتارها با آخرین نسخه پایگاه داده سوپابیس تطبیق یافت.', 'info');
    } catch {
      showToast('خطا در ارتباط با سوپابیس', 'در حال حاضر تغییرات در حافظه آفلاین ثبت می‌گردند.', 'error');
    } finally {
      setIsSyncingSupabase(false);
    }
  };

  // Handle File Upload for Create Form
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      showToast('خطای حجم فایل', 'حجم فایل آواتار نباید بیشتر از ۴ مگابایت باشد.', 'error');
      e.target.value = '';
      return;
    }

    setIsProcessingUpload(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setPreviewImage(dataUrl);
        setNewAvatarUrl(dataUrl);
        if (!newAvatarName) {
          const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
          setNewAvatarName(`آواتار ${fileNameWithoutExt}`);
        }
      }
      setIsProcessingUpload(false);
    };
    reader.onerror = () => {
      showToast('خطا در بارگذاری', 'بارگذاری فایل تصویر با خطا مواجه گردید.', 'error');
      setIsProcessingUpload(false);
    };
    reader.readAsDataURL(file);
  };

  // Handle File Upload for Edit Form
  const handleEditFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      showToast('خطای حجم فایل', 'حجم فایل آواتار نباید بیشتر از ۴ مگابایت باشد.', 'error');
      e.target.value = '';
      return;
    }

    setIsProcessingEditUpload(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setEditPreviewImage(dataUrl);
        setEditUrl(dataUrl);
      }
      setIsProcessingEditUpload(false);
    };
    reader.onerror = () => {
      showToast('خطا در خواندن فایل', 'بارگذاری فایل تصویر انتخابی ناموفق بود.', 'error');
      setIsProcessingEditUpload(false);
    };
    reader.readAsDataURL(file);
  };

  // Submit New Avatar
  const handleCreateAvatar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAvatarUrl.trim()) {
      showToast('تصویر مشخص نشده', 'لطفاً یک فایل تصویر آپلود کنید یا آدرس اینترنتی تصویر را وارد فرمایید.', 'error');
      return;
    }
    if (!newAvatarName.trim()) {
      showToast('عنوان الزامی است', 'لطفاً نام یا عنوان نمایشی آواتار را مشخص فرمایید.', 'error');
      return;
    }

    const createdItem: AvatarItem = {
      id: `av_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: newAvatarName.trim(),
      url: newAvatarUrl.trim(),
      gender: newAvatarGender,
      isCustom: true
    };

    addAvatar(createdItem);
    loadAvatars();
    showToast(
      'آواتار جدید ثبت گردید',
      `آواتار «${createdItem.name}» به بخش ${createdItem.gender === 'دختر' ? 'دختران' : 'پسران'} افزوده و در سوپابیس ذخیره شد.`,
      'success'
    );

    // Reset Form
    setNewAvatarName('');
    setNewAvatarUrl('');
    setPreviewImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Open Edit Modal
  const handleOpenEdit = (item: AvatarItem) => {
    setEditingAvatar(item);
    setEditName(item.name);
    setEditGender(item.gender);
    setEditUrl(item.url);
    setEditPreviewImage(item.url);
  };

  // Save Edited Avatar
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAvatar) return;

    if (!editName.trim()) {
      showToast('خطای نام', 'نام آواتار نمی‌تواند خالی باشد.', 'error');
      return;
    }
    if (!editUrl.trim()) {
      showToast('خطای تصویر', 'آدرس یا تصویر آواتار مشخص نشده است.', 'error');
      return;
    }

    updateAvatar(editingAvatar.id, {
      name: editName.trim(),
      gender: editGender,
      url: editUrl.trim()
    });

    loadAvatars();
    showToast(
      'تغییرات با موفقیت ذخیره شد',
      `مشخصات آواتار «${editName}» در پایگاه داده سوپابیس و حافظه محلی بروزرسانی گردید.`,
      'success'
    );
    setEditingAvatar(null);
  };

  // Open Delete Confirmation Modal
  const handleRequestDelete = (item: AvatarItem) => {
    setDeletingAvatar(item);
  };

  // Confirm Delete Avatar
  const handleConfirmDelete = () => {
    if (!deletingAvatar) return;
    setIsDeletingLoading(true);

    const deletedName = deletingAvatar.name;
    const deletedGender = deletingAvatar.gender;

    deleteAvatar(deletingAvatar.id);
    loadAvatars();
    setIsDeletingLoading(false);
    setDeletingAvatar(null);

    showToast(
      'آواتار حذف گردید',
      `آواتار «${deletedName}» (${deletedGender === 'دختر' ? 'دخترانه' : 'پسرانه'}) با موفقیت از سوپابیس و سامانه حذف شد.`,
      'delete'
    );
  };

  // Reset to Project Defaults
  const handleConfirmResetDefaults = () => {
    resetToDefaultAvatars();
    loadAvatars();
    setShowResetConfirm(false);
    showToast(
      'بازنشانی انجام شد',
      'فهرست آواتارها به حالت پیش‌فرض پروژه بازنشانی و در سوپابیس ذخیره شد.',
      'info'
    );
  };

  // Filtered List
  const filteredAvatars = avatarsList.filter(item => {
    if (activeTab === 'custom' && !item.isCustom && !item.id.startsWith('custom_') && !item.id.startsWith('av_')) return false;
    if (activeTab === 'girls' && item.gender !== 'دختر') return false;
    if (activeTab === 'boys' && item.gender !== 'پسر') return false;
    if (searchQuery.trim()) {
      return item.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
    }
    return true;
  });

  return (
    <div className="space-y-6 dir-rtl font-sans text-right relative" dir="rtl">
      
      {/* 🔔 Animated Toast Notifications for Avatar Operations */}
      <div className="fixed top-20 left-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className={`p-3.5 rounded-2xl border shadow-2xl backdrop-blur-md pointer-events-auto flex items-start gap-3 ${
                toast.type === 'delete'
                  ? 'bg-red-950/90 border-red-500/60 text-red-200 shadow-[0_0_25px_rgba(239,68,68,0.3)]'
                  : toast.type === 'error'
                  ? 'bg-amber-950/90 border-amber-500/60 text-amber-200'
                  : toast.type === 'info'
                  ? 'bg-blue-950/90 border-blue-500/60 text-blue-200'
                  : 'bg-emerald-950/90 border-emerald-500/60 text-emerald-200 shadow-[0_0_25px_rgba(16,185,129,0.3)]'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {toast.type === 'delete' ? (
                  <Trash2 size={18} className="text-red-400" />
                ) : toast.type === 'error' ? (
                  <AlertTriangle size={18} className="text-amber-400" />
                ) : toast.type === 'info' ? (
                  <Info size={18} className="text-blue-400" />
                ) : (
                  <CheckCircle2 size={18} className="text-emerald-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-black text-white">{toast.title}</h4>
                {toast.description && (
                  <p className="text-[11px] opacity-90 mt-0.5 leading-relaxed">{toast.description}</p>
                )}
              </div>

              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-white p-0.5 rounded transition"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 👑 Top Header Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-[#0d1530] via-[#091024] to-[#120f2c] border border-cyan-500/40 shadow-2xl relative overflow-hidden">
        <div className="absolute -left-10 -top-10 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-[1px] shadow-[0_0_25px_rgba(6,182,212,0.4)]">
              <div className="w-full h-full bg-[#070b1a] rounded-2xl flex items-center justify-center text-cyan-400">
                <Camera size={28} />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black text-white">استودیوی مدیریت، ویرایش و حذف آواتارها</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-[10px] font-bold flex items-center gap-1">
                  <Cloud size={12} className={isSupabaseEnabled ? 'text-emerald-400' : 'text-slate-400'} />
                  <span>{isSupabaseEnabled ? 'متصل به سوپابیس' : 'حافظه محلی آفلاین'}</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                امکان افزودن، ویرایش مشخصات، آپلود تصویر و حذف کامل آواتارهای دختران و پسران با همگام‌سازی ابری در سوپابیس
              </p>
            </div>
          </div>

          {/* Action & Stat Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="px-3.5 py-2 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
              <span className="block text-[10px] text-slate-400 font-medium">کل آواتارها</span>
              <span className="text-sm font-black text-white">{avatarsList.length}</span>
            </div>
            <div className="px-3.5 py-2 rounded-2xl bg-fuchsia-950/40 border border-fuchsia-800/60 text-center">
              <span className="block text-[10px] text-fuchsia-300 font-medium">دختران</span>
              <span className="text-sm font-black text-fuchsia-300">
                {avatarsList.filter(a => a.gender === 'دختر').length}
              </span>
            </div>
            <div className="px-3.5 py-2 rounded-2xl bg-cyan-950/40 border border-cyan-800/60 text-center">
              <span className="block text-[10px] text-cyan-300 font-medium">پسران</span>
              <span className="text-sm font-black text-cyan-300">
                {avatarsList.filter(a => a.gender === 'پسر').length}
              </span>
            </div>

            <button
              type="button"
              onClick={handleManualSupabaseSync}
              disabled={isSyncingSupabase}
              className="px-3 py-2 rounded-2xl bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/60 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow"
              title="همگام‌سازی فوری با پایگاه داده سوپابیس"
            >
              <RefreshCw size={13} className={isSyncingSupabase ? 'animate-spin' : ''} />
              <span>همگام‌سازی ابری</span>
            </button>

            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="px-3 py-2 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow"
              title="بازنشانی آواتارها به حالت پیش‌فرض پروژه"
            >
              <RotateCcw size={14} />
              <span>بازنشانی پیش‌فرض</span>
            </button>
          </div>
        </div>
      </div>

      {/* 🚀 Add New Avatar Form */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[#090f24] border border-slate-800 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Plus size={18} className="text-amber-400" />
            <h2 className="text-sm sm:text-base font-black text-white">آپلود و ایجاد آواتار جدید در سوپابیس</h2>
          </div>
          <span className="text-[11px] text-slate-400">فرمت‌های مجاز: PNG, JPG, JPEG, WebP</span>
        </div>

        <form onSubmit={handleCreateAvatar} className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            
            {/* Upload Box / Image Dropzone (4 cols) */}
            <div className="lg:col-span-4 space-y-2">
              <label className="block text-xs font-bold text-slate-300">تصویر آواتار (آپلود مستقیم یا انتخاب فایل):</label>
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`w-full h-44 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-3 text-center cursor-pointer relative overflow-hidden group ${
                  previewImage 
                    ? 'border-emerald-500/70 bg-slate-950/90' 
                    : 'border-slate-700 hover:border-cyan-400 bg-slate-950/60 hover:bg-slate-900/60'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept="image/png,image/jpeg,image/webp,image/jpg" 
                  className="hidden" 
                />

                {previewImage ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img 
                      src={previewImage} 
                      alt="Avatar Preview" 
                      className="max-w-full max-h-36 object-contain filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] group-hover:scale-105 transition-transform" 
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold rounded-xl backdrop-blur-xs">
                      برای تغییر کلیک کنید
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-slate-400 group-hover:text-cyan-300 transition-colors">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center mx-auto group-hover:border-cyan-400 transition-colors">
                      <Upload size={22} className="group-hover:scale-110 transition-transform" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">کلیک برای انتخاب یا رها کردن تصویر</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">حداکثر حجم ۴ مگابایت</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Inputs Column (8 cols) */}
            <div className="lg:col-span-8 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Avatar Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    نام / عنوان نمایشی آواتار:
                  </label>
                  <input
                    type="text"
                    value={newAvatarName}
                    onChange={(e) => setNewAvatarName(e.target.value)}
                    placeholder="مثال: فرمانده صیاد، تکاور خط‌شکن"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none transition"
                  />
                </div>

                {/* Gender Category */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    دسته‌بندی جنسیتی:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewAvatarGender('دختر')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        newAvatarGender === 'دختر'
                          ? 'bg-fuchsia-600 text-white border-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.4)]'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <Heart size={14} />
                      <span>دخترانه (بانوان)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewAvatarGender('پسر')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        newAvatarGender === 'پسر'
                          ? 'bg-cyan-600 text-white border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <Zap size={14} />
                      <span>پسرانه (آقایان)</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* URL Input (Optional Alternative) */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  یا مسیر فایل / لینک مستقیم تصویر:
                </label>
                <input
                  type="text"
                  value={newAvatarUrl}
                  onChange={(e) => {
                    setNewAvatarUrl(e.target.value);
                    if (e.target.value.startsWith('http') || e.target.value.startsWith('/') || e.target.value.startsWith('data:')) {
                      setPreviewImage(e.target.value);
                    }
                  }}
                  placeholder="/images/avatar/... یا data:image/..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none transition font-mono dir-ltr text-left"
                />
              </div>

              {/* Action Submit */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isProcessingUpload || !newAvatarUrl}
                  className={`px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 transition cursor-pointer shadow-lg active:scale-95 ${
                    newAvatarUrl
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-slate-950'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Plus size={16} />
                  <span>انتشار و ذخیره در سوپابیس</span>
                </button>
              </div>

            </div>

          </div>
        </form>
      </div>

      {/* 🔍 Navigation Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#080d22] p-3 rounded-2xl border border-slate-800">
        
        {/* Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'all'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            همه آواتارها ({avatarsList.length})
          </button>

          <button
            onClick={() => setActiveTab('girls')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'girls'
                ? 'bg-fuchsia-600 text-white shadow'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            دخترانه ({avatarsList.filter(a => a.gender === 'دختر').length})
          </button>

          <button
            onClick={() => setActiveTab('boys')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'boys'
                ? 'bg-cyan-600 text-white shadow'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            پسرانه ({avatarsList.filter(a => a.gender === 'پسر').length})
          </button>

          <button
            onClick={() => setActiveTab('custom')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'custom'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            آپلودهای جدید ادمین ({avatarsList.filter(a => a.isCustom || a.id.startsWith('av_') || a.id.startsWith('custom_')).length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجوی نام آواتار..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>

      </div>

      {/* 🖼️ Avatars Grid with Edit, Delete, and Preview */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
          <AnimatePresence>
            {filteredAvatars
              .slice((avatarsPage - 1) * 10, avatarsPage * 10)
              .map((item) => {
              const isGirl = item.gender === 'دختر';
              const isCustomUpload = item.isCustom || item.id.startsWith('av_') || item.id.startsWith('custom_');

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={`p-3 rounded-2xl border transition-all relative flex flex-col items-center text-center group hover:scale-[1.02] ${
                    isCustomUpload
                      ? 'bg-[#081224] border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                      : 'bg-[#060a17] border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Badges on Top */}
                  <div className="w-full flex items-center justify-between mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      isGirl ? 'bg-fuchsia-950 text-fuchsia-300 border border-fuchsia-800/60' : 'bg-cyan-950 text-cyan-300 border border-cyan-800/60'
                    }`}>
                      {item.gender}
                    </span>

                    {isCustomUpload && (
                      <span className="px-1.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[9px] font-black">
                        آپلود ادمین
                      </span>
                    )}
                  </div>

                  {/* Avatar Image Frame */}
                  <div 
                    onClick={() => setPreviewModalAvatar(item)}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-slate-950/80 border border-slate-800 p-1 flex items-center justify-center relative mb-2 group-hover:border-amber-400 transition-colors cursor-pointer"
                  >
                    <img 
                      src={item.url} 
                      alt={item.name} 
                      className="w-full h-full object-cover rounded-xl"
                    />
                  </div>

                  {/* Title */}
                  <h3 className="text-xs font-bold text-white line-clamp-1 mb-2.5" title={item.name}>
                    {item.name}
                  </h3>

                  {/* Action Buttons: Edit, Delete */}
                  <div className="w-full flex items-center justify-center gap-1.5 mt-auto pt-2 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(item)}
                      className="px-2.5 py-1 rounded-lg bg-blue-950/80 hover:bg-blue-900 text-blue-300 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer border border-blue-800/50"
                      title="ویرایش نام، تصویر و جنسیت این آواتار"
                    >
                      <Edit3 size={11} />
                      <span>ویرایش</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRequestDelete(item)}
                      className="px-2.5 py-1 rounded-lg bg-red-950/80 hover:bg-red-900 text-red-400 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer border border-red-800/50"
                      title="حذف کامل این آواتار از سامانه و سوپابیس"
                    >
                      <Trash2 size={11} />
                      <span>حذف</span>
                    </button>
                  </div>

                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* 📄 صفحه‌بندی آواتارها (۱۰ آواتار در هر صفحه) */}
        <PaginationControls
          currentPage={avatarsPage}
          totalItems={filteredAvatars.length}
          itemsPerPage={10}
          onPageChange={setAvatarsPage}
          themeColor="cyan"
        />
      </div>

      {filteredAvatars.length === 0 && (
        <div className="p-12 text-center rounded-3xl bg-slate-950/60 border border-slate-800 space-y-2">
          <ImageIcon size={32} className="mx-auto text-slate-600 mb-2" />
          <p className="text-sm font-bold text-slate-400">هیچ آواتاری با فیلتر انتخابی یافت نشد.</p>
          <p className="text-xs text-slate-500">می‌توانید با استفاده از فرم بالا آواتار جدید اضافه کنید یا دکمه بازنشانی پیش‌فرض را بزنید.</p>
        </div>
      )}

      {/* 🗑️ Delete Confirmation Modal */}
      {deletingAvatar && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 dir-rtl text-right">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-[#0f1424] border border-red-500/50 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-[0_0_40px_rgba(239,68,68,0.25)] relative"
          >
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-white">تایید حذف قطعی آواتار</h3>
                <span className="text-[11px] text-slate-400">این عملیات از پایگاه داده سوپابیس و کلیه حساب‌ها حذف خواهد شد</span>
              </div>
            </div>

            <div className="flex items-center gap-4 p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800">
              <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 shrink-0">
                <img src={deletingAvatar.url} alt={deletingAvatar.name} className="w-full h-full object-cover" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold text-white block">{deletingAvatar.name}</span>
                <span className="text-[10px] text-slate-400 block">دسته‌بندی: {deletingAvatar.gender === 'دختر' ? 'دخترانه' : 'پسرانه'}</span>
                <span className="text-[10px] text-red-400 font-bold block">پس از حذف، بلافاصله در سوپابیس همگام خواهد شد.</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              آیا از حذف کامل آواتار <strong className="text-red-400">«{deletingAvatar.name}»</strong> اطمینان دارید؟
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingAvatar(null)}
                disabled={isDeletingLoading}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                انصراف
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeletingLoading}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95"
              >
                <Trash2 size={14} />
                <span>{isDeletingLoading ? 'در حال حذف از سوپابیس...' : 'بله، حذف کن'}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 🔄 Reset to Defaults Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 dir-rtl text-right">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-[#0f1424] border border-amber-500/50 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-[0_0_40px_rgba(245,158,11,0.25)] relative"
          >
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <RotateCcw size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-white">بازنشانی به حالت پیش‌فرض</h3>
                <span className="text-[11px] text-slate-400">بازگردانی کلیه آواتارهای اولیه پروژه</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              آیا مایلید تمام آواتارها به حالت پیش‌فرض پروژه بازنشانی شوند؟ این عمل لیست آواتارهای رسمی را در سوپابیس بازنشانی می‌کند.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                انصراف
              </button>

              <button
                type="button"
                onClick={handleConfirmResetDefaults}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95"
              >
                <Check size={14} />
                <span>تایید بازنشانی</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ✏️ Edit Avatar Modal */}
      {editingAvatar && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 dir-rtl text-right">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-[#090f24] border border-cyan-500/40 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl relative"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 size={18} className="text-cyan-400" />
                <h3 className="text-base font-black text-white">ویرایش مشخصات آواتار در سوپابیس</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingAvatar(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              
              {/* Image Preview & Upload in Edit */}
              <div className="flex items-center gap-4 p-3 bg-slate-950 rounded-2xl border border-slate-800">
                <div 
                  onClick={() => editFileInputRef.current?.click()}
                  className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-900 border-2 border-dashed border-cyan-500/50 flex items-center justify-center cursor-pointer relative group flex-shrink-0"
                >
                  <input 
                    type="file" 
                    ref={editFileInputRef} 
                    onChange={handleEditFileUpload} 
                    accept="image/png,image/jpeg,image/webp,image/jpg" 
                    className="hidden" 
                  />
                  {editPreviewImage ? (
                    <img 
                      src={editPreviewImage} 
                      alt="Edit Preview" 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <Upload size={20} className="text-cyan-400" />
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] text-white font-bold text-center">
                    تغییر عکس
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <span className="font-bold text-white block">تصویر فعلی آواتار</span>
                  <p className="text-slate-400 text-[11px]">برای آپلود تصویر جدید روی کادر عکس کلیک کنید.</p>
                  {isProcessingEditUpload && (
                    <span className="text-cyan-400 text-[10px] animate-pulse block">در حال پردازش فایل...</span>
                  )}
                </div>
              </div>

              {/* Avatar Name */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  نام / عنوان آواتار:
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-cyan-400 focus:outline-none transition"
                  required
                />
              </div>

              {/* Gender Category */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  دسته‌بندی جنسیتی:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditGender('دختر')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      editGender === 'دختر'
                        ? 'bg-fuchsia-600 text-white border-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.4)]'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <Heart size={14} />
                    <span>دخترانه (بانوان)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditGender('پسر')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      editGender === 'پسر'
                        ? 'bg-cyan-600 text-white border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <Zap size={14} />
                    <span>پسرانه (آقایان)</span>
                  </button>
                </div>
              </div>

              {/* Image URL Direct Input */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  آدرس تصویر (مسیر محلی یا Data URL):
                </label>
                <input
                  type="text"
                  value={editUrl}
                  onChange={(e) => {
                    setEditUrl(e.target.value);
                    setEditPreviewImage(e.target.value);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-cyan-400 focus:outline-none transition font-mono dir-ltr text-left"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingAvatar(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95"
                >
                  <Save size={14} />
                  <span>ذخیره در سوپابیس</span>
                </button>
              </div>

            </form>
          </motion.div>
        </div>
      )}

      {/* 🔍 Preview Modal */}
      {previewModalAvatar && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#090f24] border border-cyan-500/40 rounded-3xl p-6 max-w-sm w-full space-y-4 text-center shadow-2xl relative"
          >
            <div className="w-36 h-36 rounded-full mx-auto overflow-hidden border-4 border-amber-400 p-1 bg-slate-950 shadow-[0_0_30px_rgba(251,191,36,0.5)]">
              <img 
                src={previewModalAvatar.url} 
                alt={previewModalAvatar.name} 
                className="w-full h-full object-cover rounded-full"
              />
            </div>

            <div>
              <h3 className="text-base font-black text-white">{previewModalAvatar.name}</h3>
              <p className="text-xs text-slate-400 mt-1">
                دسته‌بندی: {previewModalAvatar.gender === 'دختر' ? 'دختران' : 'پسران'}
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const target = previewModalAvatar;
                  setPreviewModalAvatar(null);
                  handleOpenEdit(target);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 size={13} />
                <span>ویرایش این آواتار</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewModalAvatar(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition cursor-pointer"
              >
                بستن
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
