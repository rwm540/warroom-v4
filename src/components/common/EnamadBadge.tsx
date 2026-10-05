import React, { useMemo } from 'react';
import { OFFICIAL_ENAMAD_HTML, sanitizeEnamadHtml } from '../../utils/enamadSanitizer';

interface EnamadBadgeProps {
  htmlCode?: string;
  enabled?: boolean;
  className?: string;
  previewMode?: boolean;
}

export const EnamadBadge: React.FC<EnamadBadgeProps> = ({
  htmlCode,
  enabled = true,
  className = '',
  previewMode = false
}) => {
  if (!enabled && !previewMode) {
    return null;
  }

  const rawHtml = htmlCode && htmlCode.trim() ? htmlCode : OFFICIAL_ENAMAD_HTML;
  const sanitized = useMemo(() => sanitizeEnamadHtml(rawHtml), [rawHtml]);

  if (!sanitized) {
    return null;
  }

  // Render purely and strictly the exact official HTML snippet from the tag
  return (
    <div
      className={`enamad-official-tag inline-flex items-center justify-center p-2 rounded-2xl bg-white border border-slate-300 hover:border-amber-400 shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer min-w-[70px] min-h-[70px] [&>a]:inline-block [&>a]:cursor-pointer [&>a>img]:max-h-20 [&>a>img]:w-auto [&>a>img]:object-contain ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
};
