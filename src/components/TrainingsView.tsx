import React, { useState } from 'react';
import { 
  BookOpen, 
  Video, 
  Play, 
  FileText, 
  Image as ImageIcon, 
  Sparkles, 
  Shield, 
  Users, 
  CheckCircle2, 
  ChevronLeft,
  Home,
  ArrowLeft
} from 'lucide-react';
import { User, Training } from '../types';
import { formatToPersianDigits } from '../utils/jalali';

interface TrainingsViewProps {
  currentUser: User;
  trainings: Training[];
  onNavigate?: (tab: string) => void;
}

export default function TrainingsView({
  currentUser,
  trainings,
  onNavigate
}: TrainingsViewProps) {
  const effectiveRole = !currentUser ? 'all' : currentUser.role === 'member' ? 'user' : currentUser.role;

  const accessibleTrainings = trainings.filter(t => 
    t.is_active && (t.target_role === 'all' || t.target_role === effectiveRole)
  );

  const [selectedTrainingId, setSelectedTrainingId] = useState<string>(accessibleTrainings[0]?.id || '');
  const selectedTraining = accessibleTrainings.find(t => t.id === selectedTrainingId) || accessibleTrainings[0];

  return (
    <div className="space-y-6 dir-rtl pb-8">
      
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
            <BookOpen className="text-red-500" size={24} />
            آکادمی آموزش‌های استراتژیک و پدافندی
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            دوره آموزشی متناسب با نقش شما ({currentUser.role === 'leader' ? 'فرمانده جوخه' : 'رزمنده انفرادی'}) جهت ارتقای دانش سایبری
          </p>
        </div>
      </div>

      {/* Grid Layout: Trainings Selector (Right) + Active Training Details (Left) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Trainings List (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">دوره‌های اختصاصی فعال:</h3>

          <div className="space-y-2.5">
            {accessibleTrainings.map(t => {
              const isSelected = t.id === selectedTraining?.id;

              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTrainingId(t.id)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer ${
                    isSelected
                      ? 'bg-red-950/70 border-red-600/80 shadow-[0_0_15px_rgba(220,38,38,0.3)]'
                      : 'bg-[#080d21] border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-bold bg-slate-900 text-blue-400 border border-slate-800 px-2 py-0.5 rounded">
                      {t.category}
                    </span>
                    <span className="text-[10px] font-bold bg-red-950 text-red-300 px-2 py-0.5 rounded border border-red-800/60">
                      مخاطب: {t.target_role === 'all' ? 'همه رزمندگان' : t.target_role === 'leader' ? 'فرماندهان' : 'رزمندگان'}
                    </span>
                  </div>

                  <h4 className="font-extrabold text-xs text-white line-clamp-2 leading-relaxed mb-1">{t.title}</h4>
                  <p className="text-[11px] text-slate-400 line-clamp-1">{t.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Training Details & Content Player (8 cols) */}
        {selectedTraining ? (
          <div className="lg:col-span-8 bg-[#080d21] border border-slate-800 rounded-2xl p-5 md:p-6 space-y-6 shadow-lg">
            
            {/* Header info */}
            <div className="border-b border-slate-800 pb-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="bg-red-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded uppercase tracking-wider">
                  دسته‌بندی: {selectedTraining.category}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  تاریخ انتشار: {selectedTraining.created_at}
                </span>
              </div>

              <h3 className="text-lg md:text-xl font-black text-white">{selectedTraining.title}</h3>
            </div>

            {/* Video / Media Player Container */}
            {selectedTraining.video_url && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Video size={16} className="text-red-400" />
                  ویدئوی آموزشی کارگاه:
                </span>
                <div className="aspect-video w-full rounded-xl overflow-hidden border border-slate-800 bg-black">
                  <video 
                    src={selectedTraining.video_url} 
                    controls 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {selectedTraining.media_path && selectedTraining.media_type === 'image' && (
              <div className="rounded-xl overflow-hidden border border-slate-800 max-h-80">
                <img 
                  src={selectedTraining.media_path} 
                  alt={selectedTraining.title} 
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Description Text */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300">متن کامل راهنما و جزئیات دوره:</h4>
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-xs md:text-sm text-slate-200 leading-relaxed space-y-3">
                <p>{selectedTraining.description}</p>
                <div className="pt-3 border-t border-slate-800/80 flex items-center gap-2 text-emerald-400 text-xs font-bold">
                  <CheckCircle2 size={16} />
                  <span>دوره فعال است. پس از مطالعه دوره می‌توانید در مأموریت‌های مرتبط شرکت نمایید.</span>
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div className="lg:col-span-8 bg-[#080d21] border border-slate-800 rounded-2xl p-8 text-center text-slate-500">
            آموزشی جهت نمایش یافت نشد.
          </div>
        )}

      </div>
    </div>
  );
}
