import { GroupChatMessage, GroupChatRoom, User } from '../types';
import { isSupabaseEnabled, supabase } from './supabaseClient';
import { logAudit } from './auditLogger';

const CHAT_STORAGE_KEY = 'warroom_group_chat_store_v1';
const CHAT_EVENT_NAME = 'warroom_group_chat_updated';

type ChatStoreEntry = { room: GroupChatRoom; messages: GroupChatMessage[] };
type ChatStore = Record<string, ChatStoreEntry>;

function readStore(): ChatStore {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: ChatStore) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const payload = JSON.stringify(store);
    window.localStorage.setItem(CHAT_STORAGE_KEY, payload);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(CHAT_EVENT_NAME, { detail: store }));
      try {
        window.dispatchEvent(new StorageEvent('storage', { key: CHAT_STORAGE_KEY, newValue: payload }));
      } catch {
        // برخي مرورگرها StorageEvent را مستقيماً نمی‌پذیرند.
      }
    }
  } catch {
    // localStorage may be unavailable in some contexts; fail quietly.
  }
}

function normalizeRoomRecord(record: any): GroupChatRoom | null {
  if (!record || typeof record !== 'object') return null;
  const room = record.data && typeof record.data === 'object' ? record.data : record;
  const id = String(room?.id || record?.id || '').trim();
  if (!id) return null;

  return {
    id,
    group_id: String(room?.group_id || room?.groupId || ''),
    name: String(room?.name || 'گروه تیم'),
    member_ids: Array.isArray(room?.member_ids) ? room.member_ids.map(String).filter(Boolean) : [],
    created_at: room?.created_at || new Date().toISOString(),
    updated_at: room?.updated_at || room?.created_at || new Date().toISOString(),
    unread_count: typeof room?.unread_count === 'number' ? room.unread_count : undefined,
  };
}

function normalizeMessageRecord(record: any): GroupChatMessage | null {
  if (!record || typeof record !== 'object') return null;
  const message = record.data && typeof record.data === 'object' ? record.data : record;
  const id = String(message?.id || record?.id || '').trim();
  if (!id) return null;

  return {
    id,
    room_id: String(message?.room_id || ''),
    group_id: String(message?.group_id || ''),
    user_id: String(message?.user_id || ''),
    user_name: String(message?.user_name || 'کاربر'),
    avatar_url: message?.avatar_url || undefined,
    text: String(message?.text || ''),
    created_at: message?.created_at || new Date().toISOString(),
    is_system: Boolean(message?.is_system),
  };
}

function buildRoomKey(roomOrGroupId: string, fallback: string): string {
  return roomOrGroupId || fallback || 'default-group';
}

function syncLocalStoreFromEntries(entries: Array<{ room: GroupChatRoom; messages: GroupChatMessage[] }>) {
  const nextStore: ChatStore = {};
  for (const entry of entries) {
    const key = buildRoomKey(entry.room?.group_id || entry.room?.id, entry.room?.id || 'default-group');
    nextStore[key] = {
      room: entry.room,
      messages: Array.isArray(entry.messages) ? entry.messages : [],
    };
  }
  writeStore(nextStore);
}

function hydrateChatStoreFromSupabase() {
  if (!isSupabaseEnabled || !supabase) return;

  void Promise.all([
    supabase.from('warroom_group_chat_rooms').select('id, data').order('updated_at', { ascending: false }),
    supabase.from('warroom_group_chat_messages').select('id, data'),
  ])
    .then(([roomsRes, messagesRes]) => {
      const rooms = (roomsRes.data || [])
        .map(normalizeRoomRecord)
        .filter((room): room is GroupChatRoom => Boolean(room));

      const messages = (messagesRes.data || [])
        .map(normalizeMessageRecord)
        .filter((message): message is GroupChatMessage => Boolean(message));

      const roomsMap = new Map<string, ChatStoreEntry>();
      for (const room of rooms) {
        roomsMap.set(room.id, { room, messages: [] });
      }

      for (const message of messages) {
        const entry = roomsMap.get(message.room_id) ?? {
          room: {
            id: message.room_id,
            group_id: message.group_id,
            name: 'گروه تیم',
            member_ids: [],
            created_at: message.created_at,
            updated_at: message.created_at,
          },
          messages: [],
        };
        entry.messages.push(message);
        roomsMap.set(message.room_id, entry);
      }

      const result = Array.from(roomsMap.values()).map(entry => ({
        room: entry.room,
        messages: entry.messages
          .slice()
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
      }));

      if (result.length) {
        syncLocalStoreFromEntries(result);
      }
    })
    .catch(() => {
      // در حالت اشتراک ناموفق، حالت محلی ادامه می‌یابد.
    });
}

