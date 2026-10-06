/**
 * Utility for sanitizing and validating official eNAMAD HTML snippets.
 * Ensures security by allowing only safe <a> and <img> tags and eliminating
 * any potential XSS attacks (<script>, javascript: URLs, onerror/onclick event handlers).
 */

export const OFFICIAL_ENAMAD_HTML = `<a referrerpolicy='origin' target='_blank' href='https://trustseal.enamad.ir/?id=7987091&Code=lCCUhv7OjjK99lHykgzIJGHY6FwPWGTZ'><img referrerpolicy='origin' src='https://trustseal.enamad.ir/logo.aspx?id=7987091&Code=lCCUhv7OjjK99lHykgzIJGHY6FwPWGTZ' alt='' style='cursor:pointer' code='lCCUhv7OjjK99lHykgzIJGHY6FwPWGTZ'></a>`;

/**
 * Sanitizes the given eNAMAD HTML snippet.
 * Strips any dangerous scripts, iframes, inline event handlers, or protocol exploits
 * while strictly preserving the official <a> and <img> elements, URLs, and attributes.
 */
export function sanitizeEnamadHtml(rawHtml?: string | null): string {
  if (!rawHtml || typeof rawHtml !== 'string') {
    return OFFICIAL_ENAMAD_HTML;
  }

  const trimmed = rawHtml.trim();
  if (!trimmed) {
    return OFFICIAL_ENAMAD_HTML;
  }

  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    // Basic regex fallback for non-DOM environments
    const cleaned = trimmed
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '')
      .replace(/\son\w+\s*=\s*[^>\s]+/gi, '')
      .replace(/javascript\s*:/gi, '');
    return cleaned || OFFICIAL_ENAMAD_HTML;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(trimmed, 'text/html');

    // 1. Remove dangerous elements completely
    const dangerousTags = ['script', 'style', 'iframe', 'object', 'embed', 'link', 'form', 'input', 'button', 'svg', 'audio', 'video'];
    dangerousTags.forEach(tag => {
      const els = doc.querySelectorAll(tag);
      els.forEach(el => el.remove());
    });

    // 2. Process all remaining elements
    const allElements = doc.body.querySelectorAll('*');
    allElements.forEach(el => {
      const tagName = el.tagName.toLowerCase();

      // Only allow <a>, <img>, <span>, <div>
      if (!['a', 'img', 'span', 'div'].includes(tagName)) {
        el.replaceWith(...Array.from(el.childNodes));
        return;
      }

      // Remove any attribute starting with 'on' (onclick, onload, onerror, etc.)
      const attributes = Array.from(el.attributes);
      for (const attr of attributes) {
        const attrName = attr.name.toLowerCase();
        if (attrName.startsWith('on')) {
          el.removeAttribute(attr.name);
          continue;
        }

        // Clean javascript: or vbscript: or data: from URLs
        if (['href', 'src'].includes(attrName)) {
          const val = attr.value.trim().toLowerCase();
          if (val.startsWith('javascript:') || val.startsWith('vbscript:') || val.startsWith('data:')) {
            el.removeAttribute(attr.name);
            continue;
          }
        }

        // Enforce allowed attributes per tag
        if (tagName === 'a') {
          const allowedA = ['href', 'target', 'rel', 'referrerpolicy', 'id', 'class', 'title', 'code', 'style'];
          if (!allowedA.includes(attrName)) {
            el.removeAttribute(attr.name);
          }
        } else if (tagName === 'img') {
          const allowedImg = ['src', 'alt', 'style', 'code', 'id', 'class', 'referrerpolicy', 'width', 'height', 'loading'];
          if (!allowedImg.includes(attrName)) {
            el.removeAttribute(attr.name);
          }
        }
      }

      // Enforce safe attributes for <a> and <img>
      if (tagName === 'a') {
        el.setAttribute('target', '_blank');
        el.setAttribute('referrerpolicy', 'origin');
      } else if (tagName === 'img') {
        el.setAttribute('referrerpolicy', 'origin');
      }
    });

    const result = doc.body.innerHTML.trim();
    // Guarantee that <a> and <img> exist; otherwise return official fallback
    if (!result || !result.includes('<img') || !result.includes('<a')) {
      return OFFICIAL_ENAMAD_HTML;
    }

    return result;
  } catch (err) {
    console.error('[eNAMAD Sanitizer] Parsing error:', err);
    return OFFICIAL_ENAMAD_HTML;
  }
}

/**
 * Validates whether the HTML snippet looks like a valid eNAMAD embed
 */
export function validateEnamadHtml(rawHtml: string): { isValid: boolean; warning?: string } {
  if (!rawHtml || !rawHtml.trim()) {
    return { isValid: false, warning: 'کد اینماد خالی است.' };
  }

  const lower = rawHtml.toLowerCase();
  const hasEnamadLink = lower.includes('trustseal.enamad.ir') || lower.includes('enamad.ir');
  const hasImg = lower.includes('<img');
  const hasA = lower.includes('<a');

  if (!hasEnamadLink) {
    return { 
      isValid: false, 
      warning: 'لینک موجود در کد به سرور رسمی اینماد (trustseal.enamad.ir) اشاره ندارد.' 
    };
  }

  if (!hasImg || !hasA) {
    return { 
      isValid: false, 
      warning: 'کد باید شامل تگ <a> و تگ <img> برای نمایش لوگو و لینک هدایت باشد.' 
    };
  }

  return { isValid: true };
}
