import assert from 'node:assert/strict';
import { appendGroupChatMessage, ensureGroupChatRoom, listAllGroupChats, deleteGroupChatMessage } from './groupChatService';

const roomA = ensureGroupChatRoom('group_alpha', 'Alpha Squad', ['u1', 'u2']);
const msg1 = appendGroupChatMessage({
  roomId: roomA.id,
  groupId: 'group_alpha',
  userId: 'u1',
  userName: 'Ali',
  text: 'hello from alpha',
});

assert.ok(roomA.id, 'room should be created');
assert.ok(msg1, 'message should be created');

const rooms = listAllGroupChats();
assert.ok(rooms.some((entry) => entry.room.id === roomA.id), 'chat room should be visible to admin');

const removed = deleteGroupChatMessage(roomA.id, msg1!.id);
assert.equal(removed, true, 'message should be deletable by admin');

const nextRooms = listAllGroupChats();
const roomEntry = nextRooms.find((entry) => entry.room.id === roomA.id);
assert.ok(roomEntry && roomEntry.messages.length === 0, 'room should be empty after message deletion');

console.log('group chat service test passed');
