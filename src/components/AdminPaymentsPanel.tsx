import React, { useState } from 'react';
import { CreditCard, Save, ExternalLink, RefreshCw } from 'lucide-react';
import { PaymentSettings, PaymentTransaction } from '../types';

interface AdminPaymentsPanelProps {
  settings: PaymentSettings;
  setSettings: (value: PaymentSettings) => void;
  transactions: PaymentTransaction[];
  triggerAlert: (message: string) => void;
}

export default function AdminPaymentsPanel({ settings, setSettings, transactions, triggerAlert }: AdminPaymentsPanelProps) {
  const [form, setForm] = useState(settings);

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    const next = { ...form, amount: Math.max(0, Number(form.amount) || 0), updated_at: new Date().toISOString() };
    setSettings(next);
    setForm(next);
    triggerAlert('تنظیمات پرداخت با موفقیت ذخیره شد.');
  };

  return (
    <section className="space-y-5" dir="rtl">
      <div className="flex items-center gap-3">
        <CreditCard className="text-amber-300" />
        <div>
          <h2 className="text-xl font-black text-white">پرداختی‌ها</h2>
          <p className="text-xs text-slate-400">تنظیم مبلغ ثبت‌نام، درگاه و مشاهده تراکنش‌ها</p>
        </div>
      </div>

      <form onSubmit={save} className="grid gap-4 rounded-2xl border border-amber-400/20 bg-slate-950/60 p-5 md:grid-cols-2">
        <label className="flex items-center gap-3 text-sm text-slate-200 md:col-span-2">
          <input type="checkbox" checked={form.enabled} onChange={e => setForm({ ...form, enabled: e.target.checked })} />
          دریافت هزینه ثبت‌نام فعال باشد
        </label>
        <label className="text-xs text-slate-300">مبلغ
          <input className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white" type="number" min="0" value={form.amount} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} />
        </label>
        <label className="text-xs text-slate-300">واحد پول
          <select className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value as 'IRR' | 'IRT' })}>
            <option value="IRR">ریال</option>
            <option value="IRT">تومان</option>
          </select>
        </label>
        <label className="text-xs text-slate-300">درگاه
          <select className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white" value={form.gateway} onChange={e => setForm({ ...form, gateway: e.target.value as PaymentSettings['gateway'] })}>
            <option value="zarinpal">زرین‌پال</option>
            <option value="custom">آدرس سفارشی</option>
          </select>
        </label>
        <label className="text-xs text-slate-300">API Key / Merchant ID
          <input className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white" value={form.api_key} onChange={e => setForm({ ...form, api_key: e.target.value })} placeholder="در محیط production در سرور نگهداری شود" />
        </label>
        <label className="text-xs text-slate-300 md:col-span-2">آدرس هدایت درگاه
          <input className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white" type="url" value={form.redirect_url} onChange={e => setForm({ ...form, redirect_url: e.target.value })} placeholder="https://..." />
        </label>
        <label className="text-xs text-slate-300 md:col-span-2">آدرس بازگشت
          <input className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white" type="url" value={form.callback_url} onChange={e => setForm({ ...form, callback_url: e.target.value })} placeholder="https://.../payment/callback" />
        </label>
        <label className="text-xs text-slate-300 md:col-span-2">شرح پرداخت
          <input className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        </label>
        <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 font-black text-slate-950 md:col-span-2" type="submit"><Save size={17} /> ذخیره تنظیمات</button>
        <p className="text-[11px] leading-6 text-rose-300 md:col-span-2">کلید درگاه را در فرانت‌اند عمومی نگهداری نکنید. برای درخواست واقعی زرین‌پال، API باید در backend اجرا شود.</p>
      </form>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5">
        <div className="mb-4 flex items-center justify-between"><h3 className="font-black text-white">تراکنش‌ها</h3><RefreshCw size={16} className="text-slate-500" /></div>
        <div className="space-y-2">
          {transactions.length === 0 && <p className="text-sm text-slate-500">تراکنشی ثبت نشده است.</p>}
          {transactions.map(transaction => (
            <div key={transaction.id} className="grid gap-2 rounded-xl border border-slate-800 p-3 text-xs text-slate-300 md:grid-cols-5">
              <span>{transaction.full_name || transaction.national_code}</span><span>{transaction.amount.toLocaleString()} {transaction.currency}</span><span>{transaction.gateway}</span><span>{transaction.status}</span>
              {transaction.payment_url ? <a className="inline-flex items-center gap-1 text-cyan-300" href={transaction.payment_url} target="_blank" rel="noreferrer">درگاه <ExternalLink size={13} /></a> : <span>-</span>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
