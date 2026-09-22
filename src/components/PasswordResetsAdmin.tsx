/**
 * 🛡️ تب «درخواست‌های تغییر رمز» در پنل مدیریت
 * --------------------------------------------------------------------
 * جریان کار مدیر:
 *   ۱) فهرست درخواست‌های کاربران (کد ملی، شماره همراه ثبت‌شده و شماره تماس اعلامی)
 *   ۲) تماس تلفنی با کاربر (دکمه تماس مستقیم / کپی شماره / واتس‌اپ)
 *   ۳) تولید رمز عبور قوی، ثبت آن روی حساب کاربر و اعلام تلفنی
 *   ۴) بستن درخواست یا رد آن با ذکر دلیل
 *
 * 🔐 نکته امنیتی: رمز جدید فقط «یک‌بار» در همین صفحه نمایش داده می‌شود؛ روی سرور
 *    تنها هش scrypt ذخیره می‌گردد و هیچ‌گاه در دیتابیس به‌صورت متن ساده نمی‌ماند.
 *    همچنین «پایش امنیت» (محدودسازی نرخ، IPهای مسدود، رخدادها) در همین تب است.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyRound, Phone, Copy, Check, RefreshCw, ShieldAlert, ShieldCheck, Search, Filter,
  UserCheck, XCircle, Send, Loader2, AlertTriangle, Lock, Activity, Ban, Clock,
  MessageCircle, Siren, ChevronDown, Ban as BanIcon
} from 'lucide-react';
import type { PasswordResetRequest, User } from '../types';
import { formatToPersianDigits, normalizeToEnglishDigits } from '../utils/jalali';
import { sha256Hex } from '../lib/supabaseData';
import {
  probeBackend,
  adminListPasswordResets,
  adminGeneratePassword,
  adminMarkContacted,
  adminResolvePasswordReset,
  adminRejectPasswordReset,
  adminSecurityOverview,
  adminAuditLog,
  getBackendStatus,
} from '../lib/backendApi';

interface PasswordResetsAdminProps {
  currentUser: User;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  /** درخواست‌های ثبت‌شده در حالت محلی (بدون بک‌اند) */
  localRequests: PasswordResetRequest[];
  setLocalRequests: React.Dispatch<React.SetStateAction<PasswordResetRequest[]>>;
  triggerAlert: (msg: string) => void;
}

type StatusFilter = 'all' | 'pending' | 'contacted' | 'resolved' | 'rejected';

const STATUS_META: Record<string, { label: string; className: string }> = {
  pending: { label: 'در انتظار بررسی', className: 'bg-amber-950 text-amber-300 border-amber-500/50' },
  contacted: { label: 'تماس گرفته شد', className: 'bg-cyan-950 text-cyan-300 border-cyan-500/50' },
  resolved: { label: 'انجام شد', className: 'bg-emerald-950 text-emerald-300 border-emerald-500/50' },
  rejected: { label: 'رد شده', className: 'bg-rose-950 text-rose-300 border-rose-500/50' },
};

/** تبدیل تاریخ ISO به تاریخ/ساعت خوانا با ارقام فارسی */
const formatDateTime = (iso?: string) => {
  if (!iso) return '—';
  try {
    return formatToPersianDigits(
      new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      }).format(new Date(iso))
    );
  } catch {
    return '—';
  }
};

const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.setAttribute('readonly', '');
      el.style.position = 'absolute';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(el);
      return ok;
    } catch {
      return false;
    }
  }
};

/** پیام آماده برای اعلام تلفنی رمز جدید */
const buildCallScript = (request: PasswordResetRequest, password: string) => {
  const name = request.full_name || 'کاربر گرامی';
  return [
    `سلام ${name} عزیز، از پشتیبانی پلتفرم اتاق جنگ تماس می‌گیرم.`,
    `درخواست بازیابی رمز شما بررسی و تأیید شد.`,
    `رمز عبور جدید شما: ${password}`,
    `لطفاً پس از ورود، از بخش «تغییر رمز عبور» رمز خود را به یک رمز دلخواه و امن تغییر دهید.`,
  ].join('\n');
};

