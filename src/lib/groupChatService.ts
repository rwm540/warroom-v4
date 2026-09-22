import { GroupChatMessage, GroupChatRoom, User } from '../types';
import { isSupabaseEnabled, supabase } from './supabaseData';
import { logAudit } from './auditLogger';

const CHAT_STORAGE_KEY = 'warroom_group_chat_store_v1';
const CHAT_EVENT_NAME = 'warroom_group_chat_updated';

export type ChatStoreEntry = { room: GroupChatRoom; messages: GroupChatMessage[] };
export type ChatStore = Record<string, ChatStoreEntry>;

// حافظه مقیم جاوااسکریپت برای تضمین داده در تست‌ها، SSR و مرورگرهای خصوصی
let memoryStore: ChatStore = {};

/* ------------------------------------------------------------------ */
/* BroadcastChannel برای تبادل آنی بین تمام تب‌های باز مرورگر              */
/* ------------------------------------------------------------------ */
let crossTabBus: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    crossTabBus = new BroadcastChannel('warroom_chat_cross_tab_bus');
  }
} catch {
  crossTabBus = null;
}

/* ------------------------------------------------------------------ */
/* مدیریت اشتراک‌های محلی و کانال‌های وب‌سوکت Supabase                    */
/* ------------------------------------------------------------------ */
const roomSubscribers = new Map<string, Set<(messages: GroupChatMessage[]) => void>>();
const globalSubscribers = new Set<(messages: GroupChatMessage[]) => void>();
const activeSupabaseChannels = new Map<string, any>();
const activePollingIntervals = new Map<string, ReturnType<typeof setInterval>>();

/** استانداردسازی شناسه روم: حذف پیشوند اختیاری room_ و یکسان‌سازی کلیدها */
export function getCanonicalRoomId(roomOrGroupId: string): string {
  const raw = String(roomOrGroupId || '').trim();
  if (!raw) return 'general_headquarters';
  return raw.replace(/^room_/, '') || 'general_headquarters';
}

function readStore(): ChatStore {
  let localData: ChatStore = {};
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(CHAT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          localData = parsed;
        }
      }
    } catch {
      // ignore
    }
  }

  // ادغام حافظه مقیم با داده محلی برای حداکثر پایداری
  const merged: ChatStore = { ...memoryStore };
  for (const [key, value] of Object.entries(localData)) {
    if (!merged[key]) {
      merged[key] = value;
    } else {
      const existingMap = new Map<string, GroupChatMessage>();
      for (const msg of merged[key].messages || []) existingMap.set(msg.id, msg);
      for (const msg of value.messages || []) existingMap.set(msg.id, msg);
      merged[key] = {
        room: { ...merged[key].room, ...value.room },
        messages: Array.from(existingMap.values()).sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        ),
      };
    }
  }
  memoryStore = merged;
  return merged;
}

function writeStore(store: ChatStore) {
  memoryStore = { ...store };
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const payload = JSON.stringify(store);
    window.localStorage.setItem(CHAT_STORAGE_KEY, payload);
    window.dispatchEvent(new CustomEvent(CHAT_EVENT_NAME, { detail: store }));
    try {
      window.dispatchEvent(new StorageEvent('storage', { key: CHAT_STORAGE_KEY, newValue: payload }));
    } catch {
      // ignore
    }
  } catch {
    // localStorage may be unavailable
  }
}

export function normalizeRoomRecord(record: any): GroupChatRoom | null {
  if (!record || typeof record !== 'object') return null;
  const room = record.data && typeof record.data === 'object' ? record.data : record;
  const id = String(room?.id || record?.id || '').trim();
  if (!id) return null;

  const canonical = getCanonicalRoomId(id);
  return {
    id: `room_${canonical}`,
    group_id: String(room?.group_id || room?.groupId || canonical).trim(),
    name: String(room?.name || (canonical === 'general_headquarters' ? 'روم عمومی ستاد کل اتاق جنگ' : 'گروه تیم')),
    member_ids: Array.isArray(room?.member_ids) ? room.member_ids.map(String).filter(Boolean) : [],
    created_at: room?.created_at || new Date().toISOString(),
    updated_at: room?.updated_at || room?.created_at || new Date().toISOString(),
    unread_count: typeof room?.unread_count === 'number' ? room.unread_count : undefined,
  };
}

