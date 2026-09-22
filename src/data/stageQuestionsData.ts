export interface StageQuestion {
  id: string;
  stageId: string;
  stageNumber: number;
  stageTitle: string;
  question: string;
  mediaType: 'image' | 'video';
  mediaUrl: string;
  mediaCaption: string;
  options: [string, string, string, string]; // 4 options (الف، ب، ج، د)
  correctOptionIndex: number; // 0 to 3
  explanation: string;
  rewardPoints: number;
  timeLimitSeconds: number; // default 60s
}

export const STAGE_QUESTIONS: Record<string, StageQuestion[]> = {
  // مرحله ۱: آغاز مسیر
  s1: [
    {
      id: 'q1_1',
      stageId: 's1',
      stageNumber: 1,
      stageTitle: 'آغاز مسیر',
      question: 'در گام نخست ورود به عملیات اتاق جنگ و حرکت در مسیر کاروان، کدام ویژگی بنیادی‌ترین شرط موفقیت و برکت مأموریت‌ها به شمار می‌رود؟',
      mediaType: 'image',
      mediaUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80',
      mediaCaption: 'تصویر توجیهی: عهد و پیمان اولیه رزمندگان در نقطه آغاز حرکت',
      options: [
        'داشتن مدرن‌ترین تجهیزات رایانه‌ای قبل از هرگونه هدف‌گذاری',
        'اخلاص در نیت، میثاق با آرمان شهدا و هم‌افزایی با اعضای جوخه',
        'شتاب‌زدگی در ثبت اقدامات بدون توجه به دقت داوری',
        'فعالیت انفرادی و عدم ثبت اطلاعات در سامانه ستاد'
      ],
      correctOptionIndex: 1,
      explanation: 'در مکتب مقاومت، اخلاص و همبستگی رزمندگان جوخه نقطه پرتاب و عامل اصلی پیروزی در نبردهای سنگین فرهنگی و میدانی است.',
      rewardPoints: 100,
      timeLimitSeconds: 60
    },
    {
      id: 'q1_2',
      stageId: 's1',
      stageNumber: 1,
      stageTitle: 'آغاز مسیر',
      question: 'شناسه یا کد اختصاصی ۹ رقمی رزمنده در سامانه ستاد چه نقش اصلی در سلسله مراتب عملیات ایفا می‌کند؟',
      mediaType: 'video',
      mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      mediaCaption: 'فیلم آموزشی: نحوه احراز هویت تاکتیکی و ثبت گزارش با کد اختصاصی ۹ رقمی',
      options: [
        'احراز هویت یکتا، ثبت مأموریت‌ها و دریافت مستقیم مدال‌ها و کریستال‌های پاداش',
        'فقط یک شماره تصادفی است و هیچ کاربردی در ارزیابی ستاد ندارد',
        'صرفاً برای ورود موقت به سایت طراحی شده و منقضی می‌شود',
        'تنها برای فرماندهان ارشد کاربرد دارد'
      ],
      correctOptionIndex: 0,
      explanation: 'کد ۹ رقمی هویت رسمی رزمنده در سامانه ستاد است و تمام امتیازات، داوری‌ها و نشان‌های افتخار بر پایه آن ثبت و محاسبه می‌گردد.',
      rewardPoints: 100,
      timeLimitSeconds: 60
    }
  ],

  // مرحله ۲: معرفت
  s2: [
    {
      id: 'q2_1',
      stageId: 's2',
      stageNumber: 2,
      stageTitle: 'معرفت',
      question: 'در بیانات رهبر معظم انقلاب و شهید سلیمانی، اصلی‌ترین راهکار برای پیروزی در "جنگ شناختی و ترکیبی" دشمن چیست؟',
      mediaType: 'image',
      mediaUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=900&q=80',
      mediaCaption: 'تصویر راهبردی: رصد عملیاتی و ارتقای بصیرت در منظومه فکری مقاومت',
      options: [
        'جهاد تبیین، افزایش سواد رسانه‌ای و شناخت نقشه‌های پشت پرده دشمن',
        'بی‌تفاوتی به شبهات و شایعات پخش‌شده در فضای مجازی',
        'قطع کامل ارتباط با فناوری‌های ارتباطی نوین',
        'تکرار اخبار تاییدنشده بدون بررسی منبع موثق'
      ],
      correctOptionIndex: 0,
      explanation: 'جهاد تبیین و ارتقای بصیرت سلاح اصلی مقابله با جنگ روایت‌ها و شبهه‌افکنی‌های شبکه‌های متخاصم است.',
      rewardPoints: 120,
      timeLimitSeconds: 60
    },
    {
      id: 'q2_2',
      stageId: 's2',
      stageNumber: 2,
      stageTitle: 'معرفت',
      question: 'شاخصه اصلی "مکتب حاج قاسم" در مواجهه با خطرات و گره‌های ناامیدکننده کدام است؟',
      mediaType: 'video',
      mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      mediaCaption: 'فیلم مستند: جلوه‌های تدبیر، شجاعت و فرصت‌سازی از دل بحران‌ها',
      options: [
        'عقب‌نشینی تا رفع کامل تهدیدات محیطی',
        'فرصت‌سازی از دل تهدیدها و توکل مطلق بر نصرت الهی',
        'توقف برنامه‌ها و سپردن امور به جریان زمان',
        'سکوت و انفعال در برابر هجمه‌های سنگین'
      ],
      correctOptionIndex: 1,
      explanation: 'حاج قاسم سلیمانی فرمودند: "میزان فرصتی که در بحران‌ها وجود دارد در خود فرصت‌ها نیست، به شرطی که نترسیم و نترسانیم."',
      rewardPoints: 120,
      timeLimitSeconds: 60
    }
  ],

  // مرحله ۳: آمادگی
  s3: [
    {
      id: 'q3_1',
      stageId: 's3',
      stageNumber: 3,
      stageTitle: 'آمادگی',
      question: 'در حوزه آمادگی رزم سایبری و تولید محتوای ارزشی، کدام رویکرد بیشترین اثرگذاری میدانی را دارد؟',
      mediaType: 'image',
      mediaUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=900&q=80',
      mediaCaption: 'تصویر میدانی: آموزش‌های تاکتیکی، هوش و آمادگی رزم نوجوانان',
      options: [
        'تولید محتوای هنری، دقیق، جذاب، مستند و انتشار در بسترهای چندرسانه‌ای',
        'کپی‌برداری صرف بدون خلاقیت یا بازبینی محتوایی',
        'انتظار برای اقدام انفرادی دیگران بدون مشارکت تیمی',
        'محدود کردن محتوا صرفاً به قالب‌های متنی طولانی و خسته‌کننده'
      ],
      correctOptionIndex: 0,
      explanation: 'تولید محتوای هنری و بهره‌گیری از قالب‌های نوین نظیر ریلز، موشن‌گرافی و مستند کوتاه بالاترین اثرگذاری را در جبهه رسانه‌ای دارد.',
      rewardPoints: 150,
      timeLimitSeconds: 60
    }
  ],

  // مرحله ۴: خدمت
  s4: [
    {
      id: 'q4_1',
      stageId: 's4',
      stageNumber: 4,
      stageTitle: 'خدمت',
      question: 'مهم‌ترین اصل در اردوهای جهادی و رزمایش‌های توزیع بسته‌های کمک مؤمنانه چیست؟',
      mediaType: 'image',
      mediaUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=900&q=80',
      mediaCaption: 'تصویر مستند: بسته‌بندی اقلام معیشتی و خدمت‌رسانی صادقانه به نیازمندان',
      options: [
        'حفظ کرامت و آبروی خانواده‌های ولی‌نعمت و انجام کار در نهایت خلوص',
        'ثبت تصویر واضح از چهره افراد و انتشار آن در شبکه‌های اجتماعی',
        'کمک‌رسانی صرفاً مشروط به تمجید و تبلیغات رسانه‌ای',
        'تقسیم نامتوازن اقلام بدون نیازسنجی قبلی'
      ],
      correctOptionIndex: 0,
      explanation: 'حفظ حرمت، کرامت نفس و عزت‌مندی محرومان اصل تخطی‌ناپذیر تمامی پویش‌های خدمت‌رسانی مقاومت است.',
      rewardPoints: 150,
      timeLimitSeconds: 60
    },
    {
      id: 'q4_2',
      stageId: 's4',
      stageNumber: 4,
      stageTitle: 'خدمت',
      question: 'کدام گزینه تجلی راستین سنت خادمی و سفارت جهادی در بین نوجوانان است؟',
      mediaType: 'video',
      mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
      mediaCaption: 'فیلم توجیهی: خدمت بی‌منت و برپایی موکب‌های جهادی در مناطق محروم',
      options: [
        'گره‌گشایی از نیازمندان محله، برپایی موکب و خدمتگزاری بی‌منت',
        'تمرکز صرف بر مباحث تئوریک بدون هیچ اقدام عملی',
        'واگذاری مسئولیت به سایر گروه‌ها بدون مشارکت جوخه',
        'تکمیل صوری گزارش کارها بدون اجرای واقعی'
      ],
      correctOptionIndex: 0,
      explanation: 'خادمی صادقانه و برپایی موکب‌های خدمت و همدلی، هویت اصیل رزمندگان مکتب عاشورا را شکل می‌دهد.',
      rewardPoints: 150,
      timeLimitSeconds: 60
    }
  ],

  // مرحله ۵: همراهی
  s5: [
    {
      id: 'q5_1',
      stageId: 's5',
      stageNumber: 5,
      stageTitle: 'همراهی',
      question: 'در ساختار جوخه‌های مقاومت، هماهنگی میان اعضا و فرمانده جوخه چگونه ضامن پیروزی عملیات است؟',
      mediaType: 'image',
      mediaUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80',
      mediaCaption: 'تصویر تاکتیکی: حلقه اتحاد و هم‌فکری عملیاتی اعضای جوخه',
      options: [
        'اطاعت تشکیلاتی، مشورت سازنده، تقسیم متوازن نقش‌ها و تقویت روحیه برادری',
        'تک‌روی افراد و تصمیم‌گیری خارج از اهداف جوخه',
        'حذف ارتباط با سایر جوخه‌ها و انزوای گروهی',
        'نادیده گرفتن توانمندی‌های متنوع اعضای تیم'
      ],
      correctOptionIndex: 0,
      explanation: 'انضباط تشکیلاتی همراه با صمیمیت و همدلی عمیق، ظرفیت یک جوخه ۵ نفره را چند برابر می‌کند.',
      rewardPoints: 180,
      timeLimitSeconds: 60
    }
  ],

  // مرحله ۶: زیارت
  s6: [
    {
      id: 'q6_1',
      stageId: 's6',
      stageNumber: 6,
      stageTitle: 'زیارت',
      question: 'زیارت عتبات عالیات و مزار شهدای والامقام چه تاثیری در روحیه جهادی رزمندگان ایجاد می‌کند؟',
      mediaType: 'image',
      mediaUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=900&q=80',
      mediaCaption: 'تصویر معنوی: تجدید بیعت رزمندگان در آستان متبرک و معراج شهدا',
      options: [
        'تجدید میثاق با عهد عاشورایی، پالایش روح و کسب انگیزه مضاعف برای پایداری در مسیر حق',
        'صرفاً خستگی راه و توقف فعالیت‌های فکری',
        'یک سفر توریستی ساده بدون پیوند با مسئولیت‌های اجتماعی',
        'فراموشی وظایف جاری در بازگشت به وطن'
      ],
      correctOptionIndex: 0,
      explanation: 'زیارت میثاق معنوی برای آمادگی در رکاب ولایت و گام برداشتن در مسیر تمدن نوین اسلامی است.',
      rewardPoints: 200,
      timeLimitSeconds: 60
    }
  ],

  // مرحله ۷: سفیر عشق
  s7: [
    {
      id: 'q7_1',
      stageId: 's7',
      stageNumber: 7,
      stageTitle: 'سفیر عشق',
      question: 'پس از تکمیل هفت‌خوان و فتح قله‌های عملیات، وظیفه نهایی یک «سفیر عشق و مقاومت» چیست؟',
      mediaType: 'video',
      mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
      mediaCaption: 'فیلم افتخار: اعطای نشان خادمی و مدال زرین پیروزی نهایی اتاق جنگ',
      options: [
        'الگو بودن برای سایر نوجوانان، کادرسازی و تداوم رسالت مقاومت در مدرسه و جامعه',
        'بایگانی کردن دانسته‌ها و پایان دادن به فعالیت‌های تشکیلاتی',
        'نگاه از بالا به پایین نسبت به اعضای جدیدالورود',
        'صرفاً دریافت جوایز و قطع ارتباط با قرارگاه'
      ],
      correctOptionIndex: 0,
      explanation: 'پیروزی در اتاق جنگ نقطه آغازین هدایت‌گری، کادرسازی و تربیت نسل آینده رزمندگان و سفیران ولایت است.',
      rewardPoints: 250,
      timeLimitSeconds: 60
    }
  ]
};
