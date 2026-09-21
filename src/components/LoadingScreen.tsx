import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import RadarLoading from './RadarLoading';

interface LoadingScreenProps {
  onComplete: () => void;
  isGirls?: boolean;
}

export default function LoadingScreen({ onComplete, isGirls }: LoadingScreenProps) {
  const [progress, setProgress] = useState(45);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // Ultra-fast instant loading sequence (completes in ~100ms)
    const interval = setInterval(() => {
      if (!isMounted) return;
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 35;
      });
    }, 20);

    const timer = setTimeout(() => {
      if (!isMounted) return;
      clearInterval(interval);
      setProgress(100);
      setIsFinished(true);
      setTimeout(() => {
        if (isMounted) {
          onComplete();
        }
      }, 60);
    }, 110);

    return () => {
      isMounted = false;
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {!isFinished && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.01 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className={`fixed inset-0 z-[99999] w-screen h-screen flex items-center justify-center p-4 dir-rtl font-sans select-none overflow-hidden touch-none ${
            isGirls ? 'bg-[#0a0212] text-fuchsia-100' : 'bg-[#020804] text-emerald-100'
          }`}
        >
          {/* Atmosphere Background Glow - Perfectly Centered */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
            <div className={`w-[480px] h-[480px] blur-[140px] rounded-full ${isGirls ? 'bg-fuchsia-600/20' : 'bg-emerald-600/20'}`} />
            <div className={`absolute inset-0 bg-[size:28px_28px] ${isGirls ? 'bg-[linear-gradient(rgba(217,70,239,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(217,70,239,0.06)_1px,transparent_1px)] opacity-40' : 'bg-[linear-gradient(rgba(16,185,129,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.06)_1px,transparent_1px)] opacity-50'}`} />
          </div>

          {/* Locked Exact-Center Container */}
          <div className="relative z-10 flex items-center justify-center">
            <RadarLoading 
              size="md" 
              label="در حال پایش راداری و پردازش..." 
              subLabel="سامانه اتاق جنگ"
              progress={progress} 
              centerScope={true}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