export function normalizeMessageRecord(record: any): GroupChatMessage | null {
  if (!record || typeof record !== 'object') return null;
  const message = record.data && typeof record.data === 'object' ? record.data : record;
  const id = String(message?.id || record?.id || '').trim();
  if (!id) return null;

  const rawRoom = String(message?.room_id || message?.roomId || '').trim();
  const rawGroup = String(message?.group_id || message?.groupId || '').trim();
  const canonical = getCanonicalRoomId(rawRoom || rawGroup);

  return {
    id,
    room_id: `room_${canonical}`,
    group_id: canonical === 'general_headquarters' ? 'general_headquarters' : (rawGroup || canonical),
    user_id: String(message?.user_id || message?.userId || '').trim(),
    user_name: String(message?.user_name || message?.userName || 'کاربر').trim(),
    avatar_url: message?.avatar_url || message?.avatarUrl || undefined,
    text: String(message?.text || '').trim(),
    created_at: message?.created_at || message?.createdAt || new Date().toISOString(),
    is_system: Boolean(message?.is_system || message?.isSystem),
  };
}

export function buildRoomKey(roomOrGroupId: string, fallback: string): string {
  return getCanonicalRoomId(roomOrGroupId || fallback);
}

/** بررسی اینکه آیا پیام متعلق به این روم یا گروه است */
export function isMessageForRoom(message: GroupChatMessage, roomId: string, groupId?: string): boolean {
  if (!message) return false;
  const targetCanonical = getCanonicalRoomId(roomId || groupId || '');
  const msgRoomCanonical = getCanonicalRoomId(message.room_id);
  const msgGroupCanonical = getCanonicalRoomId(message.group_id);

  return msgRoomCanonical === targetCanonical || msgGroupCanonical === targetCanonical;
}

/** دریافت کلید ذخیره‌سازی اتاق در Store */
function findStoreKeyForRoom(store: ChatStore, roomId: string, groupId?: string): string {
  const targetCanonical = getCanonicalRoomId(roomId || groupId || '');
  if (store[targetCanonical]) return targetCanonical;

  for (const [key, entry] of Object.entries(store)) {
    if (getCanonicalRoomId(key) === targetCanonical) return key;
    if (entry?.room && getCanonicalRoomId(entry.room.id) === targetCanonical) return key;
    if (entry?.room && getCanonicalRoomId(entry.room.group_id) === targetCanonical) return key;
  }

  return targetCanonical;
}

/** ادغام یا به‌روزرسانی پیام در Store و ذخیره‌سازی */
function addOrUpdateMessageInStore(message: GroupChatMessage): { roomKey: string; messages: GroupChatMessage[] } {
  const store = readStore();
  const canonical = getCanonicalRoomId(message.room_id || message.group_id);
  const targetKey = findStoreKeyForRoom(store, message.room_id, message.group_id);
  
  const existingEntry = store[targetKey] || {
    room: {
      id: `room_${canonical}`,
      group_id: canonical === 'general_headquarters' ? 'general_headquarters' : canonical,
      name: canonical === 'general_headquarters' ? 'روم عمومی ستاد کل اتاق جنگ' : 'چت گروهی',
      member_ids: [message.user_id].filter(Boolean),
      created_at: message.created_at,
      updated_at: message.created_at,
    },
    messages: [],
  };

  const messagesMap = new Map<string, GroupChatMessage>();
  for (const msg of existingEntry.messages || []) {
    messagesMap.set(msg.id, msg);
  }
  messagesMap.set(message.id, message);

  const sortedMessages = Array.from(messagesMap.values()).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  store[targetKey] = {
    ...existingEntry,
    room: {
      ...existingEntry.room,
      updated_at: message.created_at || new Date().toISOString(),
    },
    messages: sortedMessages.slice(-400),
  };

  writeStore(store);
  return { roomKey: targetKey, messages: sortedMessages };
}

/** حذف پیام از Store */
function removeMessageFromStore(roomId: string, messageId: string): boolean {
  const store = readStore();
  let found = false;
  const targetCanonical = getCanonicalRoomId(roomId);

  for (const [key, entry] of Object.entries(store)) {
    const entryCanonical = getCanonicalRoomId(key);
    const hasMsg = (entry?.messages || []).some(m => m.id === messageId);
    if (hasMsg || entryCanonical === targetCanonical) {
      const nextMsgs = (entry?.messages || []).filter(m => m.id !== messageId);
      store[key] = {
        ...entry,
        messages: nextMsgs,
        room: { ...entry.room, updated_at: new Date().toISOString() },
      };
      found = true;
    }
  }

  if (found) {
    writeStore(store);
  }
  return found;
}

