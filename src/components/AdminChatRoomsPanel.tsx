import React, { useEffect, useMemo, useState } from 'react';
import { MessageCircle, Send, Users, RefreshCw, ShieldCheck } from 'lucide-react';
import { Group, GroupChatMessage, User } from '../types';
import {
  appendGroupChatMessage,
  ensureGroupChatRoom,
  listGroupChatMessages,
  subscribeGroupChat,
} from '../lib/groupChatService';

interface AdminChatRoomsPanelProps {
  currentUser: User;
  groups: Group[];
  users: User[];
}

export default function AdminChatRoomsPanel({ currentUser, groups, users }: AdminChatRoomsPanelProps) {
  const groupOptions = useMemo(() => groups.filter(group => Boolean(group.id)), [groups]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [messages, setMessages] = useState<GroupChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!selectedGroupId && groupOptions[0]) setSelectedGroupId(groupOptions[0].id);
    if (selectedGroupId && !groupOptions.some(group => group.id === selectedGroupId)) {
      setSelectedGroupId(groupOptions[0]?.id || '');
    }
  }, [groupOptions, selectedGroupId]);

  const selectedGroup = groupOptions.find(group => group.id === selectedGroupId) || null;
  const memberIds = users.filter(user => user.group_id === selectedGroupId).map(user => user.id);
  const [room, setRoom] = useState<ReturnType<typeof ensureGroupChatRoom> | null>(null);

  useEffect(() => {
    if (!selectedGroup) {
      setRoom(null);
      return;
    }
    try {
      setRoom(ensureGroupChatRoom(selectedGroup.id, selectedGroup.name, memberIds));
    } catch (error) {
      console.warn('[WarRoom Admin Chat] ایجاد روم ناموفق بود:', error);
      setRoom(null);
    }
  }, [selectedGroup?.id, selectedGroup?.name, memberIds.join(',')]);

  useEffect(() => {
    if (!room) {
      setMessages([]);
      return;
    }
    setMessages(listGroupChatMessages(room.id));
    return subscribeGroupChat(room.id, setMessages);
  }, [room?.id, refreshKey]);

  const sendMessage = (event: React.FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!room || !selectedGroup || !text) return;
    appendGroupChatMessage({
      roomId: room.id,
      groupId: selectedGroup.id,
      userId: currentUser.id,
      userName: `${currentUser.first_name} ${currentUser.last_name} (مدیریت)`,
      avatarUrl: currentUser.avatar_url,
      text,
      isSystem: false,
    });
    setDraft('');
  };

  return (
    <section className="grid min-h-[620px] overflow-hidden rounded-3xl border border-cyan-500/25 bg-[#070d1f]/95 shadow-2xl lg:grid-cols-[280px_1fr]" dir="rtl">
      <aside className="border-b border-slate-800 bg-slate-950/70 lg:border-b-0 lg:border-l">
        <div className="flex items-center justify-between border-b border-slate-800 p-4">
          <div>
            <h2 className="font-black text-white">روم‌های گروهی</h2>
            <p className="mt-1 text-[11px] text-slate-400">{groupOptions.length} گروه فعال</p>
          </div>
          <button type="button" onClick={() => setRefreshKey(value => value + 1)} className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:border-cyan-400 hover:text-cyan-300" title="تازه‌سازی روم‌ها">
            <RefreshCw size={15} />
          </button>
        </div>
        <div className="max-h-[520px] space-y-2 overflow-y-auto p-3">
          {groupOptions.length === 0 ? <p className="p-4 text-center text-xs text-slate-500">هنوز گروهی ثبت نشده است.</p> : groupOptions.map(group => {
            const count = users.filter(user => user.group_id === group.id).length || group.members_count || 0;
            return (
              <button key={group.id} type="button" onClick={() => setSelectedGroupId(group.id)} className={`w-full rounded-2xl border p-3 text-right transition ${selectedGroupId === group.id ? 'border-cyan-400/60 bg-cyan-500/15' : 'border-slate-800 bg-slate-900/60 hover:border-slate-600'}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-black text-white">{group.name}</span>
                  <MessageCircle size={15} className={selectedGroupId === group.id ? 'text-cyan-300' : 'text-slate-500'} />
                </div>
                <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-400"><Users size={12} /> {count} / {group.max_members || 4} عضو</div>
              </button>
            );
          })}
        </div>
      </aside>

      <div className="flex min-h-[620px] flex-col">
        {!selectedGroup || !room ? (
          <div className="flex flex-1 items-center justify-center text-sm text-slate-500">یک گروه را برای ورود به روم انتخاب کنید.</div>
        ) : (
          <>
            <header className="flex items-center justify-between border-b border-slate-800 bg-cyan-500/5 p-4">
              <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300"><MessageCircle size={20} /></span><div><h3 className="font-black text-white">{selectedGroup?.name || 'گروه انتخاب شده'}</h3><p className="mt-1 text-[10px] text-slate-400">روم زنده گروه · {memberIds.length} عضو متصل به گروه</p></div></div>
              <div className="flex items-center gap-1 text-[10px] text-emerald-300"><ShieldCheck size={14} /> Realtime</div>
            </header>
            <div className="flex-1 space-y-3 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.08),_transparent_45%)] p-5">
              {messages.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-xs text-slate-500">این روم هنوز پیامی ندارد.</div> : messages.map(message => <div key={message.id} className="rounded-2xl border border-slate-800 bg-slate-900/75 p-3"><div className="mb-1 flex items-center justify-between gap-3"><span className="text-xs font-bold text-cyan-300">{message.user_name}</span><span className="text-[10px] text-slate-500">{new Date(message.created_at).toLocaleString('fa-IR')}</span></div><p className="whitespace-pre-wrap text-sm leading-7 text-slate-200">{message.text}</p></div>)}
            </div>
            <form onSubmit={sendMessage} className="flex gap-2 border-t border-slate-800 bg-slate-950/80 p-4"><input value={draft} onChange={event => setDraft(event.target.value)} placeholder="پیام مدیریت برای این گروه..." className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400" /><button type="submit" className="flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300"><Send size={16} /> ارسال</button></form>
          </>
        )}
      </div>
    </section>
  );
}
