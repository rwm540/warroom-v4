import React from 'react';
import { User, Group } from '../../types';
import { Shield, Star, Award, UserPlus, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface UserStatusCardProps {
  currentUser: User | null;
  userGroup?: Group | null;
  onOpenRegister: () => void;
  onOpenLogin: () => void;
  onOpenSquadModal?: () => void;
}

export default function UserStatusCard({
  currentUser,
  userGroup,
  onOpenRegister,
  onOpenLogin,
  onOpenSquadModal
}: UserStatusCardProps) {
  if (currentUser) {
    const isLeader = currentUser.role === 'leader';
    const isAdmin = currentUser.role === 'admin';
    const userRankTitle = isAdmin 
      ? 'فرماندهی کل ستاد' 
      : isLeader 
        ? 'فرمانده جوخه' 
        : 'رزمنده اتاق جنگ';

    return (
      <div className="mx-4 my-3 p-3.5 rounded-2xl cyber-card-3d dir-rtl flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cyan-950/70 border border-cyan-400/50 flex items-center justify-center text-cyan-400 flex-shrink-0 shadow-[0_0_10px_rgba(34,211,238,0.3)]">
            {isAdmin ? <Shield size={18} /> : isLeader ? <Star size={18} /> : <Award size={18} />}
          </div>
          <div className="space-y-0.5 text-right">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-white">
                {userRankTitle}
              </span>
              <span className="px-1.5 py-0.2 rounded-md text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-0.5">
                <CheckCircle2 size={9} />
                <span>عملیاتی</span>
              </span>
            </div>
            <p className="text-[10px] text-slate-300">
              {userGroup ? `عضو ${userGroup.name}` : 'وضعیت عملیاتی شما فعال و اماده دریافت مأموریت است'}
            </p>
          </div>
        </div>

        {isLeader && onOpenSquadModal && (
          <button
            onClick={onOpenSquadModal}
            className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/40 transition-colors flex items-center gap-1 flex-shrink-0"
          >
            <span>مدیریت جوخه</span>
            <ArrowLeft size={11} />
          </button>
        )}
      </div>
    );
  }

  // Guest invitation card
  return (
    <div className="mx-4 my-3 p-3.5 rounded-2xl cyber-card-3d dir-rtl flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-cyan-950/70 border border-cyan-500/40 flex items-center justify-center text-cyan-400 flex-shrink-0">
          <Shield size={16} />
        </div>
        <div className="space-y-0.5 text-right">
          <h4 className="text-xs font-black text-white">
            به قرارگاه خوش آمدید
          </h4>
          <p className="text-[10px] text-slate-300">
            برای شرکت در مسابقات و دریافت مأموریت‌ها ثبت‌نام کنید.
          </p>
        </div>
      </div>

      <button
        onClick={onOpenRegister}
        className="px-3 py-1.5 rounded-xl text-[11px] font-black text-slate-950 bg-cyan-400 hover:bg-cyan-300 border border-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.5)] transition-all flex items-center gap-1 flex-shrink-0"
      >
        <UserPlus size={12} />
        <span>ثبت‌نام</span>
      </button>
    </div>
  );
}