/** اطلاع‌رسانی به کلیه مشترکین چت در کامپوننت‌های فعال محلی */
function notifyRoomSubscribers(roomOrGroupId: string, explicitMessages?: GroupChatMessage[]) {
  const canonical = getCanonicalRoomId(roomOrGroupId);
  const messagesToDispatch = explicitMessages || listGroupChatMessages(canonical);

  // ۱. ارسال به مشترکین روم اختصاصی
  const subscribers = roomSubscribers.get(canonical);
  if (subscribers && subscribers.size > 0) {
    for (const callback of subscribers) {
      try {
        callback(messagesToDispatch);
      } catch (err) {
        console.warn('[WarRoom Chat] خطا در ارسال به شنونده روم:', err);
      }
    }
  }

  // ۲. ارسال به مشترکینی که با فرمت room_ ثبت نام کرده بودند
  const prefixedSubs = roomSubscribers.get(`room_${canonical}`);
  if (prefixedSubs && prefixedSubs.size > 0) {
    for (const callback of prefixedSubs) {
      try {
        callback(messagesToDispatch);
      } catch (err) {
        console.warn('[WarRoom Chat] خطا در ارسال به شنونده روم:', err);
      }
    }
  }

  // ۳. ارسال به مانیتورینگ سراسری ادمین
  if (globalSubscribers.size > 0) {
    const allMessages = listAllGroupChatMessages();
    for (const callback of globalSubscribers) {
      try {
        callback(allMessages);
      } catch (err) {
        console.warn('[WarRoom Chat] خطا در ارسال به شنونده سراسری:', err);
      }
    }
  }
}

/** واکشی مستقیم پیام‌های روم از پایگاه داده ابری Supabase */
async function fetchRoomMessagesFromSupabase(roomOrGroupId: string): Promise<GroupChatMessage[]> {
  if (!isSupabaseEnabled || !supabase) return [];
  const canonical = getCanonicalRoomId(roomOrGroupId);

  try {
    const orFilter = `data->>room_id.eq.room_${canonical},data->>room_id.eq.${canonical},data->>group_id.eq.${canonical}`;
    const { data, error } = await supabase
      .from('warroom_group_chat_messages')
      .select('id, data')
      .or(orFilter)
      .order('updated_at', { ascending: true })
      .limit(300);

    if (error) {
      // در صورت بروز خطای فیلتر، ۱۰۰ پیام اخیر را خوانده و فیلتر می‌کنیم
      const { data: allRecent } = await supabase
        .from('warroom_group_chat_messages')
        .select('id, data')
        .order('updated_at', { ascending: false })
        .limit(120);

      const filtered = (allRecent || [])
        .map(normalizeMessageRecord)
        .filter((msg): msg is GroupChatMessage => Boolean(msg && isMessageForRoom(msg, canonical)))
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      return filtered;
    }

    const messages = (data || [])
      .map(normalizeMessageRecord)
      .filter((msg): msg is GroupChatMessage => Boolean(msg))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return messages;
  } catch {
    return [];
  }
}

/** واکشی کلیه پیام‌های اخیر سامانه از Supabase (برای پنل مدیریت و فید زنده) */
export async function fetchAllRecentMessagesFromSupabase(limit = 200): Promise<GroupChatMessage[]> {
  if (!isSupabaseEnabled || !supabase) return listAllGroupChatMessages();

  try {
    const { data, error } = await supabase
      .from('warroom_group_chat_messages')
      .select('id, data')
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error || !data) return listAllGroupChatMessages();

    const normalized = data
      .map(normalizeMessageRecord)
      .filter((msg): msg is GroupChatMessage => Boolean(msg))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    // ذخیره در حافظه محلی
    for (const msg of normalized) {
      addOrUpdateMessageInStore(msg);
    }

    return normalized;
  } catch {
    return listAllGroupChatMessages();
  }
}

