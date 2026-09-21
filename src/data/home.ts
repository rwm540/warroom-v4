export interface HomeAnnouncement {
  id: string;
  title: string;
  message: string;
  imageUrl?: string;
  createdAt: string;
  isActive: boolean;
  isNew?: boolean;
}

export interface HomeStats {
  activeMissions: number;
  activeParticipants: number;
  activeGroups: number;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export const initialHomeAnnouncements: HomeAnnouncement[] = [
  {
    id: 'ann-1',
    title: 'دستورالعمل عملیاتی شماره ۴: آغاز فاز دوم مسابقات',
    message: 'تمامی رزمندگان و فرماندهان جوخه‌ها موظفند پاسخ مأموریت‌های فعال را حداکثر تا ۲۵ تیرماه در سامانه بارگذاری نمایند.',
    imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=400&q=80',
    createdAt: '۱۴۰۳/۰۴/۱۸',
    isActive: true,
    isNew: true
  },
  {
    id: 'ann-2',
    title: 'افتتاح بخش آموزش‌های هوش مصنوعی و امنیت شبکه',
    message: 'دوره جدید ارتقای مهارت در بخش آموزش‌های قرارگاه فعال شد. هم‌اکنون می‌توانید ویدئوها و جزوات آموزشی را مشاهده نمایید.',
    imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=400&q=80',
    createdAt: '۱۴۰۳/۰۴/۱۵',
    isActive: true,
    isNew: true
  },
  {
    id: 'ann-3',
    title: 'اهدای مدال‌های شجاعت و نخبگی به جوخه‌های برتر',
    message: 'مدال‌های افتخار دوره اول ارزیابی توسط هیئت داوران ستاد به حساب کاربری رزمندگان برتر اعطا گردید.',
    imageUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=400&q=80',
    createdAt: '۱۴۰۳/۰۴/۱۰',
    isActive: true,
    isNew: false
  }
];

export const homeStatsData: HomeStats = {
  activeMissions: 18,
  activeParticipants: 1420,
  activeGroups: 156
};

export const faqsData: FaqItem[] = [
  {
    id: 'faq-1',
    question: 'چگونه در مسابقه ثبت‌نام کنم؟',
    answer: 'برای ثبت‌نام، دکمه «شروع ثبت‌نام» را انتخاب کرده و فرم اطلاعات فردی و مدرسه‌ای را تکمیل کنید. پس از تایید، کد اختصاصی رزمنده برای شما صادر می‌شود.'
  },
  {
    id: 'faq-2',
    question: 'آیا می‌توانم به‌صورت گروهی شرکت کنم؟',
    answer: 'بله، هر جوخه می‌تواند شامل ۲ تا ۶ رزمنده باشد. فرمانده جوخه با ایجاد گروه و دریافت «کد ثبت‌نام جوخه»، اعضای دیگر را به جوخه دعوت می‌کند.'
  },
  {
    id: 'faq-3',
    question: 'مأموریت‌ها چگونه ارزیابی می‌شوند؟',
    answer: 'مأموریت‌ها پس از ارسال توسط رزمندگان، توسط هیئت داوران ستاد مرکزی بررسی شده و بر اساس دقت، خلاقیت و کیفیت خروجی، امتیاز و مدال تعلق می‌گیرد.'
  },
  {
    id: 'faq-4',
    question: 'برای دریافت پشتیبانی چه کاری انجام دهم؟',
    answer: 'در صورت بروز هرگونه مشکل فنی، سوال آموزشی یا حقوقی، می‌توانید از بخش «پشتیبانی» تیکت جدید ارسال نموده و پاسخ کارشناسان را پیگیری کنید.'
  }
];

export const defaultHomeButtons = [
  {
    id: 'btn-1',
    text: 'ورود و ثبت‌نام در مسابقه',
    actionTab: 'register',
    iconName: 'UserPlus',
    shape: 'rounded-2xl' as const,
    size: 'lg' as const,
    color: 'red' as const,
    order: 1,
    isActive: true
  },
  {
    id: 'btn-2',
    text: 'مشاهده مأموریت‌های عملیاتی',
    actionTab: 'Missions',
    iconName: 'Shield',
    shape: 'rounded-2xl' as const,
    size: 'md' as const,
    color: 'cyan' as const,
    order: 2,
    isActive: true
  },
  {
    id: 'btn-3',
    text: 'جدول برترین‌ها و جوایز',
    actionTab: 'RewardsLeaderboard',
    iconName: 'Trophy',
    shape: 'rounded-2xl' as const,
    size: 'md' as const,
    color: 'amber' as const,
    order: 3,
    isActive: true
  },
  {
    id: 'btn-4',
    text: 'آکادمی دوره‌های آموزشی',
    actionTab: 'Trainings',
    iconName: 'BookOpen',
    shape: 'rounded-2xl' as const,
    size: 'md' as const,
    color: 'purple' as const,
    order: 4,
    isActive: true
  },
  {
    id: 'btn-5',
    text: 'ارتباط و تیکت پشتیبانی',
    actionTab: 'SupportTicket',
    iconName: 'MessageSquare',
    shape: 'rounded-2xl' as const,
    size: 'sm' as const,
    color: 'emerald' as const,
    order: 5,
    isActive: true
  }
];

export const defaultHomeBlocks = [
  {
    id: 'blk-hero',
    type: 'hero' as const,
    title: 'بخش اصلی هیرو و بنر ثبت‌نام',
    subtitle: 'شامل لوگو، مدال افتخار، عنوان مأموریت و بنر ثبت‌نام دختران/پسران',
    isVisible: true,
    order: 1
  },
  {
    id: 'blk-buttons',
    type: 'action_buttons' as const,
    title: 'نوار دکمه‌ها و دسترسی‌های سریع',
    subtitle: 'کلیدهای تعاملی هدایت به بخش‌های ثبت‌نام، مأموریت‌ها، جوایز و پشتیبانی',
    isVisible: true,
    order: 2
  },
  {
    id: 'blk-video',
    type: 'video_player' as const,
    title: 'ویدئوی اختصاصی معرفی قرارگاه',
    subtitle: 'نمایش تیزر رسمی یا گزارش ویدیویی مسابقات در صفحه اول',
    isVisible: true,
    order: 3
  },
  {
    id: 'blk-stats',
    type: 'stats_strip' as const,
    title: 'آمار و دستاوردهای زنده قرارگاه',
    subtitle: 'تعداد رزمندگان، مأموریت‌های فتح‌شده و کریستال‌های اعطا شده',
    isVisible: true,
    order: 4
  },
  {
    id: 'blk-prizes',
    type: 'prizes_awards' as const,
    title: 'بخش جوایز و کریستال‌های افتخار',
    subtitle: 'معرفی جوایز نفیس شامل کنسول بازی، تبلت و هدایای ویژه',
    isVisible: true,
    order: 5
  },
  {
    id: 'blk-announcements',
    type: 'announcements' as const,
    title: 'اطلاعیه‌ها و اخبار مهم قرارگاه',
    subtitle: 'آخرین اخبار، تغییرات قوانین و پیام‌های ستاد فرماندهی',
    isVisible: true,
    order: 6
  },
  {
    id: 'blk-about',
    type: 'about_section' as const,
    title: 'درباره ما و اهداف قرارگاه',
    subtitle: 'معرفی ماموریت‌ها، سند اهداف و آدرس ستاد مرکزی',
    isVisible: true,
    order: 7
  },
  {
    id: 'blk-faqs',
    type: 'faqs' as const,
    title: 'سوالات متداول رزمندگان (FAQ)',
    subtitle: 'پاسخ به ابهامات رایج ثبت‌نام، ارسال آثار و دریافت جوایز',
    isVisible: true,
    order: 8
  },
  {
    id: 'blk-social',
    type: 'social_messengers' as const,
    title: 'کانال‌ها و راه ارتباطی شبکه اجتماعی',
    subtitle: 'لینک بله، ایتا، تلگرام و خطوط پشتیبانی تلفنی قرارگاه',
    isVisible: true,
    order: 9
  }
];

