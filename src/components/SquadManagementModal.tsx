import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Edit3, 
  X, 
  Check, 
  AlertCircle, 
  KeyRound,
  Copy,
  Loader2,
  Layers
} from 'lucide-react';
import { Group, GroupJoinRequest, SquadRank, User } from '../types';
import { confirmInternal } from '../lib/appDialog';
import { normalizeToEnglishDigits } from '../utils/jalali';
import {
  createSquad,
  fetchUsersByIds,
  listSquadMemberCredentials,
  provisionSquadMembers,
  reissueMemberPassword,
  userFromProvisionedMember,
  type ProvisionedMember,
  type SquadMemberCredentialStatus,
  type SquadMemberDraft,
  squadApiErrorMessage,
} from '../lib/squadApi';
import { appendGroupChatMessage, ensureGroupChatRoom } from '../lib/groupChatService';
import PersianDatePicker from './PersianDatePicker';

export type SquadModalMode = 'manage' | 'create_squad' | 'create_subgroup';

interface SquadManagementModalProps {
  currentUser: User;
  setCurrentUser?: React.Dispatch<React.SetStateAction<User | null>>;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  groups: Group[];
  setGroups: React.Dispatch<React.SetStateAction<Group[]>>;
  groupJoinRequests: GroupJoinRequest[];
  setGroupJoinRequests: React.Dispatch<React.SetStateAction<GroupJoinRequest[]>>;
  onClose: () => void;
  triggerAlert: (msg: string) => void;
  /** وقتی از چت‌روم باز می‌شود، مشخص می‌کند کاربر قصد ساخت جوخه/زیرگروه دارد. */
  initialMode?: SquadModalMode;
}

interface IssuedCredential {
  full_name: string;
  login_id: string;
  password: string;
}

const EMPTY_MEMBER_FORM = {
  first_name: '',
  last_name: '',
  national_code: '',
  phone: '',
  grade: 'یازدهم',
  birth_date: '1387-05-15',
  password: '',
  squad_rank: 'soldier' as SquadRank,
};

