import type { SelectionGroup } from './types';

let overlayContainer: HTMLDivElement | null = null;
let overlayShadow: ShadowRoot | null = null;

export function getOverlayContainer() {
  return overlayContainer;
}

export function getOverlayShadow() {
  return overlayShadow;
}

export function createOverlayContainer() {
  if (overlayContainer) return;

  overlayContainer = document.createElement('div');
  overlayContainer.id = 'contextbox-overlay-container';
  overlayContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 2147483646;
  `;

  overlayShadow = overlayContainer.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
    .cb-highlight {
      position: fixed;
      pointer-events: none;
      border: 1px dashed rgba(245, 158, 11, 0.6);
      background: none;
      transition: all 0.1s ease;
    }
    .cb-selected {
      border: 2px solid #D97706;
      background: none;
    }
    .cb-label {
      position: absolute;
      top: -20px;
      left: -2px;
      background: #D97706;
      color: white;
      font-size: 11px;
      font-weight: bold;
      padding: 2px 6px;
      border-radius: 4px 4px 0 0;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    }
    .cb-popup {
      position: fixed;
      pointer-events: auto;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 6px;
      background: #1a1a1a;
      border-radius: 6px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.24);
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 12px;
      z-index: 1;
    }
    .cb-popup-label {
      background: #D97706;
      color: white;
      font-weight: 600;
      width: 20px;
      height: 20px;
      border-radius: 4px;
      font-size: 11px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .cb-popup-input {
      background: #2a2a2a;
      border: none;
      border-radius: 4px;
      padding: 6px 10px;
      font-size: 12px;
      color: white;
      width: 140px;
      outline: none;
    }
    .cb-popup-input::placeholder { color: #666; }
    .cb-popup-input:focus { background: #333; }
    .cb-popup-btn {
      width: 28px;
      height: 28px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
      padding: 0;
      background: transparent;
      color: #888;
    }
    .cb-popup-btn:hover { background: #333; color: white; }
    .cb-popup-btn svg { width: 15px; height: 15px; }
    .cb-popup-btn.primary { background: #D97706; color: white; }
    .cb-popup-btn.primary:hover:not(.disabled) { background: #F59E0B; }
    .cb-popup-btn.primary.disabled { opacity: 0.4; cursor: not-allowed; }
    .cb-popup-btn.close:hover { background: #7f1d1d; color: #fca5a5; }
    .cb-popup-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(26, 26, 26, 0.9);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 500;
      color: #4ade80;
      pointer-events: none;
    }
    .cb-popup-overlay.error { color: #f87171; }
    .cb-spinner {
      width: 14px;
      height: 14px;
      border: 2px solid transparent;
      border-top-color: currentColor;
      border-radius: 50%;
      animation: cb-spin 0.6s linear infinite;
    }
    @keyframes cb-spin { to { transform: rotate(360deg); } }
  `;

  overlayShadow.appendChild(style);
  document.body.appendChild(overlayContainer);
}

export function destroyOverlayContainer() {
  if (overlayContainer) {
    overlayContainer.remove();
    overlayContainer = null;
    overlayShadow = null;
  }
}

export function renderOverlays(
  groups: SelectionGroup[],
  hoveredElement: Element | null,
  isElementSelected: (el: Element) => boolean
) {
  if (!overlayShadow) return;

  overlayShadow.querySelectorAll('.cb-highlight').forEach((e) => e.remove());

  if (hoveredElement && !isElementSelected(hoveredElement)) {
    const rect = hoveredElement.getBoundingClientRect();
    const div = document.createElement('div');
    div.className = 'cb-highlight';
    div.style.cssText = `left:${rect.x}px;top:${rect.y}px;width:${rect.width}px;height:${rect.height}px;`;
    overlayShadow.appendChild(div);
  }

  for (const group of groups) {
    for (const [el, item] of group.elements) {
      const rect = el.getBoundingClientRect();
      if (!document.contains(el)) item.isStale = true;

      const div = document.createElement('div');
      div.className = 'cb-highlight cb-selected';
      div.style.cssText = `left:${rect.x}px;top:${rect.y}px;width:${rect.width}px;height:${rect.height}px;`;

      const label = document.createElement('div');
      label.className = 'cb-label';
      label.textContent = String(group.id);
      div.appendChild(label);

      overlayShadow.appendChild(div);

      item.rectViewport = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      item.rectPage = { x: rect.x + window.scrollX, y: rect.y + window.scrollY, width: rect.width, height: rect.height };
    }

    positionPopup(group);
  }
}

function positionPopup(group: SelectionGroup) {
  if (!group.popupEl || group.elements.size === 0) return;

  const firstEl = group.elements.keys().next().value;
  if (!firstEl) return;

  const rect = firstEl.getBoundingClientRect();
  const popupRect = group.popupEl.getBoundingClientRect();

  let top = rect.bottom + 8;
  let left = rect.left;

  if (top + popupRect.height > window.innerHeight) top = rect.top - popupRect.height - 8;
  if (left + popupRect.width > window.innerWidth) left = window.innerWidth - popupRect.width - 8;
  if (left < 8) left = 8;

  group.popupEl.style.top = `${top}px`;
  group.popupEl.style.left = `${left}px`;
}
