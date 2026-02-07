import type { ExtractedData, Settings } from '../types';
import type { SelectionGroup } from './types';
import { getOverlayContainer } from './overlay';
import { annotateScreenshot } from './screenshot';

const DEFAULT_AIBRIDGE_URL = 'http://127.0.0.1:9999';

// SVG icons as constants (safe, not user input)
const ATTACH_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>`;
const COPY_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M8 4v12a2 2 0 002 2h8a2 2 0 002-2V7.242a2 2 0 00-.602-1.43L16.083 2.57A2 2 0 0014.685 2H10a2 2 0 00-2 2z"/>
  <path d="M16 18v2a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2h2"/>
</svg>`;
const SEND_ICON = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`;
const CLOSE_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 18L18 6M6 6l12 12"/></svg>`;
const SPINNER_HTML = '<div class="cb-spinner"></div>';

export function destroyPopup(popup: HTMLDivElement | null) {
  if (!popup) return;
  const interval = (popup as any)._cbStatusInterval;
  if (interval) clearInterval(interval);
  popup.remove();
}

export async function checkAiBridgeStatus(): Promise<boolean> {
  const result = await chrome.storage.local.get(['settings']);
  const settings = result.settings || { aibridgeUrl: DEFAULT_AIBRIDGE_URL };
  const url = settings.aibridgeUrl || DEFAULT_AIBRIDGE_URL;

  try {
    const res = await fetch(`${url}/status`, { method: 'GET', signal: AbortSignal.timeout(1000) });
    return res.ok;
  } catch {
    return false;
  }
}

export function createPopup(
  group: SelectionGroup,
  onRemove: (groupId: number) => void
): HTMLDivElement {
  const popup = document.createElement('div');
  popup.className = 'cb-popup';
  popup.dataset.groupId = String(group.id);

  const textarea = document.createElement('textarea');
  textarea.rows = 1;
  textarea.className = 'cb-popup-input';
  textarea.placeholder = 'Shift+Enter for new line';

  const actionsRow = document.createElement('div');
  actionsRow.className = 'cb-popup-actions';

  const label = document.createElement('span');
  label.className = 'cb-popup-label';
  label.textContent = String(group.id);

  const attachBtn = document.createElement('button');
  attachBtn.className = 'cb-popup-btn';
  attachBtn.title = 'Attach file';
  attachBtn.innerHTML = ATTACH_ICON;

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';

  const copyBtn = document.createElement('button');
  copyBtn.className = 'cb-popup-btn';
  copyBtn.title = 'Copy to clipboard';
  copyBtn.innerHTML = COPY_ICON;

  const sendBtn = document.createElement('button');
  sendBtn.className = 'cb-popup-btn primary';
  sendBtn.title = 'Send to AiBridge';
  sendBtn.innerHTML = SEND_ICON;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'cb-popup-btn close';
  closeBtn.title = 'Remove selection';
  closeBtn.innerHTML = CLOSE_ICON;

  const attachmentRow = document.createElement('div');
  attachmentRow.className = 'cb-popup-attachment';
  attachmentRow.style.display = 'none';

  actionsRow.appendChild(label);
  actionsRow.appendChild(attachBtn);
  actionsRow.appendChild(copyBtn);
  actionsRow.appendChild(sendBtn);
  actionsRow.appendChild(closeBtn);

  popup.appendChild(textarea);
  popup.appendChild(attachmentRow);
  popup.appendChild(actionsRow);
  popup.appendChild(fileInput);

  let isConnected = false;

  const updateConnectionStatus = async () => {
    isConnected = await checkAiBridgeStatus();
    sendBtn.disabled = !isConnected;
    sendBtn.classList.toggle('disabled', !isConnected);
  };
  updateConnectionStatus();

  const statusInterval = setInterval(updateConnectionStatus, 2000);
  (popup as any)._cbStatusInterval = statusInterval;

  function updateAttachmentRow() {
    if (group.attachmentPath) {
      const filename = group.attachmentPath.split(/[/\\]/).pop() || group.attachmentPath;
      attachmentRow.innerHTML = ''; // Safe: rebuilding with DOM methods below
      const icon = document.createElement('span');
      icon.innerHTML = ATTACH_ICON; // Safe: hardcoded SVG constant
      const nameSpan = document.createElement('span');
      nameSpan.textContent = filename;
      const removeBtn = document.createElement('button');
      removeBtn.textContent = '\u00d7';
      removeBtn.title = 'Remove attachment';
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        group.attachmentPath = null;
        updateAttachmentRow();
      });
      attachmentRow.appendChild(icon);
      attachmentRow.appendChild(nameSpan);
      attachmentRow.appendChild(removeBtn);
      attachmentRow.style.display = 'flex';
    } else {
      attachmentRow.style.display = 'none';
      attachmentRow.innerHTML = '';
    }
  }

  attachBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'SAVE_ATTACHMENT',
          payload: { dataUrl, filename: file.name },
        });
        if (response?.error) {
          console.error('ContextBox attachment error:', response.error);
          return;
        }
        group.attachmentPath = response.path;
        updateAttachmentRow();
      } catch (err) {
        console.error('ContextBox attachment error:', err);
      }
    };
    reader.readAsDataURL(file);
    fileInput.value = '';
  });

  textarea.addEventListener('input', () => {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  });

  copyBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    handleAction(group, textarea.value, 'copy', popup, textarea, copyBtn);
  });

  sendBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isConnected) handleAction(group, textarea.value, 'send', popup, textarea, sendBtn);
  });

  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    onRemove(group.id);
  });

  textarea.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isConnected) {
        handleAction(group, textarea.value, 'send', popup, textarea, sendBtn);
      } else {
        handleAction(group, textarea.value, 'copy', popup, textarea, copyBtn);
      }
    }
  });

  popup.addEventListener('mousedown', (e) => e.stopPropagation());
  popup.addEventListener('click', (e) => e.stopPropagation());

  return popup;
}

