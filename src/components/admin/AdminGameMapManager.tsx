import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { 
  Map, Upload, Image as ImageIcon, RotateCcw, Check, Sparkles, 
  Sliders, Eye, Layers, Compass, Shield, MapPin, AlertCircle,
  EyeOff, Move, MoveHorizontal, GitCommit, SlidersHorizontal, 
  Palette, Maximize2, Minimize2, MousePointerClick, Grid, RefreshCw
} from 'lucide-react';
import { SiteSettings, JourneyStage } from '../../types';
import { formatToPersianDigits } from '../../utils/jalali';

interface AdminGameMapManagerProps {
  siteSettings: SiteSettings;
  setSiteSettings: (settings: any) => void;
  stages?: JourneyStage[];
  setStages?: React.Dispatch<React.SetStateAction<JourneyStage[]>>;
  triggerAlert: (msg: string) => void;
}

// الگوها و نقشه‌های آماده و استراتژیک برای اتاق جنگ
const MAP_PRESETS = [
  {
    id: 'default_radar',
    title: 'رادار تاکتیکی پیش‌فرض',
    description: 'شبکه وکتوری راداری با گرید سایبرنتیک و دایره‌های مختصات',
    url: '', // Empty means standard vector tactical SVG
  },
  {
    id: 'satellite_ops',
    title: 'نقشه ماهواره‌ای عملیاتی',
    description: 'دید ماهواره‌ای تاکتیکی با کدهای مختصات جغرافیایی',
    url: '/images/backgrounds/tactical_war_map_background.webp',
  },
  {
    id: 'cyber_grid',
    title: 'شبکه نئونی سایبرپانک',
    description: 'ماتریکس تاریک دیجیتال با خطوط فیروزه‌ای و کهکشانی',
    url: '/images/banners/boys_registration_banner.webp',
  },
  {
    id: 'ancient_parchment',
    title: 'طومار کهن تاریخی',
    description: 'بافت کاغذ کهن و باستانی مناسب داستان‌ها و ماجراهای تاریخی',
    url: '/images/banners/girls_registration_banner.webp',
  },
  {
    id: 'dark_nebula',
    title: 'سحابی و کهکشان تاکتیکی',
    description: 'فضای کیهانی و ستاره‌ای با عمق میدان نبرد وسیع',
    url: '/images/logos/warroom_logo.webp',
  }
];