/* ------------------------------------------------------------------ */
/* گوش دادن به رویدادهای بلادرنگ بین تب‌ها (Cross-Tab Bus)               */
/* ------------------------------------------------------------------ */
if (crossTabBus) {
  crossTabBus.onmessage = (event) => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    if (data.type === 'new_message' && data.message) {
      const msg = normalizeMessageRecord(data.message);
      if (msg) {
        addOrUpdateMessageInStore(msg);
        notifyRoomSubscribers(msg.room_id);
      }
    } else if (data.type === 'edit_message' && data.message) {
      const msg = normalizeMessageRecord(data.message);
      if (msg) {
        addOrUpdateMessageInStore(msg);
        notifyRoomSubscribers(msg.room_id);
      }
    } else if (data.type === 'delete_message' && data.messageId) {
      removeMessageFromStore(data.roomId || '', data.messageId);
      if (data.roomId) notifyRoomSubscribers(data.roomId);
    }
  };
}

/* ------------------------------------------------------------------ */
/* توابع عمومی و رابط کاربری سرویس چت                                 */
/* ------------------------------------------------------------------ */

export function ensureGroupChatRoom(groupId: string, groupName: string, memberIds: string[]): GroupChatRoom {
  const canonical = getCanonicalRoomId(groupId);
  const normalizedMembers = Array.from(new Set((memberIds || []).map(String).filter(Boolean)));
  const store = readStore();
  const roomKey = canonical;
  const existing = store[roomKey]?.room;

  const room: GroupChatRoom = existing
    ? {
        ...existing,
        id: `room_${canonical}`,
        group_id: canonical === 'general_headquarters' ? 'general_headquarters' : canonical,
        name: groupName || existing.name,
        member_ids: normalizedMembers.length ? normalizedMembers : existing.member_ids,
        updated_at: new Date().toISOString(),
      }
    : {
        id: `room_${canonical}`,
        group_id: canonical === 'general_headquarters' ? 'general_headquarters' : canonical,
        name: groupName || (canonical === 'general_headquarters' ? 'روم عمومی ستاد کل اتاق جنگ' : 'گروه تیم'),
        member_ids: normalizedMembers,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

  const existingMessages = store[roomKey]?.messages ?? [];
  store[roomKey] = { room, messages: existingMessages };
  writeStore(store);

  if (isSupabaseEnabled && supabase) {
    void supabase
      .from('warroom_group_chat_rooms')
      .upsert({
        id: room.id,
        data: room,
        updated_at: new Date().toISOString(),
      })
      .then(undefined, () => undefined);
  }

  void logAudit({
    event: existing ? 'chat.room_updated' : 'chat.room_created',
    level: 'info',
    source: 'client',
    metadata: { groupId: canonical, roomId: room.id, memberCount: normalizedMembers.length },
  });

  return room;
}

export function listGroupChatMessages(roomOrGroupId: string): GroupChatMessage[] {
  const store = readStore();
  const canonical = getCanonicalRoomId(roomOrGroupId);

  for (const [key, entry] of Object.entries(store)) {
    if (!entry) continue;
    if (getCanonicalRoomId(key) === canonical || getCanonicalRoomId(entry.room?.id) === canonical || getCanonicalRoomId(entry.room?.group_id) === canonical) {
      return (entry.messages || [])
        .slice()
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
  }

  return [];
}

/** دریافت کلیه پیام‌های موجود در سامانه (برای ادمین) */
export function listAllGroupChatMessages(): GroupChatMessage[] {
  const store = readStore();
  const allMap = new Map<string, GroupChatMessage>();

  for (const entry of Object.values(store)) {
    if (!entry || !Array.isArray(entry.messages)) continue;
    for (const msg of entry.messages) {
      allMap.set(msg.id, msg);
    }
  }

  return Array.from(allMap.values()).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

export function listAllGroupChats(): Array<{ room: GroupChatRoom; messages: GroupChatMessage[] }> {
  const store = readStore();
  return Object.values(store)
    .filter(Boolean)
    .map(entry => ({
      room: entry.room,
      messages: Array.isArray(entry.messages) ? entry.messages : [],
    }))
    .sort((a, b) => new Date(b.room.updated_at).getTime() - new Date(a.room.updated_at).getTime());
}

export function deleteGroupChatMessage(roomOrGroupId: string, messageId: string, authorId?: string): boolean {
  const canonical = getCanonicalRoomId(roomOrGroupId);
  const store = readStore();
  const key = findStoreKeyForRoom(store, canonical);
  const targetMessage = (store[key]?.messages ?? []).find(message => message.id === messageId);

  // اگر شناسه فرستنده ارائه شده باشد، بررسی احراز هویت (مگر اینکه ادمین باشد)
  if (targetMessage && authorId && targetMessage.user_id !== authorId && !authorId.startsWith('admin')) {
    return false;
  }

  removeMessageFromStore(canonical, messageId);

  // ارسال ریل‌تایم بین تب‌ها
  try {
    crossTabBus?.postMessage({ type: 'delete_message', roomId: `room_${canonical}`, messageId });
  } catch {}

  // ارسال ریل‌تایم وب‌سوکت از طریق Supabase Broadcast
  if (isSupabaseEnabled && supabase) {
    const channel = activeSupabaseChannels.get(canonical);
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'chat:delete_message',
        payload: { roomId: `room_${canonical}`, messageId },
      }).catch(() => undefined);
    }

    const globalChannel = activeSupabaseChannels.get('global');
    if (globalChannel) {
      globalChannel.send({
        type: 'broadcast',
        event: 'chat:delete_message',
        payload: { roomId: `room_${canonical}`, messageId },
      }).catch(() => undefined);
    }

    void supabase
      .from('warroom_group_chat_messages')
      .delete()
      .eq('id', messageId)
      .then(undefined, () => undefined);
  }

  notifyRoomSubscribers(canonical);

  void logAudit({
    event: 'chat.message_deleted',
    level: 'security',
    source: 'client',
    metadata: { roomId: `room_${canonical}`, messageId },
  });

  return true;
}

