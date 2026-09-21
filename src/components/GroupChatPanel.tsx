import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, GripVertical, Menu, MessageCircle, Pencil, Search, Send, ShieldCheck, Trash2, UserPlus, Users, X } from 'lucide-react';
import { Group, GroupJoinRequest, User } from '../types';
import { appendGroupChatMessage, deleteGroupChatMessage, editGroupChatMessage, ensureGroupChatRoom, getGroupChatStats, listGroupChatMessages, subscribeGroupChat } from '../lib/groupChatService';

interface GroupChatPanelProps {
  currentUser: User | null;
  users: User[];
  setUsers?: React.Dispatch<React.SetStateAction<User[]>>;
  setGroups?: React.Dispatch<React.SetStateAction<Group[]>>;
  groups?: Group[];
  groupJoinRequests?: GroupJoinRequest[];
  setGroupJoinRequests?: React.Dispatch<React.SetStateAction<GroupJoinRequest[]>>;
  isAdminMode?: boolean;
  mobileMode?: boolean;
  isModal?: boolean;
  onClose?: () => void;
  onOpenSquadModal?: () => void;
}

export default function GroupChatPanel({ 
  currentUser, 
  users, 
  setUsers, 
  setGroups, 
  groups = [], 
  groupJoinRequests = [], 
  setGroupJoinRequests, 
  isAdminMode = false, 
  mobileMode = false, 
  isModal = false,
  onClose,
  onOpenSquadModal 
}: GroupChatPanelProps) {
  const isAdminUser = currentUser?.role === 'admin';
  const adminGroupOptions = useMemo(
    () => groups.filter(group => Boolean(group?.id)).map(group => ({ id: group.id, name: group.name })),
    [groups]
  );

  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const syncedUserGroupId = currentUser?.group_id || users.find(user => user.id === currentUser?.id)?.group_id || '';

  const activeUserId = currentUser?.id || 'guest';
  const activeUserName = currentUser ? `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim() || 'رزمنده' : 'کاربر مهمان';

  // Room determination with fallback to General Headquarters room
  const effectiveGroupId = useMemo(() => {
    if (isAdminMode || isAdminUser) {
      return selectedGroupId || syncedUserGroupId || 'general_headquarters';
    }
    if (selectedGroupId) return selectedGroupId;
    return syncedUserGroupId || 'general_headquarters';
  }, [isAdminMode, isAdminUser, selectedGroupId, syncedUserGroupId]);

  const effectiveGroupName = useMemo(() => {
    if (effectiveGroupId === 'general_headquarters') {
      return 'روم عمومی ستاد کل اتاق جنگ';
    }
    const found = groups.find(group => group.id === effectiveGroupId);
    if (found) return found.name;
    if (effectiveGroupId === syncedUserGroupId) return 'جوخه عملیاتی من';
    return 'چت گروهی';
  }, [effectiveGroupId, groups, syncedUserGroupId]);

  const memberIds = useMemo(() => {
    if (effectiveGroupId === 'general_headquarters') {
      return users.map(user => user.id);
    }
    return users.filter(user => user.group_id === effectiveGroupId).map(user => user.id);
  }, [effectiveGroupId, users]);

  const room = useMemo(() => {
    return ensureGroupChatRoom(
      effectiveGroupId, 
      effectiveGroupName, 
      memberIds.length ? memberIds : [activeUserId]
    );
  }, [effectiveGroupId, effectiveGroupName, memberIds, activeUserId]);

  const [messages, setMessages] = useState<any[]>([]);
  const [draft, setDraft] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isGroupMenuOpen, setIsGroupMenuOpen] = useState(false);
  const [groupSearch, setGroupSearch] = useState('');
  const [groupPage, setGroupPage] = useState(0);

  useEffect(() => {
    setGroupPage(0);
  }, [groupSearch]);

  const layoutStorageKey = `warroom_chat_layout_${currentUser?.id || 'guest'}`;
  const defaultPosition = () => ({
    left: typeof window === 'undefined' ? 20 : Math.max(16, window.innerWidth - 388),
    top: 110,
  });
  const [position, setPosition] = useState<{ left: number; top: number } | null>(() => {
    if (typeof window === 'undefined') return { left: 20, top: 110 };
    try {
      const saved = JSON.parse(localStorage.getItem(layoutStorageKey) || 'null');
      if (saved?.position && Number.isFinite(saved.position.left) && Number.isFinite(saved.position.top)) {
        return saved.position;
      }
    } catch {}
    return defaultPosition();
  });
  const [size, setSize] = useState<{ width: number; height: number }>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = JSON.parse(localStorage.getItem(layoutStorageKey) || 'null');
        if (saved?.size && Number.isFinite(saved.size.width) && Number.isFinite(saved.size.height)) {
          return saved.size;
        }
      } catch {}
    }
    return { width: 360, height: 470 };
  });

  useEffect(() => {
    if (mobileMode || typeof window === 'undefined') return;
    try {
      localStorage.setItem(layoutStorageKey, JSON.stringify({ position: position || defaultPosition(), size }));
    } catch {}
  }, [layoutStorageKey, mobileMode, position, size]);
  const interactionState = useRef<{
    type: 'drag' | 'resize';
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
    startWidth: number;
    startHeight: number;
    edge?: 'right' | 'left' | 'top' | 'bottom' | 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  } | null>(null);

  useEffect(() => {
    if (!room) return;
    setMessages(listGroupChatMessages(room.id));
    const unsub = subscribeGroupChat(room.id, setMessages);
    return () => unsub();
  }, [room]);

  const stats = room ? getGroupChatStats(effectiveGroupId, users) : { totalMessages: 0, activeMembers: 0, engagementScore: 0 };
  const currentGroup = groups.find(group => group.id === syncedUserGroupId);
  const canRegisterSquadMember = Boolean(currentUser && (currentUser.role === 'leader' || currentGroup?.leader_id === currentUser.id));
  const pendingIncoming = groupJoinRequests.filter(request => request.target_group_id === currentUser?.group_id && request.status === 'pending');
  const matchingGroups = groups.filter(group => group.id !== currentUser?.group_id && group.status !== 'merged' && group.name.toLowerCase().includes(groupSearch.trim().toLowerCase()));
  const visibleGroups = matchingGroups.slice(0, (groupPage + 1) * 5);

  const sendGroupRequest = (targetGroup: Group) => {
    if (!currentUser || !setGroupJoinRequests || groupJoinRequests.some(request => request.requester_id === currentUser.id && request.target_group_id === targetGroup.id && request.status === 'pending')) return;
    setGroupJoinRequests(prev => [{
      id: `join_${currentUser.id}_${targetGroup.id}_${Date.now()}`,
      source_group_id: currentUser.group_id,
      target_group_id: targetGroup.id,
      requester_id: currentUser.id,
      requester_name: `${currentUser.first_name} ${currentUser.last_name}`,
      target_group_name: targetGroup.name,
      status: 'pending',
      created_at: new Date().toISOString(),
    }, ...prev]);
  };

  const resolveGroupRequest = (request: GroupJoinRequest, status: 'accepted' | 'rejected') => {
    if (!currentUser || !setGroupJoinRequests || request.target_group_id !== currentUser.group_id || currentGroup?.leader_id !== currentUser.id) return;
    setGroupJoinRequests(prev => prev.map(item => item.id === request.id ? { ...item, status, resolved_at: new Date().toISOString(), resolved_by: currentUser.id } : item));
    if (status === 'accepted' && setUsers && setGroups) {
      const sourceGroup = groups.find(group => group.id === request.source_group_id);
      const sourceMembers = users.filter(user => user.group_id === request.source_group_id);
      if (sourceGroup && request.source_group_id) {
        setUsers(prev => prev.map(user => user.group_id === request.source_group_id ? { ...user, group_id: currentGroup.id, squad_rank: user.id === sourceGroup.leader_id ? 'jokhedar' : (user.squad_rank || 'soldier') } : user));
        setGroups(prev => prev.map(group => {
          if (group.id === currentGroup.id) {
            const memberIds = Array.from(new Set([...(group.member_ids || []), ...sourceMembers.map(member => member.id)]));
            return { ...group, members_count: memberIds.length, member_ids: memberIds };
          }
          return group.id === request.source_group_id ? { ...group, members_count: 0, member_ids: [], parent_group_id: currentGroup.id, status: 'merged' } : group;
        }));
      }
    }
  };

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (event: React.FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !room) return;

    appendGroupChatMessage({
      roomId: room.id,
      groupId: room.group_id,
      userId: activeUserId,
      userName: activeUserName,
      avatarUrl: currentUser?.avatar_url,
      text,
      isSystem: false,
    });

    setDraft('');
  };

  const startDragging = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest('button, input, textarea, select, a')) return;
    const panel = event.currentTarget.parentElement;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    setPosition({ left: rect.left, top: rect.top });
    interactionState.current = {
      type: 'drag',
      startX: event.clientX,
      startY: event.clientY,
      startLeft: rect.left,
      startTop: rect.top,
      startWidth: rect.width,
      startHeight: rect.height,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const startResize = (event: React.PointerEvent<HTMLDivElement>, edge: 'right' | 'left' | 'top' | 'bottom' | 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left') => {
    event.preventDefault();
    event.stopPropagation();
    const panel = event.currentTarget.parentElement;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    setPosition({ left: rect.left, top: rect.top });
    interactionState.current = {
      type: 'resize',
      edge,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: rect.left,
      startTop: rect.top,
      startWidth: rect.width,
      startHeight: rect.height,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  useEffect(() => {
    const move = (event: PointerEvent) => {
      const interaction = interactionState.current;
      if (!interaction) return;
      if (interaction.type === 'drag') {
        const left = Math.max(8, Math.min(window.innerWidth - interaction.startWidth - 8, interaction.startLeft + event.clientX - interaction.startX));
        const top = Math.max(8, Math.min(window.innerHeight - 80, interaction.startTop + event.clientY - interaction.startY));
        setPosition({ left, top });
        return;
      }
      const edge = interaction.edge || 'bottom-right';
      const resizesLeft = edge === 'left' || edge === 'top-left' || edge === 'bottom-left';
      const resizesRight = edge === 'right' || edge === 'top-right' || edge === 'bottom-right';
      const resizesTop = edge === 'top' || edge === 'top-left' || edge === 'top-right';
      const resizesBottom = edge === 'bottom' || edge === 'bottom-left' || edge === 'bottom-right';
      const maxWidth = window.innerWidth - 16;
      const maxHeight = window.innerHeight - 16;
      const pointerRight = event.clientX;
      const pointerBottom = event.clientY;
      const fixedRight = interaction.startLeft + interaction.startWidth;
      const fixedBottom = interaction.startTop + interaction.startHeight;
      const nextLeft = resizesLeft ? Math.max(8, Math.min(fixedRight - 280, pointerRight)) : interaction.startLeft;
      const nextTop = resizesTop ? Math.max(8, Math.min(fixedBottom - 220, pointerBottom)) : interaction.startTop;
      const nextWidth = resizesLeft
        ? Math.max(280, Math.min(maxWidth, fixedRight - nextLeft))
        : resizesRight ? Math.max(280, Math.min(maxWidth, pointerRight - interaction.startLeft)) : interaction.startWidth;
      const nextHeight = resizesTop
        ? Math.max(220, Math.min(maxHeight, fixedBottom - nextTop))
        : resizesBottom ? Math.max(220, Math.min(maxHeight, pointerBottom - interaction.startTop)) : interaction.startHeight;
      setPosition({
        left: Math.max(8, Math.min(window.innerWidth - nextWidth - 8, nextLeft)),
        top: Math.max(8, Math.min(window.innerHeight - nextHeight - 8, nextTop)),
      });
      setSize({ width: nextWidth, height: nextHeight });
    };
    const stop = () => { interactionState.current = null; };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
    };
  }, []);

  const isModalLayout = isModal || mobileMode;

  return (
    <div
      className={
        isModalLayout
          ? 'relative flex flex-col h-full w-full rounded-2xl sm:rounded-3xl overflow-hidden border border-cyan-500/40 bg-[#070d1f] shadow-2xl'
          : 'fixed z-40 hidden md:flex flex-col rounded-[22px] overflow-hidden border border-cyan-500/30 bg-[#070d1f]/95 backdrop-blur-2xl shadow-[0_0_35px_rgba(34,211,238,0.18)]'
      }
      style={
        isModalLayout
          ? undefined
          : {
              left: position ? position.left : 20,
              top: position ? position.top : 110,
              width: `min(${size.width}px, calc(100vw - 24px))`,
              height: `min(${size.height}px, calc(100vh - 120px))`,
              maxWidth: 'calc(100vw - 24px)',
              maxHeight: 'calc(100vh - 120px)',
            }
      }
      dir="rtl"
    >
      {/* Chat Top Header */}
      <div
        onPointerDown={isModalLayout ? undefined : startDragging}
        className={`flex h-14 items-center justify-between shrink-0 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-500/15 via-sky-500/5 to-transparent px-3 py-2.5 ${
          isModalLayout ? '' : 'cursor-grab touch-none active:cursor-grabbing'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {!isModalLayout && <GripVertical size={15} className="shrink-0 text-cyan-400/70" aria-label="جابجایی چت" />}
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.3)]">
            <MessageCircle size={17} />
          </span>
          <div className="min-w-0">
            <div className="text-[12px] font-black text-white flex items-center gap-1.5">
              <span>{room.name}</span>
              {effectiveGroupId === 'general_headquarters' && (
                <span className="text-[9px] font-normal bg-cyan-950/80 border border-cyan-800 text-cyan-300 px-1.5 py-0.2 rounded">عمومی</span>
              )}
            </div>
            <div className="truncate text-[10px] text-slate-400">
              {stats.activeMembers} رزمنده فعال • نرخ تعامل {stats.engagementScore}%
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-slate-300">
          {/* Quick squad buttons */}
          {syncedUserGroupId && (
            <button
              type="button"
              onClick={() => setSelectedGroupId(selectedGroupId === syncedUserGroupId ? 'general_headquarters' : syncedUserGroupId)}
              className="px-2 py-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-[10px] font-bold text-cyan-300 hover:bg-cyan-500/20 transition"
              title="تغییر بین روم جوخه و روم عمومی"
            >
              {selectedGroupId === 'general_headquarters' ? 'برو به جوخه' : 'روم عمومی'}
            </button>
          )}

          {onOpenSquadModal && (
            <button
              type="button"
              onPointerDown={event => event.stopPropagation()}
              onClick={onOpenSquadModal}
              className="flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] font-bold text-red-200 hover:bg-red-500/20"
              title="مدیریت جوخه و نیروها"
            >
              <Users size={13} />
              <span className="hidden sm:inline">مدیریت جوخه</span>
            </button>
          )}

          <button
            type="button"
            onPointerDown={event => event.stopPropagation()}
            onClick={() => setIsGroupMenuOpen(value => !value)}
            className="rounded-lg p-1.5 text-cyan-300 hover:bg-cyan-500/15"
            title="پیدا کردن جوخه‌ها"
            aria-label="پیدا کردن جوخه‌ها"
          >
            <Menu size={17} />
          </button>

          {/* Close button */}
          {onClose && (
            <button
              type="button"
              onPointerDown={event => event.stopPropagation()}
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-500/20 hover:text-red-300 transition"
              title="بستن چت روم"
              aria-label="بستن چت روم"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {isGroupMenuOpen && (
        <div onPointerDown={event => event.stopPropagation()} className="absolute right-2 top-14 z-50 w-[calc(100%-16px)] rounded-2xl border border-cyan-500/30 bg-[#080f24] p-3 shadow-2xl" dir="rtl">
          <div className="mb-2 flex items-center justify-between"><span className="text-xs font-black text-white">جوخه‌ها و درخواست ارتباط</span><button type="button" onClick={() => setIsGroupMenuOpen(false)} className="text-slate-400"><X size={15} /></button></div>
          <div className="mb-2 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-2"><Search size={14} className="text-slate-500" /><input value={groupSearch} onChange={event => setGroupSearch(event.target.value)} placeholder="جست‌وجوی نام جوخه..." className="w-full bg-transparent py-2 text-[11px] text-white outline-none" /></div>
          {pendingIncoming.length > 0 && <div className="mb-2 space-y-1 rounded-xl border border-amber-500/20 bg-amber-500/5 p-2"><div className="text-[10px] font-black text-amber-300">درخواست‌های ورودی</div>{pendingIncoming.map(request => <div key={request.id} className="flex items-center justify-between gap-2 text-[10px] text-slate-200"><span>{request.requester_name}</span><span className="flex gap-1"><button type="button" onClick={() => resolveGroupRequest(request, 'accepted')} className="rounded bg-emerald-600 p-1 text-white"><Check size={11} /></button><button type="button" onClick={() => resolveGroupRequest(request, 'rejected')} className="rounded bg-rose-700 p-1 text-white"><X size={11} /></button></span></div>)}</div>}
          <div className="max-h-36 space-y-1 overflow-y-auto">{visibleGroups.length === 0 ? <p className="py-3 text-center text-[10px] text-slate-500">جوخه‌ای پیدا نشد.</p> : visibleGroups.map(group => { const pending = groupJoinRequests.some(request => request.requester_id === currentUser?.id && request.target_group_id === group.id && request.status === 'pending'); const full = (group.members_count || 0) >= (group.max_members || 4); return <div key={group.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/70 p-2"><div><div className="text-[11px] font-bold text-white">{group.name}</div><div className="text-[9px] text-slate-500">{group.members_count}/{group.max_members || 4} عضو</div></div><button type="button" disabled={pending || full} onClick={() => sendGroupRequest(group)} className="rounded-lg bg-cyan-500/15 px-2 py-1 text-[9px] font-bold text-cyan-300 disabled:opacity-40">{full ? 'تکمیل' : pending ? 'درخواست شد' : 'درخواست'}</button></div>; })}</div>
          {visibleGroups.length < matchingGroups.length && <button type="button" onClick={() => setGroupPage(page => page + 1)} className="mt-2 w-full rounded-lg border border-cyan-500/30 py-1.5 text-[10px] font-bold text-cyan-300">بارگذاری ۵ جوخه دیگر</button>}
        </div>
      )}

      {isAdminMode && adminGroupOptions.length > 0 && (
        <div className="border-b border-slate-800 bg-slate-950/80 px-3 py-2 shrink-0">
          <label className="sr-only" htmlFor="group-chat-select">انتخاب گروه</label>
          <select
            id="group-chat-select"
            value={selectedGroupId}
            onChange={(event) => setSelectedGroupId(event.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[11px] text-slate-100 outline-none focus:border-cyan-500"
          >
            <option value="general_headquarters">روم عمومی ستاد کل اتاق جنگ</option>
            {adminGroupOptions.map(group => (
              <option key={group.id} value={group.id}>{group.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div 
        onPointerDown={isModalLayout ? undefined : startDragging} 
        className="flex-1 space-y-2.5 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.06),_transparent_40%)] p-3 min-h-0"
      >
        {!syncedUserGroupId && onOpenSquadModal && (
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-2.5 flex items-center justify-between gap-2 text-xs">
            <span className="text-cyan-200 text-[11px]">شما هم‌اکنون در روم عمومی ستاد کل هستید. برای چت اختصاصی با جوخه:</span>
            <button
              onClick={onOpenSquadModal}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[10px] px-2.5 py-1 rounded-lg shrink-0 transition"
            >
              تشکیل جوخه
            </button>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-6 text-center text-xs leading-6 text-slate-400">
            هنوز پیامی در این اتاق ثبت نشده است؛ اولین پیام عملیاتی را ارسال کنید.
          </div>
        ) : (
          messages.map(message => {
            const isMine = currentUser ? message.user_id === currentUser.id : false;
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
                    <span className="font-bold text-slate-200">{message.user_name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">{new Date(message.created_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span>
                      {isMine && currentUser && (
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => { setEditingMessageId(message.id); setEditingText(message.text); }} className="rounded-md p-1 text-slate-500 transition hover:bg-cyan-500/15 hover:text-cyan-300" title="ویرایش پیام من" aria-label="ویرایش پیام من"><Pencil size={12} /></button>
                          <button type="button" onClick={() => deleteGroupChatMessage(room.id, message.id, currentUser.id)} className="rounded-md p-1 text-slate-500 transition hover:bg-rose-500/15 hover:text-rose-300" title="حذف پیام من" aria-label="حذف پیام من"><Trash2 size={12} /></button>
                        </div>
                      )}
                    </div>
                  </div>
                  {editingMessageId === message.id ? (
                    <form onSubmit={(event) => { event.preventDefault(); if (currentUser && editGroupChatMessage(room.id, message.id, currentUser.id, editingText)) setEditingMessageId(null); }} className="space-y-2">
                      <textarea value={editingText} onChange={event => setEditingText(event.target.value)} autoFocus className="w-full rounded-lg border border-cyan-500/40 bg-slate-950 px-2 py-1.5 text-[11px] leading-6 text-white outline-none" rows={2} />
                      <div className="flex justify-end gap-1"><button type="submit" className="rounded-lg bg-cyan-400 p-1.5 text-slate-950" title="ذخیره ویرایش"><Check size={13} /></button><button type="button" onClick={() => setEditingMessageId(null)} className="rounded-lg bg-slate-800 p-1.5 text-slate-300" title="لغو"><X size={13} /></button></div>
                    </form>
                  ) : <p className="text-[12px] leading-6 text-slate-100 whitespace-pre-wrap">{message.text}</p>}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Message Form */}
      <form onSubmit={sendMessage} className="flex h-14 items-center gap-2 shrink-0 border-t border-slate-800 bg-slate-950/90 p-2.5">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="پیام خود را بنویسید..."
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

      {!isModalLayout && <>
      <div onPointerDown={(event) => startResize(event, 'right')} className="absolute -right-1 top-8 h-[calc(100%-64px)] w-2 cursor-ew-resize" title="تغییر عرض چت" />
      <div onPointerDown={(event) => startResize(event, 'left')} className="absolute -left-1 top-8 h-[calc(100%-64px)] w-2 cursor-ew-resize" title="تغییر عرض چت" />
      <div onPointerDown={(event) => startResize(event, 'bottom')} className="absolute -bottom-1 left-8 h-2 w-[calc(100%-64px)] cursor-ns-resize" title="تغییر ارتفاع چت" />
      <div onPointerDown={(event) => startResize(event, 'top')} className="absolute -top-1 left-8 h-2 w-[calc(100%-64px)] cursor-ns-resize" title="تغییر ارتفاع چت" />
      <div onPointerDown={(event) => startResize(event, 'top-left')} className="absolute -left-1 -top-1 h-5 w-5 cursor-nwse-resize rounded-tl-xl" title="تغییر اندازه چت" />
      <div onPointerDown={(event) => startResize(event, 'top-right')} className="absolute -right-1 -top-1 h-5 w-5 cursor-nesw-resize rounded-tr-xl" title="تغییر اندازه چت" />
      <div onPointerDown={(event) => startResize(event, 'bottom-left')} className="absolute -bottom-1 -left-1 h-5 w-5 cursor-nesw-resize rounded-bl-xl" title="تغییر اندازه چت" />
      <div onPointerDown={(event) => startResize(event, 'bottom-right')} className="absolute -bottom-1 -right-1 h-5 w-5 cursor-nwse-resize rounded-br-xl" title="تغییر اندازه چت" />
      </>}
    </div>
  );
}
