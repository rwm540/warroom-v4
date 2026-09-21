import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Edit3, 
  X, 
  Check, 
  AlertCircle, 
  ShieldAlert, 
  User as UserIcon,
  Phone,
  IdCard,
  Calendar
} from 'lucide-react';
import { Group, GroupJoinRequest, SquadRank, User } from '../types';
import { confirmInternal } from '../lib/appDialog';
import { validateNationalCode, validatePhoneNumber, validateJalaliDate, generatePersonalCode, normalizeToEnglishDigits, generateRegistrationCode } from '../utils/jalali';
import { apiCheckNationalCodeExists } from '../lib/backendApi';
import { isSupabaseEnabled, saveUserProgressToSupabase, sha256Hex } from '../lib/supabaseData';
import PersianDatePicker from './PersianDatePicker';

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
}

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
  triggerAlert
}: SquadManagementModalProps) {
  // Find group
  const userGroup = groups.find(g => g.id === currentUser.group_id);
  const squadMembers = users.filter(u => u.group_id === currentUser.group_id);
  const isLeader = currentUser.role === 'leader' || !userGroup || userGroup?.leader_id === currentUser.id;
  const incomingRequests = groupJoinRequests.filter(request => request.target_group_id === currentUser.group_id && request.status === 'pending');
  const outgoingRequests = groupJoinRequests.filter(request => request.requester_id === currentUser.id && request.status === 'pending');

  const [newSquadNameInput, setNewSquadNameInput] = useState('');

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

  // Add / Edit Member form state
  const [memberForm, setMemberForm] = useState({
    first_name: '',
    last_name: '',
    national_code: '',
    phone: '',
    grade: currentUser.grade || 'یازدهم',
    birth_date: '1387/05/15',
    password: '',
    squad_rank: 'soldier' as SquadRank
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Create squad on-the-fly if user doesn't have one
  const handleCreateSquad = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newSquadNameInput.trim() || `جوخه ${currentUser.last_name || 'عملیاتی'}`;
    const newGroupId = `g-${Date.now()}`;
    const newGroup: Group = {
      id: newGroupId,
      name,
      leader_id: currentUser.id,
      members_count: 1,
      member_ids: [currentUser.id],
      education_level: currentUser.education_level || 'متوسطه دوم',
      gender: currentUser.gender || 'پسر',
      province: currentUser.province || 'تهران',
      city: currentUser.city || 'تهران',
      registration_code: generateRegistrationCode(),
      created_at: new Date().toISOString(),
    };
    setGroups(prev => [...prev, newGroup]);
    const updatedLeader: User = {
      ...currentUser,
      group_id: newGroupId,
      role: 'leader',
      squad_rank: 'commander'
    };
    setUsers(prev => prev.map(u => u.id === currentUser.id ? updatedLeader : u));
    if (setCurrentUser) {
      setCurrentUser(updatedLeader);
    }
    try {
      localStorage.setItem('warroom_current_user_data', JSON.stringify(updatedLeader));
    } catch {}
    setNewSquadNameInput('');
    triggerAlert(`جوخه «${name}» تشکیل شد و شما به عنوان فرمانده آن تعیین شدید.`);
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

  // Submit Add or Edit Member
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

    // Check duplicate in local state
    const duplicateInUsers = users.some(u => u.id !== editingUserId && (
      (u.national_code && normalizeToEnglishDigits(u.national_code).replace(/\D/g, '') === cleanNatCode) ||
      (u.personal_code && normalizeToEnglishDigits(u.personal_code).replace(/\D/g, '') === cleanNatCode)
    ));
    if (duplicateInUsers) {
      setErrorMsg('این کد ملی قبلاً برای رزمنده دیگری ثبت شده است.');
      return;
    }

    // Determine target group
    let targetGroupId = currentUser.group_id;
    if (!targetGroupId) {
      targetGroupId = `g-${Date.now()}`;
      const autoGroup: Group = {
        id: targetGroupId,
        name: `جوخه ${currentUser.last_name || 'عملیاتی'}`,
        leader_id: currentUser.id,
        members_count: 1,
        member_ids: [currentUser.id],
        education_level: currentUser.education_level || 'متوسطه دوم',
        gender: currentUser.gender || 'پسر',
        province: currentUser.province || 'تهران',
        city: currentUser.city || 'تهران',
        registration_code: generateRegistrationCode(),
        created_at: new Date().toISOString(),
      };
      setGroups(prev => [...prev, autoGroup]);
      const updatedLeader: User = {
        ...currentUser,
        group_id: targetGroupId,
        role: 'leader',
        squad_rank: 'commander'
      };
      setUsers(prev => prev.map(u => u.id === currentUser.id ? updatedLeader : u));
      if (setCurrentUser) {
        setCurrentUser(updatedLeader);
      }
      try {
        localStorage.setItem('warroom_current_user_data', JSON.stringify(updatedLeader));
      } catch {}
    }

    if (editingUserId) {
      // Edit existing member
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
        phone: cleanPhone || existingMember.phone,
        grade: memberForm.grade,
        birth_date: cleanBirthDate || existingMember.birth_date,
        squad_rank: memberForm.squad_rank,
        password: memberForm.password ? await sha256Hex(memberForm.password) : existingMember.password,
        role: memberForm.squad_rank === 'commander' ? 'leader' : memberForm.squad_rank === 'soldier' ? 'member' : 'user'
      };
      setUsers(prev => prev.map(user => user.id === editingUserId ? updatedMember : user));
      
      // Attempt background save without blocking
      if (isSupabaseEnabled) {
        saveUserProgressToSupabase(updatedMember).catch(err => {
          console.warn('[SquadManagement] Supabase member update note:', err);
        });
      }

      triggerAlert(`اطلاعات رزمنده "${firstName} ${lastName}" به‌روزرسانی شد.`);
      setEditingUserId(null);
    } else {
      // Add new member (check max 6 limit)
      if (squadMembers.length >= 6) {
        setErrorMsg('سقف اعضای جوخه (حداکثر ۶ نفر) تکمیل است.');
        return;
      }

      const defaultPass = memberForm.password.trim() || '123456';
      const newMember: User = {
        id: `u-mem-${Date.now()}`,
        first_name: firstName,
        last_name: lastName,
        national_code: cleanNatCode,
        phone: cleanPhone || '09120000000',
        password: await sha256Hex(defaultPass),
        role: memberForm.squad_rank === 'commander' ? 'leader' : memberForm.squad_rank === 'soldier' ? 'member' : 'user',
        education_level: currentUser.education_level || 'متوسطه دوم',
        grade: memberForm.grade || currentUser.grade || 'یازدهم',
        gender: currentUser.gender,
        province: currentUser.province,
        city: currentUser.city,
        birth_date: cleanBirthDate || '1387/05/15',
        school_name: currentUser.school_name,
        personal_code: generatePersonalCode(),
        group_id: targetGroupId,
        squad_rank: memberForm.squad_rank
      };

      // Instantly add to local users state
      setUsers(prev => [...prev, newMember]);
      
      // Update group members count
      setGroups(prev => prev.map(g => 
        g.id === targetGroupId ? { 
          ...g, 
          members_count: (g.members_count || 0) + 1,
          member_ids: Array.from(new Set([...(g.member_ids || []), newMember.id]))
        } : g
      ));

      // Attempt background save without blocking
      if (isSupabaseEnabled) {
        saveUserProgressToSupabase(newMember).catch(err => {
          console.warn('[SquadManagement] Supabase member save note:', err);
        });
      }

      triggerAlert(`رزمنده جدید "${newMember.first_name} ${newMember.last_name}" با موفقیت ایجاد و به جوخه افزوده شد.`);
    }

    setMemberForm({
      first_name: '',
      last_name: '',
      national_code: '',
      phone: '',
      grade: currentUser.grade || 'یازدهم',
      birth_date: '1387/05/15',
      password: '',
      squad_rank: 'soldier'
    });
    setShowAddForm(false);
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
    setShowAddForm(true);
  };

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
          {squadMembers.length < 6 && (
            <button
              onClick={() => {
                setEditingUserId(null);
                setMemberForm({
                  first_name: '',
                  last_name: '',
                  national_code: '',
                  phone: '',
                  grade: currentUser.grade || 'یازدهم',
                  birth_date: '1387/05/15',
                  password: '',
                  squad_rank: 'soldier' as SquadRank
                });
                setShowAddForm(true);
              }}
              className="bg-red-700 hover:bg-red-600 text-white font-extrabold text-xs px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 shadow-lg shadow-red-900/40 active:scale-95"
            >
              <UserPlus size={16} />
              <span>افزودن عضو جدید به جوخه</span>
            </button>
          )}
        </div>

        {/* If user does not have a squad yet, allow instant creation */}
        {!userGroup && (
          <form onSubmit={handleCreateSquad} className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3.5 space-y-2.5">
            <h4 className="text-xs font-black text-cyan-300 flex items-center gap-1.5">
              <span>تشکیل جوخه جدید</span>
              <span className="text-[10px] text-slate-400 font-normal">(برای فرماندهی و افزودن نیروها)</span>
            </h4>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="نام جوخه (مثال: جوخه ذوالفقار)"
                value={newSquadNameInput}
                onChange={(e) => setNewSquadNameInput(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
              />
              <button
                type="submit"
                className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition"
              >
                تشکیل جوخه
              </button>
            </div>
          </form>
        )}

        {/* Requests and Joint Squad Section */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 space-y-2">
            <h4 className="text-xs font-black text-cyan-300">پیوستن به گروه دیگر</h4>
            <p className="text-[10px] leading-5 text-slate-400">بدون پذیرش سرگروه، گروه و روم شما تغییر نمی‌کند.</p>
            <div className="max-h-24 space-y-1 overflow-y-auto">
              {groups.filter(group => group.id !== currentUser.group_id).map(group => (
                <button key={group.id} type="button" onClick={() => requestToJoinGroup(group)} disabled={outgoingRequests.some(request => request.target_group_id === group.id)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-right text-[10px] text-slate-200 disabled:cursor-not-allowed disabled:opacity-50 hover:border-cyan-500">{group.name} <span className="text-slate-500">({group.members_count}/{group.max_members || 4})</span></button>
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
                <label className="block text-[11px] font-bold text-slate-300 mb-1">کد ملی ۱۰ رقمی:</label>
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
                <label className="block text-[11px] font-bold text-slate-300 mb-1">شماره موبایل:</label>
                <input
                  type="text"
                  maxLength={11}
                  value={memberForm.phone}
                  onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white"
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
                <label className="block text-[11px] font-bold text-slate-300 mb-1">رمز عبور:</label>
                <input
                  type="password"
                  value={memberForm.password}
                  onChange={(e) => setMemberForm({ ...memberForm, password: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  required={!editingUserId}
                  minLength={6}
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
                className="w-2/3 bg-red-700 hover:bg-red-600 text-white text-xs font-bold py-2 rounded-lg transition"
              >
                {editingUserId ? 'ثبت تغییرات' : 'افزودن به اعضا'}
              </button>
            </div>
          </form>
        )}

        {/* Squad Members List Table */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-400">اعضای ثبت‌شده در جوخه:</h4>

          <div className="space-y-2">
            {squadMembers.map(m => (
              <div 
                key={m.id}
                className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                    m.role === 'leader' ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-slate-900 text-slate-300'
                  }`}>
                    {m.first_name[0]}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-white">{m.first_name} {m.last_name}</span>
                      <span className="text-[10px] bg-slate-900 text-slate-400 font-mono px-1.5 rounded">
                        کد: {m.personal_code}
                      </span>
                      {m.role === 'leader' && (
                        <span className="bg-red-950 text-red-300 text-[9px] font-bold px-1.5 rounded border border-red-800/60">
                          فرمانده
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                      <span>کد ملی: <span className="font-mono">{m.national_code}</span></span>
                      <span>موبایل: <span className="font-mono">{m.phone}</span></span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {m.role !== 'leader' && (
                  <div className="flex items-center gap-1">
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
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
