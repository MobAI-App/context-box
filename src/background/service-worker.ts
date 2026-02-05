import type { ExtractedData } from '../types';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SAVE_SCREENSHOT') {
    handleSaveScreenshot(message.payload)
      .then(sendResponse)
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }

  if (message.type === 'CAPTURE_TAB') {
    chrome.tabs
      .captureVisibleTab({ format: 'png' })
      .then((dataUrl) => sendResponse({ dataUrl }))
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }
});

interface SavePayload {
  data: ExtractedData;
  instructions: string;
  screenshotDataUrl: string;
}

async function handleSaveScreenshot(payload: SavePayload): Promise<{ prompt: string; screenshotPath: string | null }> {
  const { data, instructions, screenshotDataUrl } = payload;

  let screenshotPath: string | null = null;

  try {
    if (screenshotDataUrl) {
      screenshotPath = await saveScreenshot(screenshotDataUrl, data.pageContext.url);
    }
  } catch (error) {
    console.warn('Screenshot save failed:', error);
  }

  const prompt = buildPrompt(data, instructions, screenshotPath);
  return { prompt, screenshotPath };
}

function buildPrompt(data: ExtractedData, instructions: string, screenshotPath: string | null): string {
  const { pageContext, items } = data;

  let prompt = '';

  if (instructions.trim()) {
    prompt += `User request: ${instructions.trim()}\n\n`;
  }

  prompt += `Page:\n`;
  prompt += `* URL: ${pageContext.url}\n`;
  prompt += `* Title: ${pageContext.title}\n`;
  prompt += `* Viewport: ${pageContext.viewportWidth}x${pageContext.viewportHeight}, dpr=${pageContext.devicePixelRatio}\n`;
  prompt += `* Scroll: ${pageContext.scrollX},${pageContext.scrollY}\n\n`;

  prompt += `Selected elements:\n`;

  for (const item of items) {
    prompt += `${item.index}. <${item.tagName}> — ${item.selector}`;
    if (item.isStale) prompt += ` (STALE)`;
    prompt += `\n`;

    if (item.textSnippet) {
      prompt += `   * text: "${item.textSnippet}"\n`;
    }

    prompt += `   * rect: ${Math.round(item.rectViewport.x)},${Math.round(item.rectViewport.y)},${Math.round(item.rectViewport.width)},${Math.round(item.rectViewport.height)}\n`;

    const attrEntries = Object.entries(item.attributes).filter(([key]) => key !== 'class' && key !== 'id');
    if (attrEntries.length > 0) {
      prompt += `   * attributes: {${attrEntries.map(([k, v]) => `${k}="${v}"`).join(', ')}}\n`;
    }

    if (item.computedStyles && Object.keys(item.computedStyles).length > 0) {
      const s = item.computedStyles;
      const entries = [`display: ${s.display}`, `position: ${s.position}`, `width: ${s.width}`, `height: ${s.height}`];
      if (s.flexDirection && s.display?.includes('flex')) {
        entries.push(`flex-direction: ${s.flexDirection}`, `justify-content: ${s.justifyContent}`, `align-items: ${s.alignItems}`);
      }
      prompt += `   * styles: {${entries.join(', ')}}\n`;
    }

    if (item.accessibility?.accessibleName) {
      prompt += `   * accessible name: "${item.accessibility.accessibleName}"\n`;
    }

    if (item.htmlSnippet) {
      const indented = item.htmlSnippet
        .split('\n')
        .map((l) => `      ${l}`)
        .join('\n');
      prompt += `   * html:\n${indented}\n`;
    }

    prompt += `\n`;
  }

  if (screenshotPath) {
    prompt += `Screenshot: ${screenshotPath}\n`;
    prompt += `(Bounding boxes labeled by element index)\n\n`;
  }

  prompt += `Task: Use the data above. Refer to elements by index.\n`;

  return prompt;
}

async function saveScreenshot(dataUrl: string, pageUrl: string): Promise<string> {
  let hostname = 'page';
  try {
    hostname = new URL(pageUrl).hostname.replace(/[^a-z0-9]/gi, '_');
  } catch {}

  const now = new Date();
  const timestamp = now
    .toISOString()
    .replace(/[-:T]/g, '')
    .slice(0, 15)
    .replace(/(\d{8})(\d{6})/, '$1_$2');
  const filename = `contextbox/${hostname}_${timestamp}.png`;

  return new Promise((resolve, reject) => {
    chrome.downloads.download({ url: dataUrl, filename, saveAs: false }, (downloadId) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      const listener = (delta: chrome.downloads.DownloadDelta) => {
        if (delta.id !== downloadId) return;

        if (delta.state?.current === 'complete') {
          chrome.downloads.onChanged.removeListener(listener);
          chrome.downloads.search({ id: downloadId }, (results) => {
            resolve(results[0].filename);
          });
        } else if (delta.state?.current === 'interrupted') {
          chrome.downloads.onChanged.removeListener(listener);
          reject(new Error('Download interrupted'));
        }
      };

      chrome.downloads.onChanged.addListener(listener);
    });
  });
}
