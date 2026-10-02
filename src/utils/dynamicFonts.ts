/**
 * Utility to dynamically inject custom uploaded fonts and online CSS webfonts
 */

export function injectCustomFontFace(
  fontName: string,
  dataUrl: string,
  format: string = 'woff2'
): void {
  if (typeof document === 'undefined' || !fontName || !dataUrl) return;

  const styleId = `custom-font-face-${fontName.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;

  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  // Format mapping
  const normalizedFormat = format.toLowerCase().includes('woff2')
    ? 'woff2'
    : format.toLowerCase().includes('woff')
    ? 'woff'
    : format.toLowerCase().includes('ttf')
    ? 'truetype'
    : format.toLowerCase().includes('otf')
    ? 'opentype'
    : format;

  styleEl.textContent = `
    @font-face {
      font-family: "${fontName}";
      src: url("${dataUrl}") format("${normalizedFormat}");
      font-weight: 100 900;
      font-style: normal;
      font-display: swap;
    }
  `;
}

export function injectCustomFontCssUrl(cssUrl: string): void {
  if (typeof document === 'undefined' || !cssUrl || !cssUrl.trim()) return;

  const linkId = 'custom-font-css-link';
  let linkEl = document.getElementById(linkId) as HTMLLinkElement | null;

  if (!linkEl) {
    linkEl = document.createElement('link');
    linkEl.id = linkId;
    linkEl.rel = 'stylesheet';
    document.head.appendChild(linkEl);
  }

  linkEl.href = cssUrl.trim();
}