export function editGroupChatMessage(roomOrGroupId: string, messageId: string, authorId: string, text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  const canonical = getCanonicalRoomId(roomOrGroupId);
  const store = readStore();
  const key = findStoreKeyForRoom(store, canonical);
  const targetMessage = (store[key]?.messages ?? []).find(message => message.id === messageId);
  if (!targetMessage || targetMessage.user_id !== authorId) return false;

  const updatedMessage: GroupChatMessage = {
    ...targetMessage,
    text: trimmed,
    updated_at: new Date().toISOString(),
  };

  addOrUpdateMessageInStore(updatedMessage);

  // ارسال ریل‌تایم بین تب‌ها
  try {
    crossTabBus?.postMessage({ type: 'edit_message', message: updatedMessage });
  } catch {}

  // ارسال ریل‌تایم وب‌سوکت از طریق Supabase Broadcast
  if (isSupabaseEnabled && supabase) {
    const channel = activeSupabaseChannels.get(canonical);
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'chat:edit_message',
        payload: updatedMessage,
      }).catch(() => undefined);
    }

    const globalChannel = activeSupabaseChannels.get('global');
    if (globalChannel) {
      globalChannel.send({
        type: 'broadcast',
        event: 'chat:edit_message',
        payload: updatedMessage,
      }).catch(() => undefined);
    }

    void supabase
      .from('warroom_group_chat_messages')
      .upsert({
        id: messageId,
        data: updatedMessage,
        updated_at: new Date().toISOString(),
      })
      .then(undefined, () => undefined);
  }

  notifyRoomSubscribers(canonical);

  void logAudit({
    event: 'chat.message_edited',
    level: 'info',
    source: 'client',
    actorId: authorId,
    metadata: { roomId: `room_${canonical}`, messageId, textLength: trimmed.length },
  });

  return true;
}

