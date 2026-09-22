import React, { useState } from 'react';
import { 
  Target, 
  UploadCloud, 
  FileCheck, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  Video, 
  Music, 
  Image as ImageIcon, 
  Clock, 
  Info, 
  Check, 
  Trash2, 
  RotateCcw,
  Sparkles,
  ExternalLink,
  Home,
  ArrowLeft
} from 'lucide-react';
import { User, Mission, MissionSubmission } from '../types';
import { formatToPersianDigits } from '../utils/jalali';

interface MissionsViewProps {
  currentUser: User;
  missions: Mission[];
  submissions: MissionSubmission[];
  setSubmissions: React.Dispatch<React.SetStateAction<MissionSubmission[]>>;
  triggerAlert: (msg: string) => void;
  onNavigate?: (tab: string) => void;
}

const ALLOWED_EXTENSIONS = [
  'pdf', 'doc', 'docx', 'txt', 'zip', 'rar', 
  'jpg', 'jpeg', 'png', 'gif', 
  'mp4', 'mov', 'avi', 'mkv', 'webm', 
  'mp3', 'wav', 'flac', 'ogg'
];

export default function MissionsView({
  currentUser,
  missions,
  submissions,
  setSubmissions,
  triggerAlert,
  onNavigate
}: MissionsViewProps) {
  if (!currentUser) {
    return (
      <div className="dir-rtl max-w-2xl mx-auto py-12 px-4 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-red-950/80 border border-red-600/60 flex items-center justify-center text-red-400 mx-auto shadow-[0_0_20px_rgba(220,38,38,0.3)]">
          <Target size={32} />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-white">مأموریت‌های اتاق جنگ</h2>
          <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
            برای مشاهده و ارسال پاسخ مأموریت‌های عملیاتی، ابتدا باید وارد حساب کاربری خود شوید.
          </p>
        </div>
      </div>
    );
  }

  const [selectedMissionId, setSelectedMissionId] = useState<string>(missions[0]?.id || '');
  const selectedMission = missions.find(m => m.id === selectedMissionId) || missions[0];

  // Current user's submission for this mission
  const existingSubmission = submissions.find(
    s => s.mission_id === selectedMission?.id && s.user_id === currentUser.id
  );

  // Upload Form State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [userNote, setUserNote] = useState<string>(existingSubmission?.user_note || '');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // File selection handler
  const handleFileChange = (file: File | null) => {
    setUploadError(null);
    if (!file) {
      setSelectedFile(null);
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setUploadError(`فرمت فایل انتخاب شده (${ext}) مجاز نیست. پسوندهای مجاز: ${ALLOWED_EXTENSIONS.join(', ')}`);
      setSelectedFile(null);
      return;
    }

    // Check size limit (1GB simulated check)
    const sizeInGB = file.size / (1024 * 1024 * 1024);
    if (sizeInGB > 1) {
      setUploadError('حجم فایل انتخاب شده بیش از حد مجاز (۱ گیگابایت) است.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Submit response handler with animated progress
  const handleSubmitResponse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile && !existingSubmission) {
      setUploadError('لطفاً یک فایل جهت بارگذاری انتخاب نمایید.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    // Simulate 1.5 second upload progress bar
    let progress = 0;
    const interval = setInterval(() => {
      progress += 15;
      if (progress >= 100) {
        progress = 100;
        setUploadProgress(100);
        clearInterval(interval);

        setTimeout(() => {
          setIsUploading(false);
          const fileName = selectedFile ? selectedFile.name : (existingSubmission?.file_name || 'گزارش_پاسخ.pdf');
          const fileSizeStr = selectedFile 
            ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB` 
            : (existingSubmission?.file_size || '2.5 MB');
          const ext = fileName.split('.').pop()?.toLowerCase() || 'pdf';

          const newSub: MissionSubmission = {
            id: existingSubmission ? existingSubmission.id : `sub-${Date.now()}`,
            user_id: currentUser.id,
            user_name: `${currentUser.first_name} ${currentUser.last_name}`,
            personal_code: currentUser.personal_code,
            group_id: currentUser.group_id,
            mission_id: selectedMission.id,
            mission_title: selectedMission.title,
            file_path: `/uploads/${fileName}`,
            file_name: fileName,
            file_size: fileSizeStr,
            file_type: ext,
            user_note: userNote,
            status: 'pending',
            awarded_score: 0,
            submitted_at: '۱۴۰۳/۰۲/۲۲ - ' + new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
          };

          // Filter out old submission and add new one
          setSubmissions(prev => [
            ...prev.filter(s => !(s.mission_id === selectedMission.id && s.user_id === currentUser.id)),
            newSub
          ]);

          setSelectedFile(null);
          triggerAlert(`پاسخ مأموریت "${selectedMission.title}" بارگذاری شد و فایل قبلی جایگزین گردید.`);
        }, 300);
      } else {
        setUploadProgress(progress);
      }
    }, 120);
  };

  return (
    <div className="space-y-6 dir-rtl pb-8">
      
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
            <Target className="text-red-500" size={24} />
            ستاد مأموریت‌های عملیاتی و ارزیابی استراتژیک
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            پاسخ‌های مأموریت را بارگذاری نمایید. ارسال فایل جدید جایگزین پاسخ‌های قبلی شما خواهد شد.
          </p>
        </div>
      </div>

      {/* Main Grid: Mission Selector List (Right) + Mission Details & File Upload (Left) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Missions Selector List (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">فهرست مأموریت‌های فعال:</h3>
          
          <div className="space-y-2.5">
            {missions.filter(m => m.is_active).length === 0 && (
              <div className="p-6 rounded-xl border border-dashed border-slate-700 bg-[#080d21]/60 text-center space-y-2">
                <Target className="mx-auto text-slate-600" size={28} />
                <p className="text-xs text-slate-400 font-bold">هنوز مأموریت فعالی تعریف نشده است</p>
                <p className="text-[10px] text-slate-500 leading-relaxed">مأموریت‌های عملیاتی توسط ستاد فرماندهی از طریق پنل مدیریت تعریف می‌شوند. به‌زودی اولین عملیات اعلام خواهد شد.</p>
              </div>
            )}
            {missions.filter(m => m.is_active).map(m => {
              const sub = submissions.find(s => s.mission_id === m.id && s.user_id === currentUser.id);
              const isSelected = m.id === selectedMission?.id;

              return (
                <div
                  key={m.id}
                  onClick={() => {
                    setSelectedMissionId(m.id);
                    setUserNote(sub?.user_note || '');
                    setSelectedFile(null);
                    setUploadError(null);
                  }}
                  className={`p-3.5 rounded-xl border transition cursor-pointer ${
                    isSelected 
                      ? 'bg-red-950/70 border-red-600/80 shadow-[0_0_15px_rgba(220,38,38,0.3)]' 
                      : 'bg-[#080d21] border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-bold bg-slate-900 text-red-400 border border-red-950 px-2 py-0.5 rounded">
                      سقف امتیاز: {formatToPersianDigits(m.max_score)}
                    </span>
                    {sub && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        sub.status === 'approved' 
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                          : sub.status === 'rejected'
                          ? 'bg-red-950 text-red-300 border border-red-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}>
                        {sub.status === 'approved' ? `تأیید (${sub.awarded_score})` : sub.status === 'rejected' ? 'نیازمند اصلاح' : 'در انتظار داور'}
                      </span>
                    )}
                  </div>

                  <h4 className="font-extrabold text-xs text-white line-clamp-2 leading-relaxed mb-1">{m.title}</h4>
                  
                  {m.deadline && (
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                      <Clock size={12} className="text-slate-500" />
                      <span>مهلت تحویل: {m.deadline}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Mission Details & Upload Center (8 cols) */}
        {selectedMission && (
          <div className="lg:col-span-8 space-y-6">
            
            {/* Banner & Mission Briefing */}
            <div className="bg-[#080d21] border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
              
              {/* Banner Image */}
              {selectedMission.banner_path && (
                <div className="h-44 md:h-52 w-full relative">
                  <img 
                    src={selectedMission.banner_path} 
                    alt={selectedMission.title}
                    className="w-full h-full object-cover" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#080d21] via-[#080d21]/60 to-transparent" />
                  
                  <div className="absolute bottom-4 right-4 left-4 flex items-end justify-between">
                    <div>
                      <span className="bg-red-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded uppercase tracking-wider mb-1 inline-block">
                        مأموریت عملیاتی اصلی
                      </span>
                      <h3 className="text-base md:text-xl font-black text-white">{selectedMission.title}</h3>
                    </div>
                    <span className="bg-amber-500 text-slate-950 font-black text-xs px-3 py-1 rounded-lg font-mono">
                      {formatToPersianDigits(selectedMission.max_score)} امتیاز
                    </span>
                  </div>
                </div>
              )}

              {/* Description Body */}
              <div className="p-5 space-y-4">
                <div className="text-xs md:text-sm text-slate-200 leading-relaxed space-y-2">
                  <p className="font-bold text-slate-300">شرح دستورالعمل عملیاتی:</p>
                  <p className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 text-slate-300">
                    {selectedMission.description}
                  </p>
                </div>

                {/* Video / Audio / Image Media Frame if provided */}
                {selectedMission.video_url && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                      <Video size={14} className="text-red-400" />
                      رسانه آموزشی و راهنمای ویدئویی مأموریت:
                    </span>
                    <div className="aspect-video w-full rounded-xl overflow-hidden border border-slate-800 bg-black">
                      <video 
                        src={selectedMission.video_url} 
                        controls 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Existing Submission Status Card if Submitted */}
            {existingSubmission && (
              <div className={`p-4 rounded-xl border space-y-3 ${
                existingSubmission.status === 'approved'
                  ? 'bg-emerald-950/30 border-emerald-800/80'
                  : existingSubmission.status === 'rejected'
                  ? 'bg-red-950/40 border-red-800/80'
                  : 'bg-amber-950/30 border-amber-800/80'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {existingSubmission.status === 'approved' && <CheckCircle2 className="text-emerald-400" size={20} />}
                    {existingSubmission.status === 'rejected' && <XCircle className="text-red-400" size={20} />}
                    {existingSubmission.status === 'pending' && <Clock className="text-amber-400 animate-pulse" size={20} />}

                    <div>
                      <h4 className="text-xs font-extrabold text-white">
                        {existingSubmission.status === 'approved' && 'پاسخ مأموریت توسط داور ستاد تأیید شد'}
                        {existingSubmission.status === 'rejected' && 'پاسخ نیازمند اصلاح و ارسال مجدد است'}
                        {existingSubmission.status === 'pending' && 'پاسخ شما ارسال شد و در صف ارزیابی داوران قرار دارد'}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono">
                        تاریخ آخرین ارسال: {existingSubmission.submitted_at} | فایل: {existingSubmission.file_name} ({existingSubmission.file_size})
                      </p>
                    </div>
                  </div>

                  {existingSubmission.status === 'approved' && (
                    <div className="bg-emerald-900/60 border border-emerald-700/60 text-emerald-200 px-3 py-1 rounded-lg text-xs font-black font-mono">
                      +{formatToPersianDigits(existingSubmission.awarded_score)} امتیاز کسب شد
                    </div>
                  )}
                </div>

                {/* Admin Feedback Note if exists */}
                {existingSubmission.admin_note && (
                  <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 text-xs text-slate-200">
                    <span className="font-bold text-amber-400 block mb-1">بازخورد و بازبینی هیئت داوران:</span>
                    <p>{existingSubmission.admin_note}</p>
                  </div>
                )}
              </div>
            )}

            {/* Submission Upload Form */}
            <div className="bg-[#080d21] border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-xs font-extrabold text-white flex items-center gap-2">
                  <UploadCloud size={18} className="text-red-400" />
                  <span>بارگذاری و ارسال فایل پاسخ مأموریت</span>
                </h3>
                <span className="text-[10px] text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded font-bold">
                  حداکثر ۱ گیگابایت (جایگزینی خودکار ارسال قبلی)
                </span>
              </div>

              {uploadError && (
                <div className="bg-red-950/80 border border-red-800 text-red-300 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              <form onSubmit={handleSubmitResponse} className="space-y-4">
                
                {/* Drag & Drop File Zone */}
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer ${
                    dragActive 
                      ? 'border-red-500 bg-red-950/40' 
                      : selectedFile 
                      ? 'border-emerald-600 bg-emerald-950/20' 
                      : 'border-slate-800 hover:border-slate-700 bg-slate-950/60'
                  }`}
                >
                  <input
                    type="file"
                    id="mission-file-input"
                    className="hidden"
                    onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)}
                  />

                  <label htmlFor="mission-file-input" className="cursor-pointer space-y-2 block">
                    <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-400">
                      {selectedFile ? <FileCheck className="text-emerald-400" size={24} /> : <UploadCloud size={24} />}
                    </div>

                    {selectedFile ? (
                      <div>
                        <p className="text-xs font-bold text-emerald-400">{selectedFile.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          حجم: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB | برای تغییر کلیک کنید
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-bold text-slate-200">
                          فایل پاسخ را اینجا بکشید و رها کنید یا برای انتخاب کلیک کنید
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1">
                          فرمت‌های مجاز: PDF, DOCX, ZIP, RAR, MP4, MP3, PNG, JPG و غیره
                        </p>
                      </div>
                    )}
                  </label>
                </div>

                {/* User Note Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">توضیحات و یادداشت رزمنده (اختیاری):</label>
                  <textarea
                    rows={3}
                    value={userNote}
                    onChange={(e) => setUserNote(e.target.value)}
                    placeholder="توضیحات مربوط به نحوه حل، متدلوژی یا کدهای استخراج‌شده را اینجا بنویسید..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-red-600"
                  />
                </div>

                {/* Upload Progress Bar during upload */}
                {isUploading && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-300 font-bold font-mono">
                      <span>در حال ارسال ایمن فایل به سرور اتاق جنگ...</span>
                      <span>{formatToPersianDigits(uploadProgress)}٪</span>
                    </div>
                    <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div 
                        className="bg-gradient-to-r from-red-600 to-emerald-500 h-full transition-all duration-150"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isUploading}
                  className="w-full bg-red-700 hover:bg-red-600 text-white font-extrabold text-xs py-3 rounded-xl transition shadow-[0_0_15px_rgba(220,38,38,0.4)] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <UploadCloud size={16} />
                  <span>{existingSubmission ? 'ارسال فایل جدید و جایگزینی پاسخ قبلی' : 'ارسال نهایی فایل پاسخ'}</span>
                </button>
              </form>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