function ensureRoomInLocalStore(room: GroupChatRoom, messages: GroupChatMessage[] = []): ChatStore {
  const store = readStore();
  const key = buildRoomKey(room.group_id || room.id, room.id);
  store[key] = { room, messages };
  writeStore(store);
  return store;
}

export function ensureGroupChatRoom(groupId: string, groupName: string, memberIds: string[]): GroupChatRoom {
  const normalizedMembers = Array.from(new Set((memberIds || []).map(String).filter(Boolean)));
  const store = readStore();
  const roomKey = buildRoomKey(groupId, 'default-group');
  const existing = store[roomKey]?.room;
  const room: GroupChatRoom = existing
    ? {
        ...existing,
        group_id: groupId || existing.group_id,
        name: groupName || existing.name,
        member_ids: normalizedMembers.length ? normalizedMembers : existing.member_ids,
        updated_at: new Date().toISOString(),
      }
    : {
        id: `room_${groupId || Date.now()}`,
        group_id: groupId,
        name: groupName || 'گروه تیم',
        member_ids: normalizedMembers,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

  const existingMessages = store[roomKey]?.messages ?? [];
  ensureRoomInLocalStore(room, existingMessages);

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
    metadata: { groupId, roomId: room.id, memberCount: normalizedMembers.length },
  });

  return room;
}

