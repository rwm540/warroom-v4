import React, { useState, useEffect, useRef } from 'react';
import { 
  Music, 
  Plus, 
  Trash2, 
  Play, 
  Pause, 
  Shuffle, 
  Repeat, 
  Repeat1, 
  Radio, 
  Link as LinkIcon, 
  CheckCircle2, 
  ArrowUp, 
  ArrowDown, 
  RefreshCw, 
  Check, 
  Disc,
  Edit3,
  Upload,
  FileAudio,
  X,
  Volume2,
  Clock,
  Sparkles,
  Sliders
} from 'lucide-react';
import { SoundtrackItem, AudioPlaybackMode } from '../types';
import { confirmInternal } from '../lib/appDialog';
import { 
  battleMusicSynth, 
  syncSoundtracksNow,
  playTacticalSound, 
  getAudioContext 
} from '../utils/epicBgmEngine';
import {
  saveSoundtrackToSupabase,
  deleteSoundtrackFromSupabase,
  uploadAudioFileToSupabase,
  fetchSoundtracksFromSupabase,
  isSupabaseEnabled
} from '../lib/supabaseData';

interface AdminSoundtrackManagerProps {
  triggerAlert: (msg: string) => void;
}

export default function AdminSoundtrackManager({ triggerAlert }: AdminSoundtrackManagerProps) {
  const [playlist, setPlaylist] = useState<SoundtrackItem[]>(() => {
    return battleMusicSynth.getPlaylist();
  });

  const [playbackMode, setPlaybackMode] = useState<AudioPlaybackMode>(() => {
    return battleMusicSynth.getPlaybackMode();
  });

  const [currentActiveId, setCurrentActiveId] = useState<string>(() => {
    return battleMusicSynth.getCurrentTrack()?.id || '';
  });

  const [isPlaying, setIsPlaying] = useState<boolean>(() => {
    return battleMusicSynth.getIsRunning();
  });

  const [isLoadingFromDb, setIsLoadingFromDb] = useState<boolean>(false);

  // Form State for Adding New Track
  const [sourceType, setSourceType] = useState<'upload' | 'url' | 'synth'>('upload');
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newTag, setNewTag] = useState('حماسی / ارکسترال');
  const [newUrl, setNewUrl] = useState('');
  const [newSynthId, setNewSynthId] = useState<'epic_march' | 'cyber_mission' | 'triumph_anthem' | 'strategic_zen'>('epic_march');
  const [newColor, setNewColor] = useState('from-amber-500 to-yellow-400');
  const [newDuration, setNewDuration] = useState(90);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Edit Modal State
  const [editingTrack, setEditingTrack] = useState<SoundtrackItem | null>(null);
  const [editFormData, setEditFormData] = useState<{
    id: string;
    title: string;
    subtitle: string;
    tag: string;
    sourceType: 'upload' | 'url' | 'synth';
    url: string;
    synthTrackId: 'epic_march' | 'cyber_mission' | 'triumph_anthem' | 'strategic_zen';
    color: string;
    durationSeconds: number;
    is_active: boolean;
  }>({
    id: '',
    title: '',
    subtitle: '',
    tag: '',
    sourceType: 'url',
    url: '',
    synthTrackId: 'epic_march',
    color: 'from-amber-500 to-yellow-400',
    durationSeconds: 90,
    is_active: true
  });
  const [isEditUploading, setIsEditUploading] = useState(false);

  // Testing URL Audio
  const [testingUrl, setTestingUrl] = useState(false);
  const [testAudioObj, setTestAudioObj] = useState<HTMLAudioElement | null>(null);

  // بارگذاری داده‌ها از Supabase در شروع
  const loadTracksFromSupabase = async () => {
    setIsLoadingFromDb(true);
    try {
      const data = await fetchSoundtracksFromSupabase();
      if (Array.isArray(data) && data.length > 0) {
        setPlaylist(data);
        battleMusicSynth.setPlaylist(data);
      }
    } catch (e) {
      console.warn('[AdminSoundtrack] خطا در بارگذاری قطعات از سرور:', e);
    } finally {
      setIsLoadingFromDb(false);
    }
  };

  useEffect(() => {
    loadTracksFromSupabase();

    const handleTracksUpdated = (e: CustomEvent<SoundtrackItem[]>) => {
      setPlaylist(e.detail);
    };
    const handleTrackChanged = (e: CustomEvent<SoundtrackItem>) => {
      setCurrentActiveId(e.detail.id);
    };
    const handleSettingsUpdated = () => {
      setPlaybackMode(battleMusicSynth.getPlaybackMode());
      setPlaylist(battleMusicSynth.getPlaylist());
      setCurrentActiveId(battleMusicSynth.getCurrentTrack()?.id || '');
      setIsPlaying(battleMusicSynth.getIsRunning());
    };

    window.addEventListener('warroom_soundtracks_updated' as any, handleTracksUpdated);
    window.addEventListener('warroom_track_changed' as any, handleTrackChanged);
    window.addEventListener('warroom_audio_settings_updated' as any, handleSettingsUpdated);

    return () => {
      window.removeEventListener('warroom_soundtracks_updated' as any, handleTracksUpdated);
      window.removeEventListener('warroom_track_changed' as any, handleTrackChanged);
      window.removeEventListener('warroom_audio_settings_updated' as any, handleSettingsUpdated);
      if (testAudioObj) {
        testAudioObj.pause();
      }
    };
  }, []);

  const handleModeChange = (mode: AudioPlaybackMode) => {
    playTacticalSound('click');
    setPlaybackMode(mode);
    battleMusicSynth.setPlaybackMode(mode);
    const modeLabel = mode === 'random' ? 'پخش تصادفی (Shuffle)' : mode === 'sequential' ? 'پخش ترتیبی لیست' : 'تکرار تک‌آهنگ';
    triggerAlert(`حالت پخش موسیقی‌های اتاق جنگ به «${modeLabel}» تغییر یافت.`);
  };

  const handleToggleActive = async (id: string) => {
    playTacticalSound('click');
    let targetTrack: SoundtrackItem | undefined;
    const updated = playlist.map(item => {
      if (item.id === id) {
        targetTrack = { ...item, is_active: !item.is_active };
        return targetTrack;
      }
      return item;
    });

    setPlaylist(updated);
    battleMusicSynth.setPlaylist(updated);
    syncSoundtracksNow(updated);
    if (targetTrack) {
      await saveSoundtrackToSupabase(targetTrack);
    }
    triggerAlert('وضعیت فعال‌سازی قطعه در سرور مرکزی به‌روزرسانی شد.');
  };

  const handleDelete = async (id: string) => {
    const updated = playlist.filter(t => t.id !== id);
    setPlaylist(updated);
    battleMusicSynth.setPlaylist(updated);
    syncSoundtracksNow(updated);
    await deleteSoundtrackFromSupabase(id);

    if (updated.length === 0) {
      triggerAlert('کلیه قطعات حذف شدند. هم‌اکنون هیچ موسیقی‌ای پخش نمی‌شود و آیکون شناور کنار صفحه محو شد.');
    } else {
      triggerAlert('قطعه موسیقی با موفقیت از دیتابیس مرکزی و لیست پخش سراسری حذف شد.');
    }
  };

  const handleClearAllTracks = () => {
    confirmInternal('آیا از حذف تمام قطعات موسیقی اطمینان دارید؟ با این کار هیچ آهنگی پخش نخواهد شد و آیکون کناری صفحه نیز محو می‌شود.', {
      title: 'تأیید حذف لیست موسیقی',
      confirmText: 'حذف همه قطعات',
      onConfirm: async () => {
        const ids = playlist.map(p => p.id);
        setPlaylist([]);
        battleMusicSynth.setPlaylist([]);
        syncSoundtracksNow([]);
        for (const tid of ids) {
          await deleteSoundtrackFromSupabase(tid);
        }
        triggerAlert('تمامی قطعات موسیقی با موفقیت پاک شدند و سیستم صوتی در حالت خاموش قرار گرفت.');
      }
    });
  };

  const handleMoveOrder = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= playlist.length) return;

    playTacticalSound('click');
    const newItems = [...playlist];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    const reordered = newItems.map((item, idx) => ({ ...item, order: idx + 1 }));
    setPlaylist(reordered);
    battleMusicSynth.setPlaylist(reordered);
    syncSoundtracksNow(reordered);
  };

  const handlePlayDirect = (track: SoundtrackItem) => {
    getAudioContext();
    playTacticalSound('click');
    setCurrentActiveId(track.id);
    battleMusicSynth.setTrack(track);
    battleMusicSynth.start();
    setIsPlaying(true);
    triggerAlert(`قطعه «${track.title}» هم‌اکنون به عنوان موسیقی فعال اتاق جنگ شروع به پخش کرد.`);
  };

  const handleTestAudioUrl = (urlToTest?: string) => {
    const targetUrl = (urlToTest || newUrl).trim();
    if (!targetUrl) {
      triggerAlert('لطفاً آدرس لینک صوتی معتبر را وارد کنید.');
      return;
    }

    if (testingUrl && testAudioObj) {
      testAudioObj.pause();
      setTestingUrl(false);
      setTestAudioObj(null);
      return;
    }

    try {
      battleMusicSynth.stop(); // Pause background music to prevent audio overlap
      const audio = new Audio(targetUrl);
      audio.crossOrigin = 'anonymous';
      audio.volume = 0.5;
      audio.play().then(() => {
        setTestingUrl(true);
        setTestAudioObj(audio);
        triggerAlert('صدای فایل با موفقیت پخش گردید.');
        audio.onended = () => {
          setTestingUrl(false);
          setTestAudioObj(null);
        };
      }).catch(err => {
        console.error('Audio test failed:', err);
        setTestingUrl(false);
        setTestAudioObj(null);
        triggerAlert('خطا در بارگذاری لینک صوت! از دسترس بودن فایل مطمئن شوید.');
      });
    } catch {
      triggerAlert('آدرس وارد شده نامعتبر است.');
    }
  };

  // آپلود مستقیم فایل صوتی برای فرم ایجاد
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // چک کردن فرمت صوتی
    if (!file.type.startsWith('audio/') && !/\.(mp3|wav|ogg|m4a|aac)$/i.test(file.name)) {
      triggerAlert('خطا: لطفا یک فایل صوتی معتبر (MP3, WAV, OGG, M4A) انتخاب کنید.');
      return;
    }

    // سقف حجم فایل: ۱۵ مگابایت
    if (file.size > 15 * 1024 * 1024) {
      triggerAlert('خطا: حداکثر حجم مجاز فایل صوتی ۱۵ مگابایت است.');
      return;
    }

    setIsUploading(true);
    setUploadProgress('در حال خواندن و آپلود در مخزن رسانه‌های سرور...');

    try {
      // تشخیص طول زمان فایل
      const tempAudio = new Audio();
      const objectUrl = URL.createObjectURL(file);
      tempAudio.src = objectUrl;
      tempAudio.onloadedmetadata = () => {
        if (tempAudio.duration && isFinite(tempAudio.duration)) {
          setNewDuration(Math.round(tempAudio.duration));
        }
        URL.revokeObjectURL(objectUrl);
      };

      // تعیین عنوان خودکار در صورت خالی بودن
      if (!newTitle.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_.-]+/g, ' ');
        setNewTitle(cleanName);
      }

      const res = await uploadAudioFileToSupabase(file);
      if (res.success && res.url) {
        setNewUrl(res.url);
        setUploadedFileName(file.name);
        triggerAlert(`فایل صوتی «${file.name}» با موفقیت در مخزن رسانه‌های سرور آپلود گردید.`);
      } else {
        triggerAlert(`خطا در آپلود فایل صوتی: ${res.error || 'مشکل در ارتباط با سرور'}`);
      }
    } catch (err: any) {
      triggerAlert(`خطا در آپلود: ${err?.message}`);
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
  };

  // افزودن قطعه جدید
  const handleAddTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      triggerAlert('لطفاً عنوان قطعه را وارد نمایید.');
      return;
    }

    if ((sourceType === 'url' || sourceType === 'upload') && !newUrl.trim()) {
      triggerAlert('لطفاً فایل صوتی را آپلود کرده یا آدرس لینک فایل صوتی (mp3 / ogg / wav) را وارد کنید.');
      return;
    }

    const newTrack: SoundtrackItem = {
      id: `track-${Date.now()}`,
      title: newTitle.trim(),
      subtitle: newSubtitle.trim() || (sourceType !== 'synth' ? 'موسیقی آپلود شده توسط ادمین در سرور' : 'تولید سینت سایزر هوشمند'),
      tag: newTag.trim() || 'سفارشی / ادمین',
      color: newColor,
      sourceType: sourceType === 'synth' ? 'synth' : 'url',
      url: sourceType !== 'synth' ? newUrl.trim() : undefined,
      synthTrackId: sourceType === 'synth' ? newSynthId : undefined,
      durationSeconds: Number(newDuration) || 90,
      is_active: true,
      order: playlist.length + 1
    };

    const updated = [...playlist, newTrack];
    setPlaylist(updated);
    battleMusicSynth.setPlaylist(updated);
    syncSoundtracksNow(updated);
    await saveSoundtrackToSupabase(newTrack);

    // Reset Form
    setNewTitle('');
    setNewSubtitle('');
    setNewUrl('');
    setUploadedFileName('');
    setNewTag('حماسی / ارکسترال');
    if (testingUrl && testAudioObj) {
      testAudioObj.pause();
      setTestingUrl(false);
    }

    triggerAlert(`🎵 قطعه «${newTrack.title}» با موفقیت افزوده و در سرور مرکزی ثبت گردید.`);
  };

  // باز کردن مودال ویرایش
  const handleOpenEdit = (track: SoundtrackItem) => {
    setEditingTrack(track);
    setEditFormData({
      id: track.id,
      title: track.title,
      subtitle: track.subtitle || '',
      tag: track.tag || 'سفارشی',
      sourceType: track.sourceType === 'synth' ? 'synth' : 'url',
      url: track.url || '',
      synthTrackId: track.synthTrackId || 'epic_march',
      color: track.color || 'from-amber-500 to-yellow-400',
      durationSeconds: track.durationSeconds || 90,
      is_active: track.is_active
    });
  };

  // آپلود فایل جدید در مودال ویرایش
  const handleEditFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/') && !/\.(mp3|wav|ogg|m4a|aac)$/i.test(file.name)) {
      triggerAlert('خطا: لطفا یک فایل صوتی معتبر انتخاب کنید.');
      return;
    }

    setIsEditUploading(true);
    try {
      const res = await uploadAudioFileToSupabase(file);
      if (res.success && res.url) {
        setEditFormData(prev => ({
          ...prev,
          url: res.url,
          sourceType: 'url'
        }));
        triggerAlert(`فایل جدید «${file.name}» با موفقیت آپلود و جایگزین شد.`);
      } else {
        triggerAlert(`خطا در آپلود فایل: ${res.error}`);
      }
    } catch (err: any) {
      triggerAlert(`خطا: ${err?.message}`);
    } finally {
      setIsEditUploading(false);
    }
  };

  // ذخیره ویرایش قطعه
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrack) return;
    if (!editFormData.title.trim()) {
      triggerAlert('عنوان قطعه الزامی است.');
      return;
    }

    const updatedTrack: SoundtrackItem = {
      ...editingTrack,
      title: editFormData.title.trim(),
      subtitle: editFormData.subtitle.trim(),
      tag: editFormData.tag.trim(),
      color: editFormData.color,
      sourceType: editFormData.sourceType === 'synth' ? 'synth' : 'url',
      url: editFormData.sourceType !== 'synth' ? editFormData.url.trim() : undefined,
      synthTrackId: editFormData.sourceType === 'synth' ? editFormData.synthTrackId : undefined,
      durationSeconds: Number(editFormData.durationSeconds) || 90,
      is_active: editFormData.is_active
    };

    const updatedList = playlist.map(t => t.id === updatedTrack.id ? updatedTrack : t);
    setPlaylist(updatedList);
    battleMusicSynth.setPlaylist(updatedList);
    syncSoundtracksNow(updatedList);
    await saveSoundtrackToSupabase(updatedTrack);

    setEditingTrack(null);
    triggerAlert(`قطعه «${updatedTrack.title}» با موفقیت در دیتابیس مرکزی به‌روزرسانی شد.`);
  };

  return (
    <div className="space-y-6 dir-rtl font-sans text-slate-100">
      
      {/* Top Banner / Explainer */}
      <div className="bg-[#080d21] border border-cyan-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-cyan-500 p-0.5 shadow-xl shrink-0">
              <div className="w-full h-full bg-[#080d21] rounded-[14px] flex items-center justify-center text-cyan-300">
                <Radio size={28} className="animate-pulse" />
              </div>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2 flex-wrap">
                <span>مرکز کنترل موسیقی و رادیو سراسری اتاق جنگ</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono">
                  شبکه پخش آنلاین قرارگاه
                </span>
                {isSupabaseEnabled && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={11} />
                    متصل به دیتابیس ابری
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                آپلود مستقیم فایل‌های صوتی در باکت <span className="font-mono text-cyan-300">warroom-media</span>، ثبت و همگام‌سازی دائمی در جدول <span className="font-mono text-amber-300">warroom_soundtracks</span>، با قابلیت ویرایش کامل، حذف و اولویت‌بندی.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={loadTracksFromSupabase}
              disabled={isLoadingFromDb}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-cyan-300 hover:text-white hover:border-cyan-500 text-xs font-bold transition cursor-pointer"
              title="بارگذاری مجدد لیست قطعات از دیتابیس مرکزی"
            >
              <RefreshCw size={13} className={isLoadingFromDb ? 'animate-spin' : ''} />
              <span>همگام‌سازی از سرور</span>
            </button>

            {playlist.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllTracks}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-rose-300 hover:text-white hover:border-rose-500 text-xs font-bold transition cursor-pointer"
                title="پاکسازی تمام قطعات و خاموش کردن کامل رادیو"
              >
                <Trash2 size={13} />
                <span>پاکسازی همه آهنگ‌ها</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Playback Mode Selector Box */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-3">
          
          {/* 1. Shuffle / Random */}
          <button
            onClick={() => handleModeChange('random')}
            className={`p-3.5 rounded-2xl border text-right transition flex items-start gap-3 cursor-pointer ${
              playbackMode === 'random'
                ? 'bg-amber-950/40 border-amber-400/80 text-white shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-900/50'
            }`}
          >
            <div className={`p-2.5 rounded-xl shrink-0 ${
              playbackMode === 'random' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-900 text-slate-400'
            }`}>
              <Shuffle size={20} />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-amber-300">پخش تصادفی و خودکار</h4>
                {playbackMode === 'random' && <Check size={14} className="text-amber-400" />}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                پس از پایان هر قطعه، یک آهنگ به صورت خودکار و تصادفی از میان قطعات فعال انتخاب و پخش می‌شود.
              </p>
            </div>
          </button>

          {/* 2. Sequential */}
          <button
            onClick={() => handleModeChange('sequential')}
            className={`p-3.5 rounded-2xl border text-right transition flex items-start gap-3 cursor-pointer ${
              playbackMode === 'sequential'
                ? 'bg-cyan-950/40 border-cyan-400/80 text-white shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-900/50'
            }`}
          >
            <div className={`p-2.5 rounded-xl shrink-0 ${
              playbackMode === 'sequential' ? 'bg-cyan-500 text-slate-950 font-black' : 'bg-slate-900 text-slate-400'
            }`}>
              <Repeat size={20} />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-cyan-300">پخش ترتیبی قطعات</h4>
                {playbackMode === 'sequential' && <Check size={14} className="text-cyan-400" />}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                آهنگ‌ها به ترتیب اولویت و شماره از ابتدا تا انتهای فهرست یکی پس از دیگری پخش می‌شوند.
              </p>
            </div>
          </button>

          {/* 3. Repeat One */}
          <button
            onClick={() => handleModeChange('repeat_one')}
            className={`p-3.5 rounded-2xl border text-right transition flex items-start gap-3 cursor-pointer ${
              playbackMode === 'repeat_one'
                ? 'bg-emerald-950/40 border-emerald-400/80 text-white shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-900/50'
            }`}
          >
            <div className={`p-2.5 rounded-xl shrink-0 ${
              playbackMode === 'repeat_one' ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-900 text-slate-400'
            }`}>
              <Repeat1 size={20} />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-emerald-300">تکرار مداوم تک‌آهنگ</h4>
                {playbackMode === 'repeat_one' && <Check size={14} className="text-emerald-400" />}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                تنها همان آهنگ انتخاب شده جاری بدون توقف در تمام صفحات و مراحل تکرار می‌گردد.
              </p>
            </div>
          </button>

        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Form: Add New Track (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#080d21] border border-slate-800 rounded-3xl p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <Plus size={16} className="text-amber-400" />
                <span>افزودن و آپلود قطعه موسیقی جدید</span>
              </h4>
              <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                ذخیره در سرور مرکزی
              </span>
            </div>

            <form onSubmit={handleAddTrack} className="space-y-4 text-xs">
              
              {/* Select Source Type */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block">نوع منبع صوت:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSourceType('upload')}
                    className={`py-2.5 px-2 rounded-xl border flex flex-col items-center justify-center gap-1 font-black transition cursor-pointer text-center ${
                      sourceType === 'upload'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <Upload size={15} />
                    <span className="text-[11px]">آپلود فایل صوتی</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSourceType('url')}
                    className={`py-2.5 px-2 rounded-xl border flex flex-col items-center justify-center gap-1 font-black transition cursor-pointer text-center ${
                      sourceType === 'url'
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md font-black'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <LinkIcon size={15} />
                    <span className="text-[11px]">لینک وب صوتی</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSourceType('synth')}
                    className={`py-2.5 px-2 rounded-xl border flex flex-col items-center justify-center gap-1 font-black transition cursor-pointer text-center ${
                      sourceType === 'synth'
                        ? 'bg-indigo-500 text-white border-indigo-400 shadow-md font-black'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <Disc size={15} />
                    <span className="text-[11px]">سینت‌سایزر</span>
                  </button>
                </div>
              </div>

              {/* Title & Subtitle */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block">نام آهنگ / قطعه (فارسی):</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: سرود دلاوران ایران / مارش عملیات بیت‌المقدس"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block">توضیحات کوتاه / آهنگساز:</label>
                <input
                  type="text"
                  placeholder="مثال: موسیقی حماسی با پرکاشن‌های رزمی پرانرژی"
                  value={newSubtitle}
                  onChange={(e) => setNewSubtitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* 1. UPLOAD FIELD */}
              {sourceType === 'upload' && (
                <div className="space-y-2 bg-slate-950 p-3.5 rounded-2xl border border-amber-500/40">
                  <div className="flex items-center justify-between">
                    <label className="text-amber-300 font-bold flex items-center gap-1.5">
                      <FileAudio size={15} />
                      <span>آپلود فایل موسیقی در دیتابیس قرارگاه:</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">MP3, WAV, OGG</span>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="audio/*,.mp3,.wav,.ogg,.m4a"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-700 hover:border-amber-400/80 rounded-xl p-4 text-center cursor-pointer transition bg-slate-900/60 hover:bg-slate-900 group"
                  >
                    <Upload size={24} className="mx-auto text-amber-400 mb-1 group-hover:scale-110 transition" />
                    {isUploading ? (
                      <div className="space-y-1">
                        <RefreshCw size={16} className="animate-spin mx-auto text-amber-400" />
                        <span className="text-xs text-amber-300">{uploadProgress}</span>
                      </div>
                    ) : uploadedFileName ? (
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-emerald-400 block">فایل آپلود شد:</span>
                        <span className="text-[11px] text-slate-300 font-mono block truncate max-w-xs mx-auto">{uploadedFileName}</span>
                        <span className="text-[10px] text-cyan-400">برای تغییر فایل، کلیک کنید</span>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-200 block">برای انتخاب و آپلود فایل صوتی کلیک کنید</span>
                        <span className="text-[10px] text-slate-500 block">ذخیره خودکار در مخزن رسانه‌های سرور</span>
                      </div>
                    )}
                  </div>

                  {newUrl && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        آدرس رسانه آماده است
                      </span>
                      <button
                        type="button"
                        onClick={() => handleTestAudioUrl(newUrl)}
                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                          testingUrl 
                            ? 'bg-amber-500 text-slate-950 border-amber-400 animate-pulse'
                            : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
                        }`}
                      >
                        {testingUrl ? <Pause size={12} /> : <Play size={12} />}
                        <span>{testingUrl ? 'توقف پخش' : 'پیش‌نمایش صدا'}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 2. URL FIELD */}
              {sourceType === 'url' && (
                <div className="space-y-1.5 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 font-bold">نشانی اینترنتی فایل صوتی:</label>
                    <span className="text-[10px] text-cyan-400 font-mono">پیوند مستقیم وب</span>
                  </div>
                  <input
                    type="url"
                    required
                    placeholder="https://example.com/audio/epic_anthem.mp3"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-400 text-left"
                    dir="ltr"
                  />
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-[10px] text-slate-500">
                      می‌توانید هر پیوند صوتی معتبر را قرار دهید.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleTestAudioUrl(newUrl)}
                      className={`px-3 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                        testingUrl 
                          ? 'bg-amber-500 text-slate-950 border-amber-400 animate-pulse'
                          : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
                      }`}
                    >
                      {testingUrl ? <Pause size={12} /> : <Play size={12} />}
                      <span>{testingUrl ? 'توقف تست' : 'تست صدا'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 3. SYNTH FIELD */}
              {sourceType === 'synth' && (
                <div className="space-y-1.5 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  <label className="text-slate-300 font-bold block">انتخاب الگوی تولید صدا:</label>
                  <select
                    value={newSynthId}
                    onChange={(e) => setNewSynthId(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="epic_march">مارش حماسی اتاق جنگ</option>
                    <option value="cyber_mission">عملیات شبانه رادار</option>
                    <option value="triumph_anthem">سرود پیروزی و افتخار جوخه</option>
                    <option value="strategic_zen">تمرکز و تحلیل راهبردی</option>
                  </select>
                </div>
              )}

              {/* Tag & Color selection */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold block">برچسب سبک:</label>
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="مثال: حماسی / رزمی"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-bold block">رنگ بج تصویری:</label>
                  <select
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="from-amber-500 to-yellow-400">طلایی و نارنجی (حماسی)</option>
                    <option value="from-cyan-500 to-blue-500">آبی و سایبر (فناوری)</option>
                    <option value="from-red-500 to-rose-400">قرمز و آتشین (رزمی)</option>
                    <option value="from-emerald-500 to-teal-400">سبز و زمردین (پیروزی)</option>
                    <option value="from-purple-500 to-indigo-400">بنفش و نیلی (استراتژیک)</option>
                  </select>
                </div>
              </div>

              {/* Duration input */}
              <div className="space-y-1">
                <label className="text-slate-300 font-bold block">مدت زمان حدودی قطعه (ثانیه):</label>
                <input
                  type="number"
                  min={10}
                  max={1200}
                  value={newDuration}
                  onChange={(e) => setNewDuration(Number(e.target.value) || 90)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isUploading}
                className="w-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 font-black py-3 rounded-2xl shadow-lg hover:shadow-[0_0_25px_rgba(245,158,11,0.4)] transition flex items-center justify-center gap-2 cursor-pointer text-sm disabled:opacity-50"
              >
                <Plus size={16} />
                <span>افزودن و ذخیره قطعه در دیتابیس مرکزی</span>
              </button>

            </form>
          </div>
        </div>

        {/* Right List: Active Playlist & Track Controls (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#080d21] border border-slate-800 rounded-3xl p-5 shadow-xl">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Music size={18} className="text-cyan-400" />
                <h4 className="text-sm font-black text-white">
                  فهرست قطعات موسیقی اتاق جنگ ({playlist.length} قطعه)
                </h4>
              </div>
              <span className="text-xs text-amber-300 font-mono">
                {playlist.filter(t => t.is_active).length} فعال در چرخه
              </span>
            </div>

            {/* List */}
            <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1 custom-scrollbar">
              {isLoadingFromDb ? (
                <div className="text-center py-12 px-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3">
                  <RefreshCw size={28} className="animate-spin mx-auto text-cyan-400" />
                  <p className="text-xs text-slate-400">در حال همگام‌سازی قطعات از سرور مرکزی...</p>
                </div>
              ) : playlist.length === 0 ? (
                <div className="text-center py-12 px-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto shadow-inner">
                    <Music size={24} />
                  </div>
                  <h5 className="text-sm font-black text-white">هیچ قطعه موسیقی ثبت نشده است</h5>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                    هم‌اکنون رادیو کاملاً خاموش بوده و هیچ موسیقی در سرور وجود ندارد. همچنین آیکون موسیقی در کنار صفحه برای همه کاربران محو شده است.
                    برای پخش آهنگ، از فرم سمت راست یک قطعه صوتی آپلود کرده یا شبیه‌ساز اضافه کنید.
                  </p>
                </div>
              ) : (
                playlist.map((track, index) => {
                  const isCurrentActive = track.id === currentActiveId;

                  return (
                    <div
                      key={track.id}
                      className={`p-3.5 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isCurrentActive
                          ? 'bg-slate-900/90 border-cyan-400/80 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                          : track.is_active
                          ? 'bg-slate-950/80 border-slate-850 hover:border-slate-700'
                          : 'bg-slate-950/40 border-slate-900 opacity-60'
                      }`}
                    >
                      {/* Track info */}
                      <div className="flex items-center gap-3 min-w-0">
                        
                        {/* Order Controls */}
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => handleMoveOrder(index, 'up')}
                            disabled={index === 0}
                            className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                            title="انتقال به بالا"
                          >
                            <ArrowUp size={10} />
                          </button>
                          <button
                            onClick={() => handleMoveOrder(index, 'down')}
                            disabled={index === playlist.length - 1}
                            className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                            title="انتقال به پایین"
                          >
                            <ArrowDown size={10} />
                          </button>
                        </div>

                        {/* Icon */}
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${track.color || 'from-amber-500 to-yellow-400'} flex items-center justify-center text-slate-950 font-black shadow-md shrink-0`}>
                          {isCurrentActive && isPlaying ? (
                            <Disc size={18} className="animate-spin" style={{ animationDuration: '3s' }} />
                          ) : (
                            <Music size={18} />
                          )}
                        </div>

                        {/* Titles & Meta */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h5 className="text-xs sm:text-sm font-black text-white truncate">
                              {track.title}
                            </h5>
                            {isCurrentActive && (
                              <span className="text-[10px] px-2 py-0.2 rounded-full bg-cyan-500 text-slate-950 font-black animate-pulse">
                                در حال پخش
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {track.subtitle}
                          </p>

                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] px-2 py-0.2 rounded bg-slate-900 text-slate-300 border border-slate-800 font-mono">
                              {track.sourceType === 'url' ? '🔗 فایل صوتی' : '⚡ سینت سایزر'}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-900 text-amber-400 border border-slate-800">
                              {track.tag}
                            </span>
                            {track.durationSeconds && (
                              <span className="text-[10px] text-slate-400 font-mono flex items-center gap-0.5">
                                <Clock size={10} />
                                {track.durationSeconds} ثانیه
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions: Play Now, Edit, Toggle Active, Delete */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800/80 w-full sm:w-auto justify-between sm:justify-end">
                        
                        {/* Play Direct Button */}
                        <button
                          onClick={() => handlePlayDirect(track)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                            isCurrentActive && isPlaying
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/60'
                          }`}
                          title="پخش فوری این قطعه"
                        >
                          <Play size={12} />
                          <span>{isCurrentActive && isPlaying ? 'پخش فعال' : 'پخش'}</span>
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={() => handleOpenEdit(track)}
                          className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-amber-300 hover:border-amber-500/50 transition cursor-pointer"
                          title="ویرایش و آپدیت قطعه"
                        >
                          <Edit3 size={14} />
                        </button>

                        {/* Active/Inactive Toggle */}
                        <button
                          onClick={() => handleToggleActive(track.id)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                            track.is_active
                              ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60'
                              : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                          }`}
                          title={track.is_active ? 'غیرفعال‌سازی در چرخه' : 'فعال‌سازی در چرخه'}
                        >
                          {track.is_active ? 'فعال' : 'غیرفعال'}
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(track.id)}
                          className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-rose-400 hover:border-rose-500/50 transition cursor-pointer"
                          title="حذف قطعه از دیتابیس"
                        >
                          <Trash2 size={14} />
                        </button>

                      </div>

                    </div>
                  );
                })
              )}
            </div>

          </div>
        </div>

      </div>

      {/* مودال ویرایش و آپدیت قطعه موسیقی */}
      {editingTrack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-xl bg-[#0a1026] border-2 border-amber-500/50 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                  <Edit3 size={18} />
                </div>
                <h3 className="text-base font-bold text-white">ویرایش و آپدیت قطعه موسیقی</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingTrack(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-bold block">عنوان قطعه:</label>
                <input
                  type="text"
                  required
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-bold block">توضیحات کوتاه / آهنگساز:</label>
                <input
                  type="text"
                  value={editFormData.subtitle}
                  onChange={(e) => setEditFormData({ ...editFormData, subtitle: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-bold block">نوع منبع صوت:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditFormData({ ...editFormData, sourceType: 'url' })}
                    className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition ${
                      editFormData.sourceType === 'url'
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    <LinkIcon size={14} />
                    <span>فایل صوتی / نشانی وب</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditFormData({ ...editFormData, sourceType: 'synth' })}
                    className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition ${
                      editFormData.sourceType === 'synth'
                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    <Disc size={14} />
                    <span>سینت‌سایزر صوتی</span>
                  </button>
                </div>
              </div>

              {editFormData.sourceType === 'url' ? (
                <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 font-bold">نشانی فایل صوتی:</label>
                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      className="text-amber-400 hover:text-amber-300 text-[11px] font-bold flex items-center gap-1"
                    >
                      <Upload size={12} />
                      <span>آپلود فایل جدید جایگزین</span>
                    </button>
                  </div>
                  <input
                    type="file"
                    ref={editFileInputRef}
                    accept="audio/*,.mp3,.wav,.ogg,.m4a"
                    onChange={handleEditFileUpload}
                    className="hidden"
                  />
                  {isEditUploading && (
                    <div className="flex items-center gap-2 text-amber-300 py-1">
                      <RefreshCw size={13} className="animate-spin" />
                      <span>در حال آپلود فایل صوتی در مخزن رسانه‌های سرور...</span>
                    </div>
                  )}
                  <input
                    type="url"
                    value={editFormData.url}
                    onChange={(e) => setEditFormData({ ...editFormData, url: e.target.value })}
                    placeholder="https://..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-400"
                    dir="ltr"
                  />
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => handleTestAudioUrl(editFormData.url)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1"
                    >
                      <Play size={12} />
                      <span>تست فایل صوتی</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold block">الگوی سینت‌سایزر:</label>
                  <select
                    value={editFormData.synthTrackId}
                    onChange={(e) => setEditFormData({ ...editFormData, synthTrackId: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="epic_march">مارش حماسی اتاق جنگ</option>
                    <option value="cyber_mission">عملیات شبانه رادار</option>
                    <option value="triumph_anthem">سرود پیروزی و افتخار جوخه</option>
                    <option value="strategic_zen">تمرکز و تحلیل راهبردی</option>
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold block">برچسب سبک:</label>
                  <input
                    type="text"
                    value={editFormData.tag}
                    onChange={(e) => setEditFormData({ ...editFormData, tag: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-bold block">مدت زمان (ثانیه):</label>
                  <input
                    type="number"
                    min={10}
                    max={1200}
                    value={editFormData.durationSeconds}
                    onChange={(e) => setEditFormData({ ...editFormData, durationSeconds: Number(e.target.value) || 90 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-300 font-bold">فعال در چرخه پخش رادیو</span>
                <input
                  type="checkbox"
                  checked={editFormData.is_active}
                  onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.checked })}
                  className="w-5 h-5 rounded accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingTrack(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20 transition flex items-center gap-1.5"
                >
                  <Check size={14} />
                  <span>ذخیره تغییرات در دیتابیس مرکزی</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
