import type { Rect } from '../types';

export async function annotateScreenshot(dataUrl: string, rects: Rect[], dpr: number, label: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No context'));
        return;
      }

      ctx.drawImage(img, 0, 0);
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 2 * dpr;
      ctx.font = `bold ${12 * dpr}px -apple-system, BlinkMacSystemFont, sans-serif`;

      rects.forEach((r) => {
        const x = r.x * dpr,
          y = r.y * dpr,
          w = r.width * dpr,
          h = r.height * dpr;
        ctx.strokeRect(x, y, w, h);
        const lbl = String(label);
        const m = ctx.measureText(lbl);
        const pad = 4 * dpr,
          lh = 16 * dpr,
          lw = m.width + pad * 2;
        ctx.fillStyle = '#D97706';
        ctx.fillRect(x, y - lh, lw, lh);
        ctx.fillStyle = 'white';
        ctx.fillText(lbl, x + pad, y - pad);
      });

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = dataUrl;
  });
}