export function listGroupChatMessages(roomId: string): GroupChatMessage[] {
  const store = readStore();
  const roomEntry = Object.values(store).find(entry => entry?.room?.id === roomId);
  const items = roomEntry?.messages ?? [];
  if (!items.length && isSupabaseEnabled && supabase) {
    hydrateChatStoreFromSupabase();
  }
  return items.slice().sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

export function listAllGroupChats(): Array<{ room: GroupChatRoom; messages: GroupChatMessage[] }> {
  if (isSupabaseEnabled && supabase) {
    hydrateChatStoreFromSupabase();
  }
  const store = readStore();
  return Object.values(store)
    .filter(Boolean)
    .map(entry => ({
      room: entry.room,
      messages: Array.isArray(entry.messages) ? entry.messages : [],
    }))
    .sort((a, b) => new Date(b.room.updated_at).getTime() - new Date(a.room.updated_at).getTime());
}

export function deleteGroupChatMessage(roomId: string, messageId: string, authorId?: string): boolean {
  const store = readStore();
  const key = Object.keys(store).find(item => store[item]?.room?.id === roomId);
  if (!key) return false;

  const targetMessage = (store[key]?.messages ?? []).find(message => message.id === messageId);
  if (!targetMessage || (authorId && targetMessage.user_id !== authorId)) return false;

  const nextMessages = (store[key]?.messages ?? []).filter(message => message.id !== messageId);
  store[key] = {
    ...store[key],
    room: { ...store[key].room, updated_at: new Date().toISOString() },
    messages: nextMessages,
  };
  writeStore(store);

  if (isSupabaseEnabled && supabase) {
    void supabase.from('warroom_group_chat_messages').delete().eq('id', messageId).then(undefined, () => undefined);
  }

  void logAudit({
    event: 'chat.message_deleted',
    level: 'security',
    source: 'client',
    metadata: { roomId, messageId },
  });

  return true;
}

export function editGroupChatMessage(roomId: string, messageId: string, authorId: string, text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  const store = readStore();
  const key = Object.keys(store).find(item => store[item]?.room?.id === roomId);
  if (!key) return false;

  const targetMessage = (store[key]?.messages ?? []).find(message => message.id === messageId);
  if (!targetMessage || targetMessage.user_id !== authorId) return false;

  const updatedMessage: GroupChatMessage = {
    ...targetMessage,
    text: trimmed,
    updated_at: new Date().toISOString(),
  };
  store[key] = {
    ...store[key],
    room: { ...store[key].room, updated_at: new Date().toISOString() },
    messages: (store[key].messages ?? []).map(message => message.id === messageId ? updatedMessage : message),
  };
  writeStore(store);

  if (isSupabaseEnabled && supabase) {
    void supabase.from('warroom_group_chat_messages').upsert({
      id: messageId,
      data: updatedMessage,
      updated_at: new Date().toISOString(),
    }).then(undefined, () => undefined);
  }

  void logAudit({
    event: 'chat.message_edited',
    level: 'info',
    source: 'client',
    actorId: authorId,
    metadata: { roomId, messageId, textLength: trimmed.length },
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
  if (!payload.roomId || !trimmed) return null;

  const store = readStore();
  const roomEntry = Object.values(store).find(entry => entry?.room?.id === payload.roomId);
  const room = roomEntry?.room ?? ensureGroupChatRoom(payload.groupId, 'گروه تیم', [payload.userId]);

  const newMessage: GroupChatMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    room_id: room.id,
    group_id: payload.groupId || room.group_id,
    user_id: payload.userId,
    user_name: payload.userName,
    avatar_url: payload.avatarUrl,
    text: trimmed,
    created_at: new Date().toISOString(),
    is_system: Boolean(payload.isSystem),
  };

  const targetKey = Object.keys(store).find(key => store[key]?.room?.id === payload.roomId) || buildRoomKey(room.group_id || room.id, room.id);
  const nextMessages = [...(store[targetKey]?.messages ?? roomEntry?.messages ?? []), newMessage].slice(-200);
  const nextStore = { ...store, [targetKey]: { room: { ...room, updated_at: new Date().toISOString() }, messages: nextMessages } };
  writeStore(nextStore);

  if (isSupabaseEnabled && supabase) {
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

  void logAudit({
    event: 'chat.message_sent',
    level: 'info',
    source: 'client',
    actorId: payload.userId,
    metadata: { roomId: room.id, groupId: payload.groupId, textLength: trimmed.length },
  });

  return newMessage;
}

export function getGroupChatStats(groupId: string, users: User[] = []): {
  totalMessages: number;
  activeMembers: number;
  engagementScore: number;
} {
  const store = readStore();
  const entriesForGroup = Object.values(store).filter(entry => entry?.room?.group_id === groupId);
  const allMessages = entriesForGroup.flatMap(entry => entry.messages ?? []);
  const memberIds = Array.from(new Set(entriesForGroup.flatMap(entry => entry.room.member_ids ?? [])));
  const activeMembers = memberIds.filter(id => users.some(user => user.id === id)).length;
  const totalMessages = allMessages.length;
  const engagementScore = Math.min(100, Math.round((totalMessages * 2 + activeMembers * 12) / 2));

  return { totalMessages, activeMembers, engagementScore };
}

export function subscribeGroupChat(roomId: string, onChange: (messages: GroupChatMessage[]) => void): () => void {
  const handleUpdate = () => {
    const roomEntry = Object.values(readStore()).find(entry => entry?.room?.id === roomId);
    const messages = roomEntry?.messages ?? [];
    onChange(messages.slice().sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
  };

  const listener = (event: Event) => {
    const customDetail = (event as CustomEvent).detail as ChatStore | undefined;
    if (customDetail) {
      const roomEntry = Object.values(customDetail).find(entry => entry?.room?.id === roomId);
      if (roomEntry) {
        onChange((roomEntry.messages ?? []).slice().sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
      }
      return;
    }

    const storageEvent = event as StorageEvent;
    if (storageEvent.key === CHAT_STORAGE_KEY && storageEvent.newValue) {
      try {
        const nextStore = JSON.parse(storageEvent.newValue) as ChatStore;
        const roomEntry = Object.values(nextStore).find(entry => entry?.room?.id === roomId);
        if (roomEntry) {
          onChange((roomEntry.messages ?? []).slice().sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
        }
      } catch {
        handleUpdate();
      }
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener(CHAT_EVENT_NAME, listener);
    window.addEventListener('storage', listener);
  }

  if (isSupabaseEnabled && supabase) {
    const channel = supabase.channel(`warroom_group_chat_${roomId}`);
    const roomSubscription = channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'warroom_group_chat_messages' }, (payload: any) => {
        const record = payload.new ?? payload.old;
        const message = normalizeMessageRecord(record);
        if (!message || message.room_id !== roomId) return;
        handleUpdate();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'warroom_group_chat_rooms' }, (payload: any) => {
        const room = normalizeRoomRecord(payload.new ?? payload.old);
        if (!room || room.id !== roomId) return;
        handleUpdate();
      })
      .subscribe();

    const unsubscribe = () => {
      try {
        if (supabase) {
          void supabase.removeChannel(roomSubscription);
        }
      } catch {
        // ignore
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener(CHAT_EVENT_NAME, listener);
        window.removeEventListener('storage', listener);
      }
    };

    handleUpdate();
    void supabase.from('warroom_group_chat_messages').select('id, data').eq('data->>room_id', roomId)
      .then(({ data }) => {
        const nextMessages = ((data || []) as any[]) .map(normalizeMessageRecord).filter((message): message is GroupChatMessage => Boolean(message));
        const store = readStore();
        const targetKey = Object.keys(store).find(key => store[key]?.room?.id === roomId) || roomId;
        const roomEntry = store[targetKey];
        const room = roomEntry?.room ?? { id: roomId, group_id: '', name: 'گروه تیم', member_ids: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        ensureRoomInLocalStore(room, nextMessages);
        onChange(nextMessages.slice().sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
      })
      .then(undefined, () => handleUpdate());

    return unsubscribe;
  }

  handleUpdate();
  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener(CHAT_EVENT_NAME, listener);
      window.removeEventListener('storage', listener);
    }
  };
}
