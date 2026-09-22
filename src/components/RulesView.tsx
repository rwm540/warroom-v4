import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  FileText, 
  ShieldCheck, 
  AlertTriangle, 
  Scale, 
  Users, 
  Trophy, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  Home, 
  Lock,
  Search,
  Check,
  HelpCircle
} from 'lucide-react';

interface RulesViewProps {
  onNavigate?: (tab: string) => void;
  siteSettings?: any;
}

export default function RulesView({ onNavigate }: RulesViewProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const ruleCategories = [
    {
      id: 'reg',
      title: '۱. قوانین عمومی و شرایط ثبت‌نام',
      icon: Users,
      badgeColor: 'bg-cyan-950 text-cyan-300 border-cyan-500',
      items: [
        'کلیه شرکت‌کنندگان ملزم به ثبت اطلاعات واقعی، کدملی و مشخصات هویتی صحیح در هنگام عضویت می‌باشند.',
        'هر کاربر مجاز به عضویت در یک جوخه عملیاتی در طول هر دوره از مسابقات است.',
        'مسئولیت حفظ محرمانگی نام کاربری، کلمه عبور و کد پرسنلی اختصاصی بر عهده خود کاربر می‌باشد.'
      ]
    },
    {
      id: 'squad',
      title: '۲. ضوابط تشکیل جوخه‌ها و کار تیمی',
      icon: ShieldCheck,
      badgeColor: 'bg-amber-950 text-amber-300 border-amber-500',
      items: [
        'تعداد اعضای مجاز هر جوخه طبق ضوابط بازی بین ۳ تا ۵ نفر تعیین شده است.',
        'فرمانده (سرگروه) جوخه مسئولیت هماهنگی، ارسال پاسخ‌های نهایی مأموریت و مکاتبات رسمی با ستاد داوری را بر عهده دارد.',
        'خروج یا جابجایی اعضا در حین اجرای بازی تنها با تایید ستاد پشتیبانی امکان‌پذیر خواهد بود.'
      ]
    },
    {
      id: 'submissions',
      title: '۳. ضوابط ارسال پاسخ‌ها و مهلت زمانی مأموریت‌ها',
      icon: Clock,
      badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-500',
      items: [
        'تمامی پاسخ‌ها، تحلیل‌ها و سناریوها باید پیش از اتمام تایمر معکوس هر مرحله در سامانه ثبت شوند.',
        'پاسخ‌های ارسالی پس از پایان مهلت قانونی به عنوان پاسخ تأخیری ثبت شده و شامل کسر امتیاز خواهند بود.',
        'فرمت فایل‌های ضمیمه باید مطابق دستورالعمل مشخص‌شده در مأموریت (PDF، صوت، تصویر یا متن) باشد.'
      ]
    },
    {
      id: 'judging',
      title: '۴. آیین‌نامه داوری، نمره‌دهی و ثبت اعتراضات',
      icon: Scale,
      badgeColor: 'bg-indigo-950 text-indigo-300 border-indigo-500',
      items: [
        'ارزیابی و نمره‌دهی پاسخ‌ها بر اساس سنجه‌های تحلیلی، خلاقیت، استدلال منطقی و کار گروهی انجام می‌گیرد.',
        'در صورت وجود هرگونه ابهام، کاربران می‌توانند ظرف مدت ۲۴ ساعت پس از اعلام نتایج از طریق تیکت پشتیبانی اعتراض خود را ثبت نمایند.',
        'آرای هیئت داوران ستاد پس از بازبینی و اعلام نظر نهایی، قطعی و لازم‌الاجرا است.'
      ]
    },
    {
      id: 'ethics',
      title: '۵. اصول اخلاق حرفه‌ای، صداقت و امنیت اطلاعات',
      icon: Lock,
      badgeColor: 'bg-rose-950 text-rose-300 border-rose-500',
      items: [
        'هرگونه کپی‌برداری غیرمجاز یا تبادل پاسخ میان جوخه‌های مختلف منجر به کسر امتیاز یا تعلیق جوخه خواهد شد.',
        'رعایت ادب و احترام به سایر رقبا و داوران در بخش پیام‌ها، تیکت‌ها و ویترین الزامی است.',
        'استفاده از روش‌های نامتعارف و دستکاری در داده‌های سامانه به منزله تخلف انضباطی تلقی می‌گردد.'
      ]
    },
    {
      id: 'awards',
      title: '۶. جوایز و اهدای نشان‌های افتخار',
      icon: Trophy,
      badgeColor: 'bg-yellow-950 text-yellow-300 border-yellow-500',
      items: [
        'نشان‌های افتخار و مدال‌های مأموریت به برترین جوخه‌ها و رزمندگان فعال تعلق می‌گیرد.',
        'جوایز نقدی، هدایا و لوح‌های تقدیر در مراسم اختتامیه رسمی ستاد به نفرات برتر اهدا خواهد شد.'
      ]
    }
  ];

  const filteredCategories = ruleCategories.filter(cat => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return cat.title.toLowerCase().includes(q) || cat.items.some(it => it.toLowerCase().includes(q));
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="space-y-6 dir-rtl pb-16 max-w-6xl mx-auto px-3 sm:px-6 text-slate-100"
    >
      {/* 1. Header Bar with Clear Back Button - 100% Solid Opaque */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0f172a] border border-slate-700 rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500 text-emerald-300 shrink-0">
            <FileText size={26} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white">قوانین و مقررات رسمی سامانه</h1>
            <p className="text-sm font-bold text-emerald-200 mt-1">ضوابط برگزاری مسابقات، داوری مأموریت‌ها و آیین‌نامه انضباطی اتاق جنگ</p>
          </div>
        </div>

        {/* Clear Return to Home Button */}
        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate('Home')}
            className="self-stretch sm:self-auto px-5 py-3 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-emerald-300 border border-emerald-500/80 font-black text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2.5 cursor-pointer active:scale-95"
          >
            <Home size={18} className="text-emerald-400" />
            <span className="text-white font-extrabold">بازگشت به صفحه اصلی</span>
            <ArrowRight size={16} className="text-emerald-400 rotate-180" />
          </button>
        )}
      </div>

      {/* 2. Rules Notice Banner - 100% Solid Opaque */}
      <div className="bg-[#0f172a] border border-emerald-500/50 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-950 border border-emerald-500 text-emerald-300">
            <ShieldCheck size={22} />
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white">منشور اخلاقی و انضباطی شرکت‌کنندگان</h2>
        </div>
        <p className="text-sm sm:text-base text-slate-100 leading-relaxed font-semibold">
          تمامی شرکت‌کنندگان، مربیان و سرگروه‌ها با عضویت و حضور در سامانه متعهد به رعایت کامل مفاد این آیین‌نامه می‌باشند. هدف ما ایجاد بستری عادلانه، شفاف، پویا و سازنده برای شکوفایی استعدادها و تقویت تفکر استراتژیک است.
        </p>

        {/* Search inside rules */}
        <div className="pt-2">
          <div className="relative max-w-md">
            <Search size={18} className="absolute right-3.5 top-3.5 text-slate-400" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در متن قوانین (مثال: داوری، جوخه، امتیاز، مهلت)..."
              className="w-full bg-[#1e293b] border-2 border-slate-600 focus:border-emerald-400 rounded-xl pr-10 pl-4 py-2.5 text-sm text-white font-bold placeholder-slate-400 outline-none transition"
            />
          </div>
        </div>
      </div>

      {/* 3. Categorized Rules Grid - 100% Solid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredCategories.map((cat) => {
          const Icon = cat.icon;
          return (
            <div 
              key={cat.id}
              className="bg-[#0f172a] border border-slate-700 rounded-3xl p-6 sm:p-7 space-y-4 shadow-xl hover:border-slate-600 transition"
            >
              <div className="flex items-center gap-3.5 border-b border-slate-700 pb-3.5">
                <div className={`p-3 rounded-2xl ${cat.badgeColor} border shrink-0`}>
                  <Icon size={22} />
                </div>
                <h3 className="text-base sm:text-lg font-black text-white">{cat.title}</h3>
              </div>

              <div className="space-y-3 pt-1">
                {cat.items.map((item, itemIdx) => (
                  <div key={itemIdx} className="flex items-start gap-3 text-sm text-slate-100 font-semibold leading-relaxed">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={12} className="font-black" />
                    </div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {filteredCategories.length === 0 && (
        <div className="p-10 text-center rounded-2xl bg-[#0f172a] border border-slate-700 text-slate-300 font-bold text-sm">
          هیچ قانونی متناسب با عبارت جستجوی «{searchQuery}» یافت نشد.
        </div>
      )}

      {/* 4. Bottom Action Card - 100% Solid Opaque */}
      <div className="bg-[#0f172a] border border-slate-700 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-5 shadow-xl">
        <div className="space-y-1.5 text-center sm:text-right">
          <h3 className="text-base sm:text-lg font-black text-white flex items-center justify-center sm:justify-start gap-2">
            <HelpCircle size={20} className="text-amber-400" />
            <span>سوالی درباره قوانین، آیین‌نامه یا نحوه امتیازدهی دارید؟</span>
          </h3>
          <p className="text-sm text-slate-200 font-bold">
            می‌توانید با بخش پشتیبانی ستاد مرکزی تماس حاصل فرمایید یا از طریق سامانه تیکت ارسال کنید.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('Support')}
              className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs sm:text-sm shadow-md transition flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <span>ارسال تیکت به ستاد پشتیبانی</span>
              <ArrowRight size={16} className="rotate-180" />
            </button>
          )}
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('Home')}
              className="px-5 py-3 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-white border border-slate-600 font-bold text-xs sm:text-sm transition flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Home size={16} className="text-cyan-400" />
              <span>صفحه اصلی</span>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
