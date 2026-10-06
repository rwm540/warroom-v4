import React, { useState } from 'react';
import { 
  CreditCard, Save, ExternalLink, RefreshCw, Edit, Trash2, 
  ShieldCheck, CheckCircle2, XCircle, Plus, ToggleLeft, ToggleRight, 
  Sparkles, Receipt, Filter, Check, Clock, AlertCircle, Eye, UserCheck, UserX
} from 'lucide-react';
import { PaymentSettings, PaymentTransaction, User } from '../types';
import { formatToPersianDigits } from '../utils/jalali';

interface AdminPaymentsPanelProps {
  settings: PaymentSettings;
  setSettings: (value: PaymentSettings) => void;
  transactions: PaymentTransaction[];
  setTransactions?: React.Dispatch<React.SetStateAction<PaymentTransaction[]>>;
  users?: User[];
  setUsers?: React.Dispatch<React.SetStateAction<User[]>>;
  triggerAlert: (message: string) => void;
}

export default function AdminPaymentsPanel({ 
  settings, 
  setSettings, 
  transactions = [], 
  setTransactions,
  users = [],
  setUsers,
  triggerAlert 
}: AdminPaymentsPanelProps) {
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

  // Filter for transactions
  const [txFilter, setTxFilter] = useState<'all' | 'pending' | 'paid' | 'failed'>('all');
  const [txSearch, setTxSearch] = useState('');

  // Editor states
  const [isEditing, setIsEditing] = useState(false);
  const [editingGateway, setEditingUserGateway] = useState<any | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formEnabled, setFormEnabled] = useState(true);
  const [formAmount, setFormAmount] = useState(3500000);
  const [formCurrency, setFormCurrency] = useState<'IRR' | 'IRT'>('IRT');
  const [formGateway, setFormGateway] = useState<'zarinpal' | 'custom'>('zarinpal');
  const [formApiKey, setFormApiKey] = useState('');
  const [formRedirectUrl, setFormRedirectUrl] = useState('');
  const [formCallbackUrl, setFormCallbackUrl] = useState('');
  const [formDescription, setFormDescription] = useState('هزینه ثبت‌نام مسابقه اتاق جنگ');

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
    setFormGateway('zarinpal');
    setFormApiKey('');
    setFormRedirectUrl('');
    setFormCallbackUrl('');
    setFormDescription('هزینه ثبت‌نام مسابقه اتاق جنگ');
    setIsEditing(true);
  };

  // Open form for editing a payment method
  const handleOpenEdit = (gw: any) => {
    setEditingUserGateway(gw);
    setFormName(gw.name || 'درگاه پرداخت');
    setFormEnabled(gw.enabled !== false);
    setFormAmount(gw.amount || 0);
    setFormCurrency(gw.currency || 'IRT');
    setFormGateway(gw.gateway || 'zarinpal');
    setFormApiKey(gw.api_key || '');
    setFormRedirectUrl(gw.redirect_url || '');
    setFormCallbackUrl(gw.callback_url || '');
    setFormDescription(gw.description || 'هزینه ثبت‌نام مسابقه اتاق جنگ');
    setIsEditing(true);
  };

  // Toggle active/inactive status directly from the list
  const handleToggleGateway = (id: string, currentStatus: boolean) => {
    const updated = gateways.map(g => g.id === id ? { ...g, enabled: !currentStatus } : g);
    updateGatewaysList(updated);
    triggerAlert('وضعیت فعال‌بودن درگاه به‌روزرسانی شد.');
  };

  // Delete gateway from list
  const handleDeleteGateway = (id: string) => {
    if (gateways.length <= 1) {
      triggerAlert('حداقل یک روش یا درگاه پرداخت باید در سامانه تعریف شده باشد.');
      return;
    }
    const updated = gateways.filter(g => g.id !== id);
    updateGatewaysList(updated);
    triggerAlert('روش پرداخت حذف شد.');
  };

  // Submit create / edit gateway
  const handleSaveGateway = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      triggerAlert('لطفاً عنوان درگاه یا روش پرداخت را وارد کنید.');
      return;
    }

    const payload = {
      id: editingGateway ? editingGateway.id : `gw_${Date.now()}`,
      name: formName.trim(),
      enabled: formEnabled,
      amount: Number(formAmount) || 0,
      currency: formCurrency,
      gateway: formGateway,
      api_key: formApiKey.trim(),
      redirect_url: formRedirectUrl.trim(),
      callback_url: formCallbackUrl.trim(),
      description: formDescription.trim(),
      card_enabled: false
    };

    let updatedList: any[];
    if (editingGateway) {
      updatedList = gateways.map(g => g.id === editingGateway.id ? payload : g);
    } else {
      updatedList = [payload, ...gateways];
    }

    updateGatewaysList(updatedList);
    setIsEditing(false);
    setEditingUserGateway(null);
    triggerAlert('روش پرداخت با موفقیت ذخیره و در سامانه فعال شد.');
  };

  // 🛡️ تایید فاکتور و فعال‌سازی منحصراً برای همان کاربر
  const handleApproveTransaction = (tx: PaymentTransaction) => {
    // ۱. به‌روزرسانی فاکتور این کاربر به وضعیت پرداخت‌شده
    if (setTransactions) {
      setTransactions(prev => prev.map(t => t.id === tx.id ? { ...t, status: 'paid' } : t));
    }

    // ۲. فعال‌سازی دسترسی فقط و فقط برای همان کاربر در لیست کاربران
    if (setUsers) {
      setUsers(prev => prev.map(u => {
        const isTarget = (tx.user_id && u.id === tx.user_id) || 
                         (tx.national_code && (u.national_code === tx.national_code || (u as any).nationalCode === tx.national_code));
        if (isTarget) {
          return { ...u, is_active: true };
        }
        return u;
      }));
    }

    triggerAlert(`فاکتور «${tx.full_name || tx.national_code}» تایید شد و دسترسی ورود منحصراً برای این کاربر فعال گردید.`);
  };

  // 🛡️ رد فاکتور یا لغو دسترسی کاربر
  const handleRejectTransaction = (tx: PaymentTransaction) => {
    if (setTransactions) {
      setTransactions(prev => prev.map(t => t.id === tx.id ? { ...t, status: 'failed' } : t));
    }

    // در صورت رد فاکتور، وضعیت کاربر به غیرفعال تغییر می‌کند
    if (setUsers) {
      setUsers(prev => prev.map(u => {
        const isTarget = (tx.user_id && u.id === tx.user_id) || 
                         (tx.national_code && (u.national_code === tx.national_code || (u as any).nationalCode === tx.national_code));
        if (isTarget) {
          return { ...u, is_active: false };
        }
        return u;
      }));
    }

    triggerAlert(`فاکتور کاربر «${tx.full_name || tx.national_code}» رد شد و دسترسی موقتاً مسدود گردید.`);
  };

  // Filtered transactions list
  const filteredTransactions = transactions.filter(tx => {
    const matchesFilter = 
      txFilter === 'all' || 
      (txFilter === 'pending' && tx.status === 'pending') ||
      (txFilter === 'paid' && tx.status === 'paid') ||
      (txFilter === 'failed' && (tx.status === 'failed' || tx.status === 'cancelled'));

    const q = txSearch.trim().toLowerCase();
    const matchesSearch = 
      !q || 
      (tx.full_name && tx.full_name.toLowerCase().includes(q)) ||
      (tx.national_code && tx.national_code.includes(q)) ||
      (tx.ref_id && tx.ref_id.toLowerCase().includes(q)) ||
      (tx.id && tx.id.toLowerCase().includes(q));

    return matchesFilter && matchesSearch;
  });

  return (
    <section className="space-y-6 dir-rtl text-slate-100 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
            <CreditCard className="text-amber-400" size={22} />
            <span>مدیریت درگاه‌های پرداخت، فاکتورها و فعال‌سازی کاربران</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            هر کاربر دارای فاکتور مجزا است و تایید هر پرداخت منحصراً دسترسی همان کاربر را فعال می‌نماید.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 px-4 py-2 text-xs font-black text-slate-950 transition shadow-lg cursor-pointer self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>افزودن روش یا درگاه جدید</span>
        </button>
      </div>

      {/* Gateways Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {gateways.map(gw => (
          <div
            key={gw.id}
            className={`rounded-2xl border p-4 transition-all relative overflow-hidden flex flex-col justify-between ${
              gw.enabled
                ? 'border-amber-500/40 bg-gradient-to-b from-[#0e1628] to-[#080d1a] shadow-[0_0_20px_rgba(245,158,11,0.12)]'
                : 'border-slate-800 bg-slate-950/60 opacity-75'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5 mb-3">
                <span className="font-black text-sm text-white flex items-center gap-1.5 truncate">
                  <CreditCard size={16} className={gw.enabled ? 'text-amber-400' : 'text-slate-500'} />
                  {gw.name}
                </span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                  gw.enabled
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {gw.enabled ? 'فعال در سامانه' : 'غیرفعال'}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-[11px]">مبلغ ورودی:</span>
                  <span className="font-mono font-black text-amber-300">
                    {formatToPersianDigits(gw.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','))} {gw.currency === 'IRT' ? 'تومان' : 'ریال'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-[11px]">نوع پرداخت:</span>
                  <span className="font-bold text-cyan-300">درگاه پرداخت آنلاین امن</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => handleToggleGateway(gw.id, gw.enabled)}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1 cursor-pointer ${
                  gw.enabled
                    ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                }`}
              >
                {gw.enabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                <span>{gw.enabled ? 'غیرفعال‌سازی' : 'فعال‌سازی'}</span>
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(gw)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                  title="ویرایش مشخصات درگاه"
                >
                  <Edit size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteGateway(gw.id)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/80 hover:text-rose-400 text-slate-400 transition cursor-pointer"
                  title="حذف روش پرداخت"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Editor Modal / Form */}
      {isEditing && (
        <form onSubmit={handleSaveGateway} className="grid gap-4 rounded-3xl border border-amber-500/50 bg-[#080e1e] p-5 sm:p-6 shadow-2xl md:grid-cols-2">
          <div className="md:col-span-2 flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-black text-white text-sm flex items-center gap-2">
              <CreditCard size={18} className="text-amber-400" />
              <span>{editingGateway ? 'ویرایش مشخصات روش پرداخت' : 'افزودن روش یا درگاه پرداخت جدید'}</span>
            </h3>
            <span className="text-xs text-amber-300 font-bold">ذخیره مستقیم در سامانه</span>
          </div>

          <label className="text-xs text-slate-300">عنوان درگاه / روش پرداخت
            <input
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white focus:border-amber-400 focus:outline-none"
              value={formName}
              onChange={e => setFormName(e.target.value)}
              placeholder="مثال: درگاه زرین‌پال مسابقات یا کارت به کارت ستاد"
              required
            />
          </label>

          <label className="text-xs text-slate-300">مبلغ قابل پرداخت
            <div className="mt-2 flex gap-2">
              <input
                className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white font-mono focus:border-amber-400 focus:outline-none"
                type="number"
                value={formAmount}
                onChange={e => setFormAmount(Number(e.target.value))}
                placeholder="3500000"
                required
              />
              <select
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 text-white text-xs font-bold"
                value={formCurrency}
                onChange={e => setFormCurrency(e.target.value as any)}
              >
                <option value="IRT">تومان</option>
                <option value="IRR">ریال</option>
              </select>
            </div>
          </label>

              <label className="text-xs text-slate-300">کلید درگاه پرداخت (Merchant ID / API Key)
                <input
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white font-mono"
                  value={formApiKey}
                  onChange={e => setFormApiKey(e.target.value)}
                  placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
                  required
                />
              </label>

              <label className="text-xs text-slate-300">آدرس بازگشت پس از پرداخت (Callback URL)
                <input
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white"
                  type="url"
                  value={formCallbackUrl}
                  onChange={e => setFormCallbackUrl(e.target.value)}
                  placeholder="https://.../payment/callback"
                  required
                />
              </label>

          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-900">
            <button
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 px-4 py-3 font-black text-slate-950 transition cursor-pointer"
              type="submit"
            >
              <Save size={17} />
              <span>ذخیره و فعال‌سازی روش پرداخت</span>
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

      {/* Transactions & Invoices List */}
      <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5 sm:p-6 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div>
            <h3 className="font-black text-white text-sm flex items-center gap-2">
              <Receipt size={18} className="text-cyan-400" />
              <span>فاکتورها و تراکنش‌های انفرادی کاربران ({transactions.length} فاکتور)</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              هر کاربر دارای پرونده مالی مجزا است؛ تأیید هر فاکتور تنها دسترسی همان کاربر را فعال می‌کند.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="inline-flex rounded-2xl border border-slate-800 bg-slate-900/90 p-1 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setTxFilter('all')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                txFilter === 'all' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              همه ({transactions.length})
            </button>
            <button
              type="button"
              onClick={() => setTxFilter('pending')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                txFilter === 'pending' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              در انتظار تأیید ({transactions.filter(t => t.status === 'pending').length})
            </button>
            <button
              type="button"
              onClick={() => setTxFilter('paid')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                txFilter === 'paid' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              تأیید شده ({transactions.filter(t => t.status === 'paid').length})
            </button>
          </div>
        </div>

        {/* Transactions Table / List */}
        <div className="space-y-3">
          {filteredTransactions.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs bg-slate-900/30 rounded-2xl border border-dashed border-slate-800">
              هیچ فاکتور یا تراکنشی در این دسته‌بندی یافت نشد.
            </div>
          ) : (
            filteredTransactions.map(transaction => {
              const matchedUser = users.find(u => 
                (transaction.user_id && u.id === transaction.user_id) || 
                (transaction.national_code && u.national_code === transaction.national_code)
              );

              return (
                <div 
                  key={transaction.id} 
                  className={`rounded-2xl border p-4 text-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                    transaction.status === 'paid'
                      ? 'border-emerald-500/30 bg-emerald-950/10'
                      : transaction.status === 'pending'
                      ? 'border-amber-500/40 bg-amber-950/15 shadow-[0_0_15px_rgba(245,158,11,0.08)]'
                      : 'border-slate-800 bg-slate-900/40'
                  }`}
                >
                  {/* User info & Invoice identity */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-white">
                        {transaction.full_name || matchedUser?.first_name ? `${matchedUser?.first_name || ''} ${matchedUser?.last_name || ''}` : transaction.national_code}
                      </span>
                      {transaction.national_code && (
                        <span className="font-mono text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          کد ملی: {transaction.national_code}
                        </span>
                      )}
                      {matchedUser && (
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                          matchedUser.is_active !== false
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}>
                          {matchedUser.is_active !== false ? 'کاربر فعال' : 'کاربر غیرفعال'}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span>شناسه فاکتور: <span className="font-mono text-slate-300">{transaction.id}</span></span>
                      {transaction.ref_id && (
                        <span>• رهگیری: <span className="font-mono text-cyan-300">{transaction.ref_id}</span></span>
                      )}
                    </div>
                  </div>

                  {/* Financial amount & Gateway */}
                  <div className="flex items-center gap-4 text-xs">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">مبلغ فاکتور:</span>
                      <span className="font-mono font-black text-amber-300 text-sm">
                        {formatToPersianDigits(transaction.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','))} {transaction.currency === 'IRT' ? 'تومان' : 'ریال'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block">نوع درگاه:</span>
                      <span className="font-bold text-slate-200">
                        {transaction.gateway === 'zarinpal' ? 'زرین‌پال آنلاین' : transaction.gateway === 'card' ? 'کارت به کارت' : 'سفارشی'}
                      </span>
                    </div>
                  </div>

                  {/* Status & Action Buttons */}
                  <div className="flex items-center gap-2 self-start md:self-center">
                    {transaction.status === 'paid' ? (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-xl">
                          <CheckCircle2 size={13} />
                          <span>تأیید و فعال</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRejectTransaction(transaction)}
                          className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-rose-950/70 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 text-[10px] font-bold transition cursor-pointer"
                          title="لغو تایید این فاکتور و غیرفعال‌سازی کاربر"
                        >
                          لغو تایید
                        </button>
                      </div>
                    ) : transaction.status === 'pending' ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleApproveTransaction(transaction)}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-slate-950 font-black text-xs transition shadow flex items-center gap-1.5 cursor-pointer"
                        >
                          <UserCheck size={14} />
                          <span>تأیید فاکتور و فعال‌سازی این کاربر</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectTransaction(transaction)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-950 text-rose-300 border border-slate-800 hover:border-rose-500/40 text-xs font-bold transition cursor-pointer"
                        >
                          <XCircle size={14} />
                          <span>رد فاکتور</span>
                        </button>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-bold text-rose-400 bg-rose-500/15 border border-rose-500/30 px-2.5 py-1 rounded-xl">
                        <XCircle size={13} />
                        <span>رد شده</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
