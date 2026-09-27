import React, { useState, useRef, useCallback } from 'react';
import { Play } from 'lucide-react';

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
  aspectRatioClass = 'aspect-video'
}: TacticalVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [currentSrc, setCurrentSrc] = useState<string>(src?.trim() || DEFAULT_TACTICAL_VIDEO);

  // Update src if prop changes
  React.useEffect(() => {
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
    if (videoRef.current && videoRef.current.currentTime === 0) {
      try {
        videoRef.current.currentTime = 0.001;
      } catch {
        // Safe ignore
      }
    }
  };

  const handleVideoError = () => {
    if (currentSrc !== DEFAULT_TACTICAL_VIDEO) {
      console.warn('Tactical video source failed, falling back to default tactical video...');
      setCurrentSrc(DEFAULT_TACTICAL_VIDEO);
    }
  };

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => {
        setIsPlaying(true);
        setHasStarted(true);
        onPlay?.();
      }).catch((err) => {
        console.warn('Video playback requires interaction or muted autoplay:', err);
        video.muted = true;
        video.play().then(() => {
          setIsPlaying(true);
          setHasStarted(true);
          onPlay?.();
        }).catch(() => {});
      });
    } else {
      video.pause();
      setIsPlaying(false);
      onPause?.();
    }
  }, [onPlay, onPause]);

  const handleVideoEnded = () => {
    setIsPlaying(false);
    onEnded?.();
  };

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      onClick={togglePlay}
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
