# گزارش بررسی خطای Build

تاریخ: ۲۰۲۶-۰۹-۲۱ — commit بررسی‌شده: `64437b349adfc2301c41af5ba57f53d436a74c11`

## نتیجه

**علت مشخص شد؛ اصلاح ایمن به دریافت فایل‌های اصلی نیاز دارد. Build هنوز ناموفق است.**

مخزن ناقص است: importها و re-exportهای سورس به ۳۵ ماژول محلیِ ناموجود اشاره می‌کنند.
این عدد، مسیرهای با پسوند و بدون پسوند را یک ماژول محسوب می‌کند و شامل
`ForcePasswordChangeModal` است که فقط در barrel فایل `src/components/index.ts` ارجاع شده است؛
بنابراین تعداد ماژول‌های این فهرست الزاماً برابر تعداد خطاهای یک اجرای Vite نیست.

## شواهد Git

- checkout اولیه shallow بود. با `git fetch --unshallow origin` تاریخچهٔ کامل دریافت شد؛ ۱۵ commit بررسی شد.
- در `2494d5f`، اولین commit کد برنامه، `App.tsx` همین پنج کامپوننت گزارش‌شده را import می‌کند، ولی فایل‌های آن‌ها در tree آن commit نیستند.
- `git log --all --name-status` هیچ سابقهٔ افزودن، حذف یا جابه‌جایی برای این پنج فایل نشان نداد.
- جست‌وجوی نام فایل‌های هر ۳۵ ماژول در تاریخچه، بدون حساسیت به حروف و مستقل از پوشه، هیچ نسخه‌ای پیدا نکرد.
- پیاده‌سازی پنج کامپوننت گزارش‌شده در فایل‌های فعلیِ دیگر هم پیدا نشد.
- `git ls-remote --heads --tags origin` فقط `main` را نشان داد؛ PR یا release دیگری برای بازیابی پیدا نشد.
- `git fsck --full --no-reflogs` نیز شیء بازیابی‌پذیر دیگری گزارش نکرد.
- `8c507af` صرفاً barrel exportها را اضافه کرده و `64437b3` پسوند importها و تنظیم resolve را تغییر داده است؛ هیچ‌کدام فایل‌های غایب را اضافه نکرده‌اند.
- `.gitignore` مسیر این کامپوننت‌ها را نادیده نمی‌گیرد.

نتیجه: نبودن سورس در تاریخچهٔ منتشرشده ثابت است؛ مشکل این پنج import، case sensitivity، پسوند یا جابه‌جایی به مسیر موجود نیست.
از داخل این checkout نمی‌توان اثبات کرد فایل‌ها هنوز روی رایانه یا محیط توسعهٔ اولیه موجودند، یا چرا در ابتدا ارسال نشده‌اند.

## بررسی‌های اجراشده

| دستور | نتیجه |
|---|---|
| `npm install --no-save --package-lock=false --ignore-scripts` | ناموفق: تعارض peer dependency بین `esbuild@0.25.12` و نیاز Vite 8.3.0 به `^0.27.0 \|\| ^0.28.0` |
| `npx --yes bun install --frozen-lockfile` | موفق، با Bun 1.4.2 و lockfile موجود؛ بدون تغییر manifest یا lockfile |
| `npm run build` | exit code 1؛ Vite 8.3.0 پس از transform کردن ۱۶ ماژول، ۲۷ خطای build گزارش کرد؛ همان پنج `UNRESOLVED_IMPORT` گزارش Vercel بازتولید شدند |
| `npm run lint` | exit code 1؛ شامل خطاهای `TS2307` برای ماژول‌های غایب و خطاهای TypeScript دیگر |

نصب npm مشکل جداگانه‌ای دارد؛ برای بازتولید خطای اصلی از Bun و lockfile خود پروژه استفاده شد، نه `--force` یا `--legacy-peer-deps`.
هیچ استقرار Vercel یا تست runtime موفقی ادعا نمی‌شود.

## تغییرات و اقدام لازم

تنها این گزارش اضافه شده است. سورس، importها، تنظیمات، package.json و bun.lock تغییر نکرده‌اند؛
هیچ قابلیت، route، احراز هویت، پنل مدیریت یا منطق Supabase حذف یا جایگزین نشده است.

برای اصلاح واقعی، نسخهٔ اصلی سورس (ترجیحاً ZIP پوشهٔ `src` از محیط توسعهٔ اصلی یا backup معتبر) لازم است.
فایل‌های `.env`، کلیدها و اطلاعات محرمانه نباید ارسال شوند.
پس از بازیابی، وابستگی‌های فایل‌های بازیابی‌شده نیز باید بررسی و build و typecheck دوباره اجرا شوند؛
فهرست زیر فقط کمبودهای قابل مشاهده در سورس فعلی است.
ساختن placeholder یا حدس‌زدن پیاده‌سازی این قابلیت‌ها، بازیابی محسوب نمی‌شود.

