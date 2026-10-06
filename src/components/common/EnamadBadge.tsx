import React, { useMemo } from 'react';
import { OFFICIAL_ENAMAD_HTML, sanitizeEnamadHtml } from '../../utils/enamadSanitizer';

interface EnamadBadgeProps {
  htmlCode?: string | null;
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
  // If explicitly disabled and not in preview mode, do not render
  if (!enabled && !previewMode) {
    return null;
  }

  const rawHtml = (htmlCode && htmlCode.trim()) ? htmlCode : OFFICIAL_ENAMAD_HTML;
  const sanitized = useMemo(() => {
    const res = sanitizeEnamadHtml(rawHtml);
    return res || OFFICIAL_ENAMAD_HTML;
  }, [rawHtml]);

  // Pure official logo tag without custom background or border wrapper
  return (
    <div
      className={`enamad-official-tag inline-flex items-center justify-center bg-transparent border-none shadow-none [&_a]:inline-block [&_a]:cursor-pointer [&_a]:bg-transparent [&_a]:border-none [&_img]:inline-block [&_img]:max-h-28 [&_img]:min-h-[60px] [&_img]:min-w-[60px] [&_img]:w-auto [&_img]:object-contain [&_img]:border-none [&_img]:bg-transparent [&_img]:cursor-pointer ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
};
