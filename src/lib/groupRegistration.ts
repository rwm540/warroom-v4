import { Group, TeamRegistrationSession, User } from '../types';

export const MAX_GROUP_MEMBERS = 4;
export const SHARED_ACCESS_LIMIT = 3;

export function generateSharedCredentials(teamName: string): { username: string; password: string } {
  const seed = (teamName || 'warroom').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 6) || 'warroom';
  const username = `team_${seed}_${Math.random().toString(36).slice(2, 6)}`;
  const password = `Wr${seed.toUpperCase()}${Math.random().toString(36).slice(2, 7)}`;
  return { username, password };
}

export function createGroupRegistrationSession(input: {
  groupId: string;
  teamName: string;
  leaderId: string;
  maxMembers?: number;
}): TeamRegistrationSession {
  const { username, password } = generateSharedCredentials(input.teamName);
  const session: TeamRegistrationSession = {
    id: `team_session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    group_id: input.groupId,
    team_name: input.teamName,
    leader_id: input.leaderId,
    shared_username: username,
    shared_password: password,
    max_members: input.maxMembers ?? MAX_GROUP_MEMBERS,
    active_session_count: 0,
    created_at: new Date().toISOString(),
    status: 'active',
  };

  try {
    const key = 'warroom_team_registration_sessions';
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    existing.push(session);
    localStorage.setItem(key, JSON.stringify(existing));
  } catch {
    // ignore localStorage issues in browser-only environment
  }

  return session;
}

export function canRedeemSharedCredentials(
  session: TeamRegistrationSession,
  activeSessionCount: number,
  groupMembersCount: number
): boolean {
  return activeSessionCount < Math.max(1, session.max_members - 1) && groupMembersCount < session.max_members;
}

export function redeemSharedCredentials(input: {
  username: string;
  password: string;
  currentGroupMembers: number;
  activeSessionCount: number;
}): { ok: boolean; session?: TeamRegistrationSession; message?: string } {
  try {
    const sessions: TeamRegistrationSession[] = JSON.parse(localStorage.getItem('warroom_team_registration_sessions') || '[]');
    const session = sessions.find(item => item.shared_username === input.username && item.shared_password === input.password);

    if (!session) {
      return { ok: false, message: 'اعتبارنامه مشترک گروه نامعتبر است.' };
    }

    if (!canRedeemSharedCredentials(session, input.activeSessionCount, input.currentGroupMembers)) {
      return { ok: false, message: 'حداکثر تعداد اعضای مجاز گروه تکمیل شده است.' };
    }

    return { ok: true, session, message: 'ورود مشترک با موفقیت فعال شد.' };
  } catch {
    return { ok: false, message: 'امکان فعال‌سازی ورود مشترک وجود ندارد.' };
  }
}

export function completeMemberProfile(input: {
  user: User;
  email: string;
  firstName: string;
  lastName: string;
  groupId: string;
}): User {
  return {
    ...input.user,
    first_name: input.firstName || input.user.first_name,
    last_name: input.lastName || input.user.last_name,
    group_id: input.groupId || input.user.group_id,
    phone: input.user.phone || '',
    is_group_member: true,
    shared_username: input.user.shared_username || '',
    shared_password: input.user.shared_password || '',
  };
}

export function updateUserCredentials(input: {
  user: User;
  newUsername: string;
  newPassword: string;
}): User {
  return {
    ...input.user,
    shared_username: input.newUsername.trim() || input.user.shared_username || '',
    shared_password: input.newPassword.trim() || input.user.shared_password || '',
  };
}

export function createGroupRecord(input: {
  leaderId: string;
  groupName: string;
  leaderName: string;
  membersCount?: number;
  city?: string;
  province?: string;
}): Group {
  const { username, password } = generateSharedCredentials(input.groupName);
  return {
    id: `group_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    leader_id: input.leaderId,
    name: input.groupName || `${input.leaderName} تیم`,
    members_count: input.membersCount ?? 1,
    education_level: 'متوسطه اول',
    gender: 'پسر',
    province: input.province || 'تهران',
    city: input.city || 'تهران',
    registration_code: `WR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    created_at: new Date().toISOString(),
    shared_username: username,
    shared_password: password,
    max_members: MAX_GROUP_MEMBERS,
    member_ids: [input.leaderId],
    status: 'active',
  };
}
