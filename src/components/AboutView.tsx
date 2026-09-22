import React from 'react';
import { motion } from 'motion/react';
import { 
  ShieldAlert, 
  Target, 
  Users, 
  Compass, 
  Zap, 
  CheckCircle2, 
  Flag, 
  Sparkles,
  Trophy,
  Brain,
  Rocket,
  ArrowRight,
  Home,
  Info,
  Award,
  HeartHandshake,
  Check
} from 'lucide-react';

interface AboutViewProps {
  onNavigate?: (tab: string) => void;
  siteSettings?: any;
  homeStats?: any;
}

export default function AboutView({ onNavigate, siteSettings, homeStats }: AboutViewProps) {
  const stats = [
    { 
      label: 'رزمندگان و شرکت‌کنندگان', 
      value: homeStats ? `+${Number(homeStats.activeParticipants).toLocaleString('fa-IR')}` : '+۱۰,۰۰۰', 
      icon: Users, 
      accentColor: 'text-cyan-400',
      badgeBg: 'bg-cyan-950 text-cyan-300 border-cyan-500/60'
    },
    { 
      label: 'بازی‌ها و رویدادهای فعال', 
      value: homeStats ? `${Number(homeStats.activeMissions).toLocaleString('fa-IR')} بازی` : '۱۲ بازی', 
      icon: Target, 
      accentColor: 'text-amber-400',
      badgeBg: 'bg-amber-950 text-amber-300 border-amber-500/60'
    },
    { 
      label: 'جوخه‌ها و گروه‌های دانش‌آموزی', 
      value: homeStats ? `+${Number(homeStats.activeGroups).toLocaleString('fa-IR')} گروه` : '+۵۰۰ گروه', 
      icon: ShieldAlert, 
      accentColor: 'text-rose-400',
      badgeBg: 'bg-rose-950 text-rose-300 border-rose-500/60'
    },
    { 
      label: 'مأموریت‌های تکمیل‌شده', 
      value: '+۲۵,۰۰۰', 
      icon: Trophy, 
      accentColor: 'text-emerald-400',
      badgeBg: 'bg-emerald-950 text-emerald-300 border-emerald-500/60'
    },
  ];

  const features = [
    {
      title: 'شبیه‌سازی اتاق جنگ استراتژیک',
      desc: 'پلتفرم جامع شبیه‌سازی تصمیم‌گیری‌های پیچیده و رقابت‌های سناریومحور برای تقویت تفکر تحلیلی، حل مسئله و مدیریت بحران.',
      icon: Brain,
      iconColor: 'text-rose-400',
      iconBg: 'bg-rose-950 border-rose-600'
    },
    {
      title: 'مدیریت و همکاری جوخه‌ای',
      desc: 'امکان تشکیل گروه‌ها، تعیین سرگروه و اعضا، تخصیص نقش‌های عملیاتی و همکاری تیمی هماهنگ در حل مراحل رقابت.',
      icon: Users,
      iconColor: 'text-cyan-400',
      iconBg: 'bg-cyan-950 border-cyan-600'
    },
    {
      title: 'داوری آنلاین و رده‌بندی هوشمند',
      desc: 'ارزیابی دقیق پاسخ‌ها توسط ستاد داوری، ثبت امتیازات عملیاتی و به‌روزرسانی لحظه‌ای جدول برترین رزمندگان و جوخه‌ها.',
      icon: Trophy,
      iconColor: 'text-amber-400',
      iconBg: 'bg-amber-950 border-amber-600'
    },
    {
      title: 'نقشه راه و محتوای آموزشی',
      desc: 'محتوای آموزشی چندرسانه‌ای کاربردی، راهنمای گام‌به‌گام مراحل و اعطای مدال‌های افتخار به رزمندگان برتر.',
      icon: Compass,
      iconColor: 'text-emerald-400',
      iconBg: 'bg-emerald-950 border-emerald-600'
    }
  ];

  const values = [
    'تقویت روحیه کار گروهی، اخلاق تیمی و مسئولیت‌پذیری اجتماعی',
    'ارتقای مهارت تفکر نقادانه، تحلیل سیاسی، اجتماعی و استراتژیک',
    'ایجاد محیط رقابتی سالم، پویا و انگیزشی برای نسل جوان و نوجوان',
    'شفافیت کامل و داوری عادلانه در ارزیابی عملکرد و ثبت امتیازات'
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="space-y-6 dir-rtl pb-16 max-w-6xl mx-auto px-3 sm:px-6 text-slate-100"
    >
      {/* 1. Header Bar with Clear Back Button - 100% Solid Surface */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0f172a] border border-slate-700 rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3.5 rounded-xl bg-amber-500/20 border border-amber-500 text-amber-300 shrink-0">
            <Info size={26} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white">درباره ما و پروژه اتاق جنگ</h1>
            <p className="text-sm font-bold text-amber-200 mt-1">معرفی اهداف، چشم‌انداز، رسالت و دستاوردهای سامانه</p>
          </div>
        </div>

        {/* Clear Return to Home Button */}
        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate('Home')}
            className="self-stretch sm:self-auto px-5 py-3 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-amber-300 border border-amber-500/80 font-black text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2.5 cursor-pointer active:scale-95"
          >
            <Home size={18} className="text-amber-400" />
            <span className="text-white font-extrabold">بازگشت به صفحه اصلی</span>
            <ArrowRight size={16} className="text-amber-400 rotate-180" />
          </button>
        )}
      </div>
      
      {/* 2. Hero Introduction Card - 100% Solid Surface */}
      <div className="rounded-3xl bg-[#0f172a] border border-cyan-500/50 p-6 sm:p-8 md:p-10 shadow-xl space-y-5">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-950 border border-cyan-500 text-cyan-200 text-xs sm:text-sm font-black shadow-sm">
          <Sparkles size={16} className="text-cyan-400" />
          <span>سامانه جامع بازی‌های استراتژیک و شبیه‌سازی اتاق جنگ</span>
        </div>

        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-tight">
          درباره <span className="text-cyan-400">پروژه اتاق جنگ استراتژیک</span>
        </h2>

        <p className="text-sm sm:text-base text-slate-100 leading-relaxed font-semibold">
          {siteSettings?.aboutText || 'پلتفرم اتاق جنگ یک سامانه تعاملی، رقابتی و آموزشی است که با هدف پرورش تفکر استراتژیک، افزایش توان تحلیل مسئله و تقویت روحیه کار تیمی در میان نوجوانان و جوانان طراحی شده است. در این سامانه، کاربران در قالب جوخه‌های عملیاتی وارد سناریوهای واقعی و شبیه‌سازی‌شده می‌شوند و با حل چالش‌ها، امتیاز و رتبه کسب می‌کنند.'}
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('Support')}
              className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg transition flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <span>ارسال تیکت و ارتباط با پشتیبانی</span>
              <ArrowRight size={16} className="rotate-180" />
            </button>
          )}

          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('Rules')}
              className="px-6 py-3 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-white border border-slate-600 font-bold text-xs sm:text-sm transition flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Award size={16} className="text-amber-400" />
              <span>مشاهده قوانین و مقررات مسابقات</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Stats Counter Grid - 100% Solid Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div 
              key={idx}
              className="bg-[#0f172a] border border-slate-700 rounded-2xl p-5 text-right space-y-3 shadow-lg hover:border-slate-600 transition"
            >
              <div className="flex items-center justify-between">
                <span className={`text-2xl sm:text-3xl font-black font-mono ${s.accentColor}`}>
                  {s.value}
                </span>
                <div className="p-3 rounded-xl bg-[#1e293b] border border-slate-700">
                  <Icon size={22} className={s.accentColor} />
                </div>
              </div>
              <p className="text-sm font-bold text-slate-200">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* 4. Core Mission & Vision - 100% Solid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-[#0f172a] border border-rose-500/50 rounded-3xl p-6 sm:p-7 space-y-3.5 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-rose-950 border border-rose-500 text-rose-300 w-fit">
              <Flag size={24} />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white">مأموریت و رسالت پروژه</h3>
          </div>
          <p className="text-sm sm:text-base text-slate-100 leading-relaxed font-semibold">
            ارتقای سطح آگاهی، قدرت سناریونویسی و مهارت‌های حل مسئله در مواجهه با چالش‌های پیچیده دنیای امروز. ما بر این باوریم که با شبیه‌سازی چالش‌های واقعی در بستر بازی و رقابت، می‌توان استعدادهای برتر مدیریت و تفکر استراتژیک را شناسایی و پرورش داد.
          </p>
        </div>

        <div className="bg-[#0f172a] border border-amber-500/50 rounded-3xl p-6 sm:p-7 space-y-3.5 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-950 border border-amber-500 text-amber-300 w-fit">
              <Target size={24} />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white">چشم‌انداز آینده</h3>
          </div>
          <p className="text-sm sm:text-base text-slate-100 leading-relaxed font-semibold">
            تبدیل شدن به برترین پلتفرم بازی‌های استراتژیک دانش‌آموزی در کشور، ایجاد شبکه علمی و عملیاتی مربیان و داوران باتجربه، و گسترش بازی‌های بومی در سطح ملی و بین‌المللی با مشارکت پرشور نوجوانان مستعد.
          </p>
        </div>
      </div>

      {/* 5. Key Features Grid - 100% Solid Cards */}
      <div className="space-y-4">
        <div className="text-right space-y-1">
          <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
            <Zap className="text-cyan-400" size={22} />
            قابلیت‌ها و امکانات برجسته سامانه
          </h3>
          <p className="text-sm text-slate-200 font-bold">
            امکانات منحصربه‌فرد برای شرکت‌کنندگان، سرگروه‌ها و داوران ستاد
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {features.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <div 
                key={i}
                className="bg-[#0f172a] border border-slate-700 rounded-2xl p-5 sm:p-6 space-y-3 shadow-lg hover:border-slate-600 transition"
              >
                <div className="flex items-center gap-3.5">
                  <div className={`p-3 rounded-xl ${feat.iconBg} ${feat.iconColor} border shrink-0`}>
                    <Icon size={22} />
                  </div>
                  <h4 className="text-base sm:text-lg font-black text-white">{feat.title}</h4>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed font-semibold">
                  {feat.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Project Values - 100% Solid Cards */}
      <div className="bg-[#0f172a] border border-slate-700 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
        <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
          <CheckCircle2 className="text-emerald-400" size={24} />
          ارزش‌ها و اصول کلیدی پروژه
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {values.map((val, idx) => (
            <div key={idx} className="flex items-center gap-3 p-4 rounded-xl bg-[#1e293b] border border-slate-700">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500 text-emerald-400 flex items-center justify-center shrink-0">
                <Check size={14} className="font-black" />
              </div>
              <span className="text-sm font-bold text-white">{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 7. Bottom Navigation Link */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-[#0f172a] border border-slate-700">
        <span className="text-sm font-bold text-slate-200">
          برای کسب راهنمایی بیشتر یا ارسال پیام، به بخش ارتباط با پشتیبانی مراجعه فرمایید.
        </span>
        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate('Support')}
            className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs sm:text-sm transition flex items-center gap-2 cursor-pointer"
          >
            <span>مرکز پشتیبانی و تیکت‌ها</span>
            <ArrowRight size={14} className="rotate-180" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