export default function SquadManagementModal({
  currentUser,
  setCurrentUser,
  users,
  setUsers,
  groups,
  setGroups,
  groupJoinRequests,
  setGroupJoinRequests,
  onClose,
  triggerAlert,
  initialMode = 'manage'
}: SquadManagementModalProps) {
  // Find group
  const userGroup = groups.find(g => g.id === currentUser.group_id);
  const squadMembers = users.filter(u => u.group_id === currentUser.group_id);
  const isLeader = currentUser.role === 'admin' || !userGroup || userGroup?.leader_id === currentUser.id;
  const canCreateSubgroup = Boolean(userGroup) && (currentUser.role === 'admin' || userGroup?.leader_id === currentUser.id);
  const incomingRequests = groupJoinRequests.filter(request => request.target_group_id === currentUser.group_id && request.status === 'pending');
  const outgoingRequests = groupJoinRequests.filter(request => request.requester_id === currentUser.id && request.status === 'pending');

  const [mode, setMode] = useState<SquadModalMode>(initialMode);

  // وقتی از چت‌روم با قصد مشخص باز می‌شود، همان حالت فعال بماند.
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const [newSquadNameInput, setNewSquadNameInput] = useState('');
  const [isCreatingSquad, setIsCreatingSquad] = useState(false);
  const [isSubmittingMember, setIsSubmittingMember] = useState(false);
  const [issuedCredentials, setIssuedCredentials] = useState<IssuedCredential[]>([]);
  const [memberStatuses, setMemberStatuses] = useState<SquadMemberCredentialStatus[]>([]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('warroom_modal_active_change', { detail: { active: true } }));
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.dispatchEvent(new CustomEvent('warroom_modal_active_change', { detail: { active: false } }));
    };
  }, [onClose]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const [memberForm, setMemberForm] = useState({
    ...EMPTY_MEMBER_FORM,
    grade: currentUser.grade || 'یازدهم',
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /** پیام سیستمی در چت‌روم — فقط پس از تأیید موفقیت سمت سرور فراخوانی می‌شود. */
  const announceInChat = useCallback((squad: Group, text: string) => {
    ensureGroupChatRoom(squad.id, squad.name || 'جوخه', squad.member_ids || []);
    appendGroupChatMessage({
      roomId: `room_${squad.id}`,
      groupId: squad.id,
      userId: 'system',
      userName: 'سامانه اتاق جنگ',
      text,
      isSystem: true,
    });
  }, []);

  /** بارگذاری وضعیت اعتبارنامهٔ اعضا برای شناسایی حساب‌های قدیمی بدون رمز. */
  const refreshMemberStatuses = useCallback(async (groupId?: string) => {
    const target = groupId || currentUser.group_id;
    if (!target) {
      setMemberStatuses([]);
      return;
    }
    const result = await listSquadMemberCredentials(target);
    setMemberStatuses(result.ok && result.data ? result.data.members : []);
  }, [currentUser.group_id]);

  useEffect(() => {
    void refreshMemberStatuses();
  }, [refreshMemberStatuses, currentUser.group_id]);

  /**
   * ساخت جوخهٔ اصلی یا زیرگروه — از طریق API سرور.
   * تا زمانی که سرور موفقیت را تأیید نکند، هیچ حالتی تغییر نمی‌کند و پیام موفقیت
   * نمایش داده نمی‌شود.
   */
  const handleCreateSquad = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const name = newSquadNameInput.trim();
    if (name.length < 2) {
      setErrorMsg('نام جوخه باید حداقل ۲ نویسه باشد.');
      return;
    }

    const isSubgroup = mode === 'create_subgroup' && Boolean(userGroup);
    setIsCreatingSquad(true);
    const result = await createSquad({
      name,
      parentSquadId: isSubgroup ? userGroup!.id : null,
      metadata: {
        educationLevel: currentUser.education_level,
        gender: currentUser.gender,
        province: currentUser.province,
        city: currentUser.city,
      },
    });
    setIsCreatingSquad(false);

    if (!result.ok || !result.data) {
      const message = squadApiErrorMessage(result);
      setErrorMsg(message);
      triggerAlert(message);
      return;
    }

    const squad = result.data.squad;
    setGroups(prev => [...prev.filter(item => item.id !== squad.id), squad]);

    if (!isSubgroup) {
      // سرور group_id و نقش سرگروه را تعیین کرده است؛ همان را از دیتابیس می‌خوانیم.
      const [freshLeader] = await fetchUsersByIds([currentUser.id]);
      const updatedLeader: User = freshLeader || {
        ...currentUser,
        group_id: squad.id,
        role: currentUser.role === 'admin' ? currentUser.role : 'leader',
        squad_rank: 'commander',
      };
      setUsers(prev => prev.map(u => (u.id === currentUser.id ? updatedLeader : u)));
      setCurrentUser?.(updatedLeader);
      try {
        localStorage.setItem('warroom_current_user_data', JSON.stringify(updatedLeader));
      } catch {}
    }

    setMode('manage');
    setNewSquadNameInput('');
    await refreshMemberStatuses(squad.id);
    announceInChat(
      squad,
      isSubgroup
        ? `🛡️ زیرگروه «${squad.name}» به فرماندهی ${currentUser.first_name} ${currentUser.last_name} در سامانه ثبت شد و اعضای آن می‌توانند با حساب کاربری مستقل خود وارد این چت‌روم شوند.`
        : `🛡️ جوخه «${squad.name}» با موفقیت در سامانه ثبت شد و ${currentUser.first_name} ${currentUser.last_name} به عنوان فرمانده آن تعیین گردید.`
    );
    triggerAlert(
      isSubgroup
        ? `زیرگروه «${squad.name}» با موفقیت ثبت شد.`
        : `جوخه «${squad.name}» تشکیل شد و شما به عنوان فرمانده آن تعیین شدید.`
    );
  };

  const requestToJoinGroup = (targetGroup: Group) => {
    if (!currentUser.group_id || targetGroup.id === currentUser.group_id || outgoingRequests.some(request => request.target_group_id === targetGroup.id)) return;
    const request: GroupJoinRequest = {
      id: `join_${currentUser.id}_${targetGroup.id}_${Date.now()}`,
      source_group_id: currentUser.group_id,
      target_group_id: targetGroup.id,
      requester_id: currentUser.id,
      requester_name: `${currentUser.first_name} ${currentUser.last_name}`,
      target_group_name: targetGroup.name,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    setGroupJoinRequests(prev => [request, ...prev]);
    triggerAlert(`درخواست عضویت برای «${targetGroup.name}» ارسال شد.`);
  };

  const resolveJoinRequest = (request: GroupJoinRequest, status: 'accepted' | 'rejected') => {
    if (!isLeader || request.target_group_id !== currentUser.group_id) return;
    setGroupJoinRequests(prev => prev.map(item => item.id === request.id ? { ...item, status, resolved_at: new Date().toISOString(), resolved_by: currentUser.id } : item));
    if (status === 'accepted') {
      const sourceGroupId = request.source_group_id;
      const sourceGroup = groups.find(group => group.id === sourceGroupId);
      const sourceMembers = users.filter(user => user.group_id === sourceGroupId);
      if (sourceGroupId && sourceGroup && userGroup) {
        setUsers(prev => prev.map(user => user.group_id === sourceGroupId ? { ...user, group_id: userGroup.id, squad_rank: user.id === sourceGroup.leader_id ? 'jokhedar' : (user.squad_rank || 'soldier') } : user));
        setGroups(prev => prev.map(group => {
          if (group.id === userGroup.id) {
            const memberIds = Array.from(new Set([...(group.member_ids || []), ...sourceMembers.map(member => member.id)]));
            return { ...group, members_count: memberIds.length, member_ids: memberIds };
          }
          if (group.id === sourceGroupId) return { ...group, members_count: 0, member_ids: [], parent_group_id: userGroup.id, status: 'merged' };
          return group;
        }));
        triggerAlert(`جوخه «${sourceGroup.name}» زیرمجموعه جوخه «${userGroup.name}» شد و اعضا به اتاق مشترک منتقل شدند.`);
      }
    } else {
      triggerAlert(`درخواست «${request.requester_name}» رد شد.`);
    }
  };

  const openAddMemberForm = () => {
    setEditingUserId(null);
    setMemberForm({ ...EMPTY_MEMBER_FORM, grade: currentUser.grade || 'یازدهم' });
    setErrorMsg(null);
    setShowAddForm(true);
  };

  /**
   * ثبت عضو جدید: حساب کاربری مستقل و قابل ورود توسط سرور ساخته می‌شود.
   * در صورت شکست، هیچ عضویتی اضافه نمی‌شود و پیام موفقیت نمایش داده نمی‌شود.
   */
  const handleSubmitMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const firstName = memberForm.first_name.trim();
    const lastName = memberForm.last_name.trim();
    const cleanNatCode = normalizeToEnglishDigits(memberForm.national_code).replace(/\D/g, '');
    const cleanPhone = normalizeToEnglishDigits(memberForm.phone).replace(/\D/g, '');
    const cleanBirthDate = normalizeToEnglishDigits(memberForm.birth_date).trim();

    if (!firstName || !lastName) {
      setErrorMsg('لطفاً نام و نام خانوادگی عضو جدید را وارد نمایید.');
      return;
    }
    if (cleanNatCode.length !== 10) {
      setErrorMsg('کد ملی باید دقیقاً ۱۰ رقم باشد.');
      return;
    }
    if (!/^09\d{9}$/.test(cleanPhone)) {
      setErrorMsg('شمارهٔ موبایل باید ۱۱ رقم و با ۰۹ آغاز شود؛ کد تأیید ورود عضو به همین شماره ارسال می‌شود.');
      return;
    }

    // ویرایش پروفایل یک عضو موجود؛ رمز عبور از این مسیر تغییر نمی‌کند.
    if (editingUserId) {
      const existingMember = users.find(user => user.id === editingUserId);
      if (!existingMember) {
        setErrorMsg('حساب نیروی انتخاب‌شده پیدا نشد.');
        return;
      }
      const updatedMember: User = {
        ...existingMember,
        first_name: firstName,
        last_name: lastName,
        national_code: cleanNatCode,
        phone: cleanPhone,
        grade: memberForm.grade,
        birth_date: cleanBirthDate || existingMember.birth_date,
        squad_rank: memberForm.squad_rank,
        role: memberForm.squad_rank === 'commander' ? 'leader' : memberForm.squad_rank === 'soldier' ? 'member' : 'user',
        password: '',
      };
      setUsers(prev => prev.map(user => (user.id === editingUserId ? updatedMember : user)));
      triggerAlert(`اطلاعات رزمنده «${firstName} ${lastName}» به‌روزرسانی شد.`);
      setEditingUserId(null);
      setShowAddForm(false);
      setMemberForm({ ...EMPTY_MEMBER_FORM, grade: currentUser.grade || 'یازدهم' });
      return;
    }

    if (!currentUser.group_id) {
      setErrorMsg('پیش از افزودن عضو، ابتدا جوخهٔ خود را ثبت کنید.');
      setMode('create_squad');
      return;
    }
    if (squadMembers.length >= 6) {
      setErrorMsg('سقف اعضای جوخه (حداکثر ۶ نفر) تکمیل است.');
      return;
    }

    const draft: SquadMemberDraft = {
      first_name: firstName,
      last_name: lastName,
      national_code: cleanNatCode,
      phone: cleanPhone,
      birth_date: cleanBirthDate,
      grade: memberForm.grade,
      gender: currentUser.gender,
      squad_rank: memberForm.squad_rank,
      // خالی بودن یعنی سرور رمز قوی یک‌بارمصرف تولید کند.
      password: memberForm.password.trim(),
    };

    setIsSubmittingMember(true);
    const result = await provisionSquadMembers(currentUser.group_id, [draft]);
    setIsSubmittingMember(false);

    if (!result.ok || !result.data) {
      const message = squadApiErrorMessage(result);
      setErrorMsg(message);
      triggerAlert(message);
      return;
    }

    const { squad, members } = result.data;
    setGroups(prev => prev.map(g => (g.id === squad.id ? squad : g)));

    const created: ProvisionedMember[] = members.filter(member => member.status === 'created');
    const fallbacks = new Map(
      created.map(member => [member.user_id, userFromProvisionedMember(member, draft, squad)])
    );
    const fresh = await fetchUsersByIds(members.map(member => member.user_id));
    const authoritative = new Map(fresh.map(user => [user.id, user]));

    setUsers(prev => {
      const byId = new Map(prev.map(user => [user.id, user]));
      for (const member of members) {
        if (member.status === 'unchanged') continue;
        const next = authoritative.get(member.user_id) || fallbacks.get(member.user_id);
        if (next) byId.set(member.user_id, next);
      }
      return Array.from(byId.values());
    });

    setIssuedCredentials(
      created
        .filter(member => Boolean(member.initial_password))
        .map(member => ({
          full_name: `${firstName} ${lastName}`.trim(),
          login_id: member.login_id,
          password: member.initial_password as string,
        }))
    );

    await refreshMemberStatuses(squad.id);
    announceInChat(
      squad,
      members
        .map(member => {
          if (member.status === 'created') {
            return `🪖 حساب کاربری «${firstName} ${lastName}» ساخته شد و به جوخه «${squad.name}» پیوست.`;
          }
          if (member.status === 'linked') {
            return `🔗 حساب کاربری موجود «${firstName} ${lastName}» به جوخه «${squad.name}» متصل شد.`;
          }
          return `✅ «${firstName} ${lastName}» از قبل عضو این جوخه بود.`;
        })
        .join(' ')
    );

    const summary = result.data.summary;
    triggerAlert(
      `ثبت انجام شد: ${summary.created} حساب جدید، ${summary.linked} حساب متصل، ${summary.unchanged} عضو از قبل ثبت‌شده.`
    );

    setMemberForm({ ...EMPTY_MEMBER_FORM, grade: currentUser.grade || 'یازدهم' });
    setShowAddForm(false);
  };

  /** تعیین رمز اولیه برای اعضای قدیمی که اعتبارنامهٔ معتبر ندارند. */
  const handleIssuePassword = async (member: User) => {
    setErrorMsg(null);
    if (!currentUser.group_id) return;

    const result = await reissueMemberPassword(currentUser.group_id, member.national_code);
    if (!result.ok || !result.data) {
      const message = squadApiErrorMessage(result);
      setErrorMsg(message);
      triggerAlert(message);
      return;
    }
    setIssuedCredentials([
      {
        full_name: `${member.first_name} ${member.last_name}`,
        login_id: result.data.loginId,
        password: result.data.initialPassword,
      },
    ]);
    await refreshMemberStatuses(currentUser.group_id);
    triggerAlert(`رمز اولیهٔ «${member.first_name} ${member.last_name}» تعیین شد.`);
  };

  const copyCredential = async (credential: IssuedCredential) => {
    const text = `کد ملی (شناسهٔ ورود): ${credential.login_id}\nرمز اولیه: ${credential.password}`;
    try {
      await navigator.clipboard.writeText(text);
      triggerAlert('اطلاعات ورود کپی شد.');
    } catch {
      triggerAlert('کپی خودکار ممکن نشد؛ اطلاعات را دستی یادداشت کنید.');
    }
  };

  // Remove member handler
  const handleRemoveMember = (member: User) => {
    if (member.role === 'leader') {
      triggerAlert('امکان حذف فرمانده جوخه وجود ندارد.');
      return;
    }

    confirmInternal(`آیا از حذف رزمنده "${member.first_name} ${member.last_name}" از جوخه اطمینان دارید؟`, {
      title: 'حذف عضو از جوخه',
      onConfirm: () => {
        setUsers(prev => prev.filter(u => u.id !== member.id));
        if (userGroup) {
          setGroups(prev => prev.map(g => 
            g.id === userGroup.id ? { ...g, members_count: Math.max(1, g.members_count - 1) } : g
          ));
        }
        triggerAlert(`رزمنده "${member.first_name} ${member.last_name}" از جوخه حذف شد.`);
      }
    });
  };

  // Start edit member
  const handleStartEdit = (member: User) => {
    setEditingUserId(member.id);
    setMemberForm({
      first_name: member.first_name,
      last_name: member.last_name,
      national_code: member.national_code,
      phone: member.phone,
      grade: member.grade,
      birth_date: member.birth_date,
      password: '',
      squad_rank: member.squad_rank || (member.role === 'leader' ? 'commander' : 'soldier')
    });
    setErrorMsg(null);
    setShowAddForm(true);
  };

  const showCreateForm = mode === 'create_squad' || (!userGroup && mode !== 'create_subgroup');
  const createFormTitle = mode === 'create_subgroup'
    ? 'ثبت زیرگروه جدید'
    : 'تشکیل جوخه جدید';
  const createFormHint = mode === 'create_subgroup'
    ? `(زیرمجموعهٔ «${userGroup?.name || 'جوخهٔ شما'}» — اعضا حساب مستقل دریافت می‌کنند)`
    : '(برای فرماندهی و افزودن نیروها)';

  const credentialStatusOf = (userId: string) => memberStatuses.find(item => item.user_id === userId);

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 dir-rtl overflow-y-auto"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-[#080c1d] border border-red-900/80 rounded-3xl w-full max-w-2xl p-4 sm:p-6 space-y-5 shadow-2xl max-h-[85vh] sm:max-h-[88vh] overflow-y-auto my-auto"
      >
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Users size={22} className="text-red-400" />
            <h3 className="text-base font-black text-white">
              مدیریت رزمندگان جوخه: <span className="text-red-400">{userGroup?.name || 'جوخه عملیاتی'}</span>
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Squad Status & Action Bar */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-bold">
          <div className="flex items-center gap-2">
            <span className="text-slate-300">
              تعداد اعضای فعلی: <span className="text-red-400 font-mono text-sm">{squadMembers.length}</span> از حداکثر ۶ نفر
            </span>
            {userGroup && (
              <span className="bg-red-950/60 border border-red-800/60 text-red-300 text-[11px] px-2 py-0.5 rounded-md">
                {userGroup.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {canCreateSubgroup && (
              <button
                onClick={() => { setMode('create_subgroup'); setShowAddForm(false); setErrorMsg(null); }}
                className="bg-cyan-800 hover:bg-cyan-700 text-white font-extrabold text-xs px-3 py-2 rounded-lg transition flex items-center gap-1.5"
              >
                <Layers size={15} />
                <span>ثبت زیرگروه</span>
              </button>
            )}
            {squadMembers.length < 6 && (
              <button
                onClick={openAddMemberForm}
                className="bg-red-700 hover:bg-red-600 text-white font-extrabold text-xs px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 shadow-lg shadow-red-900/40 active:scale-95"
              >
                <UserPlus size={16} />
                <span>افزودن عضو جدید به جوخه</span>
              </button>
            )}
          </div>
        </div>

        {/* Create squad / subgroup — only reachable while the commander is authorised */}
        {(showCreateForm || mode === 'create_subgroup') && (
          <form onSubmit={handleCreateSquad} className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3.5 space-y-2.5">
            <h4 className="text-xs font-black text-cyan-300 flex items-center gap-1.5 flex-wrap">
              <span>{createFormTitle}</span>
              <span className="text-[10px] text-slate-400 font-normal">{createFormHint}</span>
            </h4>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="نام جوخه (مثال: جوخه ذوالفقار)"
                value={newSquadNameInput}
                onChange={(e) => setNewSquadNameInput(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                minLength={2}
                maxLength={60}
              />
              <button
                type="submit"
                disabled={isCreatingSquad}
                className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 text-white text-xs font-bold px-4 py-2 rounded-lg transition flex items-center gap-1.5"
              >
                {isCreatingSquad && <Loader2 size={14} className="animate-spin" />}
                <span>{mode === 'create_subgroup' ? 'ثبت زیرگروه' : 'تشکیل جوخه'}</span>
              </button>
            </div>
            <p className="text-[10px] leading-5 text-slate-400">
              ثبت گروه و حساب اعضا فقط پس از تأیید سرور انجام می‌شود؛ در صورت بروز خطا هیچ تغییری ذخیره نمی‌گردد.
            </p>
          </form>
        )}

        {/* One-time credentials issued by the server */}
        {issuedCredentials.length > 0 && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 space-y-2.5">
            <h4 className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
              <KeyRound size={15} />
              <span>اطلاعات ورود اعضا — فقط یک بار نمایش داده می‌شود</span>
            </h4>
            <p className="text-[10px] leading-5 text-emerald-200/80">
              هر عضو با کد ملی خود از صفحهٔ ورود سامانه وارد پنل شخصی‌اش می‌شود و در نخستین ورود ملزم به تغییر رمز است.
              این رمز هیچ‌جا ذخیره نمی‌شود؛ آن را یادداشت کنید.
            </p>
            <div className="space-y-2">
              {issuedCredentials.map((credential) => (
                <div key={credential.login_id} className="flex items-center justify-between gap-2 rounded-lg border border-emerald-700/50 bg-slate-950 p-2.5">
                  <div className="min-w-0 text-[11px] text-slate-200">
                    <div className="font-bold text-white truncate">{credential.full_name || 'رزمنده جدید'}</div>
                    <div className="font-mono text-emerald-300" dir="ltr">ID: {credential.login_id}</div>
                    <div className="font-mono text-amber-300" dir="ltr">PASS: {credential.password}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyCredential(credential)}
                    className="shrink-0 rounded-lg border border-emerald-600/50 bg-emerald-900/40 p-1.5 text-emerald-200 hover:bg-emerald-800/50"
                    title="کپی اطلاعات ورود"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setIssuedCredentials([])}
              className="w-full rounded-lg bg-slate-800 py-1.5 text-[11px] font-bold text-slate-300"
            >
              اطلاعات را یادداشت کردم؛ بستن
            </button>
          </div>
        )}

        {/* Requests and Joint Squad Section */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 space-y-2">
            <h4 className="text-xs font-black text-cyan-300">پیوستن به گروه دیگر</h4>
            <p className="text-[10px] leading-5 text-slate-400">بدون پذیرش سرگروه، گروه و روم شما تغییر نمی‌کند.</p>
            <div className="max-h-24 space-y-1 overflow-y-auto">
              {groups.filter(group => Boolean(group?.id) && group.id !== currentUser?.group_id).map(group => (
                <button key={group.id} type="button" onClick={() => requestToJoinGroup(group)} disabled={outgoingRequests.some(request => request.target_group_id === group.id)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-right text-[10px] text-slate-200 disabled:cursor-not-allowed disabled:opacity-50 hover:border-cyan-500">{group.name || 'جوخه'} <span className="text-slate-500">({group.members_count || 0}/{group.max_members || 4})</span></button>
              ))}
            </div>
          </div>
          {isLeader && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-2">
              <h4 className="text-xs font-black text-amber-300">درخواست‌های عضویت</h4>
              {incomingRequests.length === 0 ? (
                <p className="text-[10px] text-slate-500">درخواست جدیدی نیست.</p>
              ) : (
                incomingRequests.map(request => (
                  <div key={request.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-900 p-2">
                    <span className="text-[10px] text-slate-200">{request.requester_name}</span>
                    <span className="flex gap-1">
                      <button type="button" onClick={() => resolveJoinRequest(request, 'accepted')} className="rounded bg-emerald-600 p-1 text-white" title="تأیید"><Check size={12} /></button>
                      <button type="button" onClick={() => resolveJoinRequest(request, 'rejected')} className="rounded bg-rose-700 p-1 text-white" title="رد"><X size={12} /></button>
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="bg-red-950/80 border border-red-800 text-red-300 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Add / Edit Form Modal Box */}
        {showAddForm && (
          <form onSubmit={handleSubmitMember} className="bg-slate-950 border border-red-900/60 p-4 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-red-400 border-b border-slate-800 pb-2">
              {editingUserId ? 'ویرایش مشخصات رزمنده' : 'ثبت رزمنده جدید در جوخه (حداکثر ۶ نفر)'}
            </h4>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">نام:</label>
                <input
                  type="text"
                  value={memberForm.first_name}
                  onChange={(e) => setMemberForm({ ...memberForm, first_name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">نام خانوادگی:</label>
                <input
                  type="text"
                  value={memberForm.last_name}
                  onChange={(e) => setMemberForm({ ...memberForm, last_name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">کد ملی ۱۰ رقمی (شناسهٔ ورود عضو):</label>
                <input
                  type="text"
                  maxLength={10}
                  value={memberForm.national_code}
                  onChange={(e) => setMemberForm({ ...memberForm, national_code: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">شماره موبایل (دریافت کد تأیید):</label>
                <input
                  type="text"
                  maxLength={11}
                  value={memberForm.phone}
                  onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white"
                  placeholder="09123456789"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">پایه تحصیلی:</label>
                <input
                  type="text"
                  value={memberForm.grade}
                  onChange={(e) => setMemberForm({ ...memberForm, grade: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">تاریخ تولد شمسی:</label>
                <PersianDatePicker
                  value={memberForm.birth_date}
                  onChange={(val) => setMemberForm({ ...memberForm, birth_date: val })}
                  isGirls={currentUser.gender === 'دختر'}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  رمز اولیه {editingUserId ? '(برای تغییر از مسیر «تعیین رمز» استفاده کنید)' : '(اختیاری)'}:
                </label>
                <input
                  type="password"
                  value={memberForm.password}
                  onChange={(e) => setMemberForm({ ...memberForm, password: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  disabled={Boolean(editingUserId)}
                  minLength={editingUserId ? undefined : 8}
                  placeholder={editingUserId ? '—' : 'خالی بگذارید تا رمز قوی ساخته شود'}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">درجه جوخه:</label>
                <select
                  value={memberForm.squad_rank}
                  onChange={(e) => setMemberForm({ ...memberForm, squad_rank: e.target.value as SquadRank })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="soldier">سرباز</option>
                  <option value="farmando">فرمانرو</option>
                  <option value="jokhedar">جوخه‌دار</option>
                  <option value="commander">فرمانده</option>
                </select>
              </div>
            </div>

            {!editingUserId && (
              <p className="text-[10px] leading-5 text-slate-400">
                حساب عضو مستقیماً توسط سرور ساخته می‌شود؛ رمز سمت سرور هش می‌گردد و عضو می‌تواند با کد ملی خود از
                صفحهٔ ورود سامانه وارد پنل شخصی‌اش شود.
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="w-1/3 bg-slate-800 text-slate-300 text-xs font-bold py-2 rounded-lg"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={isSubmittingMember}
                className="w-2/3 bg-red-700 hover:bg-red-600 disabled:opacity-60 text-white text-xs font-bold py-2 rounded-lg transition flex items-center justify-center gap-1.5"
              >
                {isSubmittingMember && <Loader2 size={14} className="animate-spin" />}
                <span>{editingUserId ? 'ثبت تغییرات' : 'ساخت حساب و افزودن به اعضا'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Squad Members List Table */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-400">اعضای ثبت‌شده در جوخه:</h4>

          <div className="space-y-2">
            {squadMembers.map(m => {
              const status = credentialStatusOf(m.id);
              const needsCredential = Boolean(m.national_code) && status ? status.has_credentials === false : false;
              return (
                <div 
                  key={m.id}
                  className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                      m.role === 'leader' ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-slate-900 text-slate-300'
                    }`}>
                      {m.first_name?.[0] || '؟'}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-xs text-white">{m.first_name} {m.last_name}</span>
                        {m.personal_code && (
                          <span className="text-[10px] bg-slate-900 text-slate-400 font-mono px-1.5 rounded">
                            کد: {m.personal_code}
                          </span>
                        )}
                        {m.role === 'leader' && (
                          <span className="bg-red-950 text-red-300 text-[9px] font-bold px-1.5 rounded border border-red-800/60">
                            فرمانده
                          </span>
                        )}
                        {needsCredential && (
                          <span className="bg-amber-950 text-amber-300 text-[9px] font-bold px-1.5 rounded border border-amber-800/60">
                            بدون رمز ورود
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5 flex-wrap">
                        <span>کد ملی: <span className="font-mono">{m.national_code}</span></span>
                        <span>موبایل: <span className="font-mono">{m.phone}</span></span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {needsCredential && (
                      <button
                        onClick={() => handleIssuePassword(m)}
                        className="p-1.5 bg-amber-950/60 hover:bg-amber-900 text-amber-300 rounded-lg border border-amber-800"
                        title="تعیین رمز اولیهٔ ورود"
                      >
                        <KeyRound size={14} />
                      </button>
                    )}
                    {m.role !== 'leader' && (
                      <>
                        <button
                          onClick={() => handleStartEdit(m)}
                          className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-700"
                          title="ویرایش عضو"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleRemoveMember(m)}
                          className="p-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded-lg border border-rose-800"
                          title="حذف از جوخه"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
