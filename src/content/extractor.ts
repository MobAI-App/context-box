import type { SelectedItem } from '../types';

export function createSelectedItem(element: Element, groupId: number): SelectedItem {
  const rect = element.getBoundingClientRect();
  const htmlElement = element as HTMLElement;

  return {
    index: groupId,
    tagName: element.tagName.toLowerCase(),
    selector: generateSelector(element),
    id: element.id || null,
    classList: Array.from(element.classList),
    attributes: getAttributes(element),
    textSnippet: getTextSnippet(element),
    rectViewport: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    rectPage: { x: rect.x + window.scrollX, y: rect.y + window.scrollY, width: rect.width, height: rect.height },
    htmlSnippet: getHtmlSnippet(element),
    computedStyles: getComputedStyles(htmlElement),
    accessibility: getAccessibilityInfo(element),
    isStale: false,
  };
}

function generateSelector(element: Element): string {
  if (element.id) return `#${CSS.escape(element.id)}`;
  for (const cn of element.classList) {
    const sel = `.${CSS.escape(cn)}`;
    if (document.querySelectorAll(sel).length === 1) return sel;
  }
  const path: string[] = [];
  let cur: Element | null = element;
  while (cur && cur !== document.body) {
    let sel = cur.tagName.toLowerCase();
    if (cur.id) {
      path.unshift(`#${CSS.escape(cur.id)}`);
      break;
    }
    const parent: Element | null = cur.parentElement;
    if (parent) {
      const tag = cur.tagName;
      const sibs = Array.from(parent.children).filter((c: Element) => c.tagName === tag);
      if (sibs.length > 1) sel += `:nth-of-type(${sibs.indexOf(cur) + 1})`;
    }
    path.unshift(sel);
    cur = parent;
  }
  return path.join(' > ');
}

function getAttributes(el: Element): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const attr of el.attributes) {
    if (/token|auth|session|cookie|secret/i.test(attr.name)) continue;
    if (attr.name === 'value' && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) continue;
    attrs[attr.name] = attr.value;
  }
  return attrs;
}

function getTextSnippet(el: Element): string {
  const t = el.textContent?.trim() || '';
  return t.length > 200 ? t.slice(0, 200) + '...' : t;
}

function getHtmlSnippet(el: Element): string {
  let h = el.outerHTML;
  h = h.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  h = h.replace(/(?:password|token|auth|session|cookie|secret)=["'][^"']*["']/gi, '');
  return h.length > 4096 ? h.slice(0, 4096) + '<!-- truncated -->' : h;
}

function getComputedStyles(el: HTMLElement) {
  const c = window.getComputedStyle(el);
  return {
    display: c.display,
    position: c.position,
    width: c.width,
    height: c.height,
    margin: c.margin,
    padding: c.padding,
    boxSizing: c.boxSizing,
    fontFamily: c.fontFamily,
    fontSize: c.fontSize,
    fontWeight: c.fontWeight,
    lineHeight: c.lineHeight,
    color: c.color,
    textAlign: c.textAlign,
    flexDirection: c.flexDirection,
    justifyContent: c.justifyContent,
    alignItems: c.alignItems,
    gap: c.gap,
    gridTemplateColumns: c.gridTemplateColumns,
    gridTemplateRows: c.gridTemplateRows,
    backgroundColor: c.backgroundColor,
    borderRadius: c.borderRadius,
    border: c.border,
  };
}

function getAccessibilityInfo(el: Element) {
  const role = el.getAttribute('role');
  const ariaLabel = el.getAttribute('aria-label');
  const ariaLabelledBy = el.getAttribute('aria-labelledby');
  let accessibleName: string | null = ariaLabel;
  if (!accessibleName && ariaLabelledBy) {
    accessibleName = document.getElementById(ariaLabelledBy)?.textContent?.trim() || null;
  }
  if (!accessibleName && el.tagName === 'IMG') accessibleName = el.getAttribute('alt');
  if (!accessibleName && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && el.id) {
    accessibleName = document.querySelector(`label[for="${el.id}"]`)?.textContent?.trim() || null;
  }
  return { role, ariaLabel, ariaLabelledBy, accessibleName };
}