## فهرست کامل ماژول‌های غایب

نام ماژول‌ها بدون پسوند آمده است؛ محل import/re-export در ستون دوم ثبت شده است.

| ماژول | محل ارجاع |
|---|---|
| `src/components/AboutView` | `src/App.tsx:100`, `src/App.tsx:125`, `src/components/index.ts:1` |
| `src/components/AdminPaymentsPanel` | `src/components/AdminPanel.tsx:89`, `src/components/index.ts:4` |
| `src/components/BackgroundMusic` | `src/App.tsx:86`, `src/components/index.ts:7` |
| `src/components/ContactView` | `src/App.tsx:99`, `src/App.tsx:124`, `src/components/index.ts:8` |
| `src/components/ForcePasswordChangeModal` | `src/components/index.ts:12` |
| `src/components/InternalDialogHost` | `src/App.tsx:89`, `src/components/index.ts:16` |
| `src/components/LiveNotificationToast` | `src/App.tsx:88`, `src/components/index.ts:18` |
| `src/components/MissionsView` | `src/App.tsx:96`, `src/App.tsx:120`, `src/components/index.ts:20` |
| `src/components/OnboardingCommanderTutorial` | `src/App.tsx:110`, `src/components/index.ts:23` |
| `src/components/PasswordResetsAdmin` | `src/components/AdminPanel.tsx:88`, `src/components/index.ts:24` |
| `src/components/PersianDatePicker` | `src/components/AdminPanel.tsx:93`, `src/components/AuthView.tsx:37`, `src/components/SquadManagementModal.tsx:21`, `src/components/index.ts:25` |
| `src/components/PersistentMusicBar` | `src/App.tsx:87`, `src/components/index.ts:26` |
| `src/components/PrizesPointsView` | `src/App.tsx:103`, `src/App.tsx:123`, `src/components/index.ts:27` |
| `src/components/ProfileModal` | `src/App.tsx:107`, `src/components/index.ts:28` |
| `src/components/ProfileView` | `src/App.tsx:102`, `src/App.tsx:127`, `src/components/index.ts:29` |
| `src/components/RulesView` | `src/App.tsx:101`, `src/App.tsx:126`, `src/components/index.ts:32` |
| `src/components/SavedVitrinReelsModal` | `src/components/JourneyView.tsx:53`, `src/components/index.ts:33` |
| `src/components/SupportView` | `src/App.tsx:98`, `src/App.tsx:124`, `src/components/index.ts:36` |
| `src/components/TicketsView` | `src/components/DashboardView.tsx:41`, `src/components/index.ts:37` |
| `src/components/TrainingsView` | `src/App.tsx:97`, `src/App.tsx:121`, `src/components/index.ts:38` |
| `src/components/VitrinView` | `src/App.tsx:104`, `src/App.tsx:122`, `src/components/index.ts:39` |
| `src/components/WalletTransfersView` | `src/App.tsx:105`, `src/components/index.ts:40` |
| `src/components/home/AboutSection` | `src/components/ElementorVisualEditorModal.tsx:12`, `src/components/HomeView.tsx:17` |
| `src/components/home/FaqAccordion` | `src/components/HomeView.tsx:19` |
| `src/components/home/Footer` | `src/components/HomeView.tsx:20` |
| `src/components/home/NotificationPanel` | `src/components/HomeView.tsx:13` |
| `src/components/home/PrizesAwardsBanner` | `src/components/ElementorVisualEditorModal.tsx:11`, `src/components/HomeView.tsx:15` |
| `src/components/home/SocialMessengersWidgets` | `src/components/ElementorVisualEditorModal.tsx:14`, `src/components/HomeView.tsx:16` |
| `src/components/home/StatsStrip` | `src/components/ElementorVisualEditorModal.tsx:13`, `src/components/HomeView.tsx:18` |
| `src/data/stageQuestionsData` | `src/components/StageQuizModal.tsx:27` |
| `src/lib/appDialog` | `src/components/AdminPanel.tsx:86`, `src/components/AdminSoundtrackManager.tsx:27`, `src/components/ElementorVisualEditorModal.tsx:15`, `src/components/SquadManagementModal.tsx:17` |
| `src/lib/groupRegistration` | `src/components/AuthView.tsx:41` |
| `src/lib/redisClient` | `src/App.tsx:822`, `src/lib/backendApi.ts:18` |
| `src/utils/audioAlert` | `src/components/AdminPanel.tsx:126` |
| `src/utils/jalali` | `src/components/AdminPanel.tsx:125`, `src/components/AuthView.tsx:36`, `src/components/DailyChallengeModal.tsx:18`, `src/components/DashboardView.tsx:40`, `src/components/JourneyView.tsx:49`, `src/components/Navbar.tsx:35`, `src/components/NotificationCenterModal.tsx:23`, `src/components/RewardsLeaderboardView.tsx:15`, `src/components/SquadManagementModal.tsx:18`, `src/components/StageQuizModal.tsx:28` |
