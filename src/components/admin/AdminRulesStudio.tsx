import React, { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  HelpCircle, 
  Search, 
  Eye, 
  Layers, 
  Check, 
  ArrowRight,
  Home,
  Users,
  Clock,
  Scale,
  Lock,
  Trophy
} from 'lucide-react';
import { SiteSettings, RuleCategoryItem } from '../../types';
import { DEFAULT_RULE_CATEGORIES } from '../RulesView';

interface AdminRulesStudioProps {
  siteSettings?: SiteSettings;
  onSaveSiteSettings: (updated: Partial<SiteSettings>) => void;
  triggerAlert?: (msg: string) => void;
}

const BADGE_COLOR_OPTIONS = [
  { id: 'bg-cyan-950 text-cyan-300 border-cyan-500', label: 'فیروزه‌ای (Cyan)', colorClass: 'bg-cyan-500' },
  { id: 'bg-amber-950 text-amber-300 border-amber-500', label: 'کهربایی (Amber)', colorClass: 'bg-amber-500' },
  { id: 'bg-emerald-950 text-emerald-300 border-emerald-500', label: 'سبز زمردی (Emerald)', colorClass: 'bg-emerald-500' },
  { id: 'bg-indigo-950 text-indigo-300 border-indigo-500', label: 'نیلی / بنفش (Indigo)', colorClass: 'bg-indigo-500' },
  { id: 'bg-rose-950 text-rose-300 border-rose-500', label: 'سرخ (Rose)', colorClass: 'bg-rose-500' },
  { id: 'bg-yellow-950 text-yellow-300 border-yellow-500', label: 'طلایی (Yellow)', colorClass: 'bg-yellow-500' },
  { id: 'bg-fuchsia-950 text-fuchsia-300 border-fuchsia-500', label: 'سرخابی (Fuchsia)', colorClass: 'bg-fuchsia-500' },
  { id: 'bg-blue-950 text-blue-300 border-blue-500', label: 'آبی تاکتیکی (Blue)', colorClass: 'bg-blue-500' },
];

