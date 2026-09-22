import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Music, 
  Disc,
  ListMusic
} from 'lucide-react';
import { SoundtrackItem } from '../types';
import { battleMusicSynth } from '../utils/epicBgmEngine';

interface PersistentMusicBarProps {
  hasBottomNav?: boolean;
  isGirls?: boolean;
}

export default function PersistentMusicBar({ hasBottomNav = false, isGirls = false }: PersistentMusicBarProps) {
  const [hasTracks, setHasTracks] = useState<boolean>(() => battleMusicSynth.getHasActiveTracks());
  const [isPlaying, setIsPlaying] = useState<boolean>(() => battleMusicSynth.getIsRunning());
  const [currentTrack, setCurrentTrack] = useState<SoundtrackItem | null>(() => battleMusicSynth.getCurrentTrack());
  const [isHovered, setIsHovered] = useState(false);
  const [volume, setVolume] = useState<number>(() => battleMusicSynth.getVolume());

  useEffect(() => {
    const handleMusicState = (e: any) => {
      setHasTracks(battleMusicSynth.getHasActiveTracks());
      if (e.detail) {
        if (typeof e.detail.isRunning === 'boolean') {
          setIsPlaying(e.detail.isRunning);
        }
        if (e.detail.track !== undefined) {
          setCurrentTrack(e.detail.track);
        }
      }
    };

    const handleTrackChanged = (e: any) => {
      setHasTracks(battleMusicSynth.getHasActiveTracks());
      if (e.detail !== undefined) {
        setCurrentTrack(e.detail);
      }
    };

    const handleTracksUpdated = () => {
      setHasTracks(battleMusicSynth.getHasActiveTracks());
      setCurrentTrack(battleMusicSynth.getCurrentTrack());
      setIsPlaying(battleMusicSynth.getIsRunning());
    };

    window.addEventListener('warroom_music_state_changed' as any, handleMusicState);
    window.addEventListener('warroom_track_changed' as any, handleTrackChanged);
    window.addEventListener('warroom_soundtracks_updated' as any, handleTracksUpdated);

    const interval = setInterval(() => {
      setHasTracks(battleMusicSynth.getHasActiveTracks());
      setIsPlaying(battleMusicSynth.getIsRunning());
      const track = battleMusicSynth.getCurrentTrack();
      if (track) setCurrentTrack(track);
      setVolume(battleMusicSynth.getVolume());
    }, 800);

    return () => {
      window.removeEventListener('warroom_music_state_changed' as any, handleMusicState);
      window.removeEventListener('warroom_track_changed' as any, handleTrackChanged);
      window.removeEventListener('warroom_soundtracks_updated' as any, handleTracksUpdated);
      clearInterval(interval);
    };
  }, []);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    battleMusicSynth.toggle();
    setIsPlaying(battleMusicSynth.getIsRunning());
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    battleMusicSynth.nextTrack();
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (volume > 0) {
      battleMusicSynth.setVolume(0);
      setVolume(0);
    } else {
      battleMusicSynth.setVolume(0.35);
      setVolume(0.35);
    }
  };

  // 🛑 اگر هیچ قطعه فعالی در سرور ثبت نشده باشد، آیکون به کلی از صفحه محو می‌شود
  if (!hasTracks) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="کنترل موسیقی"
      className={`fixed z-40 transition-all duration-300 select-none ${
        hasBottomNav 
          ? 'bottom-20 left-4 md:bottom-6 md:left-6' 
          : 'bottom-5 left-4 md:bottom-6 md:left-6'
      }`}
      id="floating-music-icon-widget"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative flex items-center">
        {/* Main Small Floating Icon Button */}
        <button
          type="button"
          onClick={togglePlay}
          className={`relative group w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer shadow-lg active:scale-95 ${
            isPlaying
              ? isGirls
                ? 'bg-gradient-to-tr from-[#160222] via-[#2a063b] to-[#0b0014] text-fuchsia-300 border-2 border-fuchsia-400 shadow-[0_0_20px_rgba(255,19,137,0.55)]'
                : 'bg-gradient-to-tr from-[#0b1638] via-[#04091a] to-[#1c0818] text-blue-300 border-2 border-blue-400 shadow-[0_0_20px_rgba(37,99,235,0.55),0_0_12px_rgba(220,38,38,0.4)]'
              : isGirls
                ? 'bg-[#0a0112]/90 text-slate-400 border border-fuchsia-900/60 hover:border-fuchsia-500/60 hover:text-white shadow-[0_4px_16px_rgba(0,0,0,0.7)]'
                : 'bg-[#060a18]/90 text-slate-400 border border-blue-900/60 hover:border-blue-500/60 hover:text-white shadow-[0_4px_16px_rgba(0,0,0,0.7)]'
          }`}
          title={isPlaying ? 'توقف موسیقی (کلیک کنید)' : 'پخش موسیقی (کلیک کنید)'}
          aria-label={isPlaying ? 'توقف موسیقی' : 'پخش موسیقی'}
        >
          {/* Pulsing Neon Glow Ring when playing */}
          {isPlaying && (
            <span className={`absolute -inset-1 rounded-full animate-ping pointer-events-none ${
              isGirls ? 'bg-fuchsia-500/25' : 'bg-blue-500/25'
            }`} />
          )}

          {/* Disc or Music Note Icon */}
          <div className="relative flex items-center justify-center">
            {isPlaying ? (
              <Disc 
                size={20} 
                className={`animate-[spin_4s_linear_infinite] ${
                  isGirls 
                    ? 'text-fuchsia-300 drop-shadow-[0_0_6px_rgba(255,19,137,0.85)]' 
                    : 'text-blue-300 drop-shadow-[0_0_6px_rgba(37,99,235,0.85)]'
                }`} 
              />
            ) : (
              <Music size={19} className={`transition-colors ${
                isGirls ? 'text-slate-400 group-hover:text-fuchsia-300' : 'text-slate-400 group-hover:text-blue-300'
              }`} />
            )}
          </div>

          {/* Mini Status Badge on the Icon (Play / Pause indicator) */}
          <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold shadow-sm ${
            isPlaying 
              ? isGirls ? 'bg-fuchsia-400 text-slate-950 border border-slate-950' : 'bg-blue-500 text-slate-950 border border-slate-900' 
              : 'bg-slate-700 text-slate-300 border border-slate-900'
          }`}>
            {isPlaying ? <Pause size={8} className="fill-slate-950" /> : <Play size={8} className="fill-slate-300 ml-0.5" />}
          </span>
        </button>

        {/* Discreet Expandable Mini Capsule on Hover */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, x: -10, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -8, scale: 0.95 }}
              transition={{ duration: 0.18 }}
              className={`absolute left-14 hidden sm:flex items-center gap-2.5 backdrop-blur-xl px-3 py-1.5 rounded-full text-right dir-rtl whitespace-nowrap ${
                isGirls
                  ? 'bg-[#10011a]/95 border border-fuchsia-500/40 shadow-[0_8px_30px_rgba(0,0,0,0.85),0_0_15px_rgba(255,19,137,0.3)]'
                  : 'bg-[#060e26]/95 border border-blue-500/40 shadow-[0_8px_30px_rgba(0,0,0,0.85),0_0_15px_rgba(37,99,235,0.3)]'
              }`}
            >
              {/* Animated Mini Waves */}
              {isPlaying && (
                <span className="flex items-end gap-[2px] h-3 w-3 shrink-0">
                  <span className={`w-[2px] rounded-full animate-pulse h-full ${isGirls ? 'bg-fuchsia-400' : 'bg-blue-400'}`} />
                  <span className={`w-[2px] rounded-full animate-pulse [animation-delay:-0.2s] h-2/3 ${isGirls ? 'bg-purple-300' : 'bg-red-400'}`} />
                  <span className={`w-[2px] rounded-full animate-pulse [animation-delay:-0.4s] h-4/5 ${isGirls ? 'bg-fuchsia-400' : 'bg-blue-400'}`} />
                </span>
              )}

              {/* Title */}
              <div className="flex flex-col max-w-[140px]">
                <span className="text-[11px] font-bold text-white truncate">
                  {currentTrack?.title || 'موسیقی زمینه'}
                </span>
                <span className={`text-[9px] truncate ${isGirls ? 'text-fuchsia-300/80' : 'text-blue-300/80'}`}>
                  {isPlaying ? 'در حال پخش' : 'متوقف شده'}
                </span>
              </div>

              {/* Quick Actions: Next Track & Mute */}
              <div className="flex items-center gap-1 border-r border-slate-700/60 pr-2 mr-0.5">
                <button
                  type="button"
                  onClick={handleNext}
                  className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                  title="قطعه بعدی"
                >
                  <SkipForward size={13} />
                </button>
                <button
                  type="button"
                  onClick={toggleMute}
                  className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                  title={volume === 0 ? 'خروج از حالت بی‌صدا' : 'بی‌صدا'}
                >
                  {volume === 0 ? <VolumeX size={13} className="text-red-400" /> : <Volume2 size={13} />}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
