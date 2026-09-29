import React, { useState, useRef, useEffect } from 'react';
import { Smile, Search, X, Flame, Swords, Heart, Sparkles } from 'lucide-react';

interface EmojiPickerPopoverProps {
  onSelectEmoji: (emoji: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

interface EmojiCategory {
  id: string;
  name: string;
  icon: any;
  emojis: string[];
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: 'popular',
    name: 'پراستفاده',
    icon: Flame,
    emojis: [
      '👍', '👏', '✌️', '🫡', '🤝', '💪', '🦾', '🔥', '❤️', '💯', 
      '😂', '😎', '🤩', '🎯', '⚔️', '🛡️', '⚡', '🚀', '🏆', '🎉',
      '✨', '🇮🇷', '🙏', '👌', '🙌', '🥰', '😍', '🤔', '🥳', '💥'
    ]
  },
  {
    id: 'tactical',
    name: 'تاکتیکی و جوخه',
    icon: Swords,
    emojis: [
      '🎯', '⚔️', '🛡️', '🏹', '💣', '🧨', '🗡️', '🔫', '🚀', '🛸', 
      '🚁', '✈️', '🎖️', '🥇', '🥈', '🥉', '🏆', '🏅', '👑', '⚡', 
      '💥', '🕹️', '🎮', '🎲', '⛺', '🏰', '🚩', '🏴', '📡', '📻', 
      '🧭', '🗺️', '🔭', '🔍', '🔎', '🚨', '⚠️', '🛑', '🔒', '🔑'
    ]
  },
  {
    id: 'faces',
    name: 'چهره‌ها',
    icon: Smile,
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', 
      '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😋', '😛', '😜', 
      '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🥳', '😏', '😒', '😞', 
      '😔', '😟', '😕', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', 
      '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '🤗', '🤔', '🫣', 
      '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '🥱', '😴'
    ]
  },
  {
    id: 'symbols',
    name: 'نمادها و دل‌ها',
    icon: Heart,
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', 
      '💖', '💗', '💓', '💞', '💘', '💌', '💎', '🌟', '⭐', '✨', 
      '💫', '☀️', '🌙', '🪐', '🌍', '🔔', '📣', '📢', '💬', '💭', 
      '⏳', '⌛', '⏰', '📈', '📌', '📍', '💡', '📚', '📝', '🇮🇷'
    ]
  }
];

export const EmojiPickerPopover: React.FC<EmojiPickerPopoverProps> = ({
  onSelectEmoji,
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<string>('popular');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentCategory = EMOJI_CATEGORIES.find(c => c.id === activeTab) || EMOJI_CATEGORIES[0];

  // If user typed a search query
  const displayedEmojis = searchQuery.trim()
    ? EMOJI_CATEGORIES.flatMap(c => c.emojis).filter(
        (emoji, idx, arr) => arr.indexOf(emoji) === idx
      )
    : currentCategory.emojis;

  return (
    <div
      ref={popoverRef}
      className="absolute bottom-16 left-3 sm:left-auto right-3 sm:right-12 z-50 w-72 sm:w-80 rounded-2xl border border-cyan-500/40 bg-slate-950/95 p-3 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-150 dir-rtl text-right"
      dir="rtl"
    >
      {/* Header with Search and Close */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2 mb-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجوی ایموجی..."
            className="w-full rounded-xl bg-slate-900 border border-slate-700/80 px-7 py-1 text-xs text-white placeholder:text-slate-500 outline-none focus:border-cyan-400"
          />
          <Search size={13} className="absolute right-2.5 top-2 text-slate-400" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute left-2 top-2 text-slate-400 hover:text-white"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition"
          title="بستن"
        >
          <X size={14} />
        </button>
      </div>

      {/* Categories Bar */}
      {!searchQuery.trim() && (
        <div className="flex items-center gap-1 border-b border-slate-800/80 pb-2 mb-2 overflow-x-auto no-scrollbar">
          {EMOJI_CATEGORIES.map(category => {
            const Icon = category.icon;
            const isActive = activeTab === category.id;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveTab(category.id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                    : 'bg-slate-900 hover:bg-slate-800 border border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon size={12} className={isActive ? 'text-cyan-400' : 'text-slate-400'} />
                <span>{category.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Emojis Grid */}
      <div className="grid grid-cols-6 sm:grid-cols-7 gap-1.5 max-h-48 overflow-y-auto p-1 no-scrollbar">
        {displayedEmojis.map((emoji, index) => (
          <button
            key={`${emoji}-${index}`}
            type="button"
            onClick={() => onSelectEmoji(emoji)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900/60 hover:bg-cyan-500/20 border border-transparent hover:border-cyan-400/40 text-lg transition transform hover:scale-125 active:scale-95 cursor-pointer shadow-sm"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Quick Action Hint */}
      <div className="pt-2 mt-1 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1 text-cyan-400">
          <Sparkles size={11} />
          <span>انتخاب ایموجی برای درج در پیام</span>
        </span>
        <span className="font-mono text-slate-500 text-[9px]">اتاق جنگ</span>
      </div>
    </div>
  );
};
