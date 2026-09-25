import React, { useState, useEffect } from 'react';
import { 
  Zap, Plus, Edit3, Trash2, CheckCircle2, AlertTriangle, 
  RotateCcw, Sparkles, RefreshCw, Trophy, HelpCircle, 
  Clock, ShieldCheck, Check, X, Eye
} from 'lucide-react';
import { DailyChallengeConfig } from '../types';
import { 
  getAllDailyChallenges, 
  createDailyChallenge, 
  updateDailyChallenge, 
  setActiveDailyChallenge, 
  deleteDailyChallenge,
  resetDailyChallengeProgress,
  DEFAULT_DAILY_CHALLENGE
} from '../lib/dailyChallengeService';

interface AdminDailyChallengeManagerProps {
  currentConfig?: DailyChallengeConfig | null;
  onConfigChange?: (config: DailyChallengeConfig) => void;
  triggerAlert: (msg: string) => void;
}

export default function AdminDailyChallengeManager({
  currentConfig,
  onConfigChange,
  triggerAlert
}: AdminDailyChallengeManagerProps) {
  const [challenges, setChallenges] = useState<DailyChallengeConfig[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingChallenge, setEditingChallenge] = useState<DailyChallengeConfig | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // فرم چالش
  const [formData, setFormData] = useState<Omit<DailyChallengeConfig, 'id'> & { id?: string }>({
    title: '',
    description: '',
    badge: 'tactical_badge',
    pointsReward: 150,
    question: '',
    questionText: '',
    options: ['', '', '', ''],
    correctOptionIndex: 0,
    timeLimitSeconds: 15,
    isActive: true,
    bannerUrl: ''
  });

  // بارگذاری داده‌ها
  const loadChallenges = async () => {
    setLoading(true);
    try {
      const data = await getAllDailyChallenges();
      setChallenges(data);
      const active = data.find(c => c.isActive) || data[0];
      if (active && onConfigChange) {
        onConfigChange(active);
      }
    } catch (e) {
      console.warn('Error loading daily challenges:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChallenges();

    const handleUpdate = () => {
      loadChallenges();
    };

    window.addEventListener('warroom_daily_challenge_updated', handleUpdate);
    window.addEventListener('warroom_daily_challenge_deleted', handleUpdate);

    return () => {
      window.removeEventListener('warroom_daily_challenge_updated', handleUpdate);
      window.removeEventListener('warroom_daily_challenge_deleted', handleUpdate);
    };
  }, []);

  // باز کردن مودال ایجاد
  const handleOpenCreate = () => {
    setEditingChallenge(null);
    setFormData({
      title: `چالش تاکتیکی ${new Date().toLocaleDateString('fa-IR')}`,
      description: 'با پاسخ صحیح به این سوال راهبردی، امتیاز کریستال پاداش بگیرید.',
      badge: 'tactical_badge',
      pointsReward: 150,
      question: '',
      questionText: '',
      options: ['', '', '', ''],
      correctOptionIndex: 0,
      timeLimitSeconds: 15,
      isActive: true,
      bannerUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80'
    });
    setIsModalOpen(true);
  };

  // باز کردن مودال ویرایش
  const handleOpenEdit = (item: DailyChallengeConfig) => {
    setEditingChallenge(item);
    setFormData({
      id: item.id,
      title: item.title || '',
      description: item.description || '',
      badge: item.badge || 'tactical_badge',
      pointsReward: item.pointsReward || 150,
      question: item.question || item.questionText || '',
      questionText: item.questionText || item.question || '',
      options: item.options && item.options.length >= 4 
        ? [...item.options] 
        : [item.options?.[0] || '', item.options?.[1] || '', item.options?.[2] || '', item.options?.[3] || ''],
      correctOptionIndex: item.correctOptionIndex ?? 0,
      timeLimitSeconds: item.timeLimitSeconds || 15,
      isActive: item.isActive ?? false,
      bannerUrl: item.bannerUrl || ''
    });
    setIsModalOpen(true);
  };

  // ذخیره فرم
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      triggerAlert('خطا: لطفا عنوان چالش را وارد کنید.');
      return;
    }
    const qText = (formData.questionText || formData.question || '').trim();
    if (!qText) {
      triggerAlert('خطا: متن سوال چالش الزامی است.');
      return;
    }
    if (formData.options.some(opt => !opt.trim())) {
      triggerAlert('خطا: تکمیل هر ۴ گزینه الزامی است.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: DailyChallengeConfig = {
        id: editingChallenge ? editingChallenge.id : `dc_${Date.now()}`,
        title: formData.title.trim(),
        description: formData.description.trim(),
        badge: formData.badge,
        pointsReward: Number(formData.pointsReward) || 150,
        question: qText,
        questionText: qText,
        options: formData.options.map(o => o.trim()),
        correctOptionIndex: Number(formData.correctOptionIndex) || 0,
        timeLimitSeconds: Number(formData.timeLimitSeconds) || 15,
        isActive: !!formData.isActive,
        bannerUrl: formData.bannerUrl
      };

      if (editingChallenge) {
        await updateDailyChallenge(payload);
        triggerAlert('چالش روزانه با موفقیت در Supabase ویرایش و به‌روزرسانی شد.');
      } else {
        await createDailyChallenge(payload);
        triggerAlert('چالش روزانه جدید با موفقیت ایجاد و در Supabase ثبت شد.');
      }

      if (payload.isActive && onConfigChange) {
        onConfigChange(payload);
      }

      setIsModalOpen(false);
      await loadChallenges();
    } catch (err: any) {
      triggerAlert(`خطا در ذخیره چالش: ${err?.message || 'مشکل در ارتباط با سرور'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // فعال‌سازی چالش
  const handleSetActive = async (id: string) => {
    try {
      await setActiveDailyChallenge(id);
      triggerAlert('این چالش به عنوان چالش فعال امروز تعیین و در دیتابیس Supabase ذخیره گردید.');
      await loadChallenges();
    } catch (e: any) {
      triggerAlert(`خطا در فعال‌سازی: ${e?.message}`);
    }
  };

  // حذف چالش
  const handleDelete = async (id: string) => {
    try {
      await deleteDailyChallenge(id);
      setDeleteConfirmId(null);
      triggerAlert('چالش با موفقیت از دیتابیس Supabase حذف گردید.');
      await loadChallenges();
    } catch (e: any) {
      triggerAlert(`خطا در حذف چالش: ${e?.message}`);
    }
  };

  // ریست کردن پیشرفت کاربر برای تست
  const handleResetProgress = () => {
    resetDailyChallengeProgress();
    triggerAlert('سابقه پاسخگویی امروز پاک شد. اکنون می‌توانید در نقشه به عنوان کاربر چالش را تست کنید.');
  };

  const activeChallenge = challenges.find(c => c.isActive) || currentConfig || DEFAULT_DAILY_CHALLENGE;

  return (
    <div className="space-y-6 text-slate-100" dir="rtl">
      {/* هدر بخش مدیریت چالش روزانه */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Zap size={22} className="animate-pulse" />
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">مرکز طراحی و مدیریت چالش‌های روزانه اتاق جنگ</h2>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            طراحی سوالات تاکتیکی، هوش و تحلیل نبرد سایبری با همگام‌سازی لحظه‌ای در جدول <span className="font-mono text-cyan-400">warroom_daily_challenges</span> و ثبت مستقیم در Supabase.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleResetProgress}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition"
            title="پاک کردن وضعیت پاسخگویی امروز برای تست مجدد"
          >
            <RotateCcw size={14} />
            <span>ریست وضعیت تست</span>
          </button>

          <button
            type="button"
            onClick={loadChallenges}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-900/40 hover:bg-indigo-800/60 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>همگام‌سازی دیتابیس</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition active:scale-95"
            id="btn-create-daily-challenge"
          >
            <Plus size={16} />
            <span>ایجاد چالش روزانه جدید</span>
          </button>
        </div>
      </div>

      {/* کارت ویژه: چالش فعال امروز */}
      <div className="relative overflow-hidden p-6 rounded-2xl bg-[#0b112c]/90 border-2 border-amber-500/40 shadow-2xl backdrop-blur-md">
        <div className="absolute top-0 left-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold animate-pulse">
              <CheckCircle2 size={14} />
              چالش فعال امروز در نقشه بازی
            </span>
            <span className="text-xs text-slate-400 font-mono">شناسه: {activeChallenge.id}</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-mono font-bold">
              <Trophy size={14} className="text-amber-400" />
              {activeChallenge.pointsReward} کریستال پاداش
            </span>
            <span className="flex items-center gap-1 px-3 py-1 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-xs font-mono">
              <Clock size={14} className="text-cyan-400" />
              {activeChallenge.timeLimitSeconds || 15} ثانیه تایمر
            </span>
            <button
              onClick={() => handleOpenEdit(activeChallenge)}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition"
            >
              <Edit3 size={13} />
              <span>ویرایش این چالش</span>
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <HelpCircle size={18} className="text-amber-400" />
            {activeChallenge.title}
          </h3>
          <p className="text-sm text-slate-300 leading-relaxed bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
            {activeChallenge.questionText || activeChallenge.question}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
            {activeChallenge.options?.map((opt, idx) => {
              const isCorrect = idx === activeChallenge.correctOptionIndex;
              return (
                <div 
                  key={idx}
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs transition ${
                    isCorrect 
                      ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-300 font-bold shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                      : 'bg-slate-900/40 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] ${
                      isCorrect ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {idx + 1}
                    </span>
                    <span>{opt}</span>
                  </div>
                  {isCorrect && (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold">
                      <Check size={14} />
                      پاسخ صحیح
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* لیست و آرشیو تمام چالش‌ها */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
            <span>فهرست کلیه چالش‌های ذخیره شده ({challenges.length})</span>
          </h3>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
            <RefreshCw size={28} className="animate-spin text-amber-400" />
            <span className="text-sm">در حال بارگذاری چالش‌های روزانه از Supabase...</span>
          </div>
        ) : challenges.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-3">
            <AlertTriangle size={32} className="mx-auto text-amber-400/60" />
            <p className="text-sm text-slate-400">هنوز چالشی ثبت نشده است. با کلیک بر روی دکمه زیر اولین چالش روزانه را ایجاد کنید.</p>
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 transition"
            >
              <Plus size={15} />
              ایجاد اولین چالش
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {challenges.map((c) => {
              const isCurrentActive = !!c.isActive;
              return (
                <div 
                  key={c.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    isCurrentActive
                      ? 'bg-gradient-to-b from-[#0f1938] to-[#0a0f24] border-amber-500/60 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/30'
                      : 'bg-[#080d21] border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          isCurrentActive 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {isCurrentActive ? '● فعال (امروز)' : 'بایگانی'}
                        </span>
                        <h4 className="text-sm font-bold text-white">{c.title}</h4>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1">{c.description || 'بدون توضیحات'}</p>
                    </div>

                    <span className="shrink-0 text-xs font-mono text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 font-bold">
                      +{c.pointsReward} امتیاز
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 mb-3 line-clamp-2">
                    {c.questionText || c.question}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
                    <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                      <Clock size={12} />
                      {c.timeLimitSeconds || 15} ثانیه
                    </span>

                    <div className="flex items-center gap-1.5">
                      {!isCurrentActive && (
                        <button
                          type="button"
                          onClick={() => handleSetActive(c.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold transition flex items-center gap-1"
                        >
                          <CheckCircle2 size={12} />
                          فعال‌سازی
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(c)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                        title="ویرایش"
                      >
                        <Edit3 size={14} />
                      </button>

                      {deleteConfirmId === c.id ? (
                        <div className="flex items-center gap-1 bg-rose-950/80 p-1 rounded-lg border border-rose-600">
                          <button
                            type="button"
                            onClick={() => handleDelete(c.id)}
                            className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold"
                          >
                            تأیید حذف
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(null)}
                            className="p-0.5 text-slate-400 hover:text-white"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(c.id)}
                          className="p-1.5 rounded-lg bg-rose-950/30 hover:bg-rose-900/50 text-rose-400 hover:text-rose-300 border border-rose-500/20 transition"
                          title="حذف چالش"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* مودال ایجاد یا ویرایش چالش روزانه */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div 
            className="w-full max-w-2xl bg-[#0c1229] border-2 border-indigo-500/40 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            dir="rtl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                  <Zap size={20} />
                </div>
                <h3 className="text-base font-bold text-white">
                  {editingChallenge ? 'ویرایش چالش روزانه' : 'طراحی و ایجاد چالش تاکتیکی روزانه جدید'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">عنوان چالش</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="مثال: چالش تاکتیکی ۲۳ شهریور"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:border-amber-400 outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">پاداش کریستال (امتیاز)</label>
                  <input
                    type="number"
                    min="10"
                    max="5000"
                    value={formData.pointsReward}
                    onChange={(e) => setFormData({ ...formData, pointsReward: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono focus:border-amber-400 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">مهلت پاسخگویی تایمر (ثانیه)</label>
                  <input
                    type="number"
                    min="5"
                    max="300"
                    value={formData.timeLimitSeconds}
                    onChange={(e) => setFormData({ ...formData, timeLimitSeconds: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono focus:border-amber-400 outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">برچسب / موضوع چالش</label>
                  <input
                    type="text"
                    value={formData.badge}
                    onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                    placeholder="tactical_badge یا موضوع دلخواه"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:border-amber-400 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">سناریو و توضیحات چالش</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="توضیح مختصر سناریو یا راهنمایی چالش..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:border-amber-400 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">متن دقیق سوال چالش <span className="text-rose-400">*</span></label>
                <textarea
                  rows={2}
                  value={formData.questionText}
                  onChange={(e) => setFormData({ ...formData, questionText: e.target.value, question: e.target.value })}
                  placeholder="صورت تست هوش یا سوال چالش را بنویسید..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:border-amber-400 outline-none font-medium"
                  required
                />
              </div>

              {/* گزینه‌ها */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold">گزینه‌های پاسخ (گزینه صحیح را علامت بزنید):</label>
                  <span className="text-[11px] text-amber-400">کلیک روی دایره = انتخاب پاسخ صحیح</span>
                </div>

                <div className="space-y-2">
                  {formData.options.map((opt, idx) => {
                    const isSelected = formData.correctOptionIndex === idx;
                    return (
                      <div 
                        key={idx}
                        className={`flex items-center gap-2 p-2 rounded-xl border transition ${
                          isSelected ? 'bg-emerald-950/30 border-emerald-500/60' : 'bg-slate-900 border-slate-700'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, correctOptionIndex: idx })}
                          className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-bold shrink-0 transition ${
                            isSelected 
                              ? 'bg-emerald-500 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.5)]' 
                              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                          }`}
                          title="انتخاب به عنوان پاسخ صحیح"
                        >
                          {isSelected ? <Check size={14} /> : idx + 1}
                        </button>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const next = [...formData.options];
                            next[idx] = e.target.value;
                            setFormData({ ...formData, options: next });
                          }}
                          placeholder={`متن گزینه شماره ${idx + 1}...`}
                          className="flex-1 bg-transparent text-white outline-none text-xs"
                          required
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* سوییچ فعال‌سازی فوری */}
              <div className="pt-2 flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="space-y-0.5">
                  <span className="text-slate-200 font-semibold block">فعال‌سازی به عنوان چالش امروز</span>
                  <span className="text-[11px] text-slate-400">بلافاصله برای کلیه کاربران در نقشه ماموریت‌ها به نمایش درمی‌آید.</span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-5 h-5 rounded accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                  disabled={isSubmitting}
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20 transition flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>در حال ذخیره در دیتابیس Supabase...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={16} />
                      <span>ذخیره و ثبت مستقیم در Supabase</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
