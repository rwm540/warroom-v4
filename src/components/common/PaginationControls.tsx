import React from 'react';
import { ChevronRight, ChevronLeft, ChevronsRight, ChevronsLeft, Layers, MoreHorizontal } from 'lucide-react';

interface PaginationControlsProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage?: number;
  onPageChange: (page: number) => void;
  onLoadMore?: () => void;
  visibleCount?: number;
  className?: string;
  themeColor?: 'amber' | 'cyan' | 'fuchsia' | 'emerald' | 'blue';
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalItems,
  itemsPerPage = 10,
  onPageChange,
  onLoadMore,
  visibleCount,
  className = '',
  themeColor = 'amber'
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  if (totalItems <= itemsPerPage && !visibleCount) {
    return null;
  }

  // Active color map
  const activeColorClasses = {
    amber: 'bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.4)] border-amber-400 font-black',
    cyan: 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)] border-cyan-400 font-black',
    fuchsia: 'bg-fuchsia-600 text-white shadow-[0_0_15px_rgba(217,70,239,0.4)] border-fuchsia-400 font-black',
    emerald: 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.4)] border-emerald-400 font-black',
    blue: 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] border-blue-400 font-black'
  }[themeColor];

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      
      if (currentPage < totalPages - 2) pages.push('...');
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-3xl bg-[#090f24] border border-slate-800/90 shadow-xl dir-rtl ${className}`}>
      
      {/* 📊 Count Info */}
      <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        <span>
          نمایش <strong className="text-white font-bold">{startItem}</strong> تا <strong className="text-white font-bold">{endItem}</strong> از کل <strong className="text-amber-400 font-bold">{totalItems}</strong> مورد
        </span>
        <span className="text-slate-600">|</span>
        <span className="text-[11px] text-slate-400">
          (صفحه <strong className="text-white">{currentPage}</strong> از <strong className="text-white">{totalPages}</strong>)
        </span>
      </div>

      {/* 🚀 Pagination Controls */}
      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        
        {/* First Page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
          title="صفحه اول"
        >
          <ChevronsRight size={15} />
        </button>

        {/* Prev Page */}
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 disabled:opacity-30 disabled:pointer-events-none transition flex items-center gap-1 text-xs font-bold cursor-pointer"
        >
          <ChevronRight size={15} />
          <span>قبلی</span>
        </button>

        {/* Numbers */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((p, idx) => {
            if (typeof p === 'string') {
              return (
                <span key={`el_${idx}`} className="px-1 text-slate-500 flex items-center">
                  <MoreHorizontal size={14} />
                </span>
              );
            }
            const isCurrent = p === currentPage;
            return (
              <button
                key={`page_${p}`}
                onClick={() => onPageChange(p)}
                className={`min-w-[32px] h-8 rounded-xl text-xs font-bold transition flex items-center justify-center border cursor-pointer ${
                  isCurrent
                    ? activeColorClasses
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next Page */}
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 disabled:opacity-30 disabled:pointer-events-none transition flex items-center gap-1 text-xs font-bold cursor-pointer"
        >
          <span>بعدی</span>
          <ChevronLeft size={15} />
        </button>

        {/* Last Page */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
          title="صفحه آخر"
        >
          <ChevronsLeft size={15} />
        </button>

      </div>

    </div>
  );
};