export const AdminGameMapManager: React.FC<AdminGameMapManagerProps> = ({
  siteSettings,
  setSiteSettings,
  stages = [],
  setStages,
  triggerAlert
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [previewTab, setPreviewTab] = useState<'editor' | 'live_preview'>('editor');
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [draggingStageId, setDraggingStageId] = useState<string | null>(null);

  // Form local state synced with siteSettings
  const [customBgUrl, setCustomBgUrl] = useState<string>(siteSettings?.gameMapCustomBgUrl || '');
  const [bgMode, setBgMode] = useState<'cover' | 'contain' | 'repeat' | 'auto'>(siteSettings?.gameMapBgMode || 'cover');
  const [bgOpacity, setBgOpacity] = useState<number>(siteSettings?.gameMapBgOpacity !== undefined ? siteSettings.gameMapBgOpacity : 100);
  const [showRoadOverlay, setShowRoadOverlay] = useState<boolean>(siteSettings?.gameMapShowRoadOverlay !== false);
  const [roadOpacity, setRoadOpacity] = useState<number>(siteSettings?.gameMapRoadOpacity !== undefined ? siteSettings.gameMapRoadOpacity : 85);
  const [roadCurvature, setRoadCurvature] = useState<number>(siteSettings?.gameMapRoadCurvature !== undefined ? siteSettings.gameMapRoadCurvature : 70);
  const [roadOffsetX, setRoadOffsetX] = useState<number>(siteSettings?.gameMapRoadOffsetX || 0);
  const [roadWidth, setRoadWidth] = useState<number>(siteSettings?.gameMapRoadWidth || 30);
  const [stagesSpreadX, setStagesSpreadX] = useState<number>(siteSettings?.gameMapStagesSpreadX !== undefined ? siteSettings.gameMapStagesSpreadX : 70);
  const [blurLevel, setBlurLevel] = useState<number>(siteSettings?.gameMapBlurLevel || 0);

  // 📐 طول و ابعاد بوم نقشه
  const [mapHeight, setMapHeight] = useState<number>(siteSettings?.gameMapHeight || 620);
  const [connectStagesWithRoad, setConnectStagesWithRoad] = useState<boolean>(siteSettings?.gameMapConnectStagesWithRoad !== false);

  // 📍 مختصات درگ اند دراپ مراحل (موقعیت بر حسب درصد 0 تا 100)
  const [stageCoordinates, setStageCoordinates] = useState<Record<string, { x: number; y: number }>>(() => {
    const initial: Record<string, { x: number; y: number }> = { ...(siteSettings?.gameMapStageCoordinates || {}) };
    
    // اگر مرحله‌ای در siteSettings نبود از مقادیر استیج‌ها یا موقعیت پیش‌فرض زیگزاگی پر کن
    const count = stages.length || 4;
    stages.forEach((st, idx) => {
      if (!initial[st.id]) {
        if (st.mapXPercent !== undefined && st.mapYPercent !== undefined) {
          initial[st.id] = { x: st.mapXPercent, y: st.mapYPercent };
        } else {
          const y = count === 1 ? 50 : Math.round(12 + (idx / (count - 1)) * 76);
          const x = idx === 0 ? 50 : idx % 2 === 1 ? 30 : 70;
          initial[st.id] = { x, y };
        }
      }
    });
    return initial;
  });

  // Sync state if siteSettings changes externally
  useEffect(() => {
    if (siteSettings?.gameMapStageCoordinates) {
      setStageCoordinates(prev => ({ ...prev, ...siteSettings.gameMapStageCoordinates }));
    }
  }, [siteSettings?.gameMapStageCoordinates]);

  // تبدیل و آپلود فایل تصویر نقشه
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      triggerAlert('لطفاً یک فایل تصویری معتبر (JPG, PNG, WEBP) انتخاب کنید.');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      triggerAlert('حجم فایل تصویر نباید بیشتر از ۸ مگابایت باشد.');
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setCustomBgUrl(dataUrl);
        triggerAlert('تصویر نقشه با موفقیت لود شد. اکنون می‌توانید مراحل را روی جاده تصویر درگ کنید.');
      }
      setIsUploading(false);
    };
    reader.onerror = () => {
      setIsUploading(false);
      triggerAlert('خطا در خواندن فایل تصویر.');
    };
    reader.readAsDataURL(file);
  };

  // 🎯 جابجایی مرحله با ماوس / لمس بر روی بوم نقشه (Drag & Drop)
  const updateStagePositionFromPointer = useCallback((clientX: number, clientY: number, stageId: string) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    let xPercent = ((clientX - rect.left) / rect.width) * 100;
    let yPercent = ((clientY - rect.top) / rect.height) * 100;

    // محدوده بین 4% تا 96% برای خارج نشدن از کادر
    xPercent = Math.max(4, Math.min(96, Math.round(xPercent)));
    yPercent = Math.max(4, Math.min(96, Math.round(yPercent)));

    setStageCoordinates(prev => ({
      ...prev,
      [stageId]: { x: xPercent, y: yPercent }
    }));
  }, []);

  // هندلر درگ با ماوس
  useEffect(() => {
    if (!draggingStageId) return;

    const handleMouseMove = (e: MouseEvent) => {
      updateStagePositionFromPointer(e.clientX, e.clientY, draggingStageId);
    };

    const handleMouseUp = () => {
      setDraggingStageId(null);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        updateStagePositionFromPointer(e.touches[0].clientX, e.touches[0].clientY, draggingStageId);
      }
    };

    const handleTouchEnd = () => {
      setDraggingStageId(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [draggingStageId, updateStagePositionFromPointer]);

  // اعمال و ذخیره کامل در پایگاه داده
  const handleSave = () => {
    const updatedSiteSettings: SiteSettings = {
      ...siteSettings,
      gameMapCustomBgUrl: customBgUrl.trim(),
      gameMapBgMode: bgMode,
      gameMapBgOpacity: bgOpacity,
      gameMapShowRoadOverlay: showRoadOverlay,
      gameMapRoadOpacity: roadOpacity,
      gameMapRoadCurvature: roadCurvature,
      gameMapRoadOffsetX: roadOffsetX,
      gameMapRoadWidth: roadWidth,
      gameMapStagesSpreadX: stagesSpreadX,
      gameMapBlurLevel: blurLevel,
      gameMapHeight: mapHeight,
      gameMapConnectStagesWithRoad: connectStagesWithRoad,
      gameMapStageCoordinates: stageCoordinates,
    };
    setSiteSettings(updatedSiteSettings);

    // بروزرسانی استیج‌ها
    if (setStages && stages.length > 0) {
      setStages(prev => prev.map(st => {
        const coords = stageCoordinates[st.id];
        if (coords) {
          return {
            ...st,
            mapXPercent: coords.x,
            mapYPercent: coords.y
          };
        }
        return st;
      }));
    }

    triggerAlert('مختصات درگ‌شده مراحل، طول و عرض جاده و تنظیمات نقشه با موفقیت ذخیره شدند.');
  };

  // چیدمان خودکار زیگزاگی هوشمند (Auto Arrange S-Curve)
  const handleAutoArrange = () => {
    const count = stages.length || 4;
    const nextCoords: Record<string, { x: number; y: number }> = {};
    stages.forEach((st, idx) => {
      const y = count === 1 ? 50 : Math.round(12 + (idx / (count - 1)) * 76);
      const x = idx === 0 ? 50 : idx % 2 === 1 ? 30 : 70;
      nextCoords[st.id] = { x, y };
    });
    setStageCoordinates(nextCoords);
    triggerAlert('مراحل به صورت متقارن و مرتب در طول مسیر چیده شدند.');
  };

  // بازنشانی به پیش‌فرض
  const handleReset = () => {
    setCustomBgUrl('');
    setBgMode('cover');
    setBgOpacity(100);
    setShowRoadOverlay(true);
    setRoadOpacity(85);
    setRoadCurvature(70);
    setRoadOffsetX(0);
    setRoadWidth(30);
    setStagesSpreadX(70);
    setBlurLevel(0);
    setMapHeight(620);
    setConnectStagesWithRoad(true);
    handleAutoArrange();
  };

  // محاسبه پویای خط اتصال بین نقاط درگ شده مراحل در viewBox 0..400, 0..mapHeight
  const connectedRoadSvgPath = useMemo(() => {
    const currentStages = stages.length > 0 ? stages : [
      { id: '1', title: 'مرحله ۱' },
      { id: '2', title: 'مرحله ۲' },
      { id: '3', title: 'مرحله ۳' },
      { id: '4', title: 'مرحله ۴' },
    ];

    const sortedStages = [...currentStages].sort((a, b) => {
      const ya = stageCoordinates[a.id]?.y ?? 50;
      const yb = stageCoordinates[b.id]?.y ?? 50;
      return ya - yb;
    });

    const pts = sortedStages.map(st => {
      const coord = stageCoordinates[st.id] || { x: 50, y: 50 };
      return {
        x: (coord.x / 100) * 400,
        y: (coord.y / 100) * mapHeight
      };
    });

    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} 20 L ${pts[0].x} ${mapHeight - 20}`;

    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];
      const midY = (p0.y + p1.y) / 2;
      d += ` C ${p0.x} ${midY}, ${p1.x} ${midY}, ${p1.x} ${p1.y}`;
    }
    return d;
  }, [stages, stageCoordinates, mapHeight]);

  const activeStagesList = stages.length > 0 ? stages : [
    { id: 'st_1', number: 1, title: 'آغاز مسیر', status: 'in_progress' },
    { id: 'st_2', number: 2, title: 'معرفت', status: 'locked' },
    { id: 'st_3', number: 3, title: 'آمادگی', status: 'locked' },
    { id: 'st_4', number: 4, title: 'خدمت و فتح', status: 'locked' },
  ];

  return (
    <div className="bg-[#080d21] border border-cyan-500/40 rounded-3xl p-5 sm:p-6 space-y-6 shadow-2xl relative overflow-hidden dir-rtl font-sans text-slate-100">
      {/* Background ambient glow */}
      <div className="absolute top-0 left-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/25 to-blue-600/15 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
            <Map size={24} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-white">استودیوی چیدمان نقشه، درگ اند دراپ مراحل و کنترل جاده</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Drag & Drop چیدمان آزاد
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              آیکون مراحل را مستقیماً با ماوس یا لمس روی جاده تصویر درگ کنید؛ طول، عرض و نوار جاده را کنترل نمایید.
            </p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-2xl p-1 gap-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setPreviewTab('editor')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              previewTab === 'editor'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders size={14} />
            <span>تنظیمات و ابزارها</span>
          </button>
          <button
            type="button"
            onClick={() => setPreviewTab('live_preview')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              previewTab === 'live_preview'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Eye size={14} />
            <span>پیش‌نمایش تمام‌صفحه</span>
          </button>
        </div>
      </div>

      {previewTab === 'editor' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
          
          {/* ============================================================ */}
          {/* LEFT / CENTER: INTERACTIVE DRAG & DROP MAP CANVAS (7 Cols)   */}
          {/* ============================================================ */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MousePointerClick size={16} className="text-amber-400 animate-bounce" />
                <span className="text-xs font-black text-white">بوم درگ اند دراپ مراحل روی نقشه:</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAutoArrange}
                  className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] text-cyan-300 font-bold transition flex items-center gap-1 cursor-pointer"
                  title="چیدمان متقارن و یکنواخت مراحل"
                >
                  <RefreshCw size={11} />
                  <span>چیدمان خودکار</span>
                </button>
                <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  {activeStagesList.length} مرحله
                </span>
              </div>
            </div>

            {/* DRAGGABLE CANVAS CONTAINER */}
            <div 
              ref={canvasRef}
              style={{ height: `${mapHeight}px` }}
              className="relative w-full max-w-md mx-auto rounded-3xl overflow-hidden border-2 border-amber-500/50 shadow-[0_0_40px_rgba(0,0,0,0.9)] bg-slate-950 select-none touch-none"
            >
              {/* 1. Custom/Preset Background Layer */}
              <div
                className="absolute inset-0 bg-center pointer-events-none transition-all duration-200"
                style={{
                  backgroundImage: customBgUrl ? `url(${customBgUrl})` : undefined,
                  backgroundSize: bgMode,
                  backgroundRepeat: bgMode === 'repeat' ? 'repeat' : 'no-repeat',
                  opacity: bgOpacity / 100,
                  filter: blurLevel ? `blur(${blurLevel}px)` : undefined,
                }}
              >
                {!customBgUrl && (
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.15),transparent_70%)] flex items-center justify-center">
                    <div className="text-center space-y-1 p-4">
                      <Compass size={40} className="mx-auto text-amber-400/60 animate-spin" style={{ animationDuration: '24s' }} />
                      <span className="text-xs font-black text-slate-400 block">رادار تاکتیکی پیش‌فرض</span>
                      <span className="text-[10px] text-slate-500 block">برای تصویر دلخواه، فایل عکس خود را در بخش زیر آپلود کنید.</span>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Road SVG Layer (Connects custom dragged coordinates or curve) */}
              {showRoadOverlay && roadOpacity > 0 && (
                <svg 
                  className="absolute inset-0 w-full h-full pointer-events-none" 
                  viewBox={`0 0 400 ${mapHeight}`}
                  preserveAspectRatio="none"
                >
                  {/* Asphalt base road */}
                  <path
                    d={connectedRoadSvgPath}
                    fill="none"
                    stroke="#172236"
                    strokeWidth={roadWidth * 1.4}
                    strokeLinecap="round"
                    opacity={(roadOpacity / 100) * 0.75}
                  />
                  {/* Yellow glowing center highway strip */}
                  <path
                    d={connectedRoadSvgPath}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth={Math.max(3, roadWidth * 0.2)}
                    strokeLinecap="round"
                    strokeDasharray="7 9"
                    opacity={roadOpacity / 100}
                  />
                </svg>
              )}

              {/* 3. Drag & Drop Stage Nodes */}
              {activeStagesList.map((stage, idx) => {
                const coord = stageCoordinates[stage.id] || { x: 50, y: Math.round(15 + idx * 22) };
                const isSelected = selectedStageId === stage.id;
                const isDragging = draggingStageId === stage.id;

                return (
                  <div
                    key={stage.id}
                    style={{
                      left: `${coord.x}%`,
                      top: `${coord.y}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setSelectedStageId(stage.id);
                      setDraggingStageId(stage.id);
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      setSelectedStageId(stage.id);
                      setDraggingStageId(stage.id);
                    }}
                    className={`absolute z-30 cursor-grab active:cursor-grabbing transition-shadow group select-none ${
                      isDragging ? 'scale-110 z-40' : 'hover:scale-105'
                    }`}
                  >
                    {/* Stage Card Pin */}
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border shadow-xl backdrop-blur-md transition-all ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 border-amber-300 ring-4 ring-amber-400/40 font-black shadow-[0_0_25px_rgba(245,158,11,0.8)]'
                        : 'bg-slate-950/90 text-white border-cyan-400/60 hover:border-amber-400'
                    }`}>
                      {/* Number circle */}
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                        isSelected ? 'bg-slate-950 text-amber-300' : 'bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950'
                      }`}>
                        {formatToPersianDigits(idx + 1)}
                      </span>

                      {/* Title & info */}
                      <div className="text-right">
                        <span className="text-[11px] font-black block leading-tight truncate max-w-[110px]">
                          {stage.title || `مرحله ${idx + 1}`}
                        </span>
                        <span className={`text-[9px] block font-mono ${isSelected ? 'text-slate-800' : 'text-slate-400'}`}>
                          X:{coord.x}% • Y:{coord.y}%
                        </span>
                      </div>

                      {/* Drag Handle Icon */}
                      <Move size={12} className={isSelected ? 'text-slate-950' : 'text-slate-400'} />
                    </div>

                    {/* Coordinates tooltip */}
                    {isDragging && (
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-950 border border-amber-400 text-amber-300 text-[9px] font-mono font-bold px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap">
                        {`X: ${coord.x}% , Y: ${coord.y}%`}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Drag instruction notice at bottom of canvas */}
              <div className="absolute bottom-2 inset-x-3 pointer-events-none text-center bg-slate-950/80 backdrop-blur-md py-1 px-2 rounded-xl border border-slate-800/80 text-[10px] text-slate-300">
                ✋ با ماوس یا لمس، نشانگر هر مرحله را گرفته و به نقطه دلخواه روی جاده تصویر بکشید
              </div>
            </div>

            {/* Quick Canvas Dimensions & Save Action */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-950/60 rounded-2xl border border-slate-800/80">
              <div className="flex items-center gap-3 text-xs">
                <span className="text-slate-400">ارتفاع فعلی بوم:</span>
                <span className="font-mono font-black text-amber-300">{mapHeight}px</span>
              </div>
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-emerald-400 hover:brightness-110 text-slate-950 font-black text-xs transition shadow flex items-center gap-1.5 cursor-pointer"
              >
                <Check size={15} />
                <span>ذخیره نهایی چیدمان و تنظیمات</span>
              </button>
            </div>
          </div>

          {/* ============================================================ */}
          {/* RIGHT COLUMN: CONTROLS, DIMENSIONS, OPACITY & UPLOAD (5 Cols) */}
          {/* ============================================================ */}
          <div className="lg:col-span-5 space-y-5">
            
            {/* 1. Dimensions & Length/Width Controls */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-cyan-500/40 space-y-4 shadow-xl">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
                <SlidersHorizontal size={16} className="text-cyan-400" />
                <h4 className="text-xs sm:text-sm font-black text-white">کنترل طول، عرض و ابعاد بوم نقشه</h4>
              </div>

              {/* Map Height / Length Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-300 font-bold">طول و ارتفاع کل نقشه (Height):</span>
                  <span className="text-cyan-400 font-black font-mono" dir="ltr">{mapHeight}px</span>
                </div>
                <input
                  type="range"
                  min="450"
                  max="1300"
                  step="20"
                  value={mapHeight}
                  onChange={(e) => setMapHeight(Number(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                  <span>کوتاه (450px)</span>
                  <span>استاندارد (620px)</span>
                  <span>طولانی (1300px)</span>
                </div>
              </div>

              {/* Road Width Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-300 font-bold">عرض و ضخامت خط جاده:</span>
                  <span className="text-amber-400 font-black font-mono" dir="ltr">{roadWidth}px</span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="70"
                  step="2"
                  value={roadWidth}
                  onChange={(e) => setRoadWidth(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Road Opacity / Fade Controls */}
              <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-300 font-bold">شفافیت نوار زرد رنگ و جاده:</span>
                  <span className="text-amber-400 font-black font-mono" dir="ltr">{showRoadOverlay ? `${roadOpacity}٪` : '۰٪ (محو)'}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  disabled={!showRoadOverlay}
                  value={showRoadOverlay ? roadOpacity : 0}
                  onChange={(e) => setRoadOpacity(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer disabled:opacity-30"
                />
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRoadOverlay(false);
                      setRoadOpacity(0);
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition border cursor-pointer ${
                      !showRoadOverlay || roadOpacity === 0
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    محو کامل نوار جاده (۰٪)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowRoadOverlay(true);
                      setRoadOpacity(85);
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition border cursor-pointer ${
                      showRoadOverlay && roadOpacity > 50
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    نمایش نوار جاده
                  </button>
                </div>
              </div>
            </div>

            {/* 2. Image Upload and Map Presets */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4 shadow-xl">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
                <Upload size={16} className="text-cyan-400" />
                <h4 className="text-xs sm:text-sm font-black text-white">تصویر پس‌زمینه نقشه</h4>
              </div>

              {/* Direct File Upload */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                id="map-bg-upload-input-drag"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-cyan-500/40 hover:border-cyan-400 bg-slate-900/60 rounded-2xl p-3 text-center cursor-pointer transition group"
              >
                <div className="flex flex-col items-center justify-center gap-1.5">
                  <ImageIcon size={18} className="text-cyan-300 group-hover:scale-110 transition" />
                  <div className="text-xs font-bold text-slate-200">
                    {isUploading ? 'در حال پردازش...' : 'آپلود فایل تصویر نقشه از سیستم'}
                  </div>
                  <div className="text-[9px] text-slate-400">PNG, JPG, WEBP (حداکثر ۸ مگابایت)</div>
                </div>
              </div>

              {/* Direct URL Input */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-300 font-bold block">یا وارد کردن آدرس مستقیم تصویر (URL):</label>
                <input
                  type="text"
                  dir="ltr"
                  value={customBgUrl}
                  onChange={(e) => setCustomBgUrl(e.target.value)}
                  placeholder="https://.../map.webp"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Background Opacity & Blur Slider */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold block">شفافیت عکس: {bgOpacity}٪</span>
                  <input
                    type="range"
                    min="15"
                    max="100"
                    step="5"
                    value={bgOpacity}
                    onChange={(e) => setBgOpacity(Number(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold block">میزان بلور: {blurLevel}px</span>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="1"
                    value={blurLevel}
                    onChange={(e) => setBlurLevel(Number(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Presets List */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold text-slate-400 block">پوسته‌های آماده سامانه:</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {MAP_PRESETS.map((preset) => {
                    const isSelected = (!customBgUrl && preset.url === '') || (customBgUrl === preset.url && preset.url !== '');
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setCustomBgUrl(preset.url)}
                        className={`p-2 rounded-xl text-right transition border text-[10px] font-bold cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-950/60 border-cyan-400 text-cyan-200 shadow'
                            : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {preset.title}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 3. Stage Coordinate Inputs List */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-black text-white">مختصات دقیق درصدی مراحل (X , Y):</span>
                <span className="text-[10px] text-slate-400">قابلیت تایپ مستقیم درصد</span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {activeStagesList.map((stage, idx) => {
                  const coord = stageCoordinates[stage.id] || { x: 50, y: Math.round(15 + idx * 22) };
                  return (
                    <div 
                      key={stage.id} 
                      onClick={() => setSelectedStageId(stage.id)}
                      className={`flex items-center justify-between gap-2 p-2 rounded-xl border text-xs cursor-pointer transition ${
                        selectedStageId === stage.id ? 'bg-amber-950/30 border-amber-400/60 text-amber-200' : 'bg-slate-900/60 border-slate-800 text-slate-300'
                      }`}
                    >
                      <span className="font-bold text-[11px] truncate flex-1">
                        {formatToPersianDigits(idx + 1)}. {stage.title}
                      </span>
                      <div className="flex items-center gap-1.5 font-mono text-[10px]">
                        <span className="text-slate-400">X:</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={coord.x}
                          onChange={(e) => {
                            const val = Math.max(0, Math.min(100, Number(e.target.value)));
                            setStageCoordinates(prev => ({
                              ...prev,
                              [stage.id]: { ...(prev[stage.id] || { y: 50 }), x: val }
                            }));
                          }}
                          className="w-12 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-center text-white"
                        />
                        <span className="text-slate-400">%</span>
                        
                        <span className="text-slate-400 mr-1">Y:</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={coord.y}
                          onChange={(e) => {
                            const val = Math.max(0, Math.min(100, Number(e.target.value)));
                            setStageCoordinates(prev => ({
                              ...prev,
                              [stage.id]: { ...(prev[stage.id] || { x: 50 }), y: val }
                            }));
                          }}
                          className="w-12 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-center text-white"
                        />
                        <span className="text-slate-400">%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-emerald-400 hover:brightness-110 text-slate-950 font-black text-xs transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check size={16} />
                <span>ذخیره نهایی نقشه و مراحل</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-3.5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 text-xs font-bold transition cursor-pointer"
                title="بازنشانی به حالت پیش‌فرض"
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Full Live Preview View Tab */
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-cyan-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-black text-cyan-300">
              <Eye size={16} />
              <span>پیش‌نمایش تمام‌صفحه نقشه با مختصات درگ شده و تراز اختصاصی</span>
            </div>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition cursor-pointer"
            >
              ذخیره نهایی نقشه
            </button>
          </div>

          <div 
            style={{ height: `${mapHeight}px` }}
            className="relative w-full max-w-md mx-auto rounded-3xl overflow-hidden border-2 border-amber-500/50 shadow-2xl bg-slate-950"
          >
            <div
              className="absolute inset-0 bg-center transition-all duration-300"
              style={{
                backgroundImage: customBgUrl ? `url(${customBgUrl})` : undefined,
                backgroundSize: bgMode,
                backgroundRepeat: bgMode === 'repeat' ? 'repeat' : 'no-repeat',
                opacity: bgOpacity / 100,
                filter: blurLevel ? `blur(${blurLevel}px)` : undefined,
              }}
            />

            {showRoadOverlay && roadOpacity > 0 && (
              <svg 
                className="absolute inset-0 w-full h-full pointer-events-none" 
                viewBox={`0 0 400 ${mapHeight}`}
                preserveAspectRatio="none"
              >
                <path
                  d={connectedRoadSvgPath}
                  fill="none"
                  stroke="#172236"
                  strokeWidth={roadWidth * 1.4}
                  strokeLinecap="round"
                  opacity={(roadOpacity / 100) * 0.75}
                />
                <path
                  d={connectedRoadSvgPath}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth={Math.max(4, roadWidth * 0.22)}
                  strokeLinecap="round"
                  strokeDasharray="8 10"
                  opacity={roadOpacity / 100}
                />
              </svg>
            )}

            {activeStagesList.map((stage, idx) => {
              const coord = stageCoordinates[stage.id] || { x: 50, y: Math.round(15 + idx * 22) };
              return (
                <div
                  key={stage.id}
                  style={{
                    left: `${coord.x}%`,
                    top: `${coord.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className="absolute z-20 pointer-events-none"
                >
                  <div className="bg-slate-950/95 border border-amber-400 rounded-2xl px-3.5 py-1.5 text-center shadow-2xl backdrop-blur-md">
                    <div className="text-xs font-black text-amber-300">{stage.title || `مرحله ${idx + 1}`}</div>
                    <div className="text-[9px] text-slate-400">مختصات: X={coord.x}% , Y={coord.y}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
