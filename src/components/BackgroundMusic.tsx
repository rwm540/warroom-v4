import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { 
  battleMusicSynth, 
  getAudioContext,
  DEFAULT_SOUNDTRACKS 
} from '../utils/epicBgmEngine';
import { SoundtrackItem } from '../types';

/**
 * BackgroundMusic Component (Headless Audio Lifecycle)
 * 
 * وظیفه: مدیریت رویدادهای تعاملی کاربر برای فعال‌سازی خودکار صدا در صورت وجود موسیقی در سرور.
 * هیچ دکمه یا آیکون تکراری در UI رندر نمی‌کند (تمامی کنترل‌های بصری در PersistentMusicBar متمرکز است).
 */
export default function BackgroundMusic() {
  const hasStartedRef = useRef<boolean>(false);

  useEffect(() => {
    // اگر اصلاً موسیقی فعالی در سرور وجود ندارد، هیچ فعالیتی انجام نده
    if (!battleMusicSynth.getHasActiveTracks()) {
      return;
    }

    // 1. Set default playback mode to 'random' if not already configured
    const currentMode = battleMusicSynth.getPlaybackMode();
    if (!currentMode) {
      battleMusicSynth.setPlaybackMode('random');
    }

    // 2. Set ambient volume (35%)
    battleMusicSynth.setVolume(0.35);

    // 3. Function to start audio smoothly - strictly single stream
    const startAutonomousAudio = () => {
      if (!battleMusicSynth.getHasActiveTracks()) {
        return;
      }

      const isMutedByUser = localStorage.getItem('warroom_music_enabled') === 'false';
      if (isMutedByUser) {
        return;
      }

      if (battleMusicSynth.getIsRunning()) {
        return;
      }

      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      battleMusicSynth.start();
      hasStartedRef.current = true;
    };

    // 4. Try to start if active tracks exist
    startAutonomousAudio();

    // 5. Global interaction listeners to unlock browser autoplay policies on first gesture
    const removeGestureListeners = () => {
      window.removeEventListener('pointerdown', handleUserGesture);
      window.removeEventListener('touchstart', handleUserGesture);
      window.removeEventListener('click', handleUserGesture);
      window.removeEventListener('keydown', handleUserGesture);
      window.removeEventListener('scroll', handleUserGesture);
    };

    const handleUserGesture = () => {
      if (!battleMusicSynth.getHasActiveTracks()) {
        removeGestureListeners();
        return;
      }
      const isMutedByUser = localStorage.getItem('warroom_music_enabled') === 'false';
      if (isMutedByUser) {
        removeGestureListeners();
        return;
      }
      startAutonomousAudio();
      if (battleMusicSynth.getIsRunning()) {
        removeGestureListeners();
      }
    };

    window.addEventListener('pointerdown', handleUserGesture, { passive: true });
    window.addEventListener('touchstart', handleUserGesture, { passive: true });
    window.addEventListener('click', handleUserGesture, { passive: true });
    window.addEventListener('keydown', handleUserGesture, { passive: true });
    window.addEventListener('scroll', handleUserGesture, { passive: true });

    // 6. Listen for Admin updates in the background
    const handleTracksUpdated = (e: CustomEvent<SoundtrackItem[]>) => {
      if (battleMusicSynth.getHasActiveTracks()) {
        const isMutedByUser = localStorage.getItem('warroom_music_enabled') === 'false';
        if (!isMutedByUser && !battleMusicSynth.getIsRunning()) {
          startAutonomousAudio();
        }
      } else {
        battleMusicSynth.stop();
      }
    };
    window.addEventListener('warroom_soundtracks_updated' as any, handleTracksUpdated);

    return () => {
      removeGestureListeners();
      window.removeEventListener('warroom_soundtracks_updated' as any, handleTracksUpdated);
    };
  }, []);

  // کامپوننت به صورت کاملاً Headless اجرا می‌شود تا آیکون تکراری ایجاد نشود
  return null;
}