export default function AdminRulesStudio({
  siteSettings,
  onSaveSiteSettings,
  triggerAlert
}: AdminRulesStudioProps) {
  // State for Rules page elements
  const [headerTitle, setHeaderTitle] = useState(
    siteSettings?.rulesHeaderTitle || 'قوانین و مقررات رسمی سامانه'
  );
  const [headerSubtitle, setHeaderSubtitle] = useState(
    siteSettings?.rulesHeaderSubtitle || 'ضوابط برگزاری مسابقات، داوری مأموریت‌ها و آیین‌نامه انضباطی اتاق جنگ'
  );
  const [noticeTitle, setNoticeTitle] = useState(
    siteSettings?.rulesNoticeTitle || 'منشور اخلاقی و انضباطی شرکت‌کنندگان'
  );
  const [noticeText, setNoticeText] = useState(
    siteSettings?.rulesNoticeText || 'تمامی شرکت‌کنندگان، مربیان و سرگروه‌ها با عضویت و حضور در سامانه متعهد به رعایت کامل مفاد این آیین‌نامه می‌باشند. هدف ما ایجاد بستری عادلانه، شفاف، پویا و سازنده برای شکوفایی استعدادها و تقویت تفکر استراتژیک است.'
  );
  const [searchPlaceholder, setSearchPlaceholder] = useState(
    siteSettings?.rulesSearchPlaceholder || 'جستجو در متن قوانین (مثال: داوری، جوخه، امتیاز، مهلت)...'
  );
  const [bottomCardTitle, setBottomCardTitle] = useState(
    siteSettings?.rulesBottomCardTitle || 'سوالی درباره قوانین، آیین‌نامه یا نحوه امتیازدهی دارید؟'
  );
  const [bottomCardText, setBottomCardText] = useState(
    siteSettings?.rulesBottomCardText || 'می‌توانید با بخش پشتیبانی ستاد مرکزی تماس حاصل فرمایید یا از طریق سامانه تیکت ارسال کنید.'
  );
  const [bottomSupportBtnText, setBottomSupportBtnText] = useState(
    siteSettings?.rulesBottomSupportButtonText || 'ارسال تیکت به ستاد پشتیبانی'
  );
  const [bottomHomeBtnText, setBottomHomeBtnText] = useState(
    siteSettings?.rulesBottomHomeButtonText || 'بازگشت به صفحه اصلی'
  );

  const [categories, setCategories] = useState<RuleCategoryItem[]>(() => {
    if (siteSettings?.rulesCategories && siteSettings.rulesCategories.length > 0) {
      return JSON.parse(JSON.stringify(siteSettings.rulesCategories));
    }
    return JSON.parse(JSON.stringify(DEFAULT_RULE_CATEGORIES));
  });

  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Category handlers
  const handleAddCategory = () => {
    const newCat: RuleCategoryItem = {
      id: `cat_${Date.now()}`,
      title: `${categories.length + 1}. فصل و عنوان ضوابط جدید`,
      badgeColor: BADGE_COLOR_OPTIONS[categories.length % BADGE_COLOR_OPTIONS.length].id,
      items: [
        'بند ۱ این آیین‌نامه و ضوابط را اینجا بنویسید.'
      ]
    };
    setCategories([...categories, newCat]);
    triggerAlert?.('دسته‌بندی جدید قوانین اضافه شد.');
  };

  const handleRemoveCategory = (catId: string) => {
    if (categories.length <= 1) {
      triggerAlert?.('حداقل یک دسته‌بندی قوانین باید وجود داشته باشد.');
      return;
    }
    setCategories(categories.filter(c => c.id !== catId));
  };

  const handleUpdateCategoryTitle = (catId: string, title: string) => {
    setCategories(categories.map(c => c.id === catId ? { ...c, title } : c));
  };

  const handleUpdateCategoryBadge = (catId: string, badgeColor: string) => {
    setCategories(categories.map(c => c.id === catId ? { ...c, badgeColor } : c));
  };

  const handleAddItemToCategory = (catId: string) => {
    setCategories(categories.map(c => {
      if (c.id === catId) {
        return {
          ...c,
          items: [...c.items, 'بند جدید قانون و ضوابط را وارد نمایید.']
        };
      }
      return c;
    }));
  };

  const handleUpdateItemText = (catId: string, itemIdx: number, text: string) => {
    setCategories(categories.map(c => {
      if (c.id === catId) {
        const nextItems = [...c.items];
        nextItems[itemIdx] = text;
        return { ...c, items: nextItems };
      }
      return c;
    }));
  };

  const handleRemoveItem = (catId: string, itemIdx: number) => {
    setCategories(categories.map(c => {
      if (c.id === catId) {
        if (c.items.length <= 1) {
          return c;
        }
        return {
          ...c,
          items: c.items.filter((_, idx) => idx !== itemIdx)
        };
      }
      return c;
    }));
  };

  const handleResetToDefault = () => {
    if (confirm('آیا مطمئن هستید که می‌خواهید تمام متن‌ها و کادرهای صفحه قوانین را به حالت پیش‌فرض بازنشانی کنید؟')) {
      setHeaderTitle('قوانین و مقررات رسمی سامانه');
      setHeaderSubtitle('ضوابط برگزاری مسابقات، داوری مأموریت‌ها و آیین‌نامه انضباطی اتاق جنگ');
      setNoticeTitle('منشور اخلاقی و انضباطی شرکت‌کنندگان');
      setNoticeText('تمامی شرکت‌کنندگان، مربیان و سرگروه‌ها با عضویت و حضور در سامانه متعهد به رعایت کامل مفاد این آیین‌نامه می‌باشند. هدف ما ایجاد بستری عادلانه، شفاف، پویا و سازنده برای شکوفایی استعدادها و تقویت تفکر استراتژیک است.');
      setSearchPlaceholder('جستجو در متن قوانین (مثال: داوری، جوخه، امتیاز، مهلت)...');
      setBottomCardTitle('سوالی درباره قوانین، آیین‌نامه یا نحوه امتیازدهی دارید؟');
      setBottomCardText('می‌توانید با بخش پشتیبانی ستاد مرکزی تماس حاصل فرمایید یا از طریق سامانه تیکت ارسال کنید.');
      setBottomSupportBtnText('ارسال تیکت به ستاد پشتیبانی');
      setBottomHomeBtnText('بازگشت به صفحه اصلی');
      setCategories(JSON.parse(JSON.stringify(DEFAULT_RULE_CATEGORIES)));
      triggerAlert?.('تنظیمات صفحه قوانین به حالت پیش‌فرض بازنشانی شد.');
    }
  };

  const handleSave = () => {
    setIsSaving(true);
    const updatedRulesPayload: Partial<SiteSettings> = {
      rulesHeaderTitle: headerTitle.trim(),
      rulesHeaderSubtitle: headerSubtitle.trim(),
      rulesNoticeTitle: noticeTitle.trim(),
      rulesNoticeText: noticeText.trim(),
      rulesSearchPlaceholder: searchPlaceholder.trim(),
      rulesBottomCardTitle: bottomCardTitle.trim(),
      rulesBottomCardText: bottomCardText.trim(),
      rulesBottomSupportButtonText: bottomSupportBtnText.trim(),
      rulesBottomHomeButtonText: bottomHomeBtnText.trim(),
      rulesCategories: categories
    };

    onSaveSiteSettings(updatedRulesPayload);

    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      triggerAlert?.('تغییرات صفحه قوانین با موفقیت ذخیره و در سرور اعمال شد.');
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 400);
  };

  return (
    <div className="space-y-6 dir-rtl text-slate-100">
      {/* Studio Header Bar */}
      <div className="bg-[#0f172a] border border-emerald-500/40 rounded-2xl p-5 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-900/30">
            <FileText size={24} />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
              <span>مدیریت و شخصی‌سازی کامل صفحه قوانین و مقررات</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                CMS زنده
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-semibold mt-1">
              امکان ویرایش تک‌تک متن‌ها، سربرگ‌ها، بنرها، دسته‌بندی‌ها، بندهای حقوقی و کادرهای راهنما
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Tab Toggle */}
          <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => setActiveTab('editor')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'editor'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers size={14} />
              <span>ویرایشگر کادرها</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye size={14} />
              <span>پیش‌نمایش زنده</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleResetToDefault}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            title="بازنشانی تمام مقادیر به قوانین پیش‌فرض سامانه"
          >
            <RotateCcw size={14} />
            <span>بازنشانی پیش‌فرض</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-emerald-500/20 transition flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {isSaving ? (
              <span className="animate-spin w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full" />
            ) : saveSuccess ? (
              <CheckCircle2 size={16} className="text-emerald-950" />
            ) : (
              <Save size={16} />
            )}
            <span>{saveSuccess ? 'ذخیره شد!' : 'ذخیره تغییرات قوانین'}</span>
          </button>
        </div>
      </div>

      {activeTab === 'editor' ? (
        <div className="space-y-6">
          {/* Section 1: Header Bar Texts */}
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
              <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-black text-xs">
                ۱
              </span>
              <h3 className="text-sm font-black text-white">سربرگ و عنوان بالای صفحه قوانین</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  عنوان اصلی بالای صفحه:
                </label>
                <input
                  type="text"
                  value={headerTitle}
                  onChange={(e) => setHeaderTitle(e.target.value)}
                  placeholder="قوانین و مقررات رسمی سامانه"
                  className="w-full bg-[#1e293b] border border-slate-600 focus:border-emerald-400 rounded-xl px-3.5 py-2.5 text-sm text-white font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  متن دکمه بازگشت به خانه:
                </label>
                <input
                  type="text"
                  value={bottomHomeBtnText}
                  onChange={(e) => setBottomHomeBtnText(e.target.value)}
                  placeholder="بازگشت به صفحه اصلی"
                  className="w-full bg-[#1e293b] border border-slate-600 focus:border-emerald-400 rounded-xl px-3.5 py-2.5 text-sm text-white font-bold outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  زیرعنوان توضیحی سربرگ:
                </label>
                <input
                  type="text"
                  value={headerSubtitle}
                  onChange={(e) => setHeaderSubtitle(e.target.value)}
                  placeholder="ضوابط برگزاری مسابقات، داوری مأموریت‌ها و آیین‌نامه انضباطی اتاق جنگ"
                  className="w-full bg-[#1e293b] border border-slate-600 focus:border-emerald-400 rounded-xl px-3.5 py-2.5 text-sm text-white font-bold outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Notice Banner & Search Placeholder */}
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
              <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-black text-xs">
                ۲
              </span>
              <h3 className="text-sm font-black text-white">کادر پیام منشور اخلاقی و جستجوگر قوانین</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  عنوان کادر منشور اخلاقی:
                </label>
                <input
                  type="text"
                  value={noticeTitle}
                  onChange={(e) => setNoticeTitle(e.target.value)}
                  placeholder="منشور اخلاقی و انضباطی شرکت‌کنندگان"
                  className="w-full bg-[#1e293b] border border-slate-600 focus:border-emerald-400 rounded-xl px-3.5 py-2.5 text-sm text-white font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  متن کامل پیام و منشور اخلاقی:
                </label>
                <textarea
                  rows={3}
                  value={noticeText}
                  onChange={(e) => setNoticeText(e.target.value)}
                  placeholder="متن منشور اخلاقی شرکت در مسابقات..."
                  className="w-full bg-[#1e293b] border border-slate-600 focus:border-emerald-400 rounded-xl p-3 text-sm text-white font-semibold leading-relaxed outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  متن راهنمای پیش‌فرض داخل کادر جستجوی قوانین (Placeholder):
                </label>
                <input
                  type="text"
                  value={searchPlaceholder}
                  onChange={(e) => setSearchPlaceholder(e.target.value)}
                  placeholder="جستجو در متن قوانین (مثال: داوری، جوخه، امتیاز، مهلت)..."
                  className="w-full bg-[#1e293b] border border-slate-600 focus:border-emerald-400 rounded-xl px-3.5 py-2.5 text-sm text-white font-bold outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Categories & Rule Items Management */}
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl p-5 space-y-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-black text-xs">
                  ۳
                </span>
                <h3 className="text-sm font-black text-white">
                  مدیریت کادرها، دسته‌بندی‌ها و بندهای قوانین ({categories.length} دسته‌بندی)
                </h3>
              </div>

              <button
                type="button"
                onClick={handleAddCategory}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={15} />
                <span>افزودن دسته‌بندی جدید</span>
              </button>
            </div>

            {/* Categories List */}
            <div className="space-y-6">
              {categories.map((cat, catIdx) => (
                <div
                  key={cat.id || catIdx}
                  className="bg-[#131d36] border border-slate-700/80 rounded-2xl p-4 sm:p-5 space-y-4 relative"
                >
                  {/* Category Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700 pb-3">
                    <div className="flex-1">
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        عنوان کادر دسته‌بندی #{catIdx + 1}:
                      </label>
                      <input
                        type="text"
                        value={cat.title}
                        onChange={(e) => handleUpdateCategoryTitle(cat.id, e.target.value)}
                        placeholder="عنوان دسته‌بندی..."
                        className="w-full bg-[#1e293b] border border-slate-600 focus:border-emerald-400 rounded-xl px-3 py-2 text-sm text-white font-black outline-none"
                      />
                    </div>

                    {/* Badge Color Picker */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">
                          رنگ نشانگر کادر:
                        </label>
                        <select
                          value={cat.badgeColor || BADGE_COLOR_OPTIONS[0].id}
                          onChange={(e) => handleUpdateCategoryBadge(cat.id, e.target.value)}
                          className="bg-[#1e293b] border border-slate-600 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 outline-none"
                        >
                          {BADGE_COLOR_OPTIONS.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="pt-4">
                        <button
                          type="button"
                          onClick={() => handleRemoveCategory(cat.id)}
                          className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-xl border border-rose-500/30 transition cursor-pointer"
                          title="حذف این دسته‌بندی"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Bullet items in this category */}
                  <div className="space-y-2.5">
                    <label className="block text-[11px] font-bold text-emerald-300">
                      بندهای قوانین این دسته‌بندی ({cat.items.length} بند):
                    </label>

                    {cat.items.map((item, itemIdx) => (
                      <div key={itemIdx} className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-[10px] font-black text-slate-300 shrink-0">
                          {itemIdx + 1}
                        </span>
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => handleUpdateItemText(cat.id, itemIdx, e.target.value)}
                          placeholder="متن بند قانون..."
                          className="flex-1 bg-[#1e293b] border border-slate-600 focus:border-emerald-400 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-100 font-semibold outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(cat.id, itemIdx)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 transition cursor-pointer shrink-0"
                          title="حذف این بند"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}

                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => handleAddItemToCategory(cat.id)}
                        className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-emerald-500/10 transition cursor-pointer"
                      >
                        <Plus size={14} />
                        <span>افزودن بند جدید به این کادر</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Bottom Support Box Texts */}
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
              <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-black text-xs">
                ۴
              </span>
              <h3 className="text-sm font-black text-white">کادر راهنما و دکمه‌های پایانی صفحه قوانین</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  عنوان سوال کادر پایانی:
                </label>
                <input
                  type="text"
                  value={bottomCardTitle}
                  onChange={(e) => setBottomCardTitle(e.target.value)}
                  placeholder="سوالی درباره قوانین، آیین‌نامه یا نحوه امتیازدهی دارید؟"
                  className="w-full bg-[#1e293b] border border-slate-600 focus:border-emerald-400 rounded-xl px-3.5 py-2.5 text-sm text-white font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  متن دکمه ثبت تیکت / ارتباط با پشتیبانی:
                </label>
                <input
                  type="text"
                  value={bottomSupportBtnText}
                  onChange={(e) => setBottomSupportBtnText(e.target.value)}
                  placeholder="ارسال تیکت به ستاد پشتیبانی"
                  className="w-full bg-[#1e293b] border border-slate-600 focus:border-emerald-400 rounded-xl px-3.5 py-2.5 text-sm text-white font-bold outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  متن راهنمای کادر پایانی:
                </label>
                <textarea
                  rows={2}
                  value={bottomCardText}
                  onChange={(e) => setBottomCardText(e.target.value)}
                  placeholder="می‌توانید با بخش پشتیبانی ستاد مرکزی تماس حاصل فرمایید یا از طریق سامانه تیکت ارسال کنید."
                  className="w-full bg-[#1e293b] border border-slate-600 focus:border-emerald-400 rounded-xl p-3 text-sm text-white font-semibold leading-relaxed outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Live Preview Mode */
        <div className="border border-emerald-500/50 rounded-3xl p-6 bg-[#080d21] space-y-6">
          <div className="bg-emerald-950/60 border border-emerald-500/40 p-3 rounded-xl flex items-center justify-between text-xs font-bold text-emerald-300">
            <span>این یک پیش‌نمایش زنده از ظاهر صفحه قوانین برای کاربران سایت است.</span>
            <button
              type="button"
              onClick={() => setActiveTab('editor')}
              className="text-white bg-emerald-600 hover:bg-emerald-500 px-3 py-1 rounded-lg transition"
            >
              بازگشت به ویرایش
            </button>
          </div>

          {/* Header Preview */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0f172a] border border-slate-700 rounded-2xl p-4 sm:p-6 shadow-xl">
            <div className="flex items-center gap-3.5">
              <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500 text-emerald-300 shrink-0">
                <FileText size={26} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white">{headerTitle}</h1>
                <p className="text-sm font-bold text-emerald-200 mt-1">{headerSubtitle}</p>
              </div>
            </div>

            <div className="px-5 py-3 rounded-xl bg-[#1e293b] text-emerald-300 border border-emerald-500/80 font-black text-xs flex items-center gap-2">
              <Home size={16} />
              <span>{bottomHomeBtnText}</span>
            </div>
          </div>

          {/* Notice Banner Preview */}
          <div className="bg-[#0f172a] border border-emerald-500/50 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-950 border border-emerald-500 text-emerald-300">
                <ShieldCheck size={22} />
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white">{noticeTitle}</h2>
            </div>
            <p className="text-sm sm:text-base text-slate-100 leading-relaxed font-semibold">
              {noticeText}
            </p>

            <div className="relative max-w-md">
              <Search size={18} className="absolute right-3.5 top-3.5 text-slate-400" />
              <input 
                type="text"
                disabled
                placeholder={searchPlaceholder}
                className="w-full bg-[#1e293b] border-2 border-slate-600 rounded-xl pr-10 pl-4 py-2.5 text-sm text-white font-bold placeholder-slate-400 outline-none"
              />
            </div>
          </div>

          {/* Categorized Rules Grid Preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {categories.map((cat, index) => {
              const badgeColor = cat.badgeColor || 'bg-cyan-950 text-cyan-300 border-cyan-500';
              return (
                <div 
                  key={cat.id || index}
                  className="bg-[#0f172a] border border-slate-700 rounded-3xl p-6 sm:p-7 space-y-4 shadow-xl"
                >
                  <div className="flex items-center gap-3.5 border-b border-slate-700 pb-3.5">
                    <div className={`p-3 rounded-2xl ${badgeColor} border shrink-0`}>
                      <ShieldCheck size={22} />
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

          {/* Bottom Card Preview */}
          <div className="bg-[#0f172a] border border-slate-700 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-5 shadow-xl">
            <div className="space-y-1.5 text-center sm:text-right">
              <h3 className="text-base sm:text-lg font-black text-white flex items-center justify-center sm:justify-start gap-2">
                <HelpCircle size={20} className="text-amber-400" />
                <span>{bottomCardTitle}</span>
              </h3>
              <p className="text-sm text-slate-200 font-bold">
                {bottomCardText}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="px-6 py-3 rounded-xl bg-cyan-500 text-slate-950 font-black text-xs flex items-center gap-2">
                <span>{bottomSupportBtnText}</span>
                <ArrowRight size={16} className="rotate-180" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
