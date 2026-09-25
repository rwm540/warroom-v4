import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  Play, 
  Pause, 
  Award, 
  ArrowLeft, 
  ArrowRight, 
  RotateCcw, 
  Volume2, 
  FileText, 
  Upload, 
  Send,
  AlertTriangle,
  HelpCircle,
  Gem,
  Check,
  Compass
} from 'lucide-react';
import { User, JourneyStage } from '../types';
import { getStageBadge } from '../data/stageBadges';
import { STAGE_QUESTIONS, StageQuestion } from '../data/stageQuestionsData';
import { formatToPersianDigits } from '../utils/jalali';

interface StageQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  stage: JourneyStage | null;
  currentUser: User | null;
  triggerAlert: (msg: string) => void;
  onStageCompleted?: (stageId: string, earnedPoints: number) => void;
}

export default function StageQuizModal({
  isOpen,
  onClose,
  stage,
  currentUser,
  triggerAlert,
  onStageCompleted
}: StageQuizModalProps) {
  const stageId = stage?.id || '';
  const customQuestionsFromStage: StageQuestion[] = (stage?.quizQuestions && stage.quizQuestions.length > 0)
    ? stage.quizQuestions.map((q, idx) => ({
        id: q.id || `${stageId}_q_${idx}`,
        stageId: stageId,
        stageNumber: stage?.number || 1,
        stageTitle: stage?.title || '',
        question: q.question || 'سوال بدون متن',
        mediaType: 'image' as const,
        mediaUrl: stage?.bgThemeUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80',
        mediaCaption: `سوال ${formatToPersianDigits(idx + 1)} مرحله ${stage?.title || ''}`,
        options: (q.options && q.options.length >= 4 
          ? [q.options[0] || '', q.options[1] || '', q.options[2] || '', q.options[3] || ''] 
          : ['گزینه ۱', 'گزینه ۲', 'گزینه ۳', 'گزینه ۴']) as [string, string, string, string],
        correctOptionIndex: q.correctAnswer ?? 0,
        explanation: 'پاسخ صحیح بر اساس گزینه‌های انتخاب‌شده در سامانه تعریف شده است.',
        rewardPoints: Math.round((stage?.requiredPoints || 100) / (stage.quizQuestions?.length || 1)),
        timeLimitSeconds: q.timeLimitSeconds && q.timeLimitSeconds >= 5 && q.timeLimitSeconds <= 600 ? q.timeLimitSeconds : 30,
        wrongAnswerPenalty: q.wrongAnswerPenalty || stage?.wrongAnswerPenalty || 10
      }))
    : [];

  const questionsList: StageQuestion[] = customQuestionsFromStage.length > 0 
    ? customQuestionsFromStage 
    : ((stage && STAGE_QUESTIONS[stage.id]) ? STAGE_QUESTIONS[stage.id] : [
      {
        id: `${stageId}_default`,
        stageId: stageId,
        stageNumber: stage?.number || 1,
        stageTitle: stage?.title || '',
        question: `در مرحله «${stage?.title || 'مأموریت'}»، اولویت اصلی در مواجهه با چالش‌های میدانی و جنگ ترکیبی چیست؟`,
        mediaType: 'image',
        mediaUrl: stage?.bgThemeUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80',
        mediaCaption: `تصویر راهبردی مأموریت ${stage?.title || ''}`,
        options: [
          'توکل بر خداوند، بصیرت و اقدام هم‌افزا در قالب جوخه',
          'انفعال و انتظار بدون تحرک میدانی',
          'تمرکز فردی و بی‌توجهی به راهبری فرمانده',
          'شتاب‌زدگی و عدم ارزیابی اطلاعات'
        ],
        correctOptionIndex: 0,
        explanation: 'در مکتب مقاومت، توکل به همراه بصیرت و کار تشکیلاتی ضامن اصلی پیروزی و پیشرفت است.',
        rewardPoints: 100,
        timeLimitSeconds: 30
      }
    ]);

  const [activeTab, setActiveTab] = useState<'quiz' | 'deliverable'>('quiz');
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [scoreEarned, setScoreEarned] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  // Timer states
  const currentQ = questionsList[currentQIndex] || questionsList[0];
  const [timeLeft, setTimeLeft] = useState<number>(currentQ?.timeLimitSeconds || 60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Deliverable state
  const [fieldNote, setFieldNote] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // Video playback
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Notify global app layout to hide bottom navigation menu while modal is open
  useEffect(() => {
    if (isOpen) {
      window.dispatchEvent(new CustomEvent('warroom_modal_active_change', { detail: { active: true } }));
      return () => {
        window.dispatchEvent(new CustomEvent('warroom_modal_active_change', { detail: { active: false } }));
      };
    }
  }, [isOpen]);

  // Reset question state when changing question or stage
  useEffect(() => {
    if (!isOpen || !stage) return;
    setSelectedOption(null);
    setIsSubmitted(false);
    setIsCorrect(false);
    setTimeLeft(currentQ?.timeLimitSeconds || 60);
    setIsTimerRunning(true);
    setIsPlayingVideo(false);
  }, [currentQIndex, stage?.id, isOpen]);

  // Countdown Timer Logic
  useEffect(() => {
    if (!isOpen || !isTimerRunning || isSubmitted || quizFinished) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setIsTimerRunning(false);
          setIsSubmitted(true);
          setIsCorrect(false);
          triggerAlert('زمان پاسخ‌دهی به پایان رسید!');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, isTimerRunning, isSubmitted, quizFinished, currentQIndex]);

  if (!isOpen || !stage) return null;

  const handleSelectOption = (idx: number) => {
    if (isSubmitted || timeLeft <= 0) return;
    setSelectedOption(idx);
  };

  const handleSubmitAnswer = () => {
    if (selectedOption === null) {
      triggerAlert('لطفاً یکی از ۴ گزینه را انتخاب فرمایید.');
      return;
    }

    setIsTimerRunning(false);
    setIsSubmitted(true);

    const correct = selectedOption === currentQ.correctOptionIndex;
    setIsCorrect(correct);

    if (correct) {
      setScoreEarned((prev) => prev + currentQ.rewardPoints);
      triggerAlert(`پاسخ صحیح بود! +${formatToPersianDigits(currentQ.rewardPoints)} کریستال به شما تعلق گرفت.`);
    } else {
      const penalty = Math.max(1, currentQ.wrongAnswerPenalty || stage?.wrongAnswerPenalty || 10);
      setScoreEarned((prev) => prev - penalty);
      triggerAlert(`پاسخ نادرست بود! ⚠️ ${formatToPersianDigits(penalty)}- امتیاز نمره منفی کسر گردید.`);
    }
  };

  const handleNextQuestion = () => {
    if (currentQIndex < questionsList.length - 1) {
      setCurrentQIndex((prev) => prev + 1);
    } else {
      setQuizFinished(true);
      if (onStageCompleted) {
        onStageCompleted(stage.id, scoreEarned);
      }
      triggerAlert(`آزمون مرحله «${stage.title}» با موفقیت پایان یافت. مجموع پاداش کسب‌شده: ${formatToPersianDigits(scoreEarned)} کریستال`);
    }
  };

  const handleResetQuiz = () => {
    setCurrentQIndex(0);
    setScoreEarned(0);
    setQuizFinished(false);
    setSelectedOption(null);
    setIsSubmitted(false);
    setIsCorrect(false);
    setTimeLeft(questionsList[0]?.timeLimitSeconds || 60);
    setIsTimerRunning(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFileName(e.target.files[0].name);
      triggerAlert(`فایل "${e.target.files[0].name}" بارگذاری شد.`);
    }
  };

  // Timer color and progress calculation
  const progressPercent = Math.max(0, Math.min(100, (timeLeft / (currentQ.timeLimitSeconds || 60)) * 100));
  const isUrgent = timeLeft <= 10;
  const isWarning = timeLeft <= 25 && timeLeft > 10;

  const optionLabels = ['الف', 'ب', 'ج', 'د'];

  return (
    <div className="fixed inset-0 z-[130] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 dir-rtl overflow-hidden font-sans select-none">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-[#090e1c] border border-cyan-500/40 rounded-3xl max-w-xl sm:max-w-2xl w-full max-h-[88vh] sm:max-h-[90vh] flex flex-col overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.25)] relative my-auto"
      >
        
        {/* ========================================================================= */}
        {/* 1. TOP HEADER & STAGE INFO (SHRINK-0)                                     */}
        {/* ========================================================================= */}
        <div className="relative p-3 sm:p-4 border-b border-slate-800/80 bg-gradient-to-r from-[#0d162b] via-[#091122] to-[#060b18] shrink-0">
          <div className="flex items-center justify-between gap-2.5">
            
            {/* Stage Badge & Title */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-0.5 shadow-md flex-shrink-0">
                <div className="relative w-full h-full bg-[#070d1a] rounded-[14px] overflow-hidden flex items-center justify-center">
                  {stage.customIconUrl ? (
                    <img
                      src={stage.customIconUrl}
                      alt={`نشان مرحله ${stage.title}`}
                      draggable={false}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center text-cyan-400">
                      <Compass size={24} />
                    </div>
                  )}
                  <span className="absolute bottom-0 inset-x-0 bg-black/60 text-cyan-300 font-mono font-black text-[9px] sm:text-[10px] text-center leading-tight py-0.5">
                    {formatToPersianDigits(stage.number)}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-md bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">
                    مرحله {formatToPersianDigits(stage.number)} از ۷
                  </span>
                  <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                    <Sparkles size={11} />
                    <span>آزمون زمان‌دار</span>
                  </span>
                </div>
                <h2 className="text-sm sm:text-base font-black text-white mt-0.5">
                  {stage.title} : <span className="text-slate-300 font-medium text-xs">{stage.subtitle}</span>
                </h2>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition shrink-0 cursor-pointer"
              title="بستن پنجره"
            >
              <X size={18} />
            </button>

          </div>

          {/* Sub Tab Switcher: سوالات چهارگزینه‌ای vs ارسال مستندات */}
          <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-slate-800/60">
            <button
              onClick={() => setActiveTab('quiz')}
              className={`flex-1 py-1.5 px-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'quiz'
                  ? 'bg-cyan-500 text-slate-950 font-black shadow-md'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <HelpCircle size={14} />
              <span>سوالات ۴ گزینه‌ای ({formatToPersianDigits(currentQIndex + 1)} از {formatToPersianDigits(questionsList.length)})</span>
            </button>

            <button
              onClick={() => setActiveTab('deliverable')}
              className={`flex-1 py-1.5 px-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'deliverable'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Upload size={14} />
              <span>ارسال مستندات میدانی</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. MAIN MODAL BODY (SCROLLABLE CONTENT)                                    */}
        {/* ========================================================================= */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-3 flex-1">
          
          {activeTab === 'quiz' ? (
            quizFinished ? (
              /* QUIZ RESULT / COMPLETION CARD */
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center py-5 px-4 space-y-3 bg-gradient-to-b from-[#0a1832] to-[#081022] rounded-2xl border border-cyan-500/40"
              >
                <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-amber-400 to-emerald-400 p-0.5 shadow-[0_0_30px_rgba(245,158,11,0.5)]">
                  <div className="w-full h-full bg-[#050914] rounded-[14px] flex items-center justify-center text-amber-400">
                    <Award size={32} />
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-emerald-400 block font-mono">مأموریت با موفقیت انجام شد</span>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    تبریک! مرحله «{stage.title}» با موفقیت فتح شد
                  </h3>
                  <p className="text-xs text-slate-300 max-w-md mx-auto">
                    پاسخ‌های شما با موفقیت ارزیابی گردید و کریستال‌های پاداش به شناسنامه رزمنده شما افزوده شد.
                  </p>
                </div>

                {/* Score badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-cyan-950/80 border border-cyan-500/50 text-cyan-200">
                  <Gem size={16} className="text-cyan-400 animate-pulse" />
                  <span className="text-xs font-bold">پاداش کریستال کسب‌شده:</span>
                  <span className="font-mono font-black text-base text-white">
                    +{formatToPersianDigits(scoreEarned || currentQ.rewardPoints)}
                  </span>
                </div>
              </motion.div>
            ) : (
              /* ACTIVE QUIZ QUESTION VIEW */
              <div className="space-y-3">
                
                {/* 1. LIVE COUNTDOWN TIMER BAR */}
                <div className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 shadow-md ${
                  isUrgent 
                    ? 'bg-rose-950/50 border-rose-500/80 text-rose-300 animate-pulse'
                    : isWarning
                    ? 'bg-amber-950/40 border-amber-500/70 text-amber-300'
                    : 'bg-cyan-950/30 border-cyan-500/40 text-cyan-300'
                }`}>
                  
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded-lg ${
                      isUrgent ? 'bg-rose-500/20 text-rose-400' : isWarning ? 'bg-amber-500/20 text-amber-400' : 'bg-cyan-500/20 text-cyan-400'
                    }`}>
                      <Clock size={16} className={isUrgent ? 'animate-spin' : ''} />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold leading-tight">زمان باقی‌مانده:</span>
                      <span className="font-mono font-black text-xs sm:text-sm">
                        {formatToPersianDigits(timeLeft)} ثانیه
                      </span>
                    </div>
                  </div>

                  {/* Progress Indicator */}
                  <div className="flex-1 max-w-[120px] sm:max-w-[180px]">
                    <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-700/50">
                      <div 
                        className={`h-full transition-all duration-1000 rounded-full ${
                          isUrgent 
                            ? 'bg-gradient-to-r from-rose-500 to-red-600' 
                            : isWarning 
                            ? 'bg-gradient-to-r from-amber-400 to-orange-500' 
                            : 'bg-gradient-to-r from-cyan-400 to-emerald-400'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Reward badge */}
                  <div className="bg-slate-900/80 px-2 py-0.5 rounded-lg border border-slate-800 text-[10px] font-bold font-mono text-amber-300 flex items-center gap-1 shrink-0">
                    <Sparkles size={11} className="text-amber-400" />
                    <span>+{formatToPersianDigits(currentQ.rewardPoints)}</span>
                  </div>

                </div>

                {/* 2. QUESTION MEDIA (PHOTO OR VIDEO) - COMPACT HEIGHT */}
                <div className="rounded-xl overflow-hidden border border-slate-800 bg-[#060b16] relative shadow-md">
                  {currentQ.mediaType === 'video' ? (
                    <div className="relative max-h-36 sm:max-h-48 w-full bg-slate-950 flex items-center justify-center">
                      <video
                        ref={videoRef}
                        src={currentQ.mediaUrl}
                        controls
                        className="w-full max-h-36 sm:max-h-48 object-contain"
                        onPlay={() => setIsPlayingVideo(true)}
                        onPause={() => setIsPlayingVideo(false)}
                      />
                    </div>
                  ) : (
                    <div className="relative max-h-32 sm:max-h-44 w-full bg-slate-950 overflow-hidden">
                      <img
                        src={currentQ.mediaUrl}
                        alt="تصویر سوال"
                        className="w-full max-h-32 sm:max-h-44 object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                    </div>
                  )}

                  {/* Media Caption Pill */}
                  <div className="px-2.5 py-1.5 bg-slate-950/90 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-300 font-medium">
                    <span className="truncate max-w-[220px] sm:max-w-xs">{currentQ.mediaCaption}</span>
                    <span className="text-[9px] font-mono text-cyan-400 font-bold bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/50 shrink-0">
                      {currentQ.mediaType === 'video' ? 'فیلم آموزشی' : 'تصویر توجیهی'}
                    </span>
                  </div>
                </div>

                {/* 3. QUESTION TEXT */}
                <div className="bg-[#0b1426] p-3 rounded-xl border border-slate-800/90">
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-md bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5">
                      ؟
                    </div>
                    <h3 className="text-xs sm:text-sm font-black text-white leading-relaxed">
                      {currentQ.question}
                    </h3>
                  </div>
                </div>

                {/* 4. FOUR MULTIPLE CHOICE OPTIONS (الف، ب، ج، د) */}
                <div className="space-y-1.5">
                  {currentQ.options.map((optionText, idx) => {
                    const isSelected = selectedOption === idx;
                    const isCorrectAnswer = idx === currentQ.correctOptionIndex;

                    let cardStyle = 'bg-slate-900/80 hover:bg-slate-800/90 border-slate-800 text-slate-200';
                    let badgeStyle = 'bg-slate-800 text-slate-400 border-slate-700';

                    if (isSubmitted) {
                      if (isCorrectAnswer) {
                        cardStyle = 'bg-emerald-950/70 border-emerald-500 text-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.3)]';
                        badgeStyle = 'bg-emerald-500 text-slate-950 border-emerald-400 font-black';
                      } else if (isSelected && !isCorrectAnswer) {
                        cardStyle = 'bg-rose-950/70 border-rose-500 text-rose-100 shadow-[0_0_12px_rgba(244,63,94,0.3)]';
                        badgeStyle = 'bg-rose-500 text-white border-rose-400 font-black';
                      }
                    } else if (isSelected) {
                      cardStyle = 'bg-cyan-950/70 border-cyan-400 text-white shadow-[0_0_12px_rgba(6,182,212,0.3)]';
                      badgeStyle = 'bg-cyan-400 text-slate-950 border-cyan-300 font-black';
                    }

                    return (
                      <div
                        key={idx}
                        onClick={() => handleSelectOption(idx)}
                        className={`p-2.5 sm:p-3 rounded-xl border transition-all duration-150 flex items-center justify-between gap-2.5 cursor-pointer ${cardStyle}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`w-6 h-6 rounded-lg border flex items-center justify-center font-bold text-[11px] shrink-0 ${badgeStyle}`}>
                            {optionLabels[idx]}
                          </span>
                          <span className="text-xs font-bold leading-normal">
                            {optionText}
                          </span>
                        </div>

                        {/* Status Icon */}
                        {isSubmitted && (
                          <div className="shrink-0">
                            {isCorrectAnswer ? (
                              <CheckCircle2 size={16} className="text-emerald-400" />
                            ) : isSelected ? (
                              <XCircle size={16} className="text-rose-400" />
                            ) : null}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* 5. STRATEGIC EXPLANATION (REVEALED AFTER SUBMISSION) */}
                {isSubmitted && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-3 rounded-xl border ${
                      isCorrect 
                        ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200' 
                        : 'bg-slate-900/90 border-slate-700/80 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-[11px] font-black">
                      <Sparkles size={13} className={isCorrect ? 'text-emerald-400' : 'text-amber-400'} />
                      <span>تحلیل راهبردی ستاد و نکته کلیدی:</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-300">
                      {currentQ.explanation}
                    </p>
                  </motion.div>
                )}

              </div>
            )
          ) : (
            /* DELIVERABLE TAB (BARGOZARI GOZARESH KAR) */
            <div className="space-y-3">
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <h4 className="font-black text-white text-xs flex items-center gap-1.5">
                  <FileText size={14} className="text-amber-400" />
                  <span>شرح اهداف میدانی مرحله {stage.title}:</span>
                </h4>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  {stage.description} رزمندگان عزیز می‌توانند مستندات میدانی، عکس، کلیپ و یادداشت اختصاصی خود را جهت داوری مستقیم ارسال نمایند.
                </p>
              </div>

              {/* Upload area */}
              <div className="border-2 border-dashed border-slate-800 hover:border-amber-500/50 p-4 rounded-xl text-center space-y-1.5 transition bg-[#060b16]">
                <input 
                  type="file" 
                  id="stage-field-file-upload" 
                  onChange={handleFileUpload}
                  className="hidden" 
                />
                <label htmlFor="stage-field-file-upload" className="cursor-pointer block space-y-1">
                  <Upload size={24} className="mx-auto text-amber-400" />
                  <span className="text-white font-bold text-xs block">برای انتخاب و بارگذاری فایل کلیک کنید</span>
                  <span className="text-[10px] text-slate-500 block">پشتیبانی از انواع فایل‌های ویدیویی، فشرده، تصویر و اسناد (حداکثر ۵۰ مگابایت)</span>
                </label>
                {uploadedFileName && (
                  <div className="mt-2 bg-emerald-950/60 border border-emerald-800 text-emerald-300 p-2 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-2">
                    <CheckCircle2 size={15} />
                    <span>فایل آماده ارسال: {uploadedFileName}</span>
                  </div>
                )}
              </div>

              {/* Note */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-300">گزارش و توضیحات تکمیلی برای هیئت داوران ستاد:</label>
                <textarea 
                  rows={2}
                  value={fieldNote}
                  onChange={(e) => setFieldNote(e.target.value)}
                  placeholder="توضیحات اقدامات انجام شده توسط جوخه در این مرحله..."
                  className="w-full bg-[#060b16] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

        </div>

        {/* ========================================================================= */}
        {/* 3. STICKY FIXED FOOTER WITH ALWAYS-VISIBLE PRIMARY ACTION BUTTONS (SHRINK-0) */}
        {/* ========================================================================= */}
        <div className="p-3 sm:p-4 border-t border-slate-800/90 bg-[#060b18]/95 backdrop-blur-sm shrink-0">
          {activeTab === 'quiz' ? (
            quizFinished ? (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                <button
                  onClick={handleResetQuiz}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <RotateCcw size={14} />
                  <span>آزمون مجدد</span>
                </button>
                <button
                  onClick={onClose}
                  className="w-full sm:flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs transition shadow-lg cursor-pointer"
                >
                  تایید و بازگشت به نقشه بازی
                </button>
              </div>
            ) : (
              <div>
                {!isSubmitted ? (
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={selectedOption === null}
                    className={`w-full py-2.5 sm:py-3 rounded-xl font-black text-xs sm:text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer ${
                      selectedOption !== null
                        ? 'bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 shadow-cyan-900/40'
                        : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                    }`}
                  >
                    <Check size={16} />
                    <span>ثبت و ارزیابی پاسخ</span>
                  </button>
                ) : (
                  <button
                    onClick={handleNextQuestion}
                    className="w-full py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs sm:text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>{currentQIndex < questionsList.length - 1 ? 'رفتن به سوال بعدی' : 'مشاهده نتیجه و پایان آزمون مرحله'}</span>
                    <ArrowLeft size={16} />
                  </button>
                )}
              </div>
            )
          ) : (
            <button
              onClick={() => {
                triggerAlert(`مستندات مرحله «${stage.title}» با موفقیت برای هیئت داوران ستاد ارسال شد.`);
                onClose();
              }}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs py-2.5 sm:py-3 rounded-xl transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send size={15} />
              <span>ارسال نهایی مستندات به قرارگاه</span>
            </button>
          )}
        </div>

      </motion.div>
    </div>
  );
}
