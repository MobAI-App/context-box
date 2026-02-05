import type { Settings } from '../types';

const DEFAULT_AIBRIDGE_URL = 'http://127.0.0.1:9999';

const toggleSelectionBtn = document.getElementById('toggle-selection') as HTMLButtonElement;
const includeHtmlCheckbox = document.getElementById('include-html') as HTMLInputElement;
const includeStylesCheckbox = document.getElementById('include-styles') as HTMLInputElement;
const includeAccessibilityCheckbox = document.getElementById('include-accessibility') as HTMLInputElement;
const includeScreenshotCheckbox = document.getElementById('include-screenshot') as HTMLInputElement;
const persistSelectionCheckbox = document.getElementById('persist-selection') as HTMLInputElement;
const aibridgeUrlInput = document.getElementById('aibridge-url') as HTMLInputElement;
const aibridgeStatus = document.getElementById('aibridge-status') as HTMLDivElement;
const hintText = document.getElementById('hint-text') as HTMLParagraphElement;

let isSelectionActive = false;

async function init() {
  await loadSettings();
  await checkAiBridgeStatus();
  await checkSelectionState();
  setupEventListeners();
}

async function loadSettings() {
  const result = await chrome.storage.local.get(['settings']);
  if (result.settings) {
    const settings = result.settings as Settings;
    includeHtmlCheckbox.checked = settings.includeHtml;
    includeStylesCheckbox.checked = settings.includeStyles;
    includeAccessibilityCheckbox.checked = settings.includeAccessibility;
    includeScreenshotCheckbox.checked = settings.includeScreenshot ?? true;
    persistSelectionCheckbox.checked = settings.persistSelection ?? true;
    aibridgeUrlInput.value = settings.aibridgeUrl || DEFAULT_AIBRIDGE_URL;
  }
}

async function saveSettings() {
  const settings: Settings = {
    includeHtml: includeHtmlCheckbox.checked,
    includeStyles: includeStylesCheckbox.checked,
    includeAccessibility: includeAccessibilityCheckbox.checked,
    includeScreenshot: includeScreenshotCheckbox.checked,
    persistSelection: persistSelectionCheckbox.checked,
    aibridgeUrl: aibridgeUrlInput.value.trim() || DEFAULT_AIBRIDGE_URL,
  };
  await chrome.storage.local.set({ settings });
}

async function checkAiBridgeStatus() {
  const statusDot = aibridgeStatus.querySelector('.status-dot') as HTMLSpanElement;
  const statusText = aibridgeStatus.querySelector('.status-text') as HTMLSpanElement;
  const aibridgeUrl = aibridgeUrlInput.value.trim() || DEFAULT_AIBRIDGE_URL;

  try {
    const response = await fetch(`${aibridgeUrl}/status`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000),
    });

    if (response.ok) {
      statusDot.className = 'status-dot connected';
      statusText.textContent = 'Connected';
      hintText.textContent = '';
    } else {
      throw new Error('Not OK');
    }
  } catch {
    statusDot.className = 'status-dot disconnected';
    statusText.textContent = 'Disconnected';
    hintText.textContent = 'Start AiBridge to enable Send';
    hintText.className = 'hint';
  }
}

async function checkSelectionState() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) return;

    const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_SELECTION_STATE' });
    if (response) {
      isSelectionActive = response.isActive;
      updateUI();
    }
  } catch {
    isSelectionActive = false;
    updateUI();
  }
}

function updateUI() {
  toggleSelectionBtn.textContent = isSelectionActive ? 'Stop Selection' : 'Start Selection';
  toggleSelectionBtn.classList.toggle('active', isSelectionActive);
}

async function injectContentScript(tabId: number) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'PING' });
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content/content.js'],
    });
    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ['content/content.css'],
    });
  }
}

function setupEventListeners() {
  toggleSelectionBtn.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) {
        hintText.textContent = 'Cannot access this page';
        hintText.className = 'hint error';
        return;
      }

      await injectContentScript(tab.id);

      if (isSelectionActive) {
        await chrome.tabs.sendMessage(tab.id, { type: 'STOP_SELECTION' });
      } else {
        await chrome.tabs.sendMessage(tab.id, { type: 'START_SELECTION' });
      }

      isSelectionActive = !isSelectionActive;
      updateUI();
      window.close();
    } catch (error) {
      console.error('Failed to toggle selection:', error);
      hintText.textContent = 'Cannot access this page';
      hintText.className = 'hint error';
    }
  });

  includeHtmlCheckbox.addEventListener('change', saveSettings);
  includeStylesCheckbox.addEventListener('change', saveSettings);
  includeAccessibilityCheckbox.addEventListener('change', saveSettings);
  includeScreenshotCheckbox.addEventListener('change', saveSettings);
  persistSelectionCheckbox.addEventListener('change', saveSettings);

  let urlTimeout: number;
  aibridgeUrlInput.addEventListener('input', () => {
    clearTimeout(urlTimeout);
    urlTimeout = window.setTimeout(async () => {
      await saveSettings();
      await checkAiBridgeStatus();
    }, 500);
  });
}

init();
