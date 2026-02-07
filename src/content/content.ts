import type { Settings } from '../types';
import type { SelectionGroup, SelectionState } from './types';
import { createOverlayContainer, destroyOverlayContainer, getOverlayShadow, renderOverlays } from './overlay';
import { createSelectedItem } from './extractor';
import { createPopup, destroyPopup } from './popup';

const STORAGE_KEY = 'contextbox_selection';

interface PersistedGroup {
  id: number;
  selectors: string[];
}

let state: SelectionState = 'INACTIVE';
let groups: SelectionGroup[] = [];
let nextGroupId = 1;
let hoveredElement: Element | null = null;
let scrollRafId = 0;

const MAX_GROUPS = 20;

function init() {
  setupMessageListener();
  restoreSelection();
}

function setupMessageListener() {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    switch (message.type) {
      case 'PING':
        sendResponse({ pong: true });
        break;
      case 'START_SELECTION':
        startSelection();
        sendResponse({ success: true });
        break;
      case 'STOP_SELECTION':
        clearSelection();
        sendResponse({ success: true });
        break;
      case 'GET_SELECTION_STATE':
        sendResponse({ isActive: state !== 'INACTIVE', count: groups.length });
        break;
      case 'CLEAR_SELECTION':
        clearSelection();
        sendResponse({ success: true });
        break;
      default:
        sendResponse({ error: 'Unknown' });
    }
    return true;
  });
}

async function restoreSelection() {
  try {
    const result = await chrome.storage.local.get(['settings']);
    const settings: Settings = result.settings || {};
    if (!(settings.persistSelection ?? true)) return;

    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    const persisted: PersistedGroup[] = JSON.parse(stored);
    if (!persisted.length) return;

    createOverlayContainer();
    state = 'ACTIVE';
    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mouseout', handleMouseOut, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    document.body.style.cursor = 'crosshair';

    for (const pg of persisted) {
      const group: SelectionGroup = { id: pg.id, elements: new Map(), popupEl: null, attachmentPath: null };

      for (const selector of pg.selectors) {
        try {
          const el = document.querySelector(selector);
          if (el) {
            const item = createSelectedItem(el, group.id);
            group.elements.set(el, item);
          }
        } catch {}
      }

      if (group.elements.size > 0) {
        group.popupEl = createPopup(group, removeGroup);
        getOverlayShadow()?.appendChild(group.popupEl);
        groups.push(group);
      }
    }

    nextGroupId = groups.length > 0 ? Math.max(...groups.map((g) => g.id)) + 1 : 1;
    render();
    saveSelection();
  } catch {}
}

async function saveSelection() {
  try {
    const result = await chrome.storage.local.get(['settings']);
    const settings: Settings = result.settings || {};
    if (!(settings.persistSelection ?? true)) {
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }

    if (groups.length === 0) {
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }

    const persisted: PersistedGroup[] = groups.map((g) => ({
      id: g.id,
      selectors: Array.from(g.elements.values()).map((item) => item.selector),
    }));

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  } catch {}
}

function startSelection() {
  if (state !== 'INACTIVE') return;
  createOverlayContainer();
  state = 'ACTIVE';
  document.addEventListener('mouseover', handleMouseOver, true);
  document.addEventListener('mouseout', handleMouseOut, true);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('keydown', handleKeyDown, true);
  window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
  document.body.style.cursor = 'crosshair';
}

function stopSelection() {
  state = 'INACTIVE';
  document.removeEventListener('mouseover', handleMouseOver, true);
  document.removeEventListener('mouseout', handleMouseOut, true);
  document.removeEventListener('click', handleClick, true);
  document.removeEventListener('keydown', handleKeyDown, true);
  window.removeEventListener('scroll', handleScroll, true);
  document.body.style.cursor = '';
  hoveredElement = null;
}

function clearSelection() {
  groups.forEach((g) => destroyPopup(g.popupEl));
  groups = [];
  nextGroupId = 1;
  hoveredElement = null;
  stopSelection();
  destroyOverlayContainer();
  sessionStorage.removeItem(STORAGE_KEY);
}

function removeGroup(groupId: number) {
  const idx = groups.findIndex((g) => g.id === groupId);
  if (idx !== -1) {
    destroyPopup(groups[idx].popupEl);
    groups.splice(idx, 1);
  }
  groups.forEach((g, i) => {
    g.id = i + 1;
    const labelEl = g.popupEl?.querySelector('.cb-popup-label');
    if (labelEl) labelEl.textContent = String(g.id);
    g.elements.forEach((item) => (item.index = g.id));
  });
  nextGroupId = groups.length + 1;
  render();
  saveSelection();
}

function handleMouseOver(event: MouseEvent) {
  if (state === 'INACTIVE') return;
  const target = event.target as Element;
  if (isOverlayElement(target)) return;
  hoveredElement = target;
  state = 'HOVERING';
  render();
}

function handleMouseOut(event: MouseEvent) {
  if (state === 'INACTIVE') return;
  if (event.target === hoveredElement) {
    hoveredElement = null;
    state = 'ACTIVE';
    render();
  }
}

function handleClick(event: MouseEvent) {
  if (state === 'INACTIVE') return;
  const target = event.target as Element;
  if (isOverlayElement(target)) return;

  event.preventDefault();
  event.stopPropagation();

  let el = target;
  if (event.altKey && target.parentElement) el = target.parentElement;

  if (event.shiftKey) {
    if (groups.length > 0 && !isElementSelected(el)) {
      const lastGroup = groups[groups.length - 1];
      const item = createSelectedItem(el, lastGroup.id);
      lastGroup.elements.set(el, item);
    }
  } else {
    const existingGroup = findGroupForElement(el);
    if (existingGroup) {
      existingGroup.elements.delete(el);
      if (existingGroup.elements.size === 0) {
        removeGroup(existingGroup.id);
        render();
        return;
      }
    } else if (groups.length < MAX_GROUPS) {
      const group: SelectionGroup = { id: nextGroupId++, elements: new Map(), popupEl: null, attachmentPath: null };
      const item = createSelectedItem(el, group.id);
      group.elements.set(el, item);
      group.popupEl = createPopup(group, removeGroup);
      getOverlayShadow()?.appendChild(group.popupEl);
      groups.push(group);
    }
  }

  render();
  saveSelection();
}

function handleScroll() {
  if (scrollRafId) return;
  scrollRafId = requestAnimationFrame(() => {
    scrollRafId = 0;
    if (state !== 'INACTIVE') render();
  });
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') clearSelection();
}

function isOverlayElement(el: Element): boolean {
  return el.closest('#contextbox-overlay-container') !== null;
}

function isElementSelected(el: Element): boolean {
  return groups.some((g) => g.elements.has(el));
}

function findGroupForElement(el: Element): SelectionGroup | undefined {
  return groups.find((g) => g.elements.has(el));
}

function render() {
  renderOverlays(groups, hoveredElement, isElementSelected);
}

const observer = new MutationObserver(() => {
  for (const g of groups) {
    for (const [el, item] of g.elements) {
      if (!document.contains(el)) item.isStale = true;
    }
  }
  if (state !== 'INACTIVE') render();
});
observer.observe(document.body, { childList: true, subtree: true });

init();
