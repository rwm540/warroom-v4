import React, { useState, useEffect } from 'react';
import { 
  Music, 
  Plus, 
  Trash2, 
  Play, 
  Pause, 
  Shuffle, 
  Repeat, 
  Repeat1, 
  Volume2, 
  Radio, 
  Link as LinkIcon, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Sliders, 
  ArrowUp, 
  ArrowDown, 
  RefreshCw, 
  Check, 
  ExternalLink,
  HelpCircle,
  Disc
} from 'lucide-react';
import { SoundtrackItem, AudioPlaybackMode } from '../types';
import { confirmInternal } from '../lib/appDialog';
import { 
  battleMusicSynth, 
  syncSoundtracksNow,
  playTacticalSound, 
  getAudioContext 
} from '../utils/epicBgmEngine';

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

  // Form State for Adding New Track
  const [sourceType, setSourceType] = useState<'url' | 'synth'>('url');
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newTag, setNewTag] = useState('حماسی / ارکسترال');
  const [newUrl, setNewUrl] = useState('');
  const [newSynthId, setNewSynthId] = useState<'epic_march' | 'cyber_mission' | 'triumph_anthem' | 'strategic_zen'>('epic_march');
  const [newColor, setNewColor] = useState('from-amber-500 to-yellow-400');
  const [newDuration, setNewDuration] = useState(90);

  // Testing URL Audio
  const [testingUrl, setTestingUrl] = useState(false);
  const [testAudioObj, setTestAudioObj] = useState<HTMLAudioElement | null>(null);

  // Sync state on updates
  useEffect(() => {
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
  }, [testAudioObj]);

  const handleModeChange = (mode: AudioPlaybackMode) => {
    playTacticalSound('click');
    setPlaybackMode(mode);
    battleMusicSynth.setPlaybackMode(mode);
    const modeLabel = mode === 'random' ? 'پخش تصادفی (Shuffle)' : mode === 'sequential' ? 'پخش ترتیبی لیست' : 'تکرار تک‌آهنگ';
    triggerAlert(`حالت پخش موسیقی‌های اتاق جنگ به «${modeLabel}» تغییر یافت.`);
  };

  const handleToggleActive = (id: string) => {
    playTacticalSound('click');
    const updated = playlist.map(item => {
      if (item.id === id) {
        return { ...item, is_active: !item.is_active };
      }
      return item;
    });

    setPlaylist(updated);
    battleMusicSynth.setPlaylist(updated);
    syncSoundtracksNow(updated);
    triggerAlert('وضعیت فعال‌سازی قطعه به‌روزرسانی شد.');
  };

  const handleDelete = (id: string) => {
    const updated = playlist.filter(t => t.id !== id);
    setPlaylist(updated);
    battleMusicSynth.setPlaylist(updated);
    syncSoundtracksNow(updated);
    if (updated.length === 0) {
      triggerAlert('کلیه قطعات حذف شدند. هم‌اکنون هیچ موسیقی‌ای پخش نمی‌شود و آیکون شناور کنار صفحه محو شد.');
    } else {
      triggerAlert('قطعه موسیقی با موفقیت از لیست پخش سراسری حذف شد.');
    }
  };

  const handleClearAllTracks = () => {
    confirmInternal('آیا از حذف تمام قطعات موسیقی اطمینان دارید؟ با این کار هیچ آهنگی پخش نخواهد شد و آیکون کناری صفحه نیز محو می‌شود.', {
      title: 'تأیید حذف لیست موسیقی',
      confirmText: 'حذف همه قطعات',
      onConfirm: () => {
        setPlaylist([]);
        battleMusicSynth.setPlaylist([]);
        syncSoundtracksNow([]);
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

  const handleTestAudioUrl = () => {
    if (!newUrl.trim()) {
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
      const audio = new Audio(newUrl.trim());
      audio.crossOrigin = 'anonymous';
      audio.volume = 0.5;
      audio.play().then(() => {
        setTestingUrl(true);
        setTestAudioObj(audio);
        triggerAlert('صدای فایل لینک با موفقیت پخش گردید.');
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

  const handleAddTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      triggerAlert('لطفاً عنوان قطعه را وارد نمایید.');
      return;
    }

    if (sourceType === 'url' && !newUrl.trim()) {
      triggerAlert('لطفاً آدرس لینک فایل صوتی (mp3 / ogg / wav) را وارد کنید.');
      return;
    }

    const newTrack: SoundtrackItem = {
      id: `track-${Date.now()}`,
      title: newTitle.trim(),
      subtitle: newSubtitle.trim() || (sourceType === 'url' ? 'موسیقی سفارشی بارگذاری شده توسط ادمین' : 'تولید سینت سایزر هوشمند'),
      tag: newTag.trim() || 'سفارشی / ادمین',
      color: newColor,
      sourceType: sourceType,
      url: sourceType === 'url' ? newUrl.trim() : undefined,
      synthTrackId: sourceType === 'synth' ? newSynthId : undefined,
      durationSeconds: Number(newDuration) || 90,
      is_active: true,
      order: playlist.length + 1
    };

    const updated = [...playlist, newTrack];
    setPlaylist(updated);
    battleMusicSynth.setPlaylist(updated);
    syncSoundtracksNow(updated);

    // Reset Form
    setNewTitle('');
    setNewSubtitle('');
    setNewUrl('');
    setNewTag('حماسی / ارکسترال');
    if (testingUrl && testAudioObj) {
      testAudioObj.pause();
      setTestingUrl(false);
    }

    triggerAlert(`🎵 قطعه «${newTrack.title}» با موفقیت افزوده و در سرور Supabase ذخیره گردید.`);
  };

  return (
    <div className="space-y-6 dir-rtl">
      
      {/* Top Banner / Explainer */}
      <div className="bg-[#080d21] border border-cyan-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-cyan-500 p-0.5 shadow-xl">
              <div className="w-full h-full bg-[#080d21] rounded-[14px] flex items-center justify-center text-cyan-300">
                <Radio size={28} className="animate-pulse" />
              </div>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>مرکز کنترل موسیقی و رادیو سراسری اتاق جنگ</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono">
                  Universal Audio Hub
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                تنظیم حالت پخش، افزودن موسیقی بر اساس لینک صوتی مستقیم (MP3/WAV) یا موتور سینت سایزر. کلیه اطلاعات مستقیماً در Supabase ذخیره می‌شوند.
              </p>
            </div>
          </div>

          {/* Clear All Button if tracks exist */}
          {playlist.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleClearAllTracks}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-rose-300 hover:text-white hover:border-rose-500 text-xs font-bold transition cursor-pointer"
                title="پاکسازی تمام قطعات و خاموش کردن کامل رادیو"
              >
                <Trash2 size={13} />
                <span>پاکسازی همه آهنگ‌ها</span>
              </button>
            </div>
          )}
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
                <span>افزودن آهنگ و قطعه جدید</span>
              </h4>
              <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                پیوند یا شبیه‌ساز صوتی
              </span>
            </div>

            <form onSubmit={handleAddTrack} className="space-y-4 text-xs">
              
              {/* Select Source Type */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block">نوع منبع صوت:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSourceType('url')}
                    className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 font-black transition cursor-pointer ${
                      sourceType === 'url'
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <LinkIcon size={14} />
                    <span>پیوند صوتی مستقیم اینترنتی</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSourceType('synth')}
                    className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 font-black transition cursor-pointer ${
                      sourceType === 'synth'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <Disc size={14} />
                    <span>شبیه‌ساز صوتی هوشمند</span>
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

              {/* URL or Synth specific fields */}
              {sourceType === 'url' ? (
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
                      onClick={handleTestAudioUrl}
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
              ) : (
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

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 font-black py-3 rounded-2xl shadow-lg hover:shadow-[0_0_25px_rgba(245,158,11,0.4)] transition flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                <Plus size={16} />
                <span>افزودن قطعه به چرخه پخش رادیو اتاق جنگ</span>
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
                  فهرست قطعات و موسیقی‌های فعال ({playlist.length} قطعه)
                </h4>
              </div>
              <span className="text-xs text-amber-300 font-mono">
                {playlist.filter(t => t.is_active).length} فعال در گردش
              </span>
            </div>

            {/* List */}
            <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1 custom-scrollbar">
              {playlist.length === 0 ? (
                <div className="text-center py-12 px-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto shadow-inner">
                    <Music size={24} />
                  </div>
                  <h5 className="text-sm font-black text-white">هیچ قطعه موسیقی ثبت نشده است</h5>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                    هم‌اکنون رادیو کاملاً خاموش بوده و هیچ موسیقی در سرور وجود ندارد. همچنین آیکون موسیقی در کنار صفحه برای همه کاربران محو شده است.
                    برای پخش آهنگ، از فرم سمت راست یک قطعه صوتی یا شبیه‌ساز اضافه کنید.
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
                            {track.sourceType === 'url' ? '🔗 لینک مستقیم' : '⚡ سینت سایزر'}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-900 text-amber-400 border border-slate-800">
                            {track.tag}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions: Play Now, Toggle Active, Delete */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800/80 w-full sm:w-auto justify-between sm:justify-end">
                      
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
                        {track.is_active ? 'فعال در چرخه' : 'غیرفعال'}
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(track.id)}
                        className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-rose-400 hover:border-rose-500/50 transition cursor-pointer"
                        title="حذف قطعه"
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

    </div>
  );
}
