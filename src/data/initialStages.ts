import { JourneyStage, DailyChallengeConfig } from '../types';

/**
 * مراحل نقشه بازی — منبع اصلی داده منحصراً پایگاه داده Supabase است.
 * هیچ داده یا مرحله پیش‌فرضی به صورت هاردکد نمایش داده نمی‌شود.
 */
export const initialJourneyStages: JourneyStage[] = [];

/**
 * قالب مراحل استاندارد اتاق جنگ جهت امکان بارگذاری یا بازنشانی توسط مدیر در پایگاه داده Supabase
 */
export const STANDARD_STAGE_TEMPLATES: JourneyStage[] = [
  {
    id: 's1',
    number: 1,
    title: 'آغاز مسیر',
    subtitle: 'نیت خالصانه و ثبت‌نام اولیه در کاروان',
    status: 'locked',
    iconName: 'flag',
    requiredPoints: 0,
    description: 'گام نخست حضور در کاروان و حرکت در مسیر نورانی. در این مرحله رزمنده ثبت‌نام خود را قطعی کرده و با مرام‌نامه و اهداف آشنا می‌شود.',
    missionsCount: 0,
    completedMissions: 0,
    xOffsetPercent: 0,
    quizQuestions: [
      {
        id: 'q1_1',
        question: 'مهم‌ترین شرط ورود به عملیات کاروان اتاق جنگ چیست؟',
        options: ['حفظ آمادگی جسمانی', 'نیت خالصانه و تعهد گروهی', 'داشتن تجهیزات گران‌قیمت', 'سابقه حضور در ایده‌شو'],
        correctAnswer: 1
      }
    ]
  },
  {
    id: 's2',
    number: 2,
    title: 'معرفت',
    subtitle: 'شناخت مبانی، بصیرت و تعالیم استراتژیک',
    status: 'locked',
    iconName: 'heart',
    requiredPoints: 300,
    description: 'کسب معرفت و بینش عمیق نسبت به آرمان‌ها. رزمنده در این مرحله با مطالعه متون راهنما و پاسخ به سوالات فکری، شایستگی لازم را احراز می‌کند.',
    missionsCount: 0,
    completedMissions: 0,
    xOffsetPercent: -28,
    quizQuestions: [
      {
        id: 'q2_1',
        question: 'بصیرت استراتژیک در جنگ ترکیبی به چه معناست؟',
        options: ['تشخیص روایت درست از جنگ روانی دشمن', 'بی‌تفاوتی نسبت به اخبار رسانه‌ها', 'فقط استفاده از شبکه‌های اجتماعی خارجی', 'تمرکز صرف بر مسائل اقتصادی'],
        correctAnswer: 0
      }
    ]
  },
  {
    id: 's3',
    number: 3,
    title: 'آمادگی',
    subtitle: 'مهارت‌افزایی و سازماندهی نیروها',
    status: 'locked',
    iconName: 'shield',
    requiredPoints: 750,
    description: 'آمادگی روحی، جسمی و تشکیلاتی جهت انجام عملیات‌های مشترک و فعالیت‌های جهادی.',
    missionsCount: 0,
    completedMissions: 0,
    xOffsetPercent: 22,
    quizQuestions: [
      {
        id: 'q3_1',
        question: 'اصل کلیدی در سازماندهی جوخه‌های عملیاتی چیست؟',
        options: ['تقسیم کار هوشمند و هماهنگی تیمی', 'انجام تمام کارها توسط فرمانده', 'کار فردی بدون اطلاع اعضا', 'سرعت بدون کیفیت'],
        correctAnswer: 0
      }
    ]
  },
  {
    id: 's4',
    number: 4,
    title: 'خدمت',
    subtitle: 'امدادرسانی و بسته‌های کمک مؤمنانه',
    status: 'locked',
    iconName: 'service',
    requiredPoints: 1400,
    description: 'مشارکت در خدمت‌رسانی به نیازمندان، توزیع ارزاق و اجرای برنامه‌های خیرخواهانه جهادی.',
    missionsCount: 0,
    completedMissions: 0,
    xOffsetPercent: -22
  },
  {
    id: 's5',
    number: 5,
    title: 'همراهی',
    subtitle: 'همدلی تیمی، جوخه‌بندی و مأموریت میدانی',
    status: 'locked',
    iconName: 'users',
    requiredPoints: 2200,
    description: 'هم‌افزایی جوخه‌ای، تقویت پیوندهای برادری و هماهنگی عملیاتی با سایر ارکان ستاد.',
    missionsCount: 0,
    completedMissions: 0,
    xOffsetPercent: 18
  },
  {
    id: 's6',
    number: 6,
    title: 'زیارت',
    subtitle: 'میثاق با شهدا و حضور در اماکن مقدس',
    status: 'locked',
    iconName: 'shrine',
    requiredPoints: 3400,
    description: 'تجدید بیعت با آرمان‌های والای شهدا و بهره‌مندی از فیوضات معنوی زیارت.',
    missionsCount: 0,
    completedMissions: 0,
    xOffsetPercent: -18
  },
  {
    id: 's7',
    number: 7,
    title: 'سفیر عشق',
    subtitle: 'کسب نشان خادمی و پیروزی نهایی',
    status: 'locked',
    iconName: 'trophy',
    requiredPoints: 5000,
    description: 'رسیدن به بالاترین مرتبه خادمی و سفارت جهادی، دریافت مدال زرین و گواهینامه معتبر ستاد.',
    missionsCount: 0,
    completedMissions: 0,
    xOffsetPercent: 20
  }
];

export const initialDailyChallengeConfig: DailyChallengeConfig = {
  id: 'daily_main',
  title: 'چالش روزانه اتاق جنگ',
  description: 'ماموریت روزانه استراتژیک • پاداش ۱۵۰ امتیاز فوری',
  badge: 'امروز فعال',
  pointsReward: 150,
  question: 'استراتژی برتر در مواجهه با شایعات فضای مجازی چیست؟',
  options: [
    'بازنشر سریع بدون تحقیق',
    'پایش منبع، راست‌آزمایی و پاسخ تبیینی هوشمند',
    'سکوت کامل و نادیده گرفتن موضوع',
    'ایجاد شایعه متقابل'
  ],
  correctOptionIndex: 1,
  isActive: true
};
