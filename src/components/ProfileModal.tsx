import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Award, User as UserIcon, Check, ShieldCheck, Sparkles, Star, Bookmark, Video, Upload, Image as ImageIcon } from 'lucide-react';
import { User, Medal, UserMedal } from '../types';
import { formatToPersianDigits } from '../utils/jalali';
import { getSavedPostIds } from '../data/vitrinData';
import SavedVitrinReelsModal from './SavedVitrinReelsModal';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onUpdateAvatar: (avatarUrl: string) => void;
  medals: Medal[];
  userMedals: UserMedal[];
  triggerAlert: (msg: string) => void;
  onNavigateTab?: (tab: string) => void;
}

const PREDEFINED_AVATARS = [
  { id: 'av1', name: 'رزمنده سایبری ۱', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80' },
  { id: 'av2', name: 'فرمانده جوخه', url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=300&q=80' },
  { id: 'av3', name: 'رزمنده پیشتاز', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80' },
  { id: 'av4', name: 'افسر ارشد', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80' },
  { id: 'av5', name: 'تکاور سایبری', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80' },
  { id: 'av6', name: 'پیشگام عملیات', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80' },
];

export default function ProfileModal({
  isOpen,
  onClose,
  currentUser,
  onUpdateAvatar,
  medals,
  userMedals,
  triggerAlert,
  onNavigateTab
}: ProfileModalProps) {
  const [selectedAvatar, setSelectedAvatar] = useState(currentUser?.avatar_url || PREDEFINED_AVATARS[0].url);
  const [showSavedReels, setShowSavedReels] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    if (isOpen) {
      window.dispatchEvent(new CustomEvent('warroom_modal_active_change', { detail: { active: true } }));
      return () => {
        window.dispatchEvent(new CustomEvent('warroom_modal_active_change', { detail: { active: false } }));
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const ids = getSavedPostIds(currentUser?.id);
      setSavedCount(ids.length);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const earnedUserMedals = userMedals.filter(um => um.personal_code === currentUser.personal_code);

  const handleSave = () => {
    onUpdateAvatar(selectedAvatar);
    triggerAlert('آواتار پروفایل شما با موفقیت به‌روزرسانی شد.');
    onClose();
  };

  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Strict 1 MB size check
    const MAX_SIZE_BYTES = 1024 * 1024; // 1 MB
    if (file.size > MAX_SIZE_BYTES) {
      triggerAlert('خطا: سایز تصویر آواتار نباید بیشتر از ۱ مگابایت باشد.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSelectedAvatar(reader.result);
        triggerAlert('تصویر آواتار شخصی بارگذاری شد (حداکثر ۱ مگابایت).');
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 dir-rtl font-sans overflow-y-auto">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-[#080d21] border border-cyan-500/30 rounded-3xl max-w-lg w-full p-4 sm:p-6 space-y-5 shadow-2xl overflow-y-auto max-h-[85vh] sm:max-h-[88vh] relative my-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-950/80 text-cyan-400 border border-cyan-800">
                <UserIcon size={20} />
              </div>
              <div>
                <h2 className="text-base font-black text-white">پروفایل رزمنده و اطلاعات کاربری</h2>
                <p className="text-xs text-slate-400 font-medium">اطلاعات شناسنامه، سطح، ذخیره‌های ویترین و انتخاب آواتار</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white transition"
            >
              <X size={18} />
            </button>
          </div>

          {/* User Stats Card */}
          <div className="bg-slate-950/90 border border-slate-800/80 p-4 rounded-xl flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-600 p-[2px] shadow-[0_0_15px_rgba(6,182,212,0.4)] flex-shrink-0">
              <img src={selectedAvatar} alt="آواتار" className="w-full h-full object-cover rounded-full" />
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-sm text-white">{currentUser.first_name} {currentUser.last_name}</h3>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold px-2 py-0.5 rounded-md">
                  SPEC OPS I (سطح ۳)
                </span>
              </div>
              <p className="text-xs text-cyan-400 font-mono">کد اختصاصی: {formatToPersianDigits(currentUser.personal_code)}</p>
              <div className="flex items-center gap-4 text-xs pt-1 font-mono text-slate-300">
                <span>امتیاز کل: <strong className="text-amber-400">۱۴,۲۵۰</strong></span>
                <span>مدال‌ها: <strong className="text-cyan-300">{earnedUserMedals.length + 3}</strong></span>
              </div>
            </div>
          </div>

          {/* Quick Action: Saved Vitrin Videos Reel Button */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-transparent border border-amber-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <Bookmark size={18} className="fill-amber-400 text-amber-400" />
              </div>
              <div>
                <h4 className="text-xs font-black text-white">آثار و ویدیوهای ذخیره‌شده ویترین</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  تماشا و مرور ویدیوهای منتخب شما به صورت فید ریلز
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowSavedReels(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition shadow-md"
            >
              <Video size={14} />
              <span>مشاهده ریلز</span>
              {savedCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-slate-950 text-amber-400 font-mono text-[10px]">
                  {formatToPersianDigits(savedCount)}
                </span>
              )}
            </button>
          </div>

          {/* Avatar Selection & Upload */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-300">انتخاب یا آپلود آواتار تاکتیکی:</label>
              <span className="text-[10px] text-amber-400/90 font-medium">حداکثر ۱ مگابایت</span>
            </div>

            {/* Custom Avatar Upload Button */}
            <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shrink-0">
                  <Upload size={18} />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-200">آپلود عکس دلخواه</h5>
                  <p className="text-[10px] text-slate-400">فرمت‌های JPG، PNG (کمتر از ۱ مگابایت)</p>
                </div>
              </div>

              <label className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black text-xs cursor-pointer transition shadow-md flex items-center gap-1.5">
                <Upload size={14} />
                <span>انتخاب فایل</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleAvatarFileUpload} 
                />
              </label>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {PREDEFINED_AVATARS.map((av) => {
                const isSelected = selectedAvatar === av.url;
                return (
                  <div
                    key={av.id}
                    onClick={() => setSelectedAvatar(av.url)}
                    className={`relative cursor-pointer rounded-xl p-2.5 bg-slate-900/90 border transition flex flex-col items-center gap-2 ${
                      isSelected ? 'border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] bg-cyan-950/30' : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="w-14 h-14 rounded-full overflow-hidden border border-slate-700">
                      <img src={av.url} alt={av.name} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-200">{av.name}</span>
                    {isSelected && (
                      <div className="absolute top-2 left-2 w-5 h-5 bg-cyan-500 text-slate-950 rounded-full flex items-center justify-center font-bold shadow">
                        <Check size={12} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Button */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="w-1/3 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs py-2.5 rounded-xl transition"
            >
              انصراف
            </button>
            <button
              onClick={handleSave}
              className="w-2/3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs py-2.5 rounded-xl transition shadow-lg"
            >
              ذخیره آواتار و تغییرات
            </button>
          </div>

        </motion.div>
      </div>

      {/* Saved Vitrin Reels Modal */}
      <SavedVitrinReelsModal
        isOpen={showSavedReels}
        onClose={() => setShowSavedReels(false)}
        currentUser={currentUser}
        triggerAlert={triggerAlert}
        onNavigateToVitrin={() => {
          setShowSavedReels(false);
          onClose();
          onNavigateTab?.('Vitrin');
        }}
      />
    </>
  );
}
