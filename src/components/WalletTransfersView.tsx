import React, { useMemo, useState } from 'react';
import { ArrowLeftRight, History, Send, WalletCards } from 'lucide-react';
import { PointTransfer, User, WalletTransaction } from '../types';

interface WalletTransfersViewProps {
  currentUser: User;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  transactions: WalletTransaction[];
  setTransactions: React.Dispatch<React.SetStateAction<WalletTransaction[]>>;
  transfers: PointTransfer[];
  setTransfers: React.Dispatch<React.SetStateAction<PointTransfer[]>>;
  triggerAlert: (message: string) => void;
}

export default function WalletTransfersView({
  currentUser,
  users,
  setUsers,
  transactions,
  setTransactions,
  transfers,
  setTransfers,
  triggerAlert,
}: WalletTransfersViewProps) {
  const [receiverId, setReceiverId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const receiver = users.find(user => user.id === receiverId || user.personal_code === receiverId);
  const balance = currentUser.points || 0;
  const recentTransactions = useMemo(
    () => transactions.filter(item => item.user_id === currentUser.id).slice(0, 20),
    [currentUser.id, transactions]
  );

  const submitTransfer = (event: React.FormEvent) => {
    event.preventDefault();
    const points = Number(amount);
    if (!receiver || receiver.id === currentUser.id) {
      triggerAlert('شناسه کاربری دریافت‌کننده معتبر نیست.');
      return;
    }
    if (!Number.isInteger(points) || points <= 0 || points > balance) {
      triggerAlert('مقدار امتیاز باید مثبت و کمتر از موجودی شما باشد.');
      return;
    }

    const transferId = `transfer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const createdAt = new Date().toISOString();
    const transfer: PointTransfer = {
      id: transferId,
      sender_user_id: currentUser.id,
      receiver_user_id: receiver.id,
      amount: points,
      status: 'completed',
      note: note.trim() || undefined,
      created_at: createdAt,
      completed_at: createdAt,
    };
    const outgoing: WalletTransaction = {
      id: `wallet_out_${transferId}`,
      user_id: currentUser.id,
      group_id: currentUser.group_id,
      transaction_type: 'transfer_out',
      amount: points,
      currency: 'points',
      status: 'completed',
      reference_id: transferId,
      description: note.trim() || `انتقال به ${receiver.first_name} ${receiver.last_name}`,
      created_at: createdAt,
    };
    const incoming: WalletTransaction = {
      ...outgoing,
      id: `wallet_in_${transferId}`,
      user_id: receiver.id,
      transaction_type: 'transfer_in',
      description: note.trim() || `دریافت از ${currentUser.first_name} ${currentUser.last_name}`,
    };

    setTransfers(previous => [transfer, ...previous]);
    setTransactions(previous => [outgoing, incoming, ...previous]);
    setUsers(previous => previous.map(user => {
      if (user.id === currentUser.id) return { ...user, points: (user.points || 0) - points };
      if (user.id === receiver.id) return { ...user, points: (user.points || 0) + points };
      return user;
    }));
    setAmount('');
    setReceiverId('');
    setNote('');
    triggerAlert(`انتقال ${points.toLocaleString('fa-IR')} امتیاز با موفقیت ثبت شد.`);
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 dir-rtl">
      <header className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-500/10 text-cyan-300"><WalletCards size={24} /></div>
        <div><h1 className="text-xl font-black text-white">تراکنش‌ها و پرداختی‌ها</h1><p className="text-xs text-slate-400">مدیریت موجودی و انتقال امتیاز با شناسه کاربری</p></div>
      </header>

      <div className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
        <section className="rounded-2xl border border-cyan-500/25 bg-slate-950/70 p-4">
          <div className="mb-4 flex items-center justify-between"><span className="text-xs text-slate-400">موجودی امتیاز</span><span className="text-2xl font-black text-cyan-300">{balance.toLocaleString('fa-IR')}</span></div>
          <form onSubmit={submitTransfer} className="space-y-3">
            <label className="block text-xs font-bold text-slate-300">شناسه کاربری دریافت‌کننده<input value={receiverId} onChange={event => setReceiverId(event.target.value)} placeholder="کد اختصاصی یا شناسه کاربر" className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400" required /></label>
            {receiver && <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2 text-xs text-emerald-300">{receiver.first_name} {receiver.last_name}، کد {receiver.personal_code}</div>}
            <label className="block text-xs font-bold text-slate-300">مقدار امتیاز<input type="number" min="1" max={balance} value={amount} onChange={event => setAmount(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400" required /></label>
            <label className="block text-xs font-bold text-slate-300">یادداشت اختیاری<textarea value={note} onChange={event => setNote(event.target.value)} rows={2} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400" /></label>
            <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-3 py-2.5 text-sm font-black text-slate-950"><Send size={16} /> انتقال امتیاز</button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-black text-white"><History size={17} className="text-amber-300" /> سابقه تراکنش‌های من</div>
          <div className="space-y-2">
            {recentTransactions.length === 0 ? <p className="py-8 text-center text-xs text-slate-500">تراکنشی ثبت نشده است.</p> : recentTransactions.map(item => <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-xs"><div><div className="font-bold text-slate-200">{item.description || item.transaction_type}</div><div className="mt-1 text-[10px] text-slate-500">{new Date(item.created_at).toLocaleString('fa-IR')}</div></div><span className={item.transaction_type === 'transfer_out' ? 'text-rose-300' : 'text-emerald-300'}>{item.transaction_type === 'transfer_out' ? '-' : '+'}{item.amount.toLocaleString('fa-IR')}</span></div>)}
          </div>
        </section>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-500"><ArrowLeftRight size={14} /> انتقال‌ها در نسخهٔ فعلی در state برنامه ثبت می‌شوند؛ اتصال نهایی به RPC امن Supabase باید از سمت server انجام شود.</div>
    </div>
  );
}