export function appendGroupChatMessage(payload: {
  roomId: string;
  groupId: string;
  userId: string;
  userName: string;
  avatarUrl?: string;
  text: string;
  isSystem?: boolean;
}): GroupChatMessage | null {
  const trimmed = payload.text?.trim();
  if (!trimmed) return null;

  const canonical = getCanonicalRoomId(payload.roomId || payload.groupId);
  const store = readStore();
  const roomEntry = Object.values(store).find(
    entry => getCanonicalRoomId(entry?.room?.id) === canonical || getCanonicalRoomId(entry?.room?.group_id) === canonical
  );
  const room = roomEntry?.room ?? ensureGroupChatRoom(canonical, canonical === 'general_headquarters' ? 'روم عمومی ستاد کل اتاق جنگ' : 'گروه تیم', [payload.userId]);

  const newMessage: GroupChatMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    room_id: `room_${canonical}`,
    group_id: canonical === 'general_headquarters' ? 'general_headquarters' : canonical,
    user_id: payload.userId,
    user_name: payload.userName,
    avatar_url: payload.avatarUrl,
    text: trimmed,
    created_at: new Date().toISOString(),
    is_system: Boolean(payload.isSystem),
  };

  // ۱. ذخیره فوری در حافظه و لوکال استوریج
  addOrUpdateMessageInStore(newMessage);

  // ۲. ارسال فوری به سایر تب‌ها (Cross-Tab Bus)
  try {
    crossTabBus?.postMessage({ type: 'new_message', message: newMessage });
  } catch {}

  // ۳. انتشار بلادرنگ وب‌سوکت در کانال اختصاصی اتاق و کانال سراسری
  if (isSupabaseEnabled && supabase) {
    const channelName = `warroom_chat_${canonical}`;
    let channel = activeSupabaseChannels.get(canonical);
    if (!channel) {
      channel = supabase.channel(channelName, {
        config: { broadcast: { ack: true, self: false } },
      });
      channel.subscribe();
      activeSupabaseChannels.set(canonical, channel);
    }

    channel.send({
      type: 'broadcast',
      event: 'chat:new_message',
      payload: newMessage,
    }).catch(() => undefined);

    // ارسال به کانال سراسری عمومی
    let globalChannel = activeSupabaseChannels.get('global');
    if (!globalChannel) {
      globalChannel = supabase.channel('warroom_chat_global', {
        config: { broadcast: { ack: true, self: false } },
      });
      globalChannel.subscribe();
      activeSupabaseChannels.set('global', globalChannel);
    }

    globalChannel.send({
      type: 'broadcast',
      event: 'chat:new_message',
      payload: newMessage,
    }).catch(() => undefined);

    // ۴. ثبت دائمی در جدول Postgres
    void supabase
      .from('warroom_group_chat_messages')
      .upsert({
        id: newMessage.id,
        data: newMessage,
        updated_at: new Date().toISOString(),
      })
      .then(undefined, () => undefined);

    void supabase
      .from('warroom_group_chat_rooms')
      .upsert({
        id: room.id,
        data: { ...room, updated_at: new Date().toISOString() },
        updated_at: new Date().toISOString(),
      })
      .then(undefined, () => undefined);
  }

  // ۵. به‌روزرسانی کامپوننت‌های محلی جاری
  notifyRoomSubscribers(canonical);

  void logAudit({
    event: 'chat.message_sent',
    level: 'info',
    source: 'client',
    actorId: payload.userId,
    metadata: { roomId: room.id, groupId: canonical, textLength: trimmed.length },
  });

  return newMessage;
}

export function getGroupChatStats(groupId: string, users: User[] = []): {
  totalMessages: number;
  activeMembers: number;
  engagementScore: number;
} {
  const canonical = getCanonicalRoomId(groupId);
  const store = readStore();
  const entriesForGroup = Object.values(store).filter(
    entry => getCanonicalRoomId(entry?.room?.group_id) === canonical || getCanonicalRoomId(entry?.room?.id) === canonical
  );
  const allMessages = entriesForGroup.flatMap(entry => entry.messages ?? []);
  const memberIds = Array.from(new Set(entriesForGroup.flatMap(entry => entry.room.member_ids ?? [])));
  const activeMembers = memberIds.filter(id => users.some(user => user.id === id)).length;
  const totalMessages = allMessages.length;
  const engagementScore = Math.min(100, Math.round((totalMessages * 2 + activeMembers * 12) / 2));

  return { totalMessages, activeMembers, engagementScore };
}

/* ------------------------------------------------------------------ */
/* اشتراک چندگانه بلادرنگ برای یک چت‌روم خاص                           */
/* ------------------------------------------------------------------ */

