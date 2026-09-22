import React from 'react';
import { Headphones, Phone, Mail, ChevronLeft, Send } from 'lucide-react';

interface ContactHomeSectionProps {
  onOpenSupport: () => void;
}

export default function ContactHomeSection({ onOpenSupport }: ContactHomeSectionProps) {
  return (
    <div className="my-4 p-4 rounded-2xl bg-[#080e26]/90 backdrop-blur-xl border border-cyan-500/30 relative overflow-hidden dir-rtl shadow-[0_4px_20px_rgba(0,0,0,0.5)] group hover:border-cyan-400/60 transition-all">
      {/* Background Subtle Grid Texture */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

      <div className="relative z-10 space-y-3 text-right">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-cyan-400">
              <Headphones size={17} />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">
                ارتباط با ما و پشتیبانی مشتریان
              </h2>
              <span className="text-[10px] text-cyan-300/80 font-bold block">پاسخگویی، ارسال تیکت و راهنمایی</span>
            </div>
          </div>
          <Send size={15} className="text-cyan-400" />
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          برای پاسخگویی به سوالات، ثبت گزارش‌ها یا راهنمایی جهت شرکت در مسابقات، می‌توانید از طریق تلفن مستقیم یا ارسال تیکت آنلاین با ما در ارتباط باشید.
        </p>

        <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
          <div className="p-2 rounded-xl bg-[#0c1432] border border-cyan-500/20 text-slate-200 flex items-center gap-1.5">
            <Phone size={14} className="text-amber-400 shrink-0" />
            <span className="font-mono dir-ltr text-xs text-cyan-300">۰۲۱-۸۸۹۹۷۷۶۶</span>
          </div>
          <div className="p-2 rounded-xl bg-[#0c1432] border border-cyan-500/20 text-slate-200 flex items-center gap-1.5">
            <Mail size={14} className="text-amber-400 shrink-0" />
            <span className="font-mono text-[10px] text-cyan-300 truncate">support@warroom.ir</span>
          </div>
        </div>

        <button
          onClick={onOpenSupport}
          className="w-full mt-1 py-2 px-3 rounded-xl bg-cyan-950/70 hover:bg-cyan-900/90 border border-cyan-500/40 text-cyan-300 font-bold text-xs flex items-center justify-between transition-colors shadow-sm"
        >
          <span>ورود به صفحه کامل «ارتباط با ما» و ثبت تیکت</span>
          <ChevronLeft size={16} className="text-cyan-400" />
        </button>
      </div>
    </div>
  );
}
