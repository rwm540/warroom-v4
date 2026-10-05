import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Check, 
  RotateCcw, 
  Copy, 
  Eye, 
  AlertCircle, 
  ExternalLink,
  Code2,
  CheckCircle2,
  XCircle,
  FileCheck2
} from 'lucide-react';
import { EnamadBadge } from '../common/EnamadBadge';
import { OFFICIAL_ENAMAD_HTML, validateEnamadHtml, sanitizeEnamadHtml } from '../../utils/enamadSanitizer';

interface AdminEnamadManagerProps {
  siteSettings: Record<string, any>;
  onUpdateSiteSettings: (newSettings: Record<string, any>) => void;
  triggerAlert?: (msg: string, type?: string) => void;
}

export const AdminEnamadManager: React.FC<AdminEnamadManagerProps> = ({
  siteSettings,
  onUpdateSiteSettings,
  triggerAlert
}) => {
  // Current settings in state
  const isCurrentlyEnabled = siteSettings?.enamadEnabled !== false;
  const initialHtml = siteSettings?.enamadHtmlCode || OFFICIAL_ENAMAD_HTML;

  const [enabled, setEnabled] = useState<boolean>(isCurrentlyEnabled);
  const [htmlCode, setHtmlCode] = useState<string>(initialHtml);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [validationWarning, setValidationWarning] = useState<string | null>(null);

  // Sync state if siteSettings changes from external update
  useEffect(() => {
    setEnabled(siteSettings?.enamadEnabled !== false);
    setHtmlCode(siteSettings?.enamadHtmlCode || OFFICIAL_ENAMAD_HTML);
  }, [siteSettings?.enamadEnabled, siteSettings?.enamadHtmlCode]);

  // Live validate whenever htmlCode changes
  useEffect(() => {
    if (!htmlCode.trim()) {
      setValidationWarning('کد اینماد نباید خالی باشد.');
      return;
    }
    const val = validateEnamadHtml(htmlCode);
    if (!val.isValid && val.warning) {
      setValidationWarning(val.warning);
    } else {
      setValidationWarning(null);
    }
  }, [htmlCode]);

  // Save handler
  const handleSave = () => {
    const sanitized = sanitizeEnamadHtml(htmlCode.trim() || OFFICIAL_ENAMAD_HTML);
    const updated = {
      ...siteSettings,
      enamadEnabled: enabled,
      enamadHtmlCode: sanitized || OFFICIAL_ENAMAD_HTML
    };

    onUpdateSiteSettings(updated);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3500);

    if (triggerAlert) {
      triggerAlert(
        enabled 
          ? 'تنظیمات و کد رسمی نماد اعتماد الکترونیکی (اینماد) با موفقیت ذخیره و فعال شد.' 
          : 'تنظیمات ذخیره شد. نماد اینماد در حالت غیرفعال قرار گرفت.'
      );
    }
  };

  // Reset to default official code
  const handleResetToOfficial = () => {
    setHtmlCode(OFFICIAL_ENAMAD_HTML);
    setEnabled(true);
    if (triggerAlert) {
      triggerAlert('کد رسمی و تأییدشده اینماد بازنشانی شد. برای اعمال نهایی دکمه ذخیره را بزنید.');
    }
  };

  // Copy code to clipboard
  const handleCopyCode = () => {
    navigator.clipboard.writeText(htmlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (triggerAlert) {
      triggerAlert('کد HTML اینماد در حافظه کپی شد.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-8">
      {/* 1. Header Card */}
      <div className="bg-gradient-to-r from-[#070b1e] via-[#09112a] to-[#070b1e] border border-amber-500/40 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-950/80 border border-amber-500/50 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)] shrink-0">
              <ShieldCheck size={28} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white">
                  نماد اعتماد الکترونیکی (اینماد)
                </h2>
                {/* Live Status Badge */}
                <span className={`text-[11px] font-black px-3 py-0.5 rounded-full border flex items-center gap-1.5 shadow transition-all ${
                  enabled 
                    ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.35)]' 
                    : 'bg-slate-900/90 text-slate-400 border-slate-700'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${enabled ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
                  <span>وضعیت فعلی: {enabled ? 'فعال و در حال نمایش' : 'غیرفعال (مخفی)'}</span>
                </span>
              </div>
              <p className="text-xs text-slate-300/80 mt-1 leading-relaxed">
                مدیریت کد رسمی لوگوی اینماد وزارت صنعت، معدن و تجارت جهت نمایش در فوتر و صفحه اصلی سامانه
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleSave}
              className={`px-5 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center gap-2 shadow-lg active:scale-95 cursor-pointer ${
                isSaved 
                  ? 'bg-emerald-500 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.6)] scale-105' 
                  : 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:brightness-110 text-slate-950 shadow-[0_0_25px_rgba(245,158,11,0.4)]'
              }`}
            >
              <Check size={16} />
              <span>{isSaved ? 'تغییرات ذخیره شد ✓' : 'ذخیره تغییرات'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Config Card */}
      <div className="bg-[#05091b] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-6">
        
        {/* Toggle Switch Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/90 border border-slate-800/90">
          <div>
            <span className="text-xs font-black text-white block">
              نمایش نماد اعتماد در سایت:
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              در صورت فعال بودن، لوگوی رسمی اینماد در انتهای صفحه (فوتر) به همراه پیوند رسمی نمایش می‌یابد.
            </span>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setEnabled(true)}
              className={`px-4 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                enabled
                  ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CheckCircle2 size={14} />
              <span>فعال</span>
            </button>
            <button
              type="button"
              onClick={() => setEnabled(false)}
              className={`px-4 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                !enabled
                  ? 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <XCircle size={14} />
              <span>غیرفعال</span>
            </button>
          </div>
        </div>

        {/* HTML Code Textarea */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label className="text-xs font-black text-amber-300 flex items-center gap-1.5">
              <Code2 size={16} />
              <span>کد HTML اینماد:</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                title="کپی در حافظه"
              >
                <Copy size={12} />
                <span>{copied ? 'کپی شد' : 'کپی کد'}</span>
              </button>

              <button
                type="button"
                onClick={handleResetToOfficial}
                className="px-2.5 py-1 rounded-xl bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-500/40 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                title="بازنشانی به کد پیش‌فرض تاییدشده"
              >
                <RotateCcw size={12} />
                <span>بازنشانی به کد رسمی فعلی</span>
              </button>
            </div>
          </div>

          <div className="relative">
            <textarea
              value={htmlCode}
              onChange={(e) => setHtmlCode(e.target.value)}
              rows={4}
              dir="ltr"
              placeholder="کد HTML رسمی اینماد را اینجا وارد کنید..."
              className="w-full bg-[#030610] border border-slate-700/80 focus:border-amber-400 rounded-2xl p-3.5 text-xs text-amber-200/90 font-mono leading-relaxed outline-none shadow-inner transition resize-y"
            />
          </div>

          {validationWarning && (
            <div className="flex items-center gap-2 text-[11px] text-amber-400 bg-amber-950/40 border border-amber-500/30 p-2.5 rounded-xl">
              <AlertCircle size={14} className="shrink-0 text-amber-400" />
              <span>هشدار: {validationWarning}</span>
            </div>
          )}
        </div>

        {/* Live Preview Box */}
        <div className="space-y-3 p-4 rounded-2xl bg-slate-950 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-white flex items-center gap-1.5">
              <Eye size={15} className="text-cyan-400" />
              <span>پیش‌نمایش زنده لوگوی اینماد (Preview):</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              ارائه‌دهنده: trustseal.enamad.ir
            </span>
          </div>

          <div className="p-6 rounded-2xl bg-[#030610] border border-slate-800 flex flex-col items-center justify-center gap-3 min-h-[140px] text-center">
            {enabled ? (
              <>
                <EnamadBadge 
                  htmlCode={htmlCode} 
                  enabled={true} 
                  previewMode={true} 
                />
                <span className="text-[10px] text-emerald-400 font-bold mt-1 flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  <span>نماد به صورت زنده فعال و قابل کلیک است</span>
                </span>
              </>
            ) : (
              <div className="text-center py-4 space-y-1">
                <XCircle size={28} className="text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400 font-bold">اینماد در حال حاضر غیرفعال است و در سایت نمایش داده نمی‌شود.</p>
                <p className="text-[10px] text-slate-500">برای فعال‌سازی، دکمه «فعال» بالا را انتخاب و تغییرات را ذخیره نمایید.</p>
              </div>
            )}
          </div>
        </div>

        {/* Verification & Meta Tag Status Info Card */}
        <div className="p-4 rounded-2xl bg-[#081026] border border-cyan-500/30 space-y-2">
          <div className="flex items-center gap-2 text-xs font-black text-cyan-300">
            <FileCheck2 size={16} />
            <span>اطلاعات احراز هویت متاتگ و فایل ریشه eNAMAD:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300">
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
              <span>کد تأییدیه اختصاصی:</span>
              <strong className="text-amber-400 font-mono">69416073</strong>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
              <span>فایل احراز هویت ریشه:</span>
              <strong className="text-emerald-400 font-mono">/69416073.txt (موجود)</strong>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 sm:col-span-2 flex items-center justify-between">
              <span>متا تگ در بخش Head:</span>
              <code className="text-cyan-300 font-mono text-[10px] dir-ltr">
                {'<meta name="enamad" content="69416073" />'}
              </code>
            </div>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 flex-wrap gap-3">
          <button
            type="button"
            onClick={handleResetToOfficial}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw size={14} />
            <span>بازنشانی به کد رسمی</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className={`px-6 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 shadow-lg cursor-pointer ${
              isSaved 
                ? 'bg-emerald-500 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.6)]' 
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.4)]'
            }`}
          >
            <Check size={16} />
            <span>{isSaved ? 'تغییرات با موفقیت ذخیره شد' : 'ذخیره تغییرات'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
