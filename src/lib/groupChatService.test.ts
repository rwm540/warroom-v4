import { describe, it, expect, beforeEach } from 'vitest';
import { appendGroupChatMessage, ensureGroupChatRoom, listAllGroupChats, deleteGroupChatMessage } from './groupChatService';

describe('groupChatService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('creates room, appends message, and deletes it', () => {
    const roomA = ensureGroupChatRoom('group_alpha', 'Alpha Squad', ['u1', 'u2']);
    const msg1 = appendGroupChatMessage({
      roomId: roomA.id,
      groupId: 'group_alpha',
      userId: 'u1',
      userName: 'Ali',
      text: 'hello from alpha',
    });

    expect(roomA.id).toBeTruthy();
    expect(msg1).toBeTruthy();

    const rooms = listAllGroupChats();
    expect(rooms.some((entry) => entry.room.id === roomA.id)).toBe(true);

    const removed = deleteGroupChatMessage(roomA.id, msg1!.id);
    expect(removed).toBe(true);

    const nextRooms = listAllGroupChats();
    const roomEntry = nextRooms.find((entry) => entry.room.id === roomA.id);
    expect(roomEntry && roomEntry.messages.length === 0).toBe(true);
  });

  it('rejects empty messages', () => {
    const room = ensureGroupChatRoom('group_beta', 'Beta', ['u1']);
    const msg = appendGroupChatMessage({
      roomId: room.id,
      groupId: 'group_beta',
      userId: 'u1',
      userName: 'Ali',
      text: '   ',
    });
    expect(msg).toBeNull();
  });
});