export default function PasswordResetsAdmin({
  currentUser,
  users,
  setUsers,
  localRequests,
  setLocalRequests,
  triggerAlert
}: PasswordResetsAdminProps) {
  // 🛡️ تابع اعلان با Ref نگه‌داری می‌شود تا وابستگی اثرها پایدار بماند
  //    (جلوگیری از حلقه بی‌پایان درخواست‌ها هنگام رندر مجدد والد)
  const triggerAlertRef = useRef(triggerAlert);
  useEffect(() => { triggerAlertRef.current = triggerAlert; }, [triggerAlert]);
  const notify = useCallback((message: string) => triggerAlertRef.current?.(message), []);

  const [backendReady, setBackendReady] = useState<boolean>(() => Boolean(getBackendStatus()?.available));
  const [serverRequests, setServerRequests] = useState<PasswordResetRequest[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState<{ id: string; password: string } | null>(null);
  const [manualPassword, setManualPassword] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [security, setSecurity] = useState<any>(null);
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [showSecurity, setShowSecurity] = useState(false);

  useEffect(() => {
    let mounted = true;
    probeBackend().then((status) => {
      if (mounted) setBackendReady(Boolean(status.available));
    });
    return () => { mounted = false; };
  }, []);

  const loadServerRequests = useCallback(async () => {
    if (!backendReady) return;
    setIsLoading(true);
    const res = await adminListPasswordResets({ status: 'all' });
    setIsLoading(false);
    if (!res.ok) {
      notify(res.error?.message || 'دریافت درخواست‌ها ناموفق بود.');
      return;
    }
    setServerRequests((res.data?.requests || []) as PasswordResetRequest[]);
    setStats(res.data?.stats || {});
  }, [backendReady, notify]);

  const loadSecurity = useCallback(async () => {
    if (!backendReady) return;
    const [overview, audit] = await Promise.all([adminSecurityOverview(), adminAuditLog(60)]);
    if (overview.ok) setSecurity(overview.data);
    if (audit.ok) setAuditEvents(audit.data?.events || []);
  }, [backendReady]);

  useEffect(() => {
    loadServerRequests();
    loadSecurity();
    const timer = setInterval(() => { loadServerRequests(); }, 30_000);
    return () => clearInterval(timer);
  }, [loadServerRequests, loadSecurity]);

  /** فهرست یکپارچه: رکوردهای سرور (امن) + رکوردهای محلی (حالت بدون بک‌اند) */
  const allRequests: PasswordResetRequest[] = useMemo(() => {
    const list = backendReady ? serverRequests : localRequests;
    return [...list].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  }, [backendReady, serverRequests, localRequests]);

  const filteredRequests = useMemo(() => {
    const term = normalizeToEnglishDigits(search.trim()).replace(/\D/g, '');
    return allRequests.filter((request) => {
      if (statusFilter !== 'all' && request.status !== statusFilter) return false;
      if (!term) return true;
      return [request.national_code, request.personal_code, request.contact_phone, request.account_phone]
        .filter(Boolean)
        .some((value) => String(value).includes(term));
    });
  }, [allRequests, statusFilter, search]);

  const counts = useMemo(() => ({
    all: allRequests.length,
    pending: allRequests.filter((r) => r.status === 'pending').length,
    contacted: allRequests.filter((r) => r.status === 'contacted').length,
    resolved: allRequests.filter((r) => r.status === 'resolved').length,
    rejected: allRequests.filter((r) => r.status === 'rejected').length,
  }), [allRequests]);

  const markCopied = (key: string) => {
    setCopied(key);
    setTimeout(() => setCopied((prev) => (prev === key ? null : prev)), 1800);
  };

  /* ------------------------- اقدامات مدیر (سرور) ------------------------- */
  const handleGenerate = async (request: PasswordResetRequest) => {
    setBusyId(request.id);
    const res = await adminGeneratePassword(request.id);
    setBusyId(null);
    if (!res.ok) {
      notify(res.error?.message || 'تولید رمز ناموفق بود.');
      return;
    }
    setGeneratedPassword({ id: request.id, password: res.data?.password || '' });
    setManualPassword('');
  };

  const handleMarkContacted = async (request: PasswordResetRequest) => {
    if (!backendReady) {
      setLocalRequests((prev) => prev.map((r) => (r.id === request.id
        ? { ...r, status: 'contacted', contacted_at: new Date().toISOString() }
        : r)));
      notify('تماس تلفنی ثبت شد (حالت محلی).');
      return;
    }
    setBusyId(request.id);
    const res = await adminMarkContacted(request.id);
    setBusyId(null);
    if (!res.ok) {
      notify(res.error?.message || 'ثبت تماس ناموفق بود.');
      return;
    }
    notify('تماس تلفنی با کاربر ثبت شد.');
    loadServerRequests();
  };

  /** اعمال رمز جدید روی حساب کاربر و بستن درخواست */
  const handleResolve = async (request: PasswordResetRequest) => {
    const password = manualPassword || generatedPassword?.password || '';
    if (!password) {
      notify('ابتدا رمز جدید را تولید یا وارد کنید.');
      return;
    }

    if (!backendReady) {
      /* حالت محلی: رمز به‌صورت هش SHA-256 در حافظه محلی ذخیره می‌شود */
      const hashed = await sha256Hex(password);
      setUsers((prev) => prev.map((u) => (
        normalizeToEnglishDigits(u.national_code) === normalizeToEnglishDigits(request.national_code)
          ? { ...u, password: hashed }
          : u
      )));
      setLocalRequests((prev) => prev.map((r) => (r.id === request.id
        ? { ...r, status: 'resolved', resolved_at: new Date().toISOString(), resolution_note: 'رمز جدید تلفنی اعلام شد.' }
        : r)));
      setGeneratedPassword({ id: request.id, password });
      notify('رمز جدید ثبت شد (حالت محلی). آن را تلفنی به کاربر اعلام کنید.');
      return;
    }

    setBusyId(request.id);
    const res = await adminResolvePasswordReset(request.id, password, 'رمز جدید تلفنی اعلام شد.');
    setBusyId(null);

    if (!res.ok) {
      notify(res.error?.message || 'ثبت رمز جدید ناموفق بود.');
      return;
    }

    setGeneratedPassword({ id: request.id, password: res.data?.password || password });
    setManualPassword('');
    notify('رمز جدید روی حساب کاربر ثبت شد. آن را تلفنی اعلام کنید.');
    loadServerRequests();
  };

  const handleReject = async (request: PasswordResetRequest) => {
    const reason = rejectReason.trim() || 'عدم تأیید هویت در تماس تلفنی';

    if (!backendReady) {
      setLocalRequests((prev) => prev.map((r) => (r.id === request.id
        ? { ...r, status: 'rejected', resolved_at: new Date().toISOString(), resolution_note: reason }
        : r)));
      setRejectReason('');
      notify('درخواست رد شد (حالت محلی).');
      return;
    }

    setBusyId(request.id);
    const res = await adminRejectPasswordReset(request.id, reason);
    setBusyId(null);
    if (!res.ok) {
      notify(res.error?.message || 'رد درخواست ناموفق بود.');
      return;
    }
    setRejectReason('');
    notify('درخواست رد شد.');
    loadServerRequests();
  };

  /* --------------------------------- UI --------------------------------- */
  return (
    <div className="space-y-4 dir-rtl">

      {/* هشدار حالت محلی */}
      {!backendReady && (
        <div className="p-3 rounded-2xl bg-amber-950/50 border border-amber-500/50 text-amber-100 text-[11px] leading-relaxed flex items-start gap-2">
          <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-400" />
          <div>
            <p className="font-black">بک‌اند امن در دسترس نیست (حالت محلی)</p>
            <p className="opacity-90">
              درخواست‌ها فقط در همین مرورگر ذخیره می‌شوند، رمزها با SHA-256 سمت مرورگر هش می‌شوند و
              لایه‌های امنیتی سرور (محدودسازی نرخ، قفل حساب، هش scrypt) فعال نیستند. برای فعال‌سازی،
              سرویس بک‌اند را اجرا کنید: <code className="font-mono">npm run dev</code>
            </p>
          </div>
        </div>
      )}

      {/* نوار وضعیت امنیتی */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="p-3 rounded-2xl bg-[#080d21] border border-slate-800">
          <span className="text-[10px] text-slate-400 block">در انتظار بررسی</span>
          <span className="text-lg font-black text-amber-300">{formatToPersianDigits(counts.pending)}</span>
        </div>
        <div className="p-3 rounded-2xl bg-[#080d21] border border-slate-800">
          <span className="text-[10px] text-slate-400 block">تماس گرفته‌شده</span>
          <span className="text-lg font-black text-cyan-300">{formatToPersianDigits(counts.contacted)}</span>
        </div>
        <div className="p-3 rounded-2xl bg-[#080d21] border border-slate-800">
          <span className="text-[10px] text-slate-400 block">انجام‌شده</span>
          <span className="text-lg font-black text-emerald-300">{formatToPersianDigits(counts.resolved)}</span>
        </div>
        <div className="p-3 rounded-2xl bg-[#080d21] border border-slate-800">
          <span className="text-[10px] text-slate-400 block">رد‌شده</span>
          <span className="text-lg font-black text-rose-300">{formatToPersianDigits(counts.rejected)}</span>
        </div>
      </div>

      {/* فیلترها و جست‌وجو */}
      <div className="p-3 rounded-2xl bg-[#080d21] border border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-slate-400 font-bold flex items-center gap-1.5">
            <Filter size={13} /> وضعیت:
          </span>
          {([
            ['pending', 'در انتظار'],
            ['contacted', 'تماس‌شده'],
            ['resolved', 'انجام‌شده'],
            ['rejected', 'رد‌شده'],
            ['all', 'همه'],
          ] as [StatusFilter, string][]).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold border transition ${
                statusFilter === value
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:text-white'
              }`}
            >
              {label} ({formatToPersianDigits(counts[value] ?? 0)})
            </button>
          ))}

          <div className="flex-1 min-w-[180px] relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جست‌وجو بر اساس کد ملی یا شماره تماس..."
              className="w-full py-1.5 pr-8 pl-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-500 text-[11px] text-white font-mono"
            />
            <Search size={13} className="absolute right-2.5 top-2 text-slate-500" />
          </div>

          <button
            onClick={() => { loadServerRequests(); loadSecurity(); }}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold flex items-center gap-1.5"
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
            <span>بروزرسانی</span>
          </button>

          <button
            onClick={() => setShowSecurity((prev) => !prev)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[10px] font-bold flex items-center gap-1.5"
          >
            <Activity size={12} />
            <span>پایش امنیت</span>
            <ChevronDown size={12} className={showSecurity ? 'rotate-180 transition' : 'transition'} />
          </button>
        </div>
      </div>

      {/* پنل پایش امنیت */}
      {showSecurity && (
        <div className="p-4 rounded-2xl bg-[#080d21] border border-emerald-900/60 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-400" />
            <h4 className="text-xs font-black text-emerald-300">پایش امنیتی و ضدحمله</h4>
          </div>

          {!backendReady && (
            <p className="text-[11px] text-amber-200">
              در حالت محلی، پایش امنیتی سرور در دسترس نیست. بک‌اند را اجرا کنید تا آمار حملات، IPهای مسدود
              و رخدادهای امنیتی نمایش داده شود.
            </p>
          )}

          {backendReady && security && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                {[
                  ['کل درخواست‌ها', security.rateLimit?.totalRequests],
                  ['درخواست‌های مسدودشده', security.rateLimit?.blockedRequests],
                  ['محدودسازی نرخ', security.rateLimit?.rateLimited],
                  ['IPهای مسدود موقت', security.rateLimit?.activeBans?.length],
                  ['ورود ناموفق ۲۴ ساعت', security.stats?.failedLogins24h],
                  ['درخواست رمز در انتظار', security.stats?.resetsPending],
                  ['IPهای تحت پایش', security.rateLimit?.trackedIps],
                  ['درخواست هم‌زمان ردشده', security.rateLimit?.concurrencyRejected],
                ].map(([label, value]) => (
                  <div key={String(label)} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-400 block">{label}</span>
                    <span className="text-sm font-black text-slate-100 font-mono">
                      {formatToPersianDigits(Number(value || 0))}
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold block">لایه‌های امنیتی فعال:</span>
                <ul className="text-[10px] text-slate-300 space-y-0.5 list-disc pr-4">
                  {Object.entries(security.securityFeatures || {}).map(([key, value]) => (
                    <li key={key}><span className="font-mono text-emerald-300">{key}</span>: {String(value)}</li>
                  ))}
                </ul>
                {security.store && (
                  <p className="text-[10px] text-slate-400 pt-1">
                    لایه داده: <span className="font-mono text-cyan-300">{security.store.mode}</span>
                    {security.store.location ? ` — ${security.store.location}` : ''}
                  </p>
                )}
              </div>

              {Array.isArray(security.rateLimit?.activeBans) && security.rateLimit.activeBans.length > 0 && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-700/50 space-y-1">
                  <span className="text-[10px] text-rose-200 font-bold flex items-center gap-1.5">
                    <Ban size={12} /> IPهای مسدودشده موقت (حمله/سوءاستفاده):
                  </span>
                  {security.rateLimit.activeBans.slice(0, 6).map((ban: any) => (
                    <div key={ban.ip} className="text-[10px] font-mono text-rose-100 flex items-center justify-between">
                      <span dir="ltr">{ban.ip}</span>
                      <span>تا {formatDateTime(ban.until)}</span>
                    </div>
                  ))}
                </div>
              )}

              {auditEvents.length > 0 && (
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5 max-h-64 overflow-y-auto">
                  <span className="text-[10px] text-slate-400 font-bold block">آخرین رخدادهای امنیتی:</span>
                  {auditEvents.slice(0, 25).map((event) => (
                    <div key={event.id} className="text-[10px] flex items-center justify-between gap-2 border-b border-slate-900 pb-1">
                      <span className={
                        event.severity === 'critical' ? 'text-rose-300'
                          : event.severity === 'warning' ? 'text-amber-300'
                            : 'text-slate-300'
                      }>
                        {String(event.type).replace(/_/g, ' ')}
                        {event.message ? ` — ${event.message}` : ''}
                      </span>
                      <span className="text-slate-500 shrink-0">{formatDateTime(event.at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* فهرست درخواست‌ها */}
      {filteredRequests.length === 0 ? (
        <div className="p-8 rounded-2xl bg-[#080d21] border border-slate-800 text-center space-y-2">
          <KeyRound size={26} className="mx-auto text-slate-600" />
          <p className="text-xs font-bold text-slate-300">درخواست تغییر رمزی در این وضعیت وجود ندارد.</p>
          <p className="text-[10px] text-slate-500">
            درخواست‌های کاربران از دکمه «فراموشی رمز عبور» در صفحه ورود ثبت و در همین بخش نمایش داده می‌شوند.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((request) => {
            const meta = STATUS_META[request.status] || STATUS_META.pending;
            const isExpanded = expandedId === request.id;
            const dial = request.contact_phone_dial || (request.contact_phone ? `+98${String(request.contact_phone).replace(/^0/, '')}` : '');
            const whatsapp = dial ? `https://wa.me/${dial.replace('+', '')}` : '';
            const passwordForThis = generatedPassword?.id === request.id ? generatedPassword.password : '';

            return (
              <div key={request.id} className="rounded-2xl bg-[#080d21] border border-slate-800 overflow-hidden">
                {/* سربرگ درخواست */}
                <div className="p-3.5 flex flex-wrap items-center gap-3 justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-amber-300 shrink-0">
                      <KeyRound size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-white truncate">
                        {request.full_name || 'کاربر بدون نام'}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono flex items-center gap-2 flex-wrap">
                        <span>کد ملی: {formatToPersianDigits(request.national_code || '—')}</span>
                        {request.tracking_code && <span className="text-cyan-300">کد رهگیری: {request.tracking_code}</span>}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-lg border text-[10px] font-bold ${meta.className}`}>
                      {meta.label}
                    </span>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Clock size={11} /> {formatDateTime(request.created_at)}
                    </span>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : request.id)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-200 flex items-center gap-1"
                    >
                      {isExpanded ? 'بستن' : 'اقدامات'}
                      <ChevronDown size={12} className={isExpanded ? 'rotate-180 transition' : 'transition'} />
                    </button>
                  </div>
                </div>

                {/* اطلاعات تماس — همیشه در دسترس مدیر */}
                <div className="px-3.5 pb-3 flex flex-wrap items-center gap-2 text-[10px]">
                  <span className="text-slate-400 font-bold flex items-center gap-1">
                    <Phone size={12} /> شماره تماس اعلامی کاربر:
                  </span>
                  <code className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-700 text-emerald-300 font-mono" dir="ltr">
                    {request.contact_phone || '—'}
                  </code>
                  {request.account_phone && request.account_phone !== request.contact_phone && (
                    <>
                      <span className="text-slate-400 font-bold">شماره ثبت‌شده در سامانه:</span>
                      <code className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-700 text-cyan-300 font-mono" dir="ltr">
                        {request.account_phone}
                      </code>
                    </>
                  )}

                  {dial && (
                    <>
                      <a
                        href={`tel:${dial}`}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1"
                      >
                        <Phone size={11} /> تماس تلفنی
                      </a>
                      <button
                        onClick={async () => {
                          const ok = await copyToClipboard(request.contact_phone || '');
                          if (ok) markCopied(`phone-${request.id}`);
                          notify(ok ? 'شماره تماس کپی شد.' : 'کپی شماره ناموفق بود.');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold flex items-center gap-1"
                      >
                        {copied === `phone-${request.id}` ? <Check size={11} /> : <Copy size={11} />} کپی شماره
                      </button>
                      <a
                        href={whatsapp}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold flex items-center gap-1"
                      >
                        <MessageCircle size={11} /> واتس‌اپ
                      </a>
                    </>
                  )}
                </div>

                {request.note && (
                  <div className="mx-3.5 mb-3 p-2 rounded-xl bg-slate-950/70 border border-slate-800 text-[10px] text-slate-300">
                    <span className="text-slate-500 font-bold">توضیح کاربر: </span>{request.note}
                  </div>
                )}

                {request.resolution_note && request.status !== 'pending' && (
                  <div className="mx-3.5 mb-3 p-2 rounded-xl bg-slate-950/70 border border-slate-800 text-[10px] text-slate-300">
                    <span className="text-slate-500 font-bold">یادداشت مدیر: </span>{request.resolution_note}
                  </div>
                )}

                {/* اقدامات */}
                {isExpanded && (
                  <div className="p-3.5 border-t border-slate-800 bg-slate-950/40 space-y-3">
                    {request.status === 'resolved' ? (
                      <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-600/50 text-[11px] text-emerald-100 flex items-start gap-2">
                        <Check size={14} className="shrink-0 mt-0.5" />
                        <span>
                          این درخواست انجام شده است. رمز جدید روی حساب کاربر ثبت و (بر اساس یادداشت) تلفنی
                          اعلام شده. کاربر باید در نخستین ورود، رمز خود را تغییر دهد.
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => handleMarkContacted(request)}
                            disabled={busyId === request.id}
                            className="px-3 py-2 rounded-xl bg-cyan-700 hover:bg-cyan-600 disabled:opacity-60 text-white text-[10px] font-bold flex items-center gap-1.5"
                          >
                            <Phone size={12} /> ثبت تماس تلفنی انجام‌شده
                          </button>

                          <button
                            onClick={() => handleGenerate(request)}
                            disabled={busyId === request.id || !backendReady}
                            className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-slate-950 text-[10px] font-black flex items-center gap-1.5"
                          >
                            {busyId === request.id ? <Loader2 size={12} className="animate-spin" /> : <KeyRound size={12} />}
                            تولید رمز عبور جدید
                          </button>
                        </div>

                        {/* نمایش رمز تولیدشده — فقط یک‌بار */}
                        {passwordForThis && (
                          <div className="p-3 rounded-xl bg-amber-950/50 border border-amber-500/60 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-bold text-amber-200">رمز عبور جدید (فقط همین یک‌بار نمایش داده می‌شود):</span>
                              <button
                                onClick={async () => {
                                  const ok = await copyToClipboard(passwordForThis);
                                  if (ok) markCopied(`pwd-${request.id}`);
                                }}
                                className="px-2 py-1 rounded-lg bg-amber-500 text-slate-950 text-[10px] font-black flex items-center gap-1"
                              >
                                {copied === `pwd-${request.id}` ? <Check size={11} /> : <Copy size={11} />} کپی رمز
                              </button>
                            </div>
                            <code className="block text-center py-2 rounded-lg bg-black/60 border border-amber-500/40 text-amber-200 font-mono text-sm tracking-widest" dir="ltr">
                              {passwordForThis}
                            </code>
                            <button
                              onClick={async () => {
                                const ok = await copyToClipboard(buildCallScript(request, passwordForThis));
                                if (ok) markCopied(`script-${request.id}`);
                                notify(ok ? 'متن اطلاع‌رسانی تلفنی کپی شد.' : 'کپی متن ناموفق بود.');
                              }}
                              className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-[10px] font-bold flex items-center justify-center gap-1.5"
                            >
                              {copied === `script-${request.id}` ? <Check size={11} /> : <Copy size={11} />}
                              کپی متن آماده اعلام تلفنی
                            </button>
                          </div>
                        )}

                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 font-bold block">
                            یا رمز دلخواه خود را وارد کنید:
                          </label>
                          <input
                            type="text"
                            value={manualPassword}
                            onChange={(e) => setManualPassword(e.target.value)}
                            placeholder="حداقل ۸ کاراکتر شامل حرف و رقم"
                            className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-500 text-xs text-white font-mono"
                            dir="ltr"
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => handleResolve(request)}
                            disabled={busyId === request.id || (!passwordForThis && !manualPassword)}
                            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-[10px] font-black flex items-center gap-1.5"
                          >
                            {busyId === request.id ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                            ثبت رمز روی حساب و بستن درخواست
                          </button>

                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              placeholder="دلیل رد (اختیاری)"
                              className="py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-[10px] text-white"
                            />
                            <button
                              onClick={() => handleReject(request)}
                              disabled={busyId === request.id}
                              className="px-3 py-2 rounded-xl bg-rose-800 hover:bg-rose-700 disabled:opacity-60 text-white text-[10px] font-bold flex items-center gap-1.5"
                            >
                              <XCircle size={12} /> رد درخواست
                            </button>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[9px] text-slate-400 leading-relaxed flex items-start gap-2">
                          <Lock size={12} className="shrink-0 mt-0.5 text-emerald-400" />
                          <span>
                            رمز جدید پیش از ذخیره‌سازی با الگوریتم scrypt هش می‌شود و هیچ‌گاه به‌صورت متن ساده
                            در دیتابیس یا مرورگر باقی نمی‌ماند. پس از ثبت، نشست‌های قبلی کاربر باطل می‌شوند و
                            کاربر در نخستین ورود ملزم به تغییر رمز است.
                          </span>
                        </div>
                      </>
                    )}

                    {request.status === 'rejected' && (
                      <div className="p-2.5 rounded-xl bg-rose-950/50 border border-rose-600/50 text-[10px] text-rose-100 flex items-start gap-2">
                        <Siren size={13} className="shrink-0 mt-0.5" />
                        <span>این درخواست رد شده است. برای فعال‌سازی مجدد، کاربر باید درخواست تازه ثبت کند.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* راهنمای فرآیند */}
      <div className="p-4 rounded-2xl bg-[#080d21] border border-slate-800 space-y-2">
        <h4 className="text-xs font-black text-slate-200 flex items-center gap-2">
          <UserCheck size={14} className="text-cyan-400" /> فرآیند امن بازیابی رمز عبور کاربران
        </h4>
        <ol className="text-[10px] text-slate-400 space-y-1 list-decimal pr-4 leading-relaxed">
          <li>کاربر در صفحه ورود گزینه «فراموشی رمز عبور» را انتخاب و کد ملی + شماره تماس خود را ثبت می‌کند.</li>
          <li>درخواست با کد رهگیری در همین بخش با وضعیت «در انتظار بررسی» نمایش داده می‌شود.</li>
          <li>مدیر با شماره تماس کاربر (دکمه تماس/واتس‌اپ) تماس می‌گیرد و هویت او را احراز می‌کند.</li>
          <li>مدیر رمز جدید را تولید (یا وارد) و روی حساب کاربر ثبت می‌کند؛ رمز فقط یک‌بار در همین صفحه نمایش داده می‌شود.</li>
          <li>مدیر رمز را تلفنی اعلام و درخواست را می‌بندد؛ کاربر در نخستین ورود باید رمز خود را تغییر دهد.</li>
        </ol>
        <p className="text-[9px] text-slate-500">
          کاربر «{currentUser.first_name} {currentUser.last_name}» — دسترسی این بخش فقط برای نقش مدیر کل و با
          نشست امن سرور امکان‌پذیر است.
        </p>
      </div>
    </div>
  );
}
