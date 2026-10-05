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

  // Render purely the exact official HTML tag with zero background and zero border
  return (
    <div
      className={`enamad-official-tag inline-flex items-center justify-center [&>a]:inline-block [&>a]:cursor-pointer [&>a>img]:max-h-24 [&>a>img]:w-auto [&>a>img]:object-contain ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
};