export function subscribeGroupChat(roomOrGroupId: string, onChange: (messages: GroupChatMessage[]) => void): () => void {
  const canonical = getCanonicalRoomId(roomOrGroupId);

  // ۱. افزودن به لیست شنوندگان این اتاق
  if (!roomSubscribers.has(canonical)) {
    roomSubscribers.set(canonical, new Set());
  }
  roomSubscribers.get(canonical)!.add(onChange);

  // ۲. ارسال پیام‌های موجود بلافاصله
  const initialMessages = listGroupChatMessages(canonical);
  onChange(initialMessages);

  // ۳. واکشی فوری از Supabase جهت دریافت آخرین پیام‌ها
  void fetchRoomMessagesFromSupabase(canonical).then((dbMessages) => {
    if (dbMessages && dbMessages.length > 0) {
      for (const msg of dbMessages) {
        addOrUpdateMessageInStore(msg);
      }
      notifyRoomSubscribers(canonical);
    }
  });

  // شنونده محلی رویداد تغییرات پنجره
  const localEventListener = (event: Event) => {
    const customDetail = (event as CustomEvent).detail as ChatStore | undefined;
    if (customDetail) {
      const roomEntry = Object.values(customDetail).find(
        entry => getCanonicalRoomId(entry?.room?.id) === canonical || getCanonicalRoomId(entry?.room?.group_id) === canonical
      );
      if (roomEntry) {
        onChange((roomEntry.messages ?? []).slice().sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
      }
      return;
    }

    const storageEvent = event as StorageEvent;
    if (storageEvent.key === CHAT_STORAGE_KEY && storageEvent.newValue) {
      try {
        const nextStore = JSON.parse(storageEvent.newValue) as ChatStore;
        const roomEntry = Object.values(nextStore).find(
          entry => getCanonicalRoomId(entry?.room?.id) === canonical || getCanonicalRoomId(entry?.room?.group_id) === canonical
        );
        if (roomEntry) {
          onChange((roomEntry.messages ?? []).slice().sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
        }
      } catch {
        onChange(listGroupChatMessages(canonical));
      }
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener(CHAT_EVENT_NAME, localEventListener);
    window.addEventListener('storage', localEventListener);
  }

  // ۴. برقراری کانال ریل‌تایم Supabase
  if (isSupabaseEnabled && supabase) {
    const channelName = `warroom_chat_${canonical}`;
    if (!activeSupabaseChannels.has(canonical)) {
      const channel = supabase.channel(channelName, {
        config: {
          broadcast: { ack: true, self: false },
        },
      });

      // ۴.۱ دریافت Broadcast بلادرنگ سریع (Sub-50ms)
      channel
        .on('broadcast', { event: 'chat:new_message' }, ({ payload }) => {
          const msg = normalizeMessageRecord(payload);
          if (msg && isMessageForRoom(msg, canonical)) {
            addOrUpdateMessageInStore(msg);
            notifyRoomSubscribers(canonical);
          }
        })
        .on('broadcast', { event: 'chat:edit_message' }, ({ payload }) => {
          const msg = normalizeMessageRecord(payload);
          if (msg && isMessageForRoom(msg, canonical)) {
            addOrUpdateMessageInStore(msg);
            notifyRoomSubscribers(canonical);
          }
        })
        .on('broadcast', { event: 'chat:delete_message' }, ({ payload }) => {
          if (payload?.messageId) {
            removeMessageFromStore(canonical, payload.messageId);
            notifyRoomSubscribers(canonical);
          }
        })
        // ۴.۲ دریافت رخدادهای پایگاه‌داده Postgres Changes
        .on('postgres_changes', { event: '*', schema: 'public', table: 'warroom_group_chat_messages' }, (payload: any) => {
          const eventType = payload.eventType;
          if (eventType === 'DELETE') {
            const delId = String(payload.old?.id || payload.old?.data?.id || '').trim();
            if (delId) {
              removeMessageFromStore(canonical, delId);
              notifyRoomSubscribers(canonical);
            }
            return;
          }

          const record = payload.new;
          const msg = normalizeMessageRecord(record);
          if (msg && isMessageForRoom(msg, canonical)) {
            addOrUpdateMessageInStore(msg);
            notifyRoomSubscribers(canonical);
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            void fetchRoomMessagesFromSupabase(canonical).then((dbMessages) => {
              if (dbMessages && dbMessages.length > 0) {
                for (const msg of dbMessages) {
                  addOrUpdateMessageInStore(msg);
                }
                notifyRoomSubscribers(canonical);
              }
            });
          }
        });

      activeSupabaseChannels.set(canonical, channel);
    }

    // ۵. زمان‌سنج پولینگ احتیاطی (هر ۲.۵ ثانیه برای تضمین ۱۰۰٪ در نوسانات وب‌سوکت)
    if (!activePollingIntervals.has(canonical)) {
      const interval = setInterval(() => {
        void fetchRoomMessagesFromSupabase(canonical).then((dbMessages) => {
          if (dbMessages && dbMessages.length > 0) {
            let hasNew = false;
            const currentMsgs = listGroupChatMessages(canonical);
            const currentIds = new Set(currentMsgs.map(m => m.id));

            for (const msg of dbMessages) {
              if (!currentIds.has(msg.id)) {
                addOrUpdateMessageInStore(msg);
                hasNew = true;
              }
            }

            if (hasNew) {
              notifyRoomSubscribers(canonical);
            }
          }
        }).catch(() => undefined);
      }, 2500);

      activePollingIntervals.set(canonical, interval);
    }
  }

  // تابع لغو اشتراک
  return () => {
    const subs = roomSubscribers.get(canonical);
    if (subs) {
      subs.delete(onChange);
      if (subs.size === 0) {
        roomSubscribers.delete(canonical);

        const poll = activePollingIntervals.get(canonical);
        if (poll) {
          clearInterval(poll);
          activePollingIntervals.delete(canonical);
        }

        const chan = activeSupabaseChannels.get(canonical);
        if (chan && supabase) {
          try {
            void supabase.removeChannel(chan);
          } catch {
            // ignore
          }
          activeSupabaseChannels.delete(canonical);
        }
      }
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener(CHAT_EVENT_NAME, localEventListener);
      window.removeEventListener('storage', localEventListener);
    }
  };
}

/* ------------------------------------------------------------------ */
/* اشتراک بلادرنگ سراسری کلیه چت‌ها (مخصوص مانیتورینگ پنل مدیریت)        */
/* ------------------------------------------------------------------ */

export function subscribeGlobalChat(onChange: (messages: GroupChatMessage[]) => void): () => void {
  globalSubscribers.add(onChange);

  // ۱. ارسال پیام‌های فعلی موجود
  onChange(listAllGroupChatMessages());

  // ۲. واکشی پیام‌های اخیر از Supabase
  void fetchAllRecentMessagesFromSupabase(200).then((allMsgs) => {
    onChange(allMsgs);
  });

  // ۳. برقراری کانال ریل‌تایم سراسری
  if (isSupabaseEnabled && supabase) {
    if (!activeSupabaseChannels.has('global')) {
      const channel = supabase.channel('warroom_chat_global', {
        config: { broadcast: { ack: true, self: false } },
      });

      channel
        .on('broadcast', { event: 'chat:new_message' }, ({ payload }) => {
          const msg = normalizeMessageRecord(payload);
          if (msg) {
            addOrUpdateMessageInStore(msg);
            onChange(listAllGroupChatMessages());
          }
        })
        .on('broadcast', { event: 'chat:edit_message' }, ({ payload }) => {
          const msg = normalizeMessageRecord(payload);
          if (msg) {
            addOrUpdateMessageInStore(msg);
            onChange(listAllGroupChatMessages());
          }
        })
        .on('broadcast', { event: 'chat:delete_message' }, ({ payload }) => {
          if (payload?.messageId) {
            removeMessageFromStore(payload.roomId || '', payload.messageId);
            onChange(listAllGroupChatMessages());
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'warroom_group_chat_messages' }, (payload: any) => {
          const eventType = payload.eventType;
          if (eventType === 'DELETE') {
            const delId = String(payload.old?.id || payload.old?.data?.id || '').trim();
            if (delId) {
              removeMessageFromStore('', delId);
              onChange(listAllGroupChatMessages());
            }
            return;
          }

          const record = payload.new;
          const msg = normalizeMessageRecord(record);
          if (msg) {
            addOrUpdateMessageInStore(msg);
            onChange(listAllGroupChatMessages());
          }
        })
        .subscribe();

      activeSupabaseChannels.set('global', channel);
    }

    // پولینگ منظم برای پنل مانیتورینگ ادمین
    if (!activePollingIntervals.has('global')) {
      const poll = setInterval(() => {
        void fetchAllRecentMessagesFromSupabase(200).then((msgs) => {
          onChange(msgs);
        }).catch(() => undefined);
      }, 3000);
      activePollingIntervals.set('global', poll);
    }
  }

  return () => {
    globalSubscribers.delete(onChange);
    if (globalSubscribers.size === 0) {
      const poll = activePollingIntervals.get('global');
      if (poll) {
        clearInterval(poll);
        activePollingIntervals.delete('global');
      }

      const chan = activeSupabaseChannels.get('global');
      if (chan && supabase) {
        try {
          void supabase.removeChannel(chan);
        } catch {}
        activeSupabaseChannels.delete('global');
      }
    }
  };
}
