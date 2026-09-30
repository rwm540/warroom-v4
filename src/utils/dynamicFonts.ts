/**
 * ابزار بارگذاری پویا و تزریق فونت‌های سفارشی آپلود شده و آنلاین
 */

export function injectCustomFontFace(fontName: string, fontDataOrUrl: string, format: string = 'woff2') {
  if (typeof document === 'undefined' || !fontName || !fontDataOrUrl) return;
  
  const styleId = 'warroom-dynamic-custom-font-style';
  let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  // Format mapping
  let fmt = format.toLowerCase();
  if (fmt.includes('woff2')) fmt = 'woff2';
  else if (fmt.includes('woff')) fmt = 'woff';
  else if (fmt.includes('ttf') || fmt.includes('truetype')) fmt = 'truetype';
  else if (fmt.includes('otf') || fmt.includes('opentype')) fmt = 'opentype';
  else fmt = 'woff2';

  styleEl.textContent = `
    @font-face {
      font-family: "${fontName}";
      src: url("${fontDataOrUrl}") format("${fmt}");
      font-weight: 100 900;
      font-style: normal;
      font-display: swap;
    }
  `;
}

export function injectCustomFontCssUrl(cssUrl: string) {
  if (typeof document === 'undefined' || !cssUrl || !cssUrl.trim()) return;
  
  const linkId = 'warroom-dynamic-font-css-link';
  let linkEl = document.getElementById(linkId) as HTMLLinkElement | null;
  if (!linkEl) {
    linkEl = document.createElement('link');
    linkEl.id = linkId;
    linkEl.rel = 'stylesheet';
    document.head.appendChild(linkEl);
  }
  linkEl.href = cssUrl.trim();
}
