import React, { useState, useMemo } from 'react';
import { 
  Receipt, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  ExternalLink, 
  Copy, 
  Check, 
  Printer, 
  ShieldCheck, 
  Coins, 
  Search, 
  FileText,
  Building,
  Hash,
  X
} from 'lucide-react';
import { PaymentSettings, PaymentTransaction, User } from '../types';

interface WalletTransfersViewProps {
  currentUser: User;
  paymentTransactions: PaymentTransaction[];
  paymentSettings?: PaymentSettings;
  triggerAlert: (message: string) => void;
  onNavigate?: (tab: string) => void;
}

export default function WalletTransfersView({
  currentUser,
  paymentTransactions,
  paymentSettings,
  triggerAlert,
  onNavigate
}: WalletTransfersViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'failed'>('all');
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentTransaction | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Filter payment receipts belonging to the current user (by user_id or national_code)
  const userReceipts = useMemo(() => {
    return paymentTransactions.filter(
      t => t.user_id === currentUser.id || t.national_code === currentUser.national_code
    );
  }, [paymentTransactions, currentUser.id, currentUser.national_code]);

  // Apply search query and status tab filter
  const filteredReceipts = useMemo(() => {
    return userReceipts.filter(receipt => {
      const matchesStatus = 
        statusFilter === 'all' || 
        (statusFilter === 'paid' && receipt.status === 'paid') ||
        (statusFilter === 'pending' && receipt.status === 'pending') ||
        (statusFilter === 'failed' && (receipt.status === 'failed' || receipt.status === 'cancelled'));

      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = 
        !q || 
        (receipt.id && receipt.id.toLowerCase().includes(q)) ||
        (receipt.ref_id && receipt.ref_id.toLowerCase().includes(q)) ||
        (receipt.authority && receipt.authority.toLowerCase().includes(q)) ||
        (receipt.full_name && receipt.full_name.toLowerCase().includes(q));

      return matchesStatus && matchesSearch;
    });
  }, [userReceipts, statusFilter, searchQuery]);

  // Financial calculations
  const totalPaidAmount = useMemo(() => {
    return userReceipts
      .filter(t => t.status === 'paid')
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [userReceipts]);

  const paidCount = useMemo(() => {
    return userReceipts.filter(t => t.status === 'paid').length;
  }, [userReceipts]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedCode(text);
    triggerAlert(`${label} کپی شد.`);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const formatJalaliDate = (isoString?: string) => {
    if (!isoString) return 'نامشخص';
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(d);
    } catch {
      return isoString;
    }
  };

  const getStatusBadge = (status: PaymentTransaction['status']) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300">
            <CheckCircle2 size={13} className="text-emerald-400" />
            پرداخت موفق (تسویه شده)
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-300">
            <Clock size={13} className="text-amber-400 animate-pulse" />
            در انتظار پرداخت / تأیید
          </span>
        );
      case 'failed':
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/15 px-3 py-1 text-xs font-bold text-rose-300">
            <XCircle size={13} className="text-rose-400" />
            ناموفق / لغو شده
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-bold text-slate-400">
            نامشخص
          </span>
        );
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 dir-rtl select-none pb-12">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-cyan-500/25 bg-gradient-to-r from-[#061129]/95 via-[#0b1b3a]/90 to-[#040c1e]/95 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.6)] backdrop-blur-xl">
        <div className="flex items-center gap-3.5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/40 bg-gradient-to-br from-cyan-500/25 to-blue-600/20 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.35)]">
            <Receipt size={28} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              رسیدها و پرداختی‌ها
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                سیستم مالی
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              مشاهده فاکتورهای رسمی، رسیدهای پرداخت و وضعیت سوابق تراکنش‌های بانکی
            </p>
          </div>
        </div>

        {/* Security Stamp Badge */}
        <div className="flex items-center gap-2 self-start sm:self-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-300">
          <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
          <span>رسیدهای ثبت‌شده در درگاه بانکی شاپرک</span>
        </div>
      </header>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Paid Amount */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-md backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold">مجموع پرداختی‌های موفق</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <CreditCard size={16} />
            </div>
          </div>
          <div className="text-xl font-black text-emerald-400">
            {totalPaidAmount.toLocaleString('fa-IR')}
            <span className="text-xs text-emerald-300 font-normal mr-1.5">
              {paymentSettings?.currency === 'IRT' ? 'تومان' : 'ریال'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">تراکنش‌های تسویه شده با کد رهگیری</p>
        </div>

        {/* Receipts Count */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-md backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold">تعداد کل فاکتورها</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
              <Receipt size={16} />
            </div>
          </div>
          <div className="text-xl font-black text-white">
            {userReceipts.length.toLocaleString('fa-IR')}
            <span className="text-xs text-slate-400 font-normal mr-1.5">رسید ثبت‌شده</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {paidCount > 0 ? `${paidCount.toLocaleString('fa-IR')} پرداخت قطعی` : 'رسید در انتظار پرداخت یا ثبت اولیه'}
          </p>
        </div>

        {/* Registration Financial Status */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-md backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold">وضعیت مالی حساب کاربری</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <Building size={16} />
            </div>
          </div>
          <div className="text-sm font-black text-white mt-1">
            {paidCount > 0 || !paymentSettings?.enabled ? (
              <span className="text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                تأیید شده و بدون بدهی
              </span>
            ) : (
              <span className="text-amber-300 flex items-center gap-1.5">
                <Clock size={16} className="text-amber-400 shrink-0" />
                در انتظار پرداخت هزینه ثبت‌نام
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5">پایه تحصیلی {currentUser.grade || 'نامشخص'}</p>
        </div>

        {/* Military Points Balance (Read-only, Admin-managed) */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-md backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold">امتیازات عملیاتی ثبت‌شده</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Coins size={16} />
            </div>
          </div>
          <div className="text-xl font-black text-amber-300">
            {(currentUser.points || 0).toLocaleString('fa-IR')}
            <span className="text-xs text-amber-400/80 font-normal mr-1.5">امتیاز</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">تخصیص اختصاصی توسط ستاد ادمین</p>
        </div>
      </div>

      {/* Rules Notice */}
      <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 flex items-start gap-3 text-xs leading-relaxed text-slate-300">
        <ShieldCheck size={20} className="text-blue-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-white ml-1">اطلاعیه مالی اتاق جنگ:</span>
          کلیه امتیازات سامانه‌ای مستقیماً توسط ستاد داوری و فرماندهی بر اساس فعالیت، مأموریت‌ها و آموزش‌ها ثبت می‌گردند. انتقال امتیاز بین کاربران در سامانه غیرفعال است و این بخش صرفاً جهت بازبینی و بایگانی رسیدهای واریزی و فاکتورهای بانکی است.
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Status Filter Buttons */}
        <div className="inline-flex rounded-2xl border border-slate-800 bg-slate-950/80 p-1">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'all'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            همه رسیدها ({userReceipts.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('paid')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'paid'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            پرداخت شده ({paidCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'pending'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            در انتظار ({userReceipts.filter(t => t.status === 'pending').length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('failed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'failed'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ناموفق
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجوی کد رهگیری، شماره فاکتور..."
            className="w-full rounded-2xl border border-slate-800 bg-slate-900/90 pr-10 pl-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400 transition-colors"
          />
        </div>
      </div>

      {/* Receipts List */}
      <div className="space-y-3.5">
        {filteredReceipts.length === 0 ? (
          <div className="rounded-3xl border border-slate-800/80 bg-slate-950/60 p-10 text-center text-slate-400 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-3.5">
              <FileText size={32} />
            </div>
            <h3 className="text-base font-bold text-slate-200">رسید پرداختی یافت نشد</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              {searchQuery
                ? 'نتیجه‌ای متناسب با جستجوی شما پیدا نشد.'
                : 'در حال حاضر هیچ تراکنش یا رسید مالی برای حساب کاربری شما ثبت نشده است.'}
            </p>

            {/* If payment is enabled and user has no payment, offer payment button */}
            {paymentSettings?.enabled && paymentSettings.amount > 0 && paidCount === 0 && (
              <div className="mt-5 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 max-w-md w-full text-right">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-amber-200">پرداخت هزینه ثبت‌نام مسابقه</span>
                  <span className="text-xs font-black text-amber-300">
                    {paymentSettings.amount.toLocaleString('fa-IR')} {paymentSettings.currency === 'IRT' ? 'تومان' : 'ریال'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mb-3">
                  جهت تکمیل فرایند و فعال‌سازی کامل امکانات، می‌توانید پرداخت خود را از طریق درگاه امن زرین‌پال تکمیل کنید.
                </p>
                {paymentSettings.redirect_url ? (
                  <a
                    href={paymentSettings.redirect_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs shadow-lg hover:from-amber-400 hover:to-amber-500 transition-all"
                  >
                    انتقال به درگاه پرداخت زرین‌پال
                    <ExternalLink size={14} />
                  </a>
                ) : (
                  <span className="text-[11px] text-amber-400">آدرس درگاه در حال حاضر توسط ادمین در دست تنظیم است.</span>
                )}
              </div>
            )}
          </div>
        ) : (
          filteredReceipts.map((receipt) => {
            const isPaid = receipt.status === 'paid';
            const isPending = receipt.status === 'pending';

            return (
              <div
                key={receipt.id}
                className="group relative rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:p-5 transition-all hover:border-slate-700 hover:bg-slate-900/60 shadow-lg"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                  {/* Payer & Transaction Basic Info */}
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                        isPaid
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                          : isPending
                          ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                          : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      <Receipt size={22} />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-sm text-white">
                          هزینه ثبت‌نام و عضویت اتاق جنگ
                        </span>
                        {getStatusBadge(receipt.status)}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1.5 flex-wrap">
                        <span className="flex items-center gap-1 font-mono text-[11px] text-slate-300">
                          <Hash size={12} className="text-slate-500" />
                          {receipt.id}
                        </span>
                        <span className="text-slate-600">•</span>
                        <span>{formatJalaliDate(receipt.paid_at || receipt.created_at)}</span>
                        <span className="text-slate-600">•</span>
                        <span>درگاه: {receipt.gateway === 'zarinpal' ? 'زرین‌پال' : 'پرداخت مستقیم'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Amount and Action Buttons */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800">
                    <div className="text-left">
                      <div className="text-lg font-black text-white">
                        {receipt.amount.toLocaleString('fa-IR')}
                        <span className="text-xs text-slate-400 font-normal mr-1">
                          {receipt.currency === 'IRT' ? 'تومان' : 'ریال'}
                        </span>
                      </div>
                      {receipt.ref_id && (
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 justify-end font-mono">
                          <span>کد پیگیری:</span>
                          <span className="text-emerald-400 font-bold">{receipt.ref_id}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedReceipt(receipt)}
                        className="flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400 transition-all"
                        title="مشاهده فاکتور و رسید رسمی"
                      >
                        <FileText size={14} />
                        <span className="hidden sm:inline">مشاهده رسید</span>
                      </button>

                      {isPending && receipt.payment_url && (
                        <a
                          href={receipt.payment_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 px-3 py-2 text-xs font-black transition-all shadow-md"
                          title="تکمیل پرداخت در درگاه"
                        >
                          <span>پرداخت</span>
                          <ExternalLink size={13} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Official Digital Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md dir-rtl animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl border border-cyan-500/30 bg-[#070e1e] p-6 shadow-[0_0_50px_rgba(6,182,212,0.25)] text-slate-100">
            {/* Modal Close Button */}
            <button
              type="button"
              onClick={() => setSelectedReceipt(null)}
              className="absolute left-4 top-4 rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>

            {/* Receipt Modal Header */}
            <div className="text-center pb-4 border-b border-slate-800">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 flex items-center justify-center mb-2.5">
                <Receipt size={28} />
              </div>
              <h2 className="text-lg font-black text-white">رسید رسمی پرداخت بانکی</h2>
              <p className="text-xs text-slate-400 mt-0.5">سامانه جامع عملیات و مسابقات اتاق جنگ</p>
            </div>

            {/* Receipt Amount Display */}
            <div className="my-5 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-center">
              <span className="text-xs text-slate-400 block mb-1">مبلغ تراکنش</span>
              <div className="text-2xl font-black text-emerald-400">
                {selectedReceipt.amount.toLocaleString('fa-IR')}
                <span className="text-xs text-slate-300 font-normal mr-1.5">
                  {selectedReceipt.currency === 'IRT' ? 'تومان' : 'ریال'}
                </span>
              </div>
              <div className="mt-2">{getStatusBadge(selectedReceipt.status)}</div>
            </div>

            {/* Details Table */}
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">پرداخت‌کننده:</span>
                <span className="font-bold text-white">{selectedReceipt.full_name || currentUser.first_name + ' ' + currentUser.last_name}</span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">کد ملی:</span>
                <span className="font-mono text-slate-200">{selectedReceipt.national_code || currentUser.national_code}</span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">شماره فاکتور / شناسه:</span>
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-cyan-300">
                  <span>{selectedReceipt.id}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(selectedReceipt.id, 'شناسه فاکتور')}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    {copiedCode === selectedReceipt.id ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  </button>
                </div>
              </div>

              {selectedReceipt.ref_id && (
                <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">کد پیگیری مرجع (Ref ID):</span>
                  <div className="flex items-center gap-1.5 font-mono text-[11px] text-emerald-400 font-bold">
                    <span>{selectedReceipt.ref_id}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(selectedReceipt.ref_id!, 'کد پیگیری')}
                      className="p-1 text-slate-400 hover:text-white"
                    >
                      {copiedCode === selectedReceipt.ref_id ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">درگاه پرداخت:</span>
                <span className="font-bold text-white">{selectedReceipt.gateway === 'zarinpal' ? 'زرین‌پال (ZarinPal)' : 'درگاه پرداخت مستقیم'}</span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">تاریخ و ساعت تراکنش:</span>
                <span className="text-slate-300">{formatJalaliDate(selectedReceipt.paid_at || selectedReceipt.created_at)}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 transition-colors"
              >
                <Printer size={14} />
                چاپ رسید
              </button>

              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black px-4 py-2 text-xs transition-colors"
              >
                بستن پنجره
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