async function handleAction(
  group: SelectionGroup,
  instructions: string,
  action: 'copy' | 'send',
  popupEl: HTMLDivElement,
  inputEl: HTMLTextAreaElement,
  btnEl: HTMLButtonElement
) {
  const result = await chrome.storage.local.get(['settings']);
  const settings: Settings = result.settings || {
    includeHtml: true,
    includeStyles: true,
    includeAccessibility: true,
    includeScreenshot: true,
    aibridgeUrl: DEFAULT_AIBRIDGE_URL,
  };
  const aibridgeUrl = settings.aibridgeUrl || DEFAULT_AIBRIDGE_URL;

  const originalContent = btnEl.innerHTML;
  btnEl.innerHTML = SPINNER_HTML; // Safe: hardcoded HTML
  btnEl.disabled = true;

  const items = Array.from(group.elements.values());
  const data: ExtractedData = {
    pageContext: {
      url: window.location.href,
      title: document.title,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      timestamp: new Date().toISOString(),
    },
    items: items.map((item) => {
      const copy = { ...item };
      if (!settings.includeHtml) copy.htmlSnippet = '';
      if (!settings.includeStyles) copy.computedStyles = {} as any;
      if (!settings.includeAccessibility) copy.accessibility = {} as any;
      return copy;
    }),
  };

  try {
    let screenshotDataUrl = '';

    if (settings.includeScreenshot ?? true) {
      const overlayContainer = getOverlayContainer();
      const parent = overlayContainer?.parentNode;
      if (overlayContainer && parent) parent.removeChild(overlayContainer);
      await new Promise((r) => requestAnimationFrame(r));

      const captureRes = await chrome.runtime.sendMessage({ type: 'CAPTURE_TAB' });

      if (overlayContainer && parent) parent.appendChild(overlayContainer);

      screenshotDataUrl = captureRes?.dataUrl || '';
      if (screenshotDataUrl) {
        const rects = items.map((item) => item.rectViewport);
        const annotated = await annotateScreenshot(screenshotDataUrl, rects, window.devicePixelRatio, group.id);
        if (annotated) screenshotDataUrl = annotated;
      }
    }

    const response = await chrome.runtime.sendMessage({
      type: 'SAVE_SCREENSHOT',
      payload: { data, instructions, screenshotDataUrl, attachmentPath: group.attachmentPath },
    });

    if (response?.error) throw new Error(response.error);

    if (action === 'copy') {
      await navigator.clipboard.writeText(response.prompt);
      inputEl.value = '';
      showOverlay(popupEl, 'Copied!');
    } else {
      const res = await fetch(`${aibridgeUrl}/inject?sync=true`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: response.prompt }),
      });
      if (res.ok) {
        inputEl.value = '';
        showOverlay(popupEl, 'Sent!');
      } else {
        showOverlay(popupEl, 'Send failed', true);
      }
    }
  } catch (err) {
    console.error('ContextBox error:', err);
    showOverlay(popupEl, 'Failed', true);
  } finally {
    btnEl.innerHTML = originalContent; // Restoring original SVG content
    btnEl.disabled = false;
  }
}

function showOverlay(popupEl: HTMLDivElement, msg: string, isError = false) {
  const existing = popupEl.querySelector('.cb-popup-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = isError ? 'cb-popup-overlay error' : 'cb-popup-overlay';
  overlay.textContent = msg;
  popupEl.appendChild(overlay);

  setTimeout(() => overlay.remove(), 1500);
}
