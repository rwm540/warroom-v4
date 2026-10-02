import React, { useState } from 'react';
import { 
  Compass, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Check, 
  X, 
  Edit3, 
  Sparkles, 
  HelpCircle,
  Eye,
  Gamepad2,
  Gift,
  Grid,
  Trophy,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

export interface GuideTutorialStep {
  id: string;
  targetTab: string;
  targetLabel: string;
  title: string;
  text: string;
}

export interface GuideTutorialConfig {
  isEnabled: boolean;
  steps: GuideTutorialStep[];
}

export const defaultGuideConfig: GuideTutorialConfig = {
  isEnabled: true,
  steps: [
    {
      id: 'step_1',
      targetTab: 'Journey',
      targetLabel: 'مرکز فرماندهی و آمادگی عملیات',
      title: 'سلام رزمنده! خوش اومدی',
      text: 'من راهنمای تاکتیکی تو در اتاق جنگ هستم. بیا با هم امکانات اصلی و مسیر مسابقه رو در چند ثانیه مرور کنیم.'
    },
    {
      id: 'step_2',
      targetTab: 'Journey',
      targetLabel: 'نقشه مراحل هفت‌گانه مسابقه',
      title: '۱. نقشه مراحل بازی',
      text: 'اینجا نقشه اصلی بازیه؛ ۷ مرحله هیجان‌انگیز داری. با ورود به هر مرحله، چالش‌ها و معماها رو حل کن!'
    },
    {
      id: 'step_3',
      targetTab: 'Rewards',
      targetLabel: 'ویترین جوایز و کریستال‌ها',
      title: '۲. ویترین جوایز و کریستال‌ها',
      text: 'در این بخش هدایا و جوایز ارزنده‌ای که تعیین شده قرار داره. با کسب امتیاز و کریستال قفل جوایز رو باز کن.'
    },
    {
      id: 'step_4',
      targetTab: 'Vitrin',
      targetLabel: 'ویترین و اکسپلور دست‌سازه‌ها',
      title: '۳. ویترین و آثار دانش‌آموزی',
      text: 'ویدیوها و دست‌سازه‌های ارسالی بچه‌های سراسر کشور رو اینجا ببین و بهشون ستاره و امتیاز بده.'
    },
    {
      id: 'step_5',
      targetTab: 'Leaderboard',
      targetLabel: 'سکوی برترین‌های کشور',
      title: '۴. جدول رده‌بندی و قهرمانان',
      text: 'روی سکوی قهرمانی، برترین‌های کشور می‌درخشند. تلاش کن با کسب بیشترین امتیاز به صدر جدول برسی!'
    }
  ]
};

interface AdminGuideTutorialManagerProps {
  guideConfig?: GuideTutorialConfig;
  setGuideConfig?: (config: GuideTutorialConfig) => void;
  triggerAlert: (msg: string) => void;
  onPreviewTutorial?: () => void;
}

export default function AdminGuideTutorialManager({
  guideConfig,
  setGuideConfig,
  triggerAlert,
  onPreviewTutorial
}: AdminGuideTutorialManagerProps) {
  const currentConfig: GuideTutorialConfig = guideConfig && Array.isArray(guideConfig.steps) 
    ? guideConfig 
    : defaultGuideConfig;

  const [formConfig, setFormConfig] = useState<GuideTutorialConfig>(currentConfig);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);

  const handleToggleEnable = () => {
    const updated = { ...formConfig, isEnabled: !formConfig.isEnabled };
    setFormConfig(updated);
    if (setGuideConfig) {
      setGuideConfig(updated);
    }
    triggerAlert(updated.isEnabled ? 'تور راهنمای کاربران فعال گردید.' : 'تور راهنمای کاربران غیرفعال شد.');
  };

  const handleAddStep = () => {
    const newStep: GuideTutorialStep = {
      id: `step_${Date.now()}`,
      targetTab: 'Journey',
      targetLabel: 'بخش جدید',
      title: 'عنوان گام راهنما',
      text: 'متن دیالوگ و توضیحات راهنما برای کاربران...'
    };
    const updated = { ...formConfig, steps: [...formConfig.steps, newStep] };
    setFormConfig(updated);
    setEditingStepId(newStep.id);
    if (setGuideConfig) {
      setGuideConfig(updated);
    }
    triggerAlert('گام جدید به راهنمای تور اضافه شد.');
  };

  const handleDeleteStep = (id: string, title: string) => {
    if (formConfig.steps.length <= 1) {
      triggerAlert('راهنما باید حداقل دارای ۱ گام باشد.');
      return;
    }
    const updated = {
      ...formConfig,
      steps: formConfig.steps.filter(s => s.id !== id)
    };
    setFormConfig(updated);
    if (setGuideConfig) {
      setGuideConfig(updated);
    }
    triggerAlert(`گام «${title}» حذف گردید.`);
  };

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    const newSteps = [...formConfig.steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSteps.length) return;

    const temp = newSteps[index];
    newSteps[index] = newSteps[targetIndex];
    newSteps[targetIndex] = temp;

    const updated = { ...formConfig, steps: newSteps };
    setFormConfig(updated);
    if (setGuideConfig) {
      setGuideConfig(updated);
    }
  };

  const handleStepChange = (id: string, field: keyof GuideTutorialStep, value: string) => {
    const updated = {
      ...formConfig,
      steps: formConfig.steps.map(s => s.id === id ? { ...s, [field]: value } : s)
    };
    setFormConfig(updated);
  };

  const handleSaveAll = () => {
    if (setGuideConfig) {
      setGuideConfig(formConfig);
    }
    triggerAlert('تمامی تغییرات متن‌ها و دیالوگ‌های راهنما در دیتابیس Supabase ذخیره گردید.');
  };

  return (
    <div className="space-y-5 dir-rtl font-sans text-right" dir="rtl">
      
      {/* Header Banner */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[#080d22] border border-amber-500/40 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.3)] shrink-0">
            <Compass size={24} className="animate-spin" style={{ animationDuration: '8s' }} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span>مدیریت متن‌ها و گام‌های راهنمای تعاملی</span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full font-bold">
                همگام با Supabase
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              در این بخش می‌توانید متن دیالوگ کاراکتر راهنما، عناوین و ترتیب گام‌های آموزش اولیه کاربر را تنظیم کنید.
            </p>
          </div>
        </div>

        {/* Global Toggle & Preview */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleToggleEnable}
            className={`px-3.5 py-2 rounded-2xl text-xs font-black transition flex items-center gap-2 cursor-pointer shadow-md ${
              formConfig.isEnabled
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-500/30'
                : 'bg-red-500/20 text-red-300 border border-red-500/50 hover:bg-red-500/30'
            }`}
          >
            {formConfig.isEnabled ? (
              <>
                <ToggleRight size={18} className="text-emerald-400" />
                <span>راهنما فعال است</span>
              </>
            ) : (
              <>
                <ToggleLeft size={18} className="text-red-400" />
                <span>راهنما غیرفعال است</span>
              </>
            )}
          </button>

          {onPreviewTutorial && (
            <button
              type="button"
              onClick={onPreviewTutorial}
              className="px-3.5 py-2 rounded-2xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 font-black text-xs transition flex items-center gap-1.5 shadow cursor-pointer active:scale-95"
            >
              <Eye size={15} />
              <span>پیش‌نمایش زنده</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Steps List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
            <Sparkles size={16} className="text-amber-400" />
            <span>فهرست دیالوگ‌ها و گام‌های تعاملی ({formConfig.steps.length} گام):</span>
          </h3>

          <button
            type="button"
            onClick={handleAddStep}
            className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-lg flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            <Plus size={16} />
            <span>افزودن گام دیالوگ جدید</span>
          </button>
        </div>

        <div className="space-y-3">
          {formConfig.steps.map((step, index) => {
            const isEditing = editingStepId === step.id;
            const isFirst = index === 0;
            const isLast = index === formConfig.steps.length - 1;

            return (
              <div 
                key={step.id}
                className={`p-4 sm:p-5 rounded-3xl border transition-all duration-200 ${
                  isEditing 
                    ? 'bg-[#0a1228] border-amber-500/60 shadow-[0_0_25px_rgba(245,158,11,0.2)]' 
                    : 'bg-[#070e22]/90 border-slate-800 hover:border-slate-700 shadow-xl'
                }`}
              >
                {/* Step Header Bar */}
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800/80 mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-400/50 text-amber-300 font-mono text-xs font-black flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <h4 className="text-xs sm:text-sm font-black text-white">
                      {step.title || 'بدون عنوان'}
                    </h4>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-400 font-bold">
                      {step.targetLabel || step.targetTab}
                    </span>
                  </div>

                  {/* Actions: Move Up / Down / Edit / Delete */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => handleMoveStep(index, 'up')}
                      className={`p-1.5 rounded-xl border transition ${
                        isFirst
                          ? 'opacity-30 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-600'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700 cursor-pointer'
                      }`}
                      title="حرکت به بالا"
                    >
                      <ArrowUp size={14} />
                    </button>

                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => handleMoveStep(index, 'down')}
                      className={`p-1.5 rounded-xl border transition ${
                        isLast
                          ? 'opacity-30 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-600'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700 cursor-pointer'
                      }`}
                      title="حرکت به پایین"
                    >
                      <ArrowDown size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditingStepId(isEditing ? null : step.id)}
                      className={`p-1.5 rounded-xl border transition ${
                        isEditing
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700 cursor-pointer'
                      }`}
                      title="ویرایش متن"
                    >
                      <Edit3 size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteStep(step.id, step.title)}
                      className="p-1.5 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-400 border border-red-900/50 transition cursor-pointer"
                      title="حذف گام"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Form Editor or Preview Text */}
                {isEditing ? (
                  <div className="space-y-3 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">عنوان اصلی گام:</label>
                        <input
                          type="text"
                          value={step.title}
                          onChange={(e) => handleStepChange(step.id, 'title', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                          placeholder="مثال: ۱. نقشه مراحل مسابقه"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">برچسب یا نام بخش مربوطه:</label>
                        <input
                          type="text"
                          value={step.targetLabel}
                          onChange={(e) => handleStepChange(step.id, 'targetLabel', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                          placeholder="مثال: نقشه مراحل هفت‌گانه"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">متن دیالوگ صحبت‌های کاراکتر راهنما:</label>
                      <textarea
                        rows={3}
                        value={step.text}
                        onChange={(e) => handleStepChange(step.id, 'text', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-white leading-relaxed resize-y"
                        placeholder="متنی که داخل حباب دیالوگ سخنگو برای کاربر نمایش داده می‌شود..."
                      />
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingStepId(null);
                          handleSaveAll();
                        }}
                        className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow active:scale-95"
                      >
                        <Check size={14} />
                        <span>ثبت تغییرات این گام</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={() => setEditingStepId(step.id)}
                    className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-200 leading-relaxed font-medium cursor-pointer hover:border-slate-700 transition"
                  >
                    {step.text}
                  </div>
                )}

              </div>
            );
          })}
        </div>
      </div>

      {/* Save Button */}
      <div className="pt-2 flex justify-end">
        <button
          type="button"
          onClick={handleSaveAll}
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center gap-2 transition active:scale-95 cursor-pointer"
        >
          <Check size={18} />
          <span>ذخیره و انتشار تغییرات راهنما در دیتابیس Supabase</span>
        </button>
      </div>

    </div>
  );
}
