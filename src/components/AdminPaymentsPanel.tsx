import React, { useState } from 'react';
import { CreditCard, Save, ExternalLink, RefreshCw, Edit, Trash2, ShieldCheck, CheckCircle2, XCircle, Plus, ToggleLeft, ToggleRight, Sparkles } from 'lucide-react';
import { PaymentSettings, PaymentTransaction } from '../types';
import { formatToPersianDigits } from '../utils/jalali';

interface AdminPaymentsPanelProps {
  settings: PaymentSettings;
  setSettings: (value: PaymentSettings) => void;
  transactions: PaymentTransaction[];
  setTransactions?: React.Dispatch<React.SetStateAction<PaymentTransaction[]>>;
  triggerAlert: (message: string) => void;
}

export default function AdminPaymentsPanel({ settings, setSettings, transactions, setTransactions, triggerAlert }: AdminPaymentsPanelProps) {
  // Load and manage list of payment gateways
  const [gateways, setGateways] = useState<any[]>(() => {
    const saved = localStorage.getItem('warroom_payment_gateways');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Error parsing gateways', e);
      }
    }
    // Default fallback list
    return [
      {
        id: 'gw_1',
        name: 'درگاه مستقیم زرین‌پال',
        enabled: settings.enabled,
        amount: settings.amount || 3500000,
        currency: settings.currency || 'IRT',
        gateway: settings.gateway || 'zarinpal',
        api_key: settings.api_key || '31سییییسسیشی',
        redirect_url: settings.redirect_url || 'https://wwsd.com',
        callback_url: settings.callback_url || 'https://www.sdklsad.cm',
        description: settings.description || 'هزینه ثبت‌نام مسابقه اتاق جنگ',
        card_enabled: settings.card_enabled || false,
        card_number: settings.card_number || '۵۰۲۲۲۹۱۰۱۲۳۴۵۶۷۸',
        card_holder: settings.card_holder || 'امیرحسین رضایی',
        card_bank: settings.card_bank || 'بانک ملی ایران',
        card_instructions: settings.card_instructions || 'لطفاً فیش واریز را پس از انتقال ثبت کنید.'
      }
    ];
  });

  // Editor states
  const [isEditing, setIsEditing] = useState(false);
  const [editingGateway, setEditingUserGateway] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formEnabled, setFormEnabled] = useState(true);
  const [formAmount, setFormAmount] = useState(3500000);
  const [formCurrency, setFormCurrency] = useState<'IRR' | 'IRT'>('IRT');
  const [formType, setFormType] = useState<'online' | 'card'>('online');
  const [formGateway, setFormGateway] = useState<'zarinpal' | 'custom'>('zarinpal');
  const [formApiKey, setFormApiKey] = useState('');
  const [formRedirectUrl, setFormRedirectUrl] = useState('');
  const [formCallbackUrl, setFormCallbackUrl] = useState('');
  const [formDescription, setFormDescription] = useState('هزینه ثبت‌نام مسابقه اتاق جنگ');
  
  // Card specific form states
  const [formCardNumber, setFormCardNumber] = useState('');
  const [formCardHolder, setFormCardHolder] = useState('');
  const [formCardBank, setFormCardBank] = useState('');
  const [formCardInstructions, setFormCardInstructions] = useState('');

  // Save the complete list of gateways and update core setting
  const updateGatewaysList = (newList: any[]) => {
    setGateways(newList);
    localStorage.setItem('warroom_payment_gateways', JSON.stringify(newList));

    // Find the first enabled gateway to sync as primary settings
    const active = newList.find(g => g.enabled) || newList[0];
    if (active) {
      const nextSettings: PaymentSettings = {
        id: settings.id || 'global_payment_settings',
        enabled: active.enabled,
        amount: active.amount,
        currency: active.currency,
        gateway: active.gateway,
        api_key: active.api_key,
        redirect_url: active.redirect_url,
        callback_url: active.callback_url,
        description: active.description,
        card_enabled: active.gateway === 'card' || active.card_enabled,
        card_number: active.card_number,
        card_holder: active.card_holder,
        card_bank: active.card_bank,
        card_instructions: active.card_instructions,
        updated_at: new Date().toISOString()
      };
      setSettings(nextSettings);
    }
  };

  // Open form for adding a new payment method
  const handleOpenAdd = () => {
    setEditingUserGateway(null);
    setFormName('درگاه جدید');
    setFormEnabled(true);
    setFormAmount(3500000);
    setFormCurrency('IRT');
    setFormType('online');
    setFormGateway('zarinpal');
    setFormApiKey('');
    setFormRedirectUrl('');
    setFormCallbackUrl('');
    setFormDescription('هزینه ثبت‌نام مسابقه اتاق جنگ');
    setFormCardNumber('');
    setFormCardHolder('');
    setFormCardBank('');
    setFormCardInstructions('');
    setIsEditing(true);
  };

  // Open form for editing a payment method
  const handleOpenEdit = (gw: any) => {
    setEditingUserGateway(gw);
    setFormName(gw.name || 'درگاه پرداخت');
    setFormEnabled(gw.enabled !== false);
    setFormAmount(gw.amount || 0);
    setFormCurrency(gw.currency || 'IRT');
    setFormType(gw.gateway === 'card' || gw.card_enabled ? 'card' : 'online');
    setFormGateway(gw.gateway === 'card' ? 'zarinpal' : gw.gateway || 'zarinpal');
    setFormApiKey(gw.api_key || '');
    setFormRedirectUrl(gw.redirect_url || '');
    setFormCallbackUrl(gw.callback_url || '');
    setFormDescription(gw.description || 'هزینه ثبت‌نام مسابقه اتاق جنگ');
    setFormCardNumber(gw.card_number || '');
    setFormCardHolder(gw.card_holder || '');
    setFormCardBank(gw.card_bank || '');
    setFormCardInstructions(gw.card_instructions || '');
    setIsEditing(true);
  };

  // Toggle active/inactive status directly from the list
  const handleToggleStatus = (gwId: string) => {
    const updated = gateways.map(g => g.id === gwId ? { ...g, enabled: !g.enabled } : g);
    updateGatewaysList(updated);
    triggerAlert('وضعیت فعال‌بودن روش پرداخت تغییر یافت.');
  };

  // Save changes
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      triggerAlert('خطا: نام روش پرداخت الزامی است.');
      return;
    }

    const payload = {
      id: editingGateway ? editingGateway.id : 'gw_' + Date.now(),
      name: formName.trim(),
      enabled: formEnabled,
      amount: Math.max(0, Number(formAmount) || 0),
      currency: formCurrency,
      gateway: formType === 'card' ? 'card' : formGateway,
      api_key: formApiKey.trim(),
      redirect_url: formRedirectUrl.trim(),
      callback_url: formCallbackUrl.trim(),
      description: formDescription.trim(),
      card_enabled: formType === 'card',
      card_number: formCardNumber.trim(),
      card_holder: formCardHolder.trim(),
      card_bank: formCardBank.trim(),
      card_instructions: formCardInstructions.trim()
    };

    let nextList;
    if (editingGateway) {
      nextList = gateways.map(g => g.id === editingGateway.id ? payload : g);
      triggerAlert(`روش پرداخت «${formName}» با موفقیت ویرایش شد.`);
    } else {
      nextList = [...gateways, payload];
      triggerAlert(`روش پرداخت جدید «${formName}» با موفقیت ایجاد و ذخیره شد.`);
    }

    updateGatewaysList(nextList);
    setIsEditing(false);
    setEditingUserGateway(null);
  };

  // Confirm delete within the UI without using alerts
  const handleConfirmDelete = (id: string) => {
    const nextList = gateways.filter(g => g.id !== id);
    updateGatewaysList(nextList);
    setDeletingId(null);
    triggerAlert('روش پرداخت با موفقیت حذف شد.');
  };

  return (
    <section className="space-y-5" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CreditCard className="text-amber-300" />
          <div>
            <h2 className="text-xl font-black text-white">مدیریت روش‌ها و درگاه‌های پرداخت</h2>
            <p className="text-xs text-slate-400 font-medium">مشاهده، ویرایش، حذف یا تعریف درگاه‌های بانکی و کارت‌به‌کارت آفلاین</p>
          </div>
        </div>

        {!isEditing && (
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-lg"
          >
            <Plus size={16} />
            <span>افزودن درگاه یا روش جدید</span>
          </button>
        )}
      </div>

      {/* Gateway Management List View */}
      {!isEditing && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-4">
          <h3 className="text-xs font-extrabold text-slate-400 flex items-center gap-1.5 px-1 pb-2 border-b border-slate-900">
            <Sparkles size={14} className="text-amber-400" />
            <span>لیست درگاه‌ها و روش‌های فعال پرداخت:</span>
          </h3>

          <div className="space-y-3">
            {gateways.map((gw) => {
              const isCard = gw.gateway === 'card' || gw.card_enabled;
              const isConfirmingDelete = deletingId === gw.id;

              return (
                <div key={gw.id} className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/60 transition flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      gw.enabled 
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' 
                        : 'border-slate-800 bg-slate-950 text-slate-500'
                    }`}>
                      <CreditCard size={18} />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-white">{gw.name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                          isCard 
                            ? 'border-amber-500/30 bg-amber-500/15 text-amber-300' 
                            : 'border-cyan-500/30 bg-cyan-500/15 text-cyan-300'
                        }`}>
                          {isCard ? 'کارت به کارت (آفلاین)' : 'درگاه مستقیم زرین‌پال'}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-400 mt-1 space-y-1 sm:space-y-0 sm:flex sm:items-center sm:gap-4 font-medium">
                        <div>
                          <span>مبلغ قابل پرداخت:</span>{' '}
                          <span className="font-mono text-amber-300 font-bold">
                            {formatToPersianDigits(gw.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','))}{' '}
                            {gw.currency === 'IRT' ? 'تومان' : 'ریال'}
                          </span>
                        </div>
                        {isCard ? (
                          <div>
                            <span>بانک:</span> <span className="text-white font-bold">{gw.card_bank || '-'}</span>
                          </div>
                        ) : (
                          <div className="truncate max-w-xs">
                            <span>کد درگاه:</span> <span className="font-mono text-white text-[10px]">{gw.api_key || '-'}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Section / In-UI Delete Confirmation */}
                  <div className="flex items-center gap-2 self-end md:self-center border-t border-slate-900 md:border-none pt-3 md:pt-0 w-full md:w-auto justify-end">
                    {isConfirmingDelete ? (
                      <div className="flex items-center gap-1.5 bg-rose-950/40 border border-rose-800 p-1.5 rounded-xl animate-fade-in">
                        <span className="text-[10px] text-rose-300 font-bold px-1.5">آیا مایل به حذف هستید؟</span>
                        <button
                          type="button"
                          onClick={() => handleConfirmDelete(gw.id)}
                          className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold transition cursor-pointer"
                        >
                          بله، حذف کن
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingId(null)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold transition cursor-pointer"
                        >
                          انصراف
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Status Toggle Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(gw.id)}
                          className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-white transition"
                          title={gw.enabled ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
                        >
                          {gw.enabled ? (
                            <span className="text-[10px] text-emerald-400 font-extrabold flex items-center gap-1">● فعال</span>
                          ) : (
                            <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">○ غیرفعال</span>
                          )}
                        </button>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(gw)}
                          className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-white transition flex items-center gap-1"
                          title="ویرایش اطلاعات"
                        >
                          <Edit size={14} className="text-amber-400" />
                          <span className="text-[10px] font-bold hidden sm:inline">ویرایش</span>
                        </button>

                        {/* Custom UI Delete Button */}
                        <button
                          type="button"
                          onClick={() => setDeletingId(gw.id)}
                          className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 text-rose-400 hover:text-rose-300 transition flex items-center gap-1"
                          title="حذف"
                        >
                          <Trash2 size={14} />
                          <span className="text-[10px] font-bold hidden sm:inline">حذف</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Setup / Edit Form Panel */}
      {isEditing && (
        <form onSubmit={handleSaveForm} className="grid gap-4 rounded-2xl border border-amber-400/20 bg-slate-950/60 p-5 md:grid-cols-2 shadow-xl relative animate-fade-in">
          <div className="md:col-span-2 flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-black text-amber-300">
              {editingGateway ? `ویرایش روش پرداخت «${formName}»:` : 'افزودن روش یا درگاه جدید:'}
            </span>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setEditingUserGateway(null);
              }}
              className="text-xs text-slate-400 hover:text-white transition cursor-pointer"
            >
              انصراف و بازگشت به لیست
            </button>
          </div>

          <label className="text-xs text-slate-300 md:col-span-2">نام اختصاصی روش پرداخت
            <input
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white"
              value={formName}
              onChange={e => setFormName(e.target.value)}
              placeholder="مثال: درگاه اختصاصی زرین‌پال مسابقه"
              required
            />
          </label>

          <label className="flex items-center gap-3 text-sm text-slate-200 md:col-span-2 mt-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={formEnabled}
              onChange={e => setFormEnabled(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-amber-500 w-4 h-4"
            />
            وضعیت این روش فعال باشد
          </label>

          <label className="text-xs text-slate-300">مبلغ دریافت هزینه ثبت‌نام
            <input
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white font-mono"
              type="number"
              min="0"
              value={formAmount}
              onChange={e => setFormAmount(Number(e.target.value))}
            />
            <span className="block mt-1 text-[11px] text-amber-400 font-mono">
              مبلغ نمایشی: {formatToPersianDigits(formAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','))} {formCurrency === 'IRT' ? 'تومان' : 'ریال'}
            </span>
          </label>

          <label className="text-xs text-slate-300">واحد پول پرداخت
            <select
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white"
              value={formCurrency}
              onChange={e => setFormCurrency(e.target.value as 'IRR' | 'IRT')}
            >
              <option value="IRR">ریال</option>
              <option value="IRT">تومان</option>
            </select>
          </label>

          <label className="text-xs text-slate-300 md:col-span-2">نوع مکانیزم پرداخت
            <select
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white"
              value={formType}
              onChange={e => setFormType(e.target.value as 'online' | 'card')}
            >
              <option value="online">درگاه بانکی آنلاین (زرین‌پال / سفارشی)</option>
              <option value="card">پرداخت آفلاین کارت به کارت (اطلاعات حساب)</option>
            </select>
          </label>

          {/* Conditional inputs for ONLINE payments */}
          {formType === 'online' && (
            <>
              <label className="text-xs text-slate-300">ارائه‌دهنده درگاه بانکی
                <select
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white"
                  value={formGateway}
                  onChange={e => setFormGateway(e.target.value as 'zarinpal' | 'custom')}
                >
                  <option value="zarinpal">زرین‌پال</option>
                  <option value="custom">آدرس سفارشی</option>
                </select>
              </label>

              <label className="text-xs text-slate-300">Merchant ID / کلید درگاه (API Key)
                <input
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white font-mono"
                  value={formApiKey}
                  onChange={e => setFormApiKey(e.target.value)}
                  placeholder="کد ۳۶ کاراکتری مرچنت..."
                />
              </label>

              <label className="text-xs text-slate-300 md:col-span-2">آدرس مستقیم هدایت به درگاه
                <input
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white"
                  type="url"
                  value={formRedirectUrl}
                  onChange={e => setFormRedirectUrl(e.target.value)}
                  placeholder="https://zarinpal.com/pg/StartPay/..."
                />
              </label>

              <label className="text-xs text-slate-300 md:col-span-2">آدرس بازگشت تراکنش (Callback URL)
                <input
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white"
                  type="url"
                  value={formCallbackUrl}
                  onChange={e => setFormCallbackUrl(e.target.value)}
                  placeholder="https://.../payment/callback"
                />
              </label>
            </>
          )}

          {/* Conditional inputs for CARD-TO-CARD offline payments */}
          {formType === 'card' && (
            <div className="md:col-span-2 border-t border-slate-800 pt-4 space-y-3">
              <span className="text-xs font-black text-amber-300 block">💳 اطلاعات حساب جهت واریز کارت به کارت:</span>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="text-xs text-slate-300">شماره کارت بانکی (۱۶ رقمی)
                  <input
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white font-mono"
                    value={formCardNumber}
                    onChange={e => setFormCardNumber(e.target.value)}
                    placeholder="مثال: ۵۰۲۲۲۹۱۰۱۲۳۴۵۶۷۸"
                  />
                </label>

                <label className="text-xs text-slate-300">نام صاحب حساب
                  <input
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white"
                    value={formCardHolder}
                    onChange={e => setFormCardHolder(e.target.value)}
                    placeholder="مثال: امیرحسین رضایی"
                  />
                </label>

                <label className="text-xs text-slate-300">نام بانک عامل
                  <input
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white"
                    value={formCardBank}
                    onChange={e => setFormCardBank(e.target.value)}
                    placeholder="مثال: بانک ملی ایران"
                  />
                </label>
              </div>

              <label className="text-xs text-slate-300 block">دستورالعمل و توضیحات واریز
                <textarea
                  rows={2}
                  className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white"
                  value={formCardInstructions}
                  onChange={e => setFormCardInstructions(e.target.value)}
                  placeholder="توضیحات لازم برای انتقال و ارسال فیش توسط کاربر..."
                />
              </label>
            </div>
          )}

          <label className="text-xs text-slate-300 md:col-span-2">بابت / شرح فاکتور پرداخت
            <input
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white"
              value={formDescription}
              onChange={e => setFormDescription(e.target.value)}
            />
          </label>

          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-900">
            <button
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 px-4 py-3 font-black text-slate-950 transition cursor-pointer"
              type="submit"
            >
              <Save size={17} />
              <span>ذخیره و ثبت روش پرداخت</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setEditingUserGateway(null);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 px-4 py-3 font-bold transition cursor-pointer"
            >
              انصراف
            </button>
          </div>
        </form>
      )}

      {/* Transactions List */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-black text-white text-sm flex items-center gap-2">
            <ShieldCheck size={16} className="text-cyan-400" />
            <span>تراکنش‌ها و رسیدها</span>
          </h3>
          <RefreshCw size={16} className="text-slate-500" />
        </div>
        <div className="space-y-2">
          {transactions.length === 0 && <p className="text-xs text-slate-500 py-4 text-center">تراکنشی ثبت نشده است.</p>}
          {transactions.map(transaction => (
            <div key={transaction.id} className="grid gap-2 rounded-xl border border-slate-800 p-3 text-xs text-slate-300 md:grid-cols-5 hover:bg-slate-900/40 transition">
              <span className="font-bold text-white">{transaction.full_name || transaction.national_code}</span>
              <span className="font-mono text-amber-300">{formatToPersianDigits(transaction.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','))} {transaction.currency === 'IRT' ? 'تومان' : 'ریال'}</span>
              <span>درگاه: {transaction.gateway === 'zarinpal' ? 'زرین‌پال' : transaction.gateway === 'card' ? 'کارت به کارت' : 'سفارشی'}</span>
              <span>
                {transaction.status === 'paid' ? (
                  <span className="text-emerald-400 font-bold">● موفق / تأیید شده</span>
                ) : transaction.status === 'pending' ? (
                  <div className="flex flex-col gap-1 items-start">
                    <span className="text-amber-400 font-bold">● در انتظار تایید</span>
                    {setTransactions && (
                      <button
                        type="button"
                        onClick={() => {
                          setTransactions(prev => prev.map(t => t.id === transaction.id ? { ...t, status: 'paid' } : t));
                          triggerAlert(`رسید پرداخت «${transaction.full_name || 'کاربر'}» تایید شد و دسترسی پنل فعال گردید.`);
                        }}
                        className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-bold cursor-pointer transition"
                      >
                        تأیید و فعال‌سازی پنل
                      </button>
                    )}
                  </div>
                ) : (
                  <span className="text-rose-400">● ناموفق</span>
                )}
              </span>
              {transaction.payment_url ? (
                <a className="inline-flex items-center gap-1 text-cyan-300 hover:underline" href={transaction.payment_url} target="_blank" rel="noreferrer">
                  لینک درگاه <ExternalLink size={13} />
                </a>
              ) : (
                <span>-</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
