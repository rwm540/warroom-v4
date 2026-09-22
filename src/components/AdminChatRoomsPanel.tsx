import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  MessageCircle,
  Send,
  Users,
  RefreshCw,
  Trash2,
  AlertTriangle,
  Radio,
  Search,
  Building2,
  Swords,
  Crown,
  X,
  Shield,
  Layers
} from 'lucide-react';
import { Group, GroupChatMessage, User } from '../types';
import {
  appendGroupChatMessage,
  deleteGroupChatMessage,
  ensureGroupChatRoom,
  getCanonicalRoomId,
  listAllGroupChatMessages,
  listGroupChatMessages,
  subscribeGlobalChat,
  subscribeGroupChat,
} from '../lib/groupChatService';
import { isSupabaseEnabled, supabase } from '../lib/supabaseData';
import { logAudit } from '../lib/auditLogger';

interface AdminChatRoomsPanelProps {
  currentUser: User;
  groups: Group[];
  setGroups?: React.Dispatch<React.SetStateAction<Group[]>>;
  users: User[];
  setUsers?: React.Dispatch<React.SetStateAction<User[]>>;
  triggerAlert?: (msg: string) => void;
}

export default function AdminChatRoomsPanel({
  currentUser,
  groups,
  setGroups,
  users,
  setUsers,
  triggerAlert,
}: AdminChatRoomsPanelProps) {
  // Target Room Selection: 'global_feed' | 'general_headquarters' | squadId
  const [selectedTarget, setSelectedTarget] = useState<string>('global_feed');
  const [messages, setMessages] = useState<GroupChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [messageFilter, setMessageFilter] = useState('');
  const [squadToDelete, setSquadToDelete] = useState<Group | null>(null);
  const [isDeletingSquad, setIsDeletingSquad] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Valid groups list
  const validGroups = useMemo(() => groups.filter(g => Boolean(g?.id)), [groups]);

  // Current squad object if in squad mode
  const currentSquad = useMemo(() => {
    if (selectedTarget === 'global_feed' || selectedTarget === 'general_headquarters') return null;
    return validGroups.find(g => g.id === selectedTarget) || null;
  }, [selectedTarget, validGroups]);

  // Members of currently selected squad
  const squadMembers = useMemo(() => {
    if (!currentSquad) return [];
    return users.filter(u => u.group_id === currentSquad.id);
  }, [currentSquad, users]);

  // Leader of currently selected squad
  const squadLeader = useMemo(() => {
    if (!currentSquad) return null;
    return users.find(u => u.id === currentSquad.leader_id);
  }, [currentSquad, users]);

  // Scroll to bottom smoothly on message update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Real-time synchronization according to selected room mode
  useEffect(() => {
    if (selectedTarget === 'global_feed') {
      // Global feed showing all messages across squads and general headquarters
      setMessages(listAllGroupChatMessages());
      const unsub = subscribeGlobalChat(setMessages);
      return () => unsub();
    }

    if (selectedTarget === 'general_headquarters') {
      // General Headquarters room
      const roomId = 'room_general_headquarters';
      ensureGroupChatRoom('general_headquarters', 'روم عمومی ستاد کل اتاق جنگ', users.map(u => u.id));
      setMessages(listGroupChatMessages(roomId));
      const unsub = subscribeGroupChat(roomId, setMessages);
      return () => unsub();
    }

    // Specific squad room
    if (currentSquad) {
      const memberIds = squadMembers.map(u => u.id);
      ensureGroupChatRoom(currentSquad.id, currentSquad.name, memberIds.length ? memberIds : [currentUser.id]);
      const roomId = `room_${currentSquad.id}`;
      setMessages(listGroupChatMessages(roomId));
      const unsub = subscribeGroupChat(roomId, setMessages);
      return () => unsub();
    }
  }, [selectedTarget, currentSquad?.id, refreshKey]);

  // Send message as commander/admin
  const handleSendMessage = (event: React.FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;

    let targetRoomId = 'room_general_headquarters';
    let targetGroupId = 'general_headquarters';

    if (selectedTarget === 'global_feed') {
      targetRoomId = 'room_general_headquarters';
      targetGroupId = 'general_headquarters';
    } else if (selectedTarget === 'general_headquarters') {
      targetRoomId = 'room_general_headquarters';
      targetGroupId = 'general_headquarters';
    } else if (currentSquad) {
      targetRoomId = `room_${currentSquad.id}`;
      targetGroupId = currentSquad.id;
    }

    appendGroupChatMessage({
      roomId: targetRoomId,
      groupId: targetGroupId,
      userId: currentUser.id,
      userName: `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim() || 'فرماندهی کل (مدیریت)',
      avatarUrl: currentUser.avatar_url,
      text,
      isSystem: false,
    });

    setDraft('');
  };

  // Delete message as admin
  const handleDeleteMessage = (message: GroupChatMessage) => {
    deleteGroupChatMessage(message.room_id || message.group_id, message.id);
    if (triggerAlert) {
      triggerAlert('پیام مورد نظر با موفقیت حذف گردید.');
    }
  };

  // Delete and dissolve squad
  const handleConfirmDeleteSquad = async () => {
    if (!squadToDelete) return;
    setIsDeletingSquad(true);

    try {
      const targetSquadId = squadToDelete.id;
      const squadName = squadToDelete.name || 'جوخه';

      // 1. Delete from Supabase
      if (isSupabaseEnabled && supabase) {
        await supabase.from('warroom_groups').delete().eq('id', targetSquadId);
        await supabase
          .from('warroom_users')
          .update({ 'data->group_id': null, 'data->is_group_member': false })
          .eq('data->>group_id', targetSquadId);
      }

      // 2. Update client users state
      if (setUsers) {
        setUsers(prevUsers =>
          prevUsers.map(u =>
            u.group_id === targetSquadId ? { ...u, group_id: undefined, is_group_member: false } : u
          )
        );
      }

      // 3. Update client groups state
      if (setGroups) {
        setGroups(prevGroups => prevGroups.filter(g => g.id !== targetSquadId));
      }

      // 4. Audit log
      void logAudit({
        event: 'group.deleted_by_admin',
        level: 'security',
        source: 'client',
        actorId: currentUser.id,
        metadata: { squadId: targetSquadId, squadName },
      });

      setSelectedTarget('general_headquarters');
      setSquadToDelete(null);

      if (triggerAlert) {
        triggerAlert(`جوخه «${squadName}» با موفقیت منحل و تمام اعضای آن آزاد شدند.`);
      }
    } catch (err) {
      console.error('[WarRoom Admin Chat] خطا در انحلال جوخه:', err);
      if (triggerAlert) {
        triggerAlert('خطا در انحلال جوخه. مجدداً تلاش نمایید.');
      }
    } finally {
      setIsDeletingSquad(false);
    }
  };

  // Helper to find group name for a message in global feed
  const getGroupNameForMessage = (message: GroupChatMessage) => {
    const canonical = getCanonicalRoomId(message.room_id || message.group_id);
    if (canonical === 'general_headquarters') return 'ستاد کل';
    const found = validGroups.find(g => g.id === canonical);
    return found ? found.name : 'جوخه رزمندگان';
  };

  // Filter messages by search text
  const displayedMessages = useMemo(() => {
    const q = messageFilter.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter(
      m =>
        (m.text || '').toLowerCase().includes(q) ||
        (m.user_name || '').toLowerCase().includes(q)
    );
  }, [messages, messageFilter]);

  return (
    <div className="space-y-4 dir-rtl" dir="rtl">
      {/* 1. Tactical Studio Header Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-cyan-950/70 via-slate-900 to-sky-950/60 border border-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.15)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center text-cyan-300 shadow-inner shrink-0">
            <MessageCircle size={24} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-white">مرکز فرماندهی و مانیتورینگ چت روم‌ها</h3>
              <span className="bg-emerald-950 text-emerald-300 text-[10px] font-mono px-2 py-0.5 rounded-full border border-emerald-500/40 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                اتصال بلادرنگ برخط
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              رصد زنده کلیه مکالمات رزمندگان با یکدیگر، گفت‌وگو در جوخه‌ها، نظارت بر پیام‌ها و امکان انحلال جوخه‌ها
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300">
            <Swords size={13} className="text-amber-400" />
            <span>{validGroups.length} جوخه فعال</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300">
            <Users size={13} className="text-cyan-400" />
            <span>{users.length} رزمنده</span>
          </div>
          <button
            type="button"
            onClick={() => setRefreshKey(k => k + 1)}
            className="p-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 transition"
            title="تازه‌سازی جریان داده"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* 2. Tactical Room Selector Toolbar */}
      <div className="p-2 sm:p-2.5 rounded-2xl bg-slate-950/90 border border-cyan-500/25 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Button: Global Monitoring Feed */}
          <button
            type="button"
            onClick={() => setSelectedTarget('global_feed')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition border ${
              selectedTarget === 'global_feed'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.35)]'
                : 'bg-slate-900/80 text-amber-300 border-amber-500/30 hover:bg-amber-500/10'
            }`}
          >
            <Radio size={14} className={selectedTarget === 'global_feed' ? 'animate-pulse' : ''} />
            <span>فید جامع کلیه مکالمات (مانیتورینگ تمام رزمندگان)</span>
          </button>

          {/* Button: General Headquarters Room */}
          <button
            type="button"
            onClick={() => setSelectedTarget('general_headquarters')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition border ${
              selectedTarget === 'general_headquarters'
                ? 'bg-gradient-to-r from-cyan-500 to-sky-500 text-slate-950 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.35)]'
                : 'bg-slate-900/80 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/10'
            }`}
          >
            <Building2 size={14} />
            <span>روم عمومی ستاد کل</span>
          </button>
        </div>

        {/* Squads Dropdown Selector */}
        <div className="flex items-center gap-2 flex-1 sm:flex-initial min-w-[240px]">
          <div className="relative w-full">
            <select
              value={selectedTarget.startsWith('global') || selectedTarget === 'general_headquarters' ? '' : selectedTarget}
              onChange={e => {
                if (e.target.value) {
                  setSelectedTarget(e.target.value);
                }
              }}
              className="w-full rounded-xl border border-slate-700 bg-slate-900/90 py-2 pr-8 pl-3 text-xs font-bold text-white outline-none transition focus:border-cyan-400"
            >
              <option value="" disabled>
                -- انتخاب جوخه رزمندگان ({validGroups.length} جوخه) --
              </option>
              {validGroups.map(group => {
                const count = users.filter(u => u.group_id === group.id).length || group.members_count || 0;
                const leader = users.find(u => u.id === group.leader_id);
                return (
                  <option key={group.id} value={group.id} className="bg-slate-900 text-white">
                    {group.name} ({count}/4 عضو) {leader ? `— سرگروه: ${leader.first_name} ${leader.last_name}` : ''}
                  </option>
                );
              })}
            </select>
            <Swords size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-cyan-400 pointer-events-none" />
          </div>

          {/* Delete Squad Button (Visible if a squad is active) */}
          {currentSquad && (
            <button
              type="button"
              onClick={() => setSquadToDelete(currentSquad)}
              className="flex items-center gap-1.5 rounded-xl border border-rose-500/50 bg-rose-500/20 px-3 py-2 text-xs font-black text-rose-200 transition hover:bg-rose-500/30 shrink-0 shadow-[0_0_12px_rgba(244,63,94,0.25)]"
              title="حذف و انحلال کامل این جوخه"
            >
              <Trash2 size={14} className="text-rose-400" />
              <span>انحلال جوخه</span>
            </button>
          )}
        </div>
      </div>

      {/* Selected Squad Info Bar (if viewing a squad) */}
      {currentSquad && (
        <div className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-950/40 via-slate-900/60 to-transparent border border-cyan-500/30 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-black text-white text-sm flex items-center gap-1.5">
              <Swords size={15} className="text-cyan-400" />
              <span>جوخه «{currentSquad.name}»</span>
            </span>
            {squadLeader && (
              <span className="flex items-center gap-1 text-slate-300">
                <Crown size={12} className="text-amber-400" />
                <span>سرگروه: {squadLeader.first_name} {squadLeader.last_name}</span>
              </span>
            )}
            <span className="flex items-center gap-1 text-slate-400">
              <Users size={12} className="text-cyan-400" />
              <span>{squadMembers.length} رزمنده فعال</span>
            </span>
          </div>

          <div className="text-[11px] text-slate-400">
            رصد و چت مستقیم در اتاق اختصاصی این جوخه
          </div>
        </div>
      )}

      {/* 3. Main Chat Panel (Styled exactly identical to GroupChatPanel) */}
      <div className="relative flex flex-col h-[560px] sm:h-[620px] w-full rounded-2xl sm:rounded-3xl overflow-hidden border border-cyan-500/40 bg-[#070d1f] shadow-2xl">
        {/* Chat Top Header */}
        <div className="flex h-14 items-center justify-between shrink-0 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-500/15 via-sky-500/5 to-transparent px-3 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.3)]">
              {selectedTarget === 'global_feed' ? (
                <Radio size={17} className="text-amber-400" />
              ) : selectedTarget === 'general_headquarters' ? (
                <Building2 size={17} />
              ) : (
                <Swords size={17} />
              )}
            </span>
            <div className="min-w-0">
              <div className="text-[12px] font-black text-white flex items-center gap-1.5">
                <span>
                  {selectedTarget === 'global_feed'
                    ? 'فید جامع کلیه مکالمات سامانه'
                    : selectedTarget === 'general_headquarters'
                    ? 'روم عمومی ستاد کل اتاق جنگ'
                    : currentSquad?.name || 'چت روم جوخه'}
                </span>
                {selectedTarget === 'global_feed' && (
                  <span className="text-[9px] font-normal bg-amber-950/80 border border-amber-800 text-amber-300 px-1.5 py-0.2 rounded">
                    رصد تمام چت‌ها
                  </span>
                )}
                {selectedTarget === 'general_headquarters' && (
                  <span className="text-[9px] font-normal bg-cyan-950/80 border border-cyan-800 text-cyan-300 px-1.5 py-0.2 rounded">
                    عمومی
                  </span>
                )}
                <span
                  className="flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-950/60 px-1.5 py-0.5 text-[8px] font-bold text-emerald-400"
                  title="اتصال بلادرنگ فعال است"
                >
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                  </span>
                  <span>زنده</span>
                </span>
              </div>
              <div className="truncate text-[10px] text-slate-400">
                {selectedTarget === 'global_feed'
                  ? `${displayedMessages.length} پیام ثبتی • رصد همزمان تمام کاربران با یکدیگر`
                  : selectedTarget === 'general_headquarters'
                  ? `${users.length} رزمنده متصل • پیام‌های ستاد کل`
                  : `${squadMembers.length} رزمنده در جوخه • نظارت اتاق ادمین`}
              </div>
            </div>
          </div>

          {/* Quick Search within Messages */}
          <div className="flex items-center gap-2">
            <div className="relative hidden sm:flex items-center">
              <Search size={13} className="absolute right-2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={messageFilter}
                onChange={e => setMessageFilter(e.target.value)}
                placeholder="جستجو در پیام‌ها..."
                className="w-36 rounded-lg border border-slate-700 bg-slate-900/90 py-1 pr-7 pl-2 text-[10px] text-white outline-none focus:border-cyan-400 placeholder:text-slate-500"
              />
              {messageFilter && (
                <button
                  type="button"
                  onClick={() => setMessageFilter('')}
                  className="absolute left-1.5 text-slate-400 hover:text-white"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Messages Scroll Area (Identical background gradient & padding to GroupChatPanel) */}
        <div className="flex-1 space-y-2.5 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.06),_transparent_40%)] p-3 min-h-0">
          {displayedMessages.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-6 text-center text-xs leading-6 text-slate-400">
              {messageFilter ? 'هیچ پیامی منطبق با جستجوی شما یافت نشد.' : 'هنوز پیامی در این اتاق ثبت نشده است.'}
            </div>
          ) : (
            displayedMessages.map(message => {
              const isMine = message.user_id === currentUser.id;
              const squadLabel = selectedTarget === 'global_feed' ? getGroupNameForMessage(message) : null;

              return (
                <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl border p-2.5 shadow-md ${
                      isMine
                        ? 'border-cyan-500/40 bg-gradient-to-br from-cyan-500/15 to-sky-500/5'
                        : 'border-slate-800 bg-slate-900/80'
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between gap-3 text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-200">{message.user_name}</span>
                        {isMine && (
                          <span className="rounded bg-cyan-950/90 border border-cyan-800 text-cyan-300 px-1 py-0.2 text-[8px] font-bold">
                            فرماندهی ستاد
                          </span>
                        )}
                        {squadLabel && !isMine && (
                          <span className="rounded bg-amber-950/80 border border-amber-800/80 text-amber-300 px-1.5 py-0.2 text-[8px] font-bold flex items-center gap-0.5">
                            <Layers size={9} />
                            <span>{squadLabel}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-mono">
                          {new Date(message.created_at).toLocaleTimeString('fa-IR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {/* Admin Delete Message Button for any message */}
                        <button
                          type="button"
                          onClick={() => handleDeleteMessage(message)}
                          className="rounded-md p-1 text-slate-500 transition hover:bg-rose-500/15 hover:text-rose-300"
                          title="حذف این پیام توسط ادمین"
                          aria-label="حذف پیام"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    <p className="text-[12px] leading-6 text-slate-100 whitespace-pre-wrap">{message.text}</p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Message Form (Identical to GroupChatPanel) */}
        <form onSubmit={handleSendMessage} className="flex h-14 items-center gap-2 shrink-0 border-t border-slate-800 bg-slate-950/90 p-2.5">
          <input
            value={draft}
            onChange={event => setDraft(event.target.value)}
            placeholder={
              selectedTarget === 'global_feed'
                ? 'ارسال پیام از جایگاه ستاد به فید سامانه...'
                : selectedTarget === 'general_headquarters'
                ? 'ارسال پیام در روم عمومی ستاد کل...'
                : `ارسال پیام مستقیم به رزمندگان ${currentSquad?.name || 'جوخه'}...`
            }
            className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none transition focus:border-cyan-500 focus:shadow-[0_0_0_2px_rgba(34,211,238,0.15)]"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.45)] transition hover:brightness-110 disabled:opacity-40 disabled:hover:brightness-100"
            aria-label="ارسال پیام"
          >
            <Send size={16} />
          </button>
        </form>
      </div>

      {/* Delete Squad Confirmation Modal */}
      {squadToDelete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-rose-500/50 bg-[#070e24] p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/20 border border-rose-500/40">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-base font-black text-white">تأیید انحلال و حذف کامل جوخه</h3>
                <p className="text-xs text-rose-300/80">عملیات غیرقابل بازگشت ادمین</p>
              </div>
            </div>

            <p className="text-xs leading-6 text-slate-300">
              آیا از انحلال کامل جوخه <strong className="text-amber-300">«{squadToDelete.name}»</strong> اطمینان دارید؟ با تأیید این دستور، تمام رزمندگان عضو این جوخه آزاد شده و پرونده جوخه از دیتابیس سامانه حذف خواهد شد.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeletingSquad}
                onClick={() => setSquadToDelete(null)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-bold text-slate-300 transition hover:bg-slate-800"
              >
                انصراف
              </button>
              <button
                type="button"
                disabled={isDeletingSquad}
                onClick={handleConfirmDeleteSquad}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-black text-white shadow-lg transition hover:bg-rose-500 disabled:opacity-50"
              >
                <Trash2 size={14} />
                <span>{isDeletingSquad ? 'در حال انحلال...' : 'تأیید و انحلال جوخه'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
