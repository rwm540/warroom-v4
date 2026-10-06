import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Play, Pause, Heart, Volume2, VolumeX } from 'lucide-react';

const DEFAULT_TACTICAL_VIDEO = '/videowarroom.mp4';

interface TacticalVideoPlayerProps {
  src?: string;
  poster?: string;
  className?: string;
  videoClassName?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onDoubleTap?: () => void;
  aspectRatioClass?: string;
}

export default function TacticalVideoPlayer({
  src,
  poster,
  className = '',
  videoClassName = '',
  autoPlay = false,
  loop = false,
  muted: initialMuted = false,
  onPlay,
  onPause,
  onEnded,
  onDoubleTap,
  aspectRatioClass = 'aspect-video'
}: TacticalVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);

  const [doubleTapHeart, setDoubleTapHeart] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(initialMuted);
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [currentSrc, setCurrentSrc] = useState<string>(src?.trim() || DEFAULT_TACTICAL_VIDEO);

  // Update src if prop changes
  useEffect(() => {
    setCurrentSrc(src?.trim() || DEFAULT_TACTICAL_VIDEO);
  }, [src]);

  // Format the source with media fragment #t=0.001 to ensure the browser seeks and paints the first frame (never black)
  const videoSrc = React.useMemo(() => {
    const s = currentSrc || DEFAULT_TACTICAL_VIDEO;
    if (s.startsWith('data:') || s.startsWith('blob:') || s.includes('#')) {
      return s;
    }
    return `${s}#t=0.001`;
  }, [currentSrc]);

  // Force first frame decoding on metadata load so the screen is never black
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      // Ensure volume is fully unmuted unless explicitly set
      if (!initialMuted) {
        videoRef.current.muted = false;
        videoRef.current.volume = 1.0;
        setIsMuted(false);
      }
      if (videoRef.current.currentTime === 0) {
        try {
          videoRef.current.currentTime = 0.001;
        } catch {
          // Safe ignore
        }
      }
    }
  };

  const handleVideoError = () => {
    if (currentSrc !== DEFAULT_TACTICAL_VIDEO) {
      console.warn('Tactical video source failed, falling back to default tactical video...');
      setCurrentSrc(DEFAULT_TACTICAL_VIDEO);
    }
  };

  // Safe Play that never mutes the audio on AbortError or fast clicks
  const safePlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      // Ensure unmuted with full volume on user intent
      if (!isMuted) {
        video.muted = false;
        video.volume = 1.0;
      }
      playPromiseRef.current = video.play();
      await playPromiseRef.current;
      setIsPlaying(true);
      setHasStarted(true);
      onPlay?.();
    } catch (err: any) {
      // If browser blocked unmuted autoplay due to policy, fallback to muted autoplay but keep audio ready on click
      if (err?.name === 'NotAllowedError') {
        console.warn('Browser requires interaction for unmuted playback; starting muted...');
        video.muted = true;
        setIsMuted(true);
        try {
          playPromiseRef.current = video.play();
          await playPromiseRef.current;
          setIsPlaying(true);
          setHasStarted(true);
          onPlay?.();
        } catch {
          // Ignore
        }
      } else if (err?.name === 'AbortError') {
        // Fast click/pause interruption - DO NOT mute the video!
      }
    } finally {
      playPromiseRef.current = null;
    }
  }, [isMuted, onPlay]);

  // Safe Pause
  const safePause = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    if (playPromiseRef.current) {
      try {
        await playPromiseRef.current;
      } catch {
        // Ignore
      }
    }
    video.pause();
    setIsPlaying(false);
    onPause?.();
  }, [onPause]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      safePlay();
    } else {
      safePause();
    }
  }, [safePlay, safePause]);

  // Explicit audio mute/unmute toggle that never gets overridden
  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    const nextMuted = !video.muted;
    video.muted = nextMuted;
    if (!nextMuted) {
      video.volume = 1.0;
    }
    setIsMuted(nextMuted);
  }, []);

  // Handle Single Click (Toggle Play) vs Double Click (Like without pausing/muting)
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // If double tap occurs within 280ms
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;

      if (onDoubleTap) {
        onDoubleTap();
      }
      setDoubleTapHeart(true);
      setTimeout(() => setDoubleTapHeart(false), 900);
      return;
    }

    // Single Click detected -> wait to see if second click occurs
    clickTimeoutRef.current = setTimeout(() => {
      clickTimeoutRef.current = null;
      // On user click, also make sure video is unmuted if it was temporarily muted by browser autoplay policy
      const video = videoRef.current;
      if (video && video.muted && !initialMuted) {
        video.muted = false;
        video.volume = 1.0;
        setIsMuted(false);
      }
      togglePlay();
    }, 240);
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    onEnded?.();
  };

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      onClick={handleClick}
      className={`relative w-full ${aspectRatioClass} bg-slate-950 rounded-2xl overflow-hidden group select-none cursor-pointer border border-slate-800 shadow-xl ${className}`}
    >
      {/* HTML5 Video Element with strict security restrictions (NO download, NO controls, NO PiP) */}
      <video
        ref={videoRef}
        src={videoSrc}
        poster={poster}
        autoPlay={autoPlay}
        loop={loop}
        muted={initialMuted}
        playsInline
        preload="auto"
        controls={false}
        disablePictureInPicture
        controlsList="nodownload nofullscreen noremoteplayback noplaybackrate"
        onLoadedMetadata={handleLoadedMetadata}
        onLoadedData={handleLoadedMetadata}
        onError={handleVideoError}
        onEnded={handleVideoEnded}
        onPlay={() => {
          setIsPlaying(true);
          setHasStarted(true);
        }}
        onPause={() => setIsPlaying(false)}
        onContextMenu={(e) => e.preventDefault()}
        className={`w-full h-full object-cover transition-opacity duration-300 ${videoClassName}`}
      />

      {/* Floating Animated Heart on Double Click / Double Tap */}
      {doubleTapHeart && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
          <Heart size={84} className="fill-rose-500 text-rose-500 animate-bounce drop-shadow-[0_0_40px_rgba(244,63,94,0.95)]" />
        </div>
      )}

      {/* Audio Mute/Unmute Quick Floating Button */}
      <button
        type="button"
        onClick={toggleMute}
        className="absolute bottom-3 left-3 z-30 p-2 rounded-xl bg-black/60 hover:bg-black/85 text-white border border-white/20 backdrop-blur-md transition shadow-lg flex items-center gap-1 cursor-pointer"
        title={isMuted ? 'فعال‌سازی صدای ویدیو (کلیک کنید)' : 'بی‌صدا کردن ویدیو'}
      >
        {isMuted ? (
          <>
            <VolumeX size={16} className="text-rose-400" />
            <span className="text-[10px] font-bold text-rose-300">صدا قطع</span>
          </>
        ) : (
          <>
            <Volume2 size={16} className="text-cyan-400" />
            <span className="text-[10px] font-bold text-cyan-300">صدا وصل</span>
          </>
        )}
      </button>

      {/* Central Big Tactical Play Button (When Video is Paused / Stopped) */}
      {!isPlaying && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/45 backdrop-blur-[2px] transition-all group-hover:bg-black/35 pointer-events-none">
          <div className="relative flex items-center justify-center">
            <div className="absolute -inset-4 rounded-full bg-cyan-500/30 blur-lg animate-pulse" />
            <button
              type="button"
              className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-950/85 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shadow-[0_0_30px_rgba(6,182,212,0.6)] transform group-hover:scale-110 active:scale-95 transition-all"
              title="شروع پخش ویدیو"
            >
              <Play size={32} className="fill-cyan-400 text-cyan-400 ml-1" />
            </button>
          </div>
          <span className="mt-3 text-xs font-bold text-slate-200 bg-slate-950/80 px-3 py-1 rounded-full border border-slate-700/60 shadow">
            {hasStarted ? 'برای ادامه کلیک کنید (استارت)' : 'برای شروع کلیک کنید (استارت)'}
          </span>
        </div>
      )}
    </div>
  );
}
