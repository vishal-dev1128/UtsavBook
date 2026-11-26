import {
  AlertCircle,
  Check,
  CheckCircle2,
  Circle,
  Crop,
  Download,
  FileDown,
  Minus,
  Plus,
  QrCode,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Square,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMandal } from '../../context/MandalContext';
import { compressImageFile } from '../../lib/i18n';
import { renderMinimalReceiptToImage } from '../../lib/receiptService';
import { resolveMandalLogoUrl } from '../../types';
import { MandalSubPageShell } from './MandalSubPageShell';

const UPI_REGEX = /^[a-zA-Z0-9._-]{2,}@[a-zA-Z0-9.-]{2,}$/;

type LogoShape = 'circle' | 'rounded';
type LogoBgTone = 'white' | 'ivory' | 'blue';
type QrCardStyle = 'branded' | 'minimal';

interface LogoAdjustState {
  zoom: number;
  offsetX: number;
  offsetY: number;
  shape: LogoShape;
  bgTone: LogoBgTone;
}

const DEFAULT_LOGO_ADJUST: LogoAdjustState = {
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  shape: 'circle',
  bgTone: 'white',
};

const LOGO_BG_HEX: Record<LogoBgTone, string> = {
  white: '#FFFFFF',
  ivory: '#FFFDF7',
  blue: '#EFF6FF',
};

/* ------------------------------------------------------------------ */
/* Shared UI class tokens (keeps text / button alignment consistent)   */
/* ------------------------------------------------------------------ */
const LABEL_CLS =
  'block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 leading-none';

const inputCls = (valid = true) =>
  `w-full h-11 px-3.5 rounded-xl bg-[#F5F7FB] border shadow-2xs text-sm text-slate-900 leading-none disabled:opacity-75 focus:outline-none focus:bg-white focus:ring-4 transition-all duration-200 ${
    valid
      ? 'border-slate-200/90 focus:border-blue-500/60 focus:ring-blue-500/10'
      : 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/10'
  }`;

const UPLOAD_BTN_CLS =
  'h-11 min-w-0 px-2 rounded-xl border border-dashed border-blue-400/80 bg-blue-50/40 hover:bg-blue-50 active:scale-[0.98] shadow-2xs text-[11px] font-bold text-blue-900 flex items-center justify-center gap-1.5 cursor-pointer transition-all text-center';

const REMOVE_BTN_CLS =
  'h-8 px-2.5 rounded-lg bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-600 text-[11px] font-bold inline-flex items-center justify-center gap-1 shrink-0 whitespace-nowrap transition-all cursor-pointer';

const ASSET_CARD_CLS =
  'flex items-center justify-between gap-3 rounded-2xl bg-[#F8FAFC] border border-slate-200/90 px-3.5 py-2.5 shadow-[0_6px_18px_-6px_rgba(15,23,42,0.08),0_2px_6px_-2px_rgba(15,23,42,0.04)] transition-all';

function getLocalTodayISO(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Invalid file result'));
    };
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith('data:') && !src.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

/**
 * Signature -> clean transparent PNG.
 *
 * FIX: Pehle sirf corners check hote the aur sirf "pure white" ya "pure black"
 * (luminance < 28) hata'a jata tha. Isliye dark-blue ink + black background
 * wali image me background hat'ta nahi tha aur signature black box me dikhta tha.
 *
 * Ab:
 *  1. Image ke poore border se background color detect hota hai (median).
 *  2. Border se flood-fill karke us color se match karne wala connected background hataya jata hai
 *     (black / white / koi bhi solid color, JPEG noise ke saath bhi).
 *  3. Letters ke andar ke holes (o, a, e ...) bhi saaf hote hain.
 *  4. Edges soft (anti-aliased) rehte hain, black/white halo nahi aata.
 *  5. Extra khali jagah crop hoti hai taaki signature receipt me properly center/align ho.
 */
async function processSignatureToTransparentPng(file: File): Promise<string> {
  const rawUrl = await readFileAsDataUrl(file);
  const img = await loadHtmlImage(rawUrl);

  const maxW = 600;
  const maxH = 260;
  const scale = Math.min(1, maxW / img.width, maxH / img.height);
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return rawUrl;

  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;
  const total = w * h;

  // Border pixel indices (pixel index, not byte index)
  const borderPts: number[] = [];
  for (let x = 0; x < w; x++) {
    borderPts.push(x, (h - 1) * w + x);
  }
  for (let y = 1; y < h - 1; y++) {
    borderPts.push(y * w, y * w + (w - 1));
  }

  // Detect whether image already has real transparency at the border
  let transparentBorder = 0;
  const rs: number[] = [];
  const gs: number[] = [];
  const bs: number[] = [];
  for (const p of borderPts) {
    const i = p * 4;
    if (d[i + 3] < 30) {
      transparentBorder++;
    } else {
      rs.push(d[i]);
      gs.push(d[i + 1]);
      bs.push(d[i + 2]);
    }
  }
  const alreadyTransparent = transparentBorder / borderPts.length > 0.6;

  if (alreadyTransparent) {
    // Just clean invisible pixels so no dark fringe / black matte leaks through
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 12) {
        d[i] = 0;
        d[i + 1] = 0;
        d[i + 2] = 0;
        d[i + 3] = 0;
      }
    }
  } else {
    const median = (arr: number[]) => {
      if (arr.length === 0) return 255;
      const sorted = [...arr].sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length / 2)];
    };
    const bgR = median(rs);
    const bgG = median(gs);
    const bgB = median(bs);
    const bgLum = 0.299 * bgR + 0.587 * bgG + 0.114 * bgB;
    const lightBg = bgLum > 190; // white paper / photo of signature

    const TOL = lightBg ? 55 : 38;

    const colorDist = (i: number) => {
      const dr = d[i] - bgR;
      const dg = d[i + 1] - bgG;
      const db = d[i + 2] - bgB;
      return Math.sqrt(dr * dr + dg * dg + db * db);
    };

    const isBgLike = (p: number) => {
      const i = p * 4;
      if (d[i + 3] < 30) return true;
      if (colorDist(i) <= TOL) return true;
      if (lightBg) {
        const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        if (lum > 218) return true;
      }
      return false;
    };

    // 1) Flood fill from the border
    const removed = new Uint8Array(total);
    const stack: number[] = [];
    const tryPush = (p: number) => {
      if (!removed[p] && isBgLike(p)) {
        removed[p] = 1;
        stack.push(p);
      }
    };
    for (const p of borderPts) tryPush(p);
    while (stack.length) {
      const p = stack.pop() as number;
      const x = p % w;
      const y = (p - x) / w;
      if (x > 0) tryPush(p - 1);
      if (x < w - 1) tryPush(p + 1);
      if (y > 0) tryPush(p - w);
      if (y < h - 1) tryPush(p + w);
    }

    // 2) Enclosed holes (inside letters / loops) that closely match bg color
    for (let p = 0; p < total; p++) {
      if (!removed[p] && colorDist(p * 4) <= TOL * 0.55) {
        removed[p] = 1;
      }
    }

    // 3) Soft edge: pixels touching removed area get partial alpha (no hard halo)
    const edgePixels: number[] = [];
    for (let p = 0; p < total; p++) {
      if (removed[p]) continue;
      const x = p % w;
      const y = (p - x) / w;
      if (
        (x > 0 && removed[p - 1]) ||
        (x < w - 1 && removed[p + 1]) ||
        (y > 0 && removed[p - w]) ||
        (y < h - 1 && removed[p + w])
      ) {
        edgePixels.push(p);
      }
    }
    for (const p of edgePixels) {
      const i = p * 4;
      const dist = colorDist(i);
      const a = Math.min(1, Math.max(0, (dist - TOL * 0.6) / (TOL * 1.6)));
      d[i + 3] = Math.round(d[i + 3] * a);
    }

    // 4) Apply removal
    for (let p = 0; p < total; p++) {
      if (removed[p]) {
        const i = p * 4;
        d[i] = 0;
        d[i + 1] = 0;
        d[i + 2] = 0;
        d[i + 3] = 0;
      }
    }
  }

  // Find ink bounding box and crop extra empty space
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 24) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // Nothing left (unexpected) -> keep original so user never loses the upload
  if (maxX < 0 || maxY < 0) return rawUrl;

  ctx.putImageData(imageData, 0, 0);

  const pad = 6;
  const cx = Math.max(0, minX - pad);
  const cy = Math.max(0, minY - pad);
  const cw = Math.min(w - 1, maxX + pad) - cx + 1;
  const ch = Math.min(h - 1, maxY + pad) - cy + 1;

  const out = document.createElement('canvas');
  out.width = Math.max(1, cw);
  out.height = Math.max(1, ch);
  const outCtx = out.getContext('2d');
  if (!outCtx) return canvas.toDataURL('image/png');
  outCtx.clearRect(0, 0, out.width, out.height);
  outCtx.drawImage(canvas, cx, cy, cw, ch, 0, 0, cw, ch);

  // PNG (never JPEG/WebP) so transparency is preserved
  return out.toDataURL('image/png');
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/**
 * Renders the adjusted logo onto a crisp, lightweight 280x280 canvas so storage/DB saves reliably.
 */
async function renderAdjustedLogoDataUrl(
  sourceUrl: string,
  adjust: LogoAdjustState,
): Promise<string> {
  const img = await loadHtmlImage(sourceUrl);
  const size = 280;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return sourceUrl;

  ctx.fillStyle = LOGO_BG_HEX[adjust.bgTone];
  ctx.fillRect(0, 0, size, size);

  ctx.save();
  if (adjust.shape === 'circle') {
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
  } else {
    drawRoundedRectPath(ctx, 0, 0, size, size, 56);
    ctx.clip();
  }

  ctx.fillStyle = LOGO_BG_HEX[adjust.bgTone];
  ctx.fillRect(0, 0, size, size);

  const baseScale = Math.max(size / img.width, size / img.height);
  const drawW = img.width * baseScale * adjust.zoom;
  const drawH = img.height * baseScale * adjust.zoom;
  const scaleRatio = size / 220;
  const dx = (size - drawW) / 2 + adjust.offsetX * scaleRatio;
  const dy = (size - drawH) / 2 + adjust.offsetY * scaleRatio;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, dx, dy, drawW, drawH);
  ctx.restore();

  const webp = canvas.toDataURL('image/webp', 0.88);
  if (webp.startsWith('data:image/webp')) {
    return webp;
  }
  return canvas.toDataURL('image/jpeg', 0.88);
}

function parseUpiPayload(raw: string): { upiId?: string; payeeName?: string } {
  const trimmed = raw.trim();
  if (!trimmed.toLowerCase().startsWith('upi://')) return {};
  try {
    const parsed = new URL(trimmed);
    const pa = parsed.searchParams.get('pa')?.trim();
    const pn = parsed.searchParams.get('pn')?.trim();
    return {
      upiId: pa && UPI_REGEX.test(pa) ? pa : undefined,
      payeeName: pn || undefined,
    };
  } catch {
    const match = trimmed.match(/[?&]pa=([^&]+)/i);
    if (match?.[1]) {
      const decoded = decodeURIComponent(match[1]).trim();
      if (UPI_REGEX.test(decoded)) return { upiId: decoded };
    }
    return {};
  }
}

function detectQrRegionHeuristic(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): { x: number; y: number; width: number; height: number } {
  const grid = 28;
  const cellW = w / grid;
  const cellH = h / grid;
  const imageData = ctx.getImageData(0, 0, w, h).data;

  const scores: number[][] = Array.from({ length: grid }, () => Array(grid).fill(0));
  let maxScore = 0;

  for (let gy = 0; gy < grid; gy++) {
    for (let gx = 0; gx < grid; gx++) {
      const startX = Math.floor(gx * cellW);
      const endX = Math.min(w - 1, Math.floor((gx + 1) * cellW));
      const startY = Math.floor(gy * cellH);
      const endY = Math.min(h - 1, Math.floor((gy + 1) * cellH));

      let transitions = 0;
      let darkPixels = 0;
      let lightPixels = 0;
      let samples = 0;

      for (let y = startY; y < endY; y += 2) {
        let prevDark: boolean | null = null;
        for (let x = startX; x < endX; x += 2) {
          const idx = (y * w + x) * 4;
          const lum =
            0.299 * imageData[idx] +
            0.587 * imageData[idx + 1] +
            0.114 * imageData[idx + 2];
          const isDark = lum < 128;
          if (isDark) darkPixels++;
          else if (lum > 175) lightPixels++;

          if (prevDark !== null && prevDark !== isDark) {
            transitions++;
          }
          prevDark = isDark;
          samples++;
        }
      }

      if (samples > 0) {
        const darkRatio = darkPixels / samples;
        const lightRatio = lightPixels / samples;
        const balance =
          darkRatio > 0.14 && darkRatio < 0.82 && lightRatio > 0.14 ? 1 : 0.15;
        const score = (transitions / samples) * balance;
        scores[gy][gx] = score;
        if (score > maxScore) maxScore = score;
      }
    }
  }

  if (maxScore <= 0.04) {
    const side = Math.min(w, h);
    return {
      x: (w - side) / 2,
      y: (h - side) / 2,
      width: side,
      height: side,
    };
  }

  const threshold = maxScore * 0.42;
  let minGx = grid;
  let maxGx = 0;
  let minGy = grid;
  let maxGy = 0;

  for (let gy = 0; gy < grid; gy++) {
    for (let gx = 0; gx < grid; gx++) {
      if (scores[gy][gx] >= threshold) {
        if (gx < minGx) minGx = gx;
        if (gx > maxGx) maxGx = gx;
        if (gy < minGy) minGy = gy;
        if (gy > maxGy) maxGy = gy;
      }
    }
  }

  if (minGx > maxGx || minGy > maxGy) {
    const side = Math.min(w, h);
    return { x: (w - side) / 2, y: (h - side) / 2, width: side, height: side };
  }

  const rawX = minGx * cellW;
  const rawY = minGy * cellH;
  const rawW = (maxGx - minGx + 1) * cellW;
  const rawH = (maxGy - minGy + 1) * cellH;

  const side = Math.min(Math.max(w, h), Math.max(rawW, rawH) * 1.16);
  const cx = rawX + rawW / 2;
  const cy = rawY + rawH / 2;

  const finalSide = Math.min(side, w, h);
  const x = Math.max(0, Math.min(w - finalSide, cx - finalSide / 2));
  const y = Math.max(0, Math.min(h - finalSide, cy - finalSide / 2));

  return { x, y, width: finalSide, height: finalSide };
}

async function extractCleanQrFromScannerImage(fileDataUrl: string): Promise<{
  qrCropDataUrl: string;
  detectedUpiId?: string;
  detectedPayee?: string;
  scannerDetected: boolean;
}> {
  const img = await loadHtmlImage(fileDataUrl);
  const maxDim = 900;
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const workCanvas = document.createElement('canvas');
  workCanvas.width = w;
  workCanvas.height = h;
  const workCtx = workCanvas.getContext('2d', { willReadFrequently: true });
  if (!workCtx) {
    return { qrCropDataUrl: fileDataUrl, scannerDetected: false };
  }

  workCtx.drawImage(img, 0, 0, w, h);

  let cropBox: { x: number; y: number; width: number; height: number } | null = null;
  let detectedUpiId: string | undefined;
  let detectedPayee: string | undefined;
  let scannerDetected = false;

  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const BarcodeDetectorCtor = (
        window as unknown as {
          BarcodeDetector: new (opts?: { formats?: string[] }) => {
            detect: (source: ImageBitmapSource) => Promise<
              Array<{
                rawValue?: string;
                boundingBox?: { x: number; y: number; width: number; height: number };
              }>
            >;
          };
        }
      ).BarcodeDetector;

      const detector = new BarcodeDetectorCtor({ formats: ['qr_code'] });
      const results = await detector.detect(workCanvas);

      if (results && results.length > 0) {
        scannerDetected = true;
        const best = results[0];
        if (best.rawValue) {
          const parsed = parseUpiPayload(best.rawValue);
          detectedUpiId = parsed.upiId;
          detectedPayee = parsed.payeeName;
        }
        if (best.boundingBox && best.boundingBox.width > 20) {
          const b = best.boundingBox;
          const pad = Math.max(b.width, b.height) * 0.08;
          const side = Math.min(Math.max(b.width, b.height) + pad * 2, w, h);
          const cx = b.x + b.width / 2;
          const cy = b.y + b.height / 2;
          cropBox = {
            x: Math.max(0, Math.min(w - side, cx - side / 2)),
            y: Math.max(0, Math.min(h - side, cy - side / 2)),
            width: side,
            height: side,
          };
        }
      }
    } catch {
      // Fallback below
    }
  }

  if (!cropBox) {
    cropBox = detectQrRegionHeuristic(workCtx, w, h);
  }

  const outSize = 360;
  const outCanvas = document.createElement('canvas');
  outCanvas.width = outSize;
  outCanvas.height = outSize;
  const outCtx = outCanvas.getContext('2d', { willReadFrequently: true });
  if (!outCtx) {
    return { qrCropDataUrl: fileDataUrl, detectedUpiId, detectedPayee, scannerDetected };
  }

  outCtx.fillStyle = '#FFFFFF';
  outCtx.fillRect(0, 0, outSize, outSize);
  outCtx.imageSmoothingEnabled = true;
  outCtx.imageSmoothingQuality = 'high';
  outCtx.drawImage(
    workCanvas,
    cropBox.x,
    cropBox.y,
    cropBox.width,
    cropBox.height,
    0,
    0,
    outSize,
    outSize,
  );

  const imgData = outCtx.getImageData(0, 0, outSize, outSize);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    if (lum > 188) {
      d[i] = 255;
      d[i + 1] = 255;
      d[i + 2] = 255;
    } else if (lum < 95) {
      d[i] = 15;
      d[i + 1] = 23;
      d[i + 2] = 42;
    }
  }
  outCtx.putImageData(imgData, 0, 0);

  return {
    qrCropDataUrl: outCanvas.toDataURL('image/png'),
    detectedUpiId,
    detectedPayee,
    scannerDetected,
  };
}

async function renderStyledQrCard(params: {
  qrCropDataUrl: string;
  style: QrCardStyle;
  mandalName: string;
  upiId: string;
}): Promise<string> {
  const { qrCropDataUrl, style, mandalName, upiId } = params;
  const qrImg = await loadHtmlImage(qrCropDataUrl);

  if (style === 'minimal') {
    const size = 400;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return qrCropDataUrl;

    drawRoundedRectPath(ctx, 2, 2, size - 4, size - 4, 32);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#E2E8F0';
    ctx.stroke();

    const qrDraw = 336;
    const offset = (size - qrDraw) / 2;
    ctx.drawImage(qrImg, offset, offset, qrDraw, qrDraw);
    return canvas.toDataURL('image/png');
  }

  const width = 420;
  const height = upiId ? 510 : 472;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return qrCropDataUrl;

  drawRoundedRectPath(ctx, 2, 2, width - 4, height - 4, 32);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#DBEAFE';
  ctx.stroke();

  drawRoundedRectPath(ctx, 11, 11, width - 22, height - 22, 24);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#F1F5F9';
  ctx.stroke();

  const pillW = 180;
  const pillH = 28;
  const pillX = (width - pillW) / 2;
  const pillY = 24;
  drawRoundedRectPath(ctx, pillX, pillY, pillW, pillH, 14);
  ctx.fillStyle = '#EFF6FF';
  ctx.fill();

  ctx.fillStyle = '#1D4ED8';
  ctx.font = '800 12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SCAN & PAY VARGANI', width / 2, pillY + pillH / 2 + 0.5);

  ctx.fillStyle = '#0F172A';
  ctx.font = '800 17px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const safeName = (mandalName || 'Mandal Digital Receipt').slice(0, 32);
  ctx.fillText(safeName, width / 2, 74);

  const boxSize = 296;
  const boxX = (width - boxSize) / 2;
  const boxY = 92;
  drawRoundedRectPath(ctx, boxX, boxY, boxSize, boxSize, 22);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#E2E8F0';
  ctx.stroke();

  const qrPad = 14;
  ctx.drawImage(qrImg, boxX + qrPad, boxY + qrPad, boxSize - qrPad * 2, boxSize - qrPad * 2);

  let footerTextY = boxY + boxSize + 30;
  if (upiId) {
    const upiPillW = Math.min(330, Math.max(196, upiId.length * 9.5 + 42));
    const upiPillH = 30;
    const upiPillX = (width - upiPillW) / 2;
    const upiPillY = boxY + boxSize + 16;
    drawRoundedRectPath(ctx, upiPillX, upiPillY, upiPillW, upiPillH, 10);
    ctx.fillStyle = '#F8FAFC';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#E2E8F0';
    ctx.stroke();

    ctx.fillStyle = '#1E293B';
    ctx.font = '700 13px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    ctx.fillText(upiId, width / 2, upiPillY + upiPillH / 2 + 0.5);
    footerTextY = upiPillY + upiPillH + 22;
  }

  ctx.fillStyle = '#64748B';
  ctx.font = '700 11px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText('GPay  ·  PhonePe  ·  Paytm  ·  BHIM UPI', width / 2, footerTextY);

  return canvas.toDataURL('image/png');
}

function triggerPngDownload(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

interface MinimalReceiptCardProps {
  mandalName: string;
  localName?: string;
  address?: string;
  estYear?: string;
  receiptPrefix: string;
  logoUrl: string;
  signatureUrl?: string;
  utsavLabel: string;
  signatoryName: string;
  formattedDate: string;
  isTemplate?: boolean;
}

function MinimalReceiptCard({
  mandalName,
  localName,
  address,
  estYear,
  receiptPrefix,
  logoUrl,
  signatureUrl,
  utsavLabel,
  signatoryName,
  formattedDate,
  isTemplate = false,
}: MinimalReceiptCardProps) {
  return (
    <div
      data-minimal-receipt-card="true"
      className="relative overflow-hidden rounded-[28px] bg-[#FFFEFB] border border-slate-200/90 ring-1 ring-slate-900/[0.04] shadow-[0_20px_44px_-14px_rgba(15,23,42,0.14),0_6px_16px_-4px_rgba(15,23,42,0.06)] transition-all duration-300"
    >
      <div className="p-5 sm:p-6 space-y-5">
        {/* Top Status & Receipt Number */}
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/70 whitespace-nowrap leading-none">
            <ShieldCheck className="w-3 h-3 shrink-0" />
            <span>{isTemplate ? 'Official Receipt' : 'Official E-Receipt'}</span>
          </span>
          <span className="text-xs font-mono font-extrabold text-slate-700 bg-slate-100/90 border border-slate-200/70 px-2.5 py-1.5 rounded-lg whitespace-nowrap leading-none truncate min-w-0 tabular-nums">
            {isTemplate ? `#${receiptPrefix}-____` : `#${receiptPrefix}-0010`}
          </span>
        </div>

        {/* Mandal Identity Header */}
        <div className="flex flex-col items-center text-center gap-2.5 pt-1">
          <div className="w-16 h-16 rounded-full p-1 bg-white border border-slate-200/90 shadow-sm shrink-0">
            <img
              src={logoUrl}
              alt={mandalName}
              crossOrigin={logoUrl.startsWith('data:') || logoUrl.startsWith('blob:') ? undefined : 'anonymous'}
              referrerPolicy="no-referrer"
              className="w-full h-full rounded-full object-cover"
            />
          </div>

          <div className="space-y-1 w-full min-w-0 px-1">
            <h4 className="text-base font-extrabold text-slate-900 tracking-tight leading-snug break-words">
              {mandalName}
            </h4>
            {localName && (
              <p className="text-xs font-semibold text-blue-700 font-devanagari leading-snug break-words">
                {localName}
              </p>
            )}
            <p className="text-[11px] text-slate-500 leading-relaxed break-words">
              {[address, estYear ? `Est. ${estYear}` : ''].filter(Boolean).join(' · ') || utsavLabel}
            </p>
          </div>
        </div>

        {/* Subtle Perforated Receipt Divider */}
        <div className="w-full border-t border-dashed border-slate-200" />

        {/* Amount Highlight Box */}
        <div className="rounded-2xl bg-gradient-to-b from-slate-50/90 to-blue-50/40 border border-slate-200/80 shadow-[0_4px_14px_-4px_rgba(15,23,42,0.06)] px-4 py-4 flex flex-col items-center text-center gap-1.5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 leading-none">
            Vargani / Contribution Received
          </div>
          {isTemplate ? (
            <>
              <div className="flex items-baseline justify-center gap-1.5 pt-1">
                <span className="text-2xl font-extrabold text-slate-900 leading-none">₹</span>
                <span className="inline-block w-32 border-b-2 border-dashed border-slate-400/80 h-6" />
              </div>
              <div className="text-[11px] font-semibold text-slate-600 leading-none pt-1">
                Mode: ☐ Cash · ☐ UPI &nbsp;·&nbsp; Date: ___ / ___ / 20___
              </div>
            </>
          ) : (
            <>
              <div className="text-2xl font-extrabold text-slate-900 tabular-nums tracking-tight leading-none">
                ₹1,101
              </div>
              <div className="inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold text-emerald-700 leading-none">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Paid via UPI · {formattedDate}</span>
              </div>
            </>
          )}
        </div>

        {/* Donor Details Grid */}
        <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs px-0.5">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none">
              Received From
            </div>
            {isTemplate ? (
              <div className="mt-2.5 border-b border-dashed border-slate-300 h-4 w-full" />
            ) : (
              <div className="font-extrabold text-slate-900 mt-1.5 truncate">
                Donor Name (Preview)
              </div>
            )}
          </div>
          <div className="text-right min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none">
              Flat / Wing
            </div>
            {isTemplate ? (
              <div className="mt-2.5 border-b border-dashed border-slate-300 h-4 w-24 ml-auto" />
            ) : (
              <div className="font-bold text-slate-700 mt-1.5 truncate">A-101</div>
            )}
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none">
              Utsav Cycle
            </div>
            <div className="font-bold text-slate-700 mt-1.5 truncate">{utsavLabel}</div>
          </div>
          <div className="text-right min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none">
              Category
            </div>
            {isTemplate ? (
              <div className="mt-2.5 border-b border-dashed border-slate-300 h-4 w-24 ml-auto" />
            ) : (
              <div className="font-bold text-slate-700 mt-1.5 truncate">Vargani / Chanda</div>
            )}
          </div>
        </div>

        {/* Bottom Verified Stamp & Signature */}
        <div className="pt-4 border-t border-slate-100 flex items-end justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200/80 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-extrabold text-slate-800 leading-tight truncate">
                {isTemplate ? 'Official Mandal Receipt' : 'Digitally Verified'}
              </div>
              <div className="text-[10px] font-medium text-slate-400 mt-0.5 leading-snug">
                Thank you for your contribution
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center text-center shrink-0 w-32">
            <div className="h-12 w-full flex items-end justify-center mb-1">
              {signatureUrl && (
                <img
                  src={signatureUrl}
                  alt="Treasurer Signature"
                  crossOrigin={signatureUrl.startsWith('data:') || signatureUrl.startsWith('blob:') ? undefined : 'anonymous'}
                  referrerPolicy="no-referrer"
                  className="max-h-12 max-w-full object-contain bg-transparent"
                />
              )}
            </div>
            <div className="w-full text-[10.5px] font-bold text-slate-600 border-t border-slate-200 pt-1.5 px-1 truncate leading-none">
              {signatoryName}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MandalDetailsPage() {
  const { mandal, activeUtsav, currentMember, effectiveRole, updateMandalSettings } = useMandal();

  const defaultLogoUrl = useMemo(() => resolveMandalLogoUrl(undefined), []);
  const initialResolvedLogo = resolveMandalLogoUrl(mandal?.logoUrl);

  const [editName, setEditName] = useState(mandal?.name || '');
  const [editLocalName, setEditLocalName] = useState(mandal?.localName || '');
  const [editAddress, setEditAddress] = useState(mandal?.address || '');
  const [editEstYear, setEditEstYear] = useState(mandal?.estYear || '2026');
  const [editPrefix, setEditPrefix] = useState(mandal?.receiptPrefix || 'MB-1');
  const [editUpiId, setEditUpiId] = useState(mandal?.upiId || '');
  const [editUpiQrUrl, setEditUpiQrUrl] = useState(mandal?.upiQrUrl || '');
  const [editLogo, setEditLogo] = useState(initialResolvedLogo);
  const [editSig, setEditSig] = useState(mandal?.signatureUrl || '');

  // Logo Adjuster Studio State
  const [logoModalOpen, setLogoModalOpen] = useState(false);
  const [rawLogoSource, setRawLogoSource] = useState<string>(initialResolvedLogo);
  const [logoAdjust, setLogoAdjust] = useState<LogoAdjustState>(DEFAULT_LOGO_ADJUST);
  const [applyingLogo, setApplyingLogo] = useState(false);
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  }>({ active: false, startX: 0, startY: 0, originX: 0, originY: 0 });

  // Smart Scanner UPI QR Studio State
  const [rawQrCropUrl, setRawQrCropUrl] = useState<string | null>(null);
  const [qrCardStyle, setQrCardStyle] = useState<QrCardStyle>('branded');
  const [processingQr, setProcessingQr] = useState(false);
  const [processingSig, setProcessingSig] = useState(false);
  const [qrAutoMeta, setQrAutoMeta] = useState<{
    scannerDetected: boolean;
    extractedUpiId?: string;
  } | null>(null);

  // Live Digital Receipt Preview State
  const [downloadingReceipt, setDownloadingReceipt] = useState<'idle' | 'preview' | 'template'>('idle');
  const [receiptDownloadFeedback, setReceiptDownloadFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const syncedMandalIdRef = useRef<string | undefined>(mandal?.id);

  useEffect(() => {
    if (!mandal || syncedMandalIdRef.current === mandal.id) return;
    syncedMandalIdRef.current = mandal.id;
    const resolved = resolveMandalLogoUrl(mandal.logoUrl);
    setEditName(mandal.name || '');
    setEditLocalName(mandal.localName || '');
    setEditAddress(mandal.address || '');
    setEditEstYear(mandal.estYear || '2026');
    setEditPrefix(mandal.receiptPrefix || 'MB-1');
    setEditUpiId(mandal.upiId || '');
    setEditUpiQrUrl(mandal.upiQrUrl || '');
    setEditLogo(resolved);
    setRawLogoSource(resolved);
    setLogoAdjust(DEFAULT_LOGO_ADJUST);
    setEditSig(mandal.signatureUrl || '');
    setRawQrCropUrl(null);
    setQrAutoMeta(null);
    setSaveStatus(null);
  }, [mandal]);

  const resetFormFromMandal = () => {
    if (!mandal) return;
    const resolved = resolveMandalLogoUrl(mandal.logoUrl);
    setEditName(mandal.name || '');
    setEditLocalName(mandal.localName || '');
    setEditAddress(mandal.address || '');
    setEditEstYear(mandal.estYear || '2026');
    setEditPrefix(mandal.receiptPrefix || 'MB-1');
    setEditUpiId(mandal.upiId || '');
    setEditUpiQrUrl(mandal.upiQrUrl || '');
    setEditLogo(resolved);
    setRawLogoSource(resolved);
    setLogoAdjust(DEFAULT_LOGO_ADJUST);
    setEditSig(mandal.signatureUrl || '');
    setRawQrCropUrl(null);
    setQrAutoMeta(null);
    setSaveStatus(null);
  };

  useEffect(() => {
    if (!rawQrCropUrl) return;
    let cancelled = false;
    renderStyledQrCard({
      qrCropDataUrl: rawQrCropUrl,
      style: qrCardStyle,
      mandalName: editName.trim() || mandal?.name || 'Mandal',
      upiId: editUpiId.trim(),
    })
      .then((styled) => {
        if (!cancelled) setEditUpiQrUrl(styled);
      })
      .catch(() => {
        // Keep existing QR on error
      });
    return () => {
      cancelled = true;
    };
  }, [rawQrCropUrl, qrCardStyle, editName, editUpiId, mandal?.name]);

  useEffect(() => {
    if (!logoModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLogoModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [logoModalOpen]);

  const isDirty = useMemo(() => {
    if (!mandal) return false;
    return (
      editName.trim() !== (mandal.name || '').trim() ||
      editLocalName.trim() !== (mandal.localName || '').trim() ||
      editAddress.trim() !== (mandal.address || '').trim() ||
      editEstYear.trim() !== (mandal.estYear || '').trim() ||
      editPrefix.trim() !== (mandal.receiptPrefix || '').trim() ||
      editUpiId.trim() !== (mandal.upiId || '').trim() ||
      editUpiQrUrl !== (mandal.upiQrUrl || '') ||
      editLogo !== resolveMandalLogoUrl(mandal.logoUrl) ||
      editSig !== (mandal.signatureUrl || '')
    );
  }, [
    mandal,
    editName,
    editLocalName,
    editAddress,
    editEstYear,
    editPrefix,
    editUpiId,
    editUpiQrUrl,
    editLogo,
    editSig,
  ]);

  const formattedPreviewDate = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }, []);

  if (!mandal || !activeUtsav) return null;
  const isAdmin = effectiveRole === 'admin';

  const trimmedName = editName.trim();
  const trimmedPrefix = editPrefix.trim() || 'MB-1';
  const trimmedUpi = editUpiId.trim();
  const isUpiValid = trimmedUpi === '' || UPI_REGEX.test(trimmedUpi);
  const isYearValid = editEstYear.trim() === '' || /^\d{4}$/.test(editEstYear.trim());
  const canSubmit =
    isAdmin && !saving && isDirty && trimmedName.length > 0 && isUpiValid && isYearValid;

  const handleLogoFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setSaveStatus({
        type: 'error',
        message: 'Please select a valid image file (PNG, JPG, or WebP).',
      });
      return;
    }

    try {
      const compressed = await compressImageFile(file, 480, 0.86);
      setRawLogoSource(compressed);
      setEditLogo(compressed);
      setLogoAdjust(DEFAULT_LOGO_ADJUST);
      setLogoModalOpen(true);
      setSaveStatus(null);
    } catch {
      setSaveStatus({
        type: 'error',
        message: 'Unable to load this logo image. Please try another file.',
      });
    }
  };

  const handleApplyAdjustedLogo = async () => {
    if (applyingLogo) return;
    setApplyingLogo(true);
    try {
      const finalLogo = await renderAdjustedLogoDataUrl(rawLogoSource, logoAdjust);
      setEditLogo(finalLogo);
      setLogoModalOpen(false);
    } catch {
      setEditLogo(rawLogoSource);
      setLogoModalOpen(false);
    } finally {
      setApplyingLogo(false);
    }
  };

  const handleSignatureFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setSaveStatus({
        type: 'error',
        message: 'Please select a valid image file for signature.',
      });
      return;
    }

    setProcessingSig(true);
    try {
      const transparentPng = await processSignatureToTransparentPng(file);
      setEditSig(transparentPng);
      setSaveStatus(null);
    } catch {
      setSaveStatus({
        type: 'error',
        message: 'Unable to process signature image.',
      });
    } finally {
      setProcessingSig(false);
    }
  };

  const handleScannerQrFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setSaveStatus({
        type: 'error',
        message: 'Please upload a valid QR scanner screenshot or photo.',
      });
      return;
    }

    setProcessingQr(true);
    setSaveStatus(null);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const extracted = await extractCleanQrFromScannerImage(dataUrl);

      const nextUpiId =
        !editUpiId.trim() && extracted.detectedUpiId
          ? extracted.detectedUpiId
          : editUpiId.trim();

      if (!editUpiId.trim() && extracted.detectedUpiId) {
        setEditUpiId(extracted.detectedUpiId);
      }

      setRawQrCropUrl(extracted.qrCropDataUrl);
      setQrAutoMeta({
        scannerDetected: extracted.scannerDetected,
        extractedUpiId: extracted.detectedUpiId,
      });

      const styledQr = await renderStyledQrCard({
        qrCropDataUrl: extracted.qrCropDataUrl,
        style: qrCardStyle,
        mandalName: editName.trim() || mandal.name || 'Mandal',
        upiId: nextUpiId,
      });

      setEditUpiQrUrl(styledQr);
      setSaveStatus({
        type: 'success',
        message: extracted.detectedUpiId
          ? `Smart QR generated & UPI ID (${extracted.detectedUpiId}) auto-detected!`
          : 'Scanner QR extracted and upgraded into a clean receipt QR card!',
      });
    } catch {
      setSaveStatus({
        type: 'error',
        message: 'Unable to extract QR from this image. Please try a clearer image.',
      });
    } finally {
      setProcessingQr(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSaving(true);
    setSaveStatus(null);
    try {
      await updateMandalSettings({
        name: trimmedName,
        localName: editLocalName.trim(),
        address: editAddress.trim(),
        estYear: editEstYear.trim() || mandal.estYear,
        receiptPrefix: trimmedPrefix,
        upiId: trimmedUpi,
        upiQrUrl: editUpiQrUrl,
        logoUrl: editLogo,
        signatureUrl: editSig,
      });
      setSaveStatus({
        type: 'success',
        message: 'Mandal details and receipt branding saved.',
      });
    } catch (err) {
      setSaveStatus({
        type: 'error',
        message:
          err instanceof Error && err.message
            ? err.message
            : 'Failed to save settings. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  const hasCustomLogo = editLogo !== defaultLogoUrl;
  const effectiveMandalName = trimmedName || mandal.name;
  const utsavLabel = `${activeUtsav.name} (${activeUtsav.yearCycle})`;
  const signatoryName = currentMember?.name || 'Authorized Signatory';
  const safeFileSlug =
    effectiveMandalName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'mandal';

  const draftMandalForMinimal = {
    ...mandal,
    name: effectiveMandalName,
    localName: editLocalName.trim(),
    address: editAddress.trim(),
    estYear: editEstYear.trim() || mandal.estYear,
    receiptPrefix: trimmedPrefix,
    upiId: trimmedUpi,
    upiQrUrl: editUpiQrUrl,
    logoUrl: editLogo,
    signatureUrl: editSig,
  };

  const getLocalTodayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate(),
    ).padStart(2, '0')}`;
  };

  const previewMinimalEntry = {
    id: 'preview',
    user_id: mandal.user_id,
    utsavId: activeUtsav.id,
    type: 'income' as const,
    receiptNumber: `${trimmedPrefix}-0010`,
    publicReceiptId: 'preview',
    titleOrDonorName: 'Donor Name (Preview)',
    flatOrAddress: 'A-101',
    head: 'Vargani / Chanda',
    amount: 1101,
    paymentMode: 'UPI' as const,
    whatsappStatus: 'delivered' as const,
    approvalStatus: 'approved' as const,
    createdByUid: currentMember?.uid || 'admin',
    createdByName: signatoryName,
    isVoided: false,
    entryDate: getLocalTodayISO(),
    createdAt: new Date().toISOString(),
  };

  const handleDownloadPreviewReceipt = async () => {
    if (downloadingReceipt !== 'idle') return;
    setReceiptDownloadFeedback(null);
    setDownloadingReceipt('preview');
    try {
      const { dataUrl } = await renderMinimalReceiptToImage({
        mandal: draftMandalForMinimal,
        utsavName: utsavLabel,
        entry: previewMinimalEntry,
        format: 'png',
        signatoryName,
      });
      triggerPngDownload(dataUrl, `${safeFileSlug}-receipt-preview-minimal.png`);
      setReceiptDownloadFeedback({
        type: 'success',
        message: 'Minimal preview receipt downloaded.',
      });
    } catch {
      setReceiptDownloadFeedback({
        type: 'error',
        message: 'Could not download preview receipt. Please try again.',
      });
    } finally {
      setDownloadingReceipt('idle');
    }
  };

  const handleDownloadBlankTemplate = async () => {
    if (downloadingReceipt !== 'idle') return;
    setReceiptDownloadFeedback(null);
    setDownloadingReceipt('template');

    try {
      const { dataUrl } = await renderMinimalReceiptToImage({
        mandal: draftMandalForMinimal,
        utsavName: utsavLabel,
        entry: previewMinimalEntry,
        format: 'png',
        isTemplate: true,
        signatoryName,
      });
      triggerPngDownload(dataUrl, `${safeFileSlug}-receipt-template-minimal.png`);
      setReceiptDownloadFeedback({
        type: 'success',
        message: 'Blank Minimal receipt template downloaded.',
      });
    } catch {
      setReceiptDownloadFeedback({
        type: 'error',
        message: 'Could not download receipt template. Please try again.',
      });
    } finally {
      setDownloadingReceipt('idle');
    }
  };

  return (
    <MandalSubPageShell
      title="Mandal Details & Receipt"
      subtitle="Branding, logo framing, smart UPI QR & live receipt preview"
    >
      <style>{`
        @keyframes mdFadeSlideUp {
          0% {
            opacity: 0;
            transform: translateY(14px) scale(0.99);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes mdModalBackdrop {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes mdModalSpring {
          0% {
            opacity: 0;
            transform: translateY(18px) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .md-stagger {
          opacity: 0;
          animation: mdFadeSlideUp 420ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .md-backdrop-in {
          animation: mdModalBackdrop 220ms ease-out forwards;
        }
        .md-dialog-in {
          animation: mdModalSpring 300ms cubic-bezier(0.22, 1.15, 0.36, 1) forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .md-stagger, .md-backdrop-in, .md-dialog-in {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start pb-24">
        {/* Left Column: Branding & Smart QR Form Section */}
        <form
          onSubmit={handleSave}
          style={{ animationDelay: '0ms' }}
          className="md-stagger lg:col-span-7 bg-white rounded-[26px] border border-slate-200/90 ring-1 ring-slate-900/[0.03] p-4 sm:p-5 space-y-4 shadow-[0_14px_34px_-12px_rgba(15,23,42,0.12),0_4px_12px_-3px_rgba(15,23,42,0.06)] transition-shadow duration-300"
        >
          {saveStatus && (
            <div
              role="status"
              className={`md-stagger flex items-start gap-2 rounded-2xl border px-3.5 py-2.5 text-xs font-bold shadow-xs ${
                saveStatus.type === 'success'
                  ? 'bg-emerald-50/90 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50/90 border-rose-200 text-rose-800'
              }`}
            >
              {saveStatus.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-px" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-px" />
              )}
              <span className="leading-snug min-w-0 break-words">{saveStatus.message}</span>
            </div>
          )}

          {/* Mandal Identity Fields */}
          <div className="space-y-3.5">
            <div>
              <label className={LABEL_CLS}>
                Mandal Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                disabled={!isAdmin}
                value={editName}
                onChange={(e) => {
                  setEditName(e.target.value);
                  if (saveStatus) setSaveStatus(null);
                }}
                placeholder="Enter Mandal Name"
                className={`${inputCls()} font-semibold`}
              />
            </div>

            <div>
              <label className={LABEL_CLS}>Marathi / Hindi Name</label>
              <input
                type="text"
                disabled={!isAdmin}
                value={editLocalName}
                onChange={(e) => {
                  setEditLocalName(e.target.value);
                  if (saveStatus) setSaveStatus(null);
                }}
                placeholder="उदा. श्री गणेशोत्सव मंडळ"
                className={`${inputCls()} font-medium font-devanagari`}
              />
            </div>

            <div>
              <label className={LABEL_CLS}>Address</label>
              <input
                type="text"
                disabled={!isAdmin}
                value={editAddress}
                onChange={(e) => {
                  setEditAddress(e.target.value);
                  if (saveStatus) setSaveStatus(null);
                }}
                placeholder="Area, Landmark, City"
                className={`${inputCls()} font-semibold`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <label className={LABEL_CLS}>Est. Year</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  disabled={!isAdmin}
                  value={editEstYear}
                  onChange={(e) => {
                    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setEditEstYear(digitsOnly);
                    if (saveStatus) setSaveStatus(null);
                  }}
                  placeholder="2026"
                  className={`${inputCls(isYearValid)} font-bold tabular-nums`}
                />
              </div>
              <div className="min-w-0">
                <label className={LABEL_CLS}>Receipt Prefix</label>
                <input
                  type="text"
                  maxLength={12}
                  disabled={!isAdmin}
                  value={editPrefix}
                  onChange={(e) => {
                    const cleaned = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
                    setEditPrefix(cleaned);
                    if (saveStatus) setSaveStatus(null);
                  }}
                  placeholder="MB-1"
                  className={`${inputCls()} font-mono font-bold`}
                />
              </div>
            </div>

            <div>
              <label className={LABEL_CLS}>Mandal UPI ID</label>
              <input
                type="text"
                disabled={!isAdmin}
                value={editUpiId}
                onChange={(e) => {
                  setEditUpiId(e.target.value.trim());
                  if (saveStatus) setSaveStatus(null);
                }}
                placeholder="mandal@upi"
                className={`${inputCls(isUpiValid)} font-medium`}
              />
              {!isUpiValid && (
                <p className="mt-1.5 text-[11px] font-semibold text-rose-600 leading-snug">
                  Enter a valid UPI ID format (e.g., <span className="font-mono">mandal@oksbi</span>).
                </p>
              )}
            </div>
          </div>

          {/* Visual Branding & Smart Scanner Studio */}
          {isAdmin && (
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 min-w-0 truncate">
                  Logo, Signature & Smart UPI Scanner
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-full whitespace-nowrap shrink-0 leading-none">
                  <Sparkles className="w-3 h-3" />
                  <span>Auto-Enhance</span>
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <label className={UPLOAD_BTN_CLS}>
                  <Upload className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                  <span className="truncate">{hasCustomLogo ? 'Logo ✓' : 'Logo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoFilePick}
                  />
                </label>

                <label className={`${UPLOAD_BTN_CLS} ${processingSig ? 'opacity-60 pointer-events-none' : ''}`}>
                  <Upload className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                  <span className="truncate">
                    {processingSig ? 'Processing...' : editSig ? 'Sign ✓' : 'Signature'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={processingSig}
                    className="hidden"
                    onChange={handleSignatureFilePick}
                  />
                </label>

                <label className={`${UPLOAD_BTN_CLS} ${processingQr ? 'opacity-60 pointer-events-none' : ''}`}>
                  <QrCode className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                  <span className="truncate">
                    {processingQr ? 'Scanning...' : editUpiQrUrl ? 'QR ✓' : 'Scan QR'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={processingQr}
                    className="hidden"
                    onChange={handleScannerQrFilePick}
                  />
                </label>
              </div>

              {/* Active Logo Sub-Section Card */}
              <div className={ASSET_CARD_CLS}>
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={editLogo}
                    alt="Mandal Logo"
                    className="w-10 h-10 rounded-full object-cover bg-white border border-slate-200 shadow-xs shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-slate-800 truncate leading-tight">
                      {hasCustomLogo ? 'Custom Mandal Logo' : 'Default Mandal Emblem'}
                    </div>
                    <div className="text-[10.5px] text-slate-500 truncate mt-0.5 leading-tight">
                      Zoom, pan & frame logo for receipts
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setRawLogoSource(editLogo);
                      setLogoAdjust(DEFAULT_LOGO_ADJUST);
                      setLogoModalOpen(true);
                    }}
                    className="h-8 px-2.5 rounded-lg bg-white hover:bg-blue-50 active:scale-95 border border-slate-200 text-[11px] font-bold text-blue-700 inline-flex items-center justify-center gap-1 shadow-xs transition-all cursor-pointer whitespace-nowrap"
                  >
                    <Crop className="w-3 h-3" />
                    <span>Adjust</span>
                  </button>
                  {hasCustomLogo && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditLogo(defaultLogoUrl);
                        setRawLogoSource(defaultLogoUrl);
                        setLogoAdjust(DEFAULT_LOGO_ADJUST);
                      }}
                      aria-label="Reset logo"
                      className="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-600 inline-flex items-center justify-center transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Signature Preview Sub-Section Card */}
              {editSig && (
                <div className={ASSET_CARD_CLS}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-16 h-10 rounded-lg bg-white border border-slate-200 px-1.5 shadow-2xs shrink-0 flex items-center justify-center">
                      <img
                        src={editSig}
                        alt="Authorized Signature"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-slate-800 truncate leading-tight">
                        Authorized Signature
                      </div>
                      <div className="text-[10.5px] text-slate-500 truncate mt-0.5 leading-tight">
                        Transparent background applied
                      </div>
                    </div>
                  </div>
                  <button type="button" onClick={() => setEditSig('')} className={REMOVE_BTN_CLS}>
                    <Trash2 className="w-3 h-3" />
                    <span>Remove</span>
                  </button>
                </div>
              )}

              {/* Smart Extracted UPI QR Studio Sub-Section Card */}
              {editUpiQrUrl && (
                <div className="rounded-2xl bg-gradient-to-br from-blue-50/75 via-[#F8FAFC] to-white border border-blue-200/90 p-3.5 space-y-3 shadow-[0_8px_22px_-8px_rgba(37,99,235,0.14),0_2px_6px_-2px_rgba(15,23,42,0.04)] transition-all">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={editUpiQrUrl}
                        alt="Generated UPI QR"
                        className="w-14 h-16 rounded-xl object-contain bg-white border border-slate-200/90 p-1 shadow-xs shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <ScanLine className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="text-xs font-extrabold text-slate-900 truncate leading-tight">
                            Smart Receipt UPI QR
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 truncate leading-tight">
                          {qrAutoMeta?.extractedUpiId
                            ? `Auto-extracted: ${qrAutoMeta.extractedUpiId}`
                            : 'Cleaned & framed from uploaded scanner'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setEditUpiQrUrl('');
                        setRawQrCropUrl(null);
                        setQrAutoMeta(null);
                      }}
                      className={REMOVE_BTN_CLS}
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove</span>
                    </button>
                  </div>

                  {rawQrCropUrl && (
                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-blue-100/80">
                      <span className="text-[10.5px] font-bold text-slate-500 whitespace-nowrap">
                        QR Card Style
                      </span>
                      <div className="inline-flex rounded-xl bg-slate-200/70 p-0.5">
                        {(
                          [
                            { id: 'branded', label: 'Branded Card' },
                            { id: 'minimal', label: 'Pure Minimal' },
                          ] as const
                        ).map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setQrCardStyle(opt.id)}
                            className={`h-7 px-2.5 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer whitespace-nowrap inline-flex items-center justify-center ${
                              qrCardStyle === opt.id
                                ? 'bg-white text-blue-700 shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Save / Reset Action Bar */}
          {isAdmin ? (
            <div className="flex items-stretch gap-2.5 pt-1.5">
              {isDirty && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={resetFormFromMandal}
                  title="Discard unsaved changes"
                  className="h-11 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 active:scale-[0.98] disabled:opacity-50 text-slate-700 text-xs font-bold whitespace-nowrap inline-flex items-center justify-center gap-1.5 shrink-0 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                  <span>Reset</span>
                </button>
              )}
              <button
                type="submit"
                disabled={!canSubmit}
                className="flex-1 min-w-0 h-11 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none text-white text-[13px] sm:text-sm font-extrabold whitespace-nowrap inline-flex items-center justify-center gap-1.5 shadow-[0_8px_20px_-6px_rgba(37,99,235,0.45)] transition-all cursor-pointer touch-manipulation"
              >
                {saving ? (
                  <>
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin shrink-0" />
                    <span>Saving...</span>
                  </>
                ) : isDirty ? (
                  <>
                    <Check className="w-4 h-4 stroke-[2.5] shrink-0" />
                    <span>Save Branding</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>All Changes Saved</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="rounded-xl bg-amber-50 border border-amber-200/80 px-3.5 py-2.5 text-xs font-semibold text-amber-900 leading-snug">
              Only Admin / Treasurer can edit Mandal branding and UPI settings.
            </div>
          )}
        </form>

        {/* Right Column: Minimal & Aesthetic Live Digital Receipt Preview */}
        <div
          style={{ animationDelay: '75ms' }}
          className="md-stagger lg:col-span-5 space-y-3 lg:sticky lg:top-4 self-start min-w-0"
        >
          {/* Single-Line Header Row */}
          <div className="flex items-center justify-between gap-2 px-1 min-h-[30px]">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-400 whitespace-nowrap truncate leading-none">
                Minimal Receipt Preview
              </h3>
              {isDirty && (
                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 whitespace-nowrap shrink-0 leading-none">
                  Live Draft
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200/80 whitespace-nowrap shrink-0 leading-none">
              Minimal
            </span>
          </div>

          <div>
            <MinimalReceiptCard
              mandalName={effectiveMandalName}
              localName={editLocalName.trim()}
              address={editAddress.trim()}
              estYear={editEstYear.trim()}
              receiptPrefix={trimmedPrefix}
              logoUrl={editLogo}
              signatureUrl={editSig}
              utsavLabel={utsavLabel}
              signatoryName={signatoryName}
              formattedDate={formattedPreviewDate}
            />
          </div>

          {/* Preview & Blank Template Download Buttons */}
          <div className="grid grid-cols-2 gap-2.5 pt-0.5">
            <button
              type="button"
              onClick={handleDownloadPreviewReceipt}
              disabled={downloadingReceipt !== 'idle'}
              className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 active:scale-[0.98] disabled:opacity-60 border border-slate-200/90 text-slate-800 text-xs font-extrabold inline-flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              {downloadingReceipt === 'preview' ? (
                <>
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 border-t-slate-700 animate-spin shrink-0" />
                  <span>Downloading...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Download Preview</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadBlankTemplate}
              disabled={downloadingReceipt !== 'idle'}
              className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.98] disabled:opacity-60 text-white text-xs font-extrabold inline-flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              {downloadingReceipt === 'template' ? (
                <>
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin shrink-0" />
                  <span>Preparing...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-3.5 h-3.5 shrink-0" />
                  <span>Download Template</span>
                </>
              )}
            </button>
          </div>

          {receiptDownloadFeedback && (
            <div
              role="status"
              className={`flex items-center gap-1.5 text-xs font-semibold px-1 ${
                receiptDownloadFeedback.type === 'success' ? 'text-emerald-700' : 'text-rose-600'
              }`}
            >
              {receiptDownloadFeedback.type === 'success' ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{receiptDownloadFeedback.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Logo Framing & Adjustment Studio Modal */}
      {logoModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Adjust Mandal Logo"
          onClick={() => setLogoModalOpen(false)}
          className="md-backdrop-in fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="md-dialog-in w-full max-w-[390px] max-h-[calc(100vh-2rem)] overflow-y-auto rounded-[28px] bg-white border border-slate-200/90 shadow-2xl p-5 space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <SlidersHorizontal className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-extrabold text-slate-900 leading-tight truncate">
                    Adjust Mandal Logo
                  </h3>
                  <p className="text-[11px] text-slate-500 leading-tight mt-0.5 truncate">
                    Drag image to reposition · Slide zoom
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLogoModalOpen(false)}
                aria-label="Close logo adjuster"
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col items-center justify-center py-3 gap-2 bg-[#F5F7FB] rounded-2xl border border-slate-200/80">
              <div
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  dragRef.current = {
                    active: true,
                    startX: e.clientX,
                    startY: e.clientY,
                    originX: logoAdjust.offsetX,
                    originY: logoAdjust.offsetY,
                  };
                }}
                onPointerMove={(e) => {
                  if (!dragRef.current.active) return;
                  const dx = e.clientX - dragRef.current.startX;
                  const dy = e.clientY - dragRef.current.startY;
                  setLogoAdjust((prev) => ({
                    ...prev,
                    offsetX: Math.max(-110, Math.min(110, dragRef.current.originX + dx)),
                    offsetY: Math.max(-110, Math.min(110, dragRef.current.originY + dy)),
                  }));
                }}
                onPointerUp={() => {
                  dragRef.current.active = false;
                }}
                onPointerCancel={() => {
                  dragRef.current.active = false;
                }}
                style={{ backgroundColor: LOGO_BG_HEX[logoAdjust.bgTone] }}
                className={`relative w-[220px] h-[220px] overflow-hidden border-2 border-blue-500/40 shadow-inner select-none touch-none cursor-grab active:cursor-grabbing transition-[border-radius] duration-200 ${
                  logoAdjust.shape === 'circle' ? 'rounded-full' : 'rounded-[42px]'
                }`}
              >
                <img
                  src={rawLogoSource}
                  alt="Adjust preview"
                  draggable={false}
                  style={{
                    transform: `translate3d(${logoAdjust.offsetX}px, ${logoAdjust.offsetY}px, 0) scale(${logoAdjust.zoom})`,
                  }}
                  className="w-full h-full object-cover pointer-events-none will-change-transform"
                />
              </div>
              <span className="text-[10.5px] font-semibold text-slate-400 text-center leading-none">
                Drag inside frame to center your emblem
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 leading-none">
                <span>Zoom</span>
                <span className="tabular-nums text-blue-700">{logoAdjust.zoom.toFixed(2)}x</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setLogoAdjust((prev) => ({
                      ...prev,
                      zoom: Math.max(0.8, Number((prev.zoom - 0.1).toFixed(2))),
                    }))
                  }
                  aria-label="Zoom out"
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer shrink-0"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="range"
                  min={0.8}
                  max={2.6}
                  step={0.05}
                  value={logoAdjust.zoom}
                  onChange={(e) =>
                    setLogoAdjust((prev) => ({ ...prev, zoom: parseFloat(e.target.value) }))
                  }
                  className="flex-1 min-w-0 accent-blue-600 cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() =>
                    setLogoAdjust((prev) => ({
                      ...prev,
                      zoom: Math.min(2.6, Number((prev.zoom + 0.1).toFixed(2))),
                    }))
                  }
                  aria-label="Zoom in"
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <div className="text-[10.5px] font-bold text-slate-500 mb-1.5 leading-none">
                  Frame Shape
                </div>
                <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl h-10">
                  <button
                    type="button"
                    onClick={() => setLogoAdjust((p) => ({ ...p, shape: 'circle' }))}
                    className={`h-full rounded-lg text-[11px] font-bold inline-flex items-center justify-center gap-1 cursor-pointer ${
                      logoAdjust.shape === 'circle'
                        ? 'bg-white text-blue-700 shadow-2xs'
                        : 'text-slate-600'
                    }`}
                  >
                    <Circle className="w-3 h-3 shrink-0" />
                    <span className="truncate">Circle</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogoAdjust((p) => ({ ...p, shape: 'rounded' }))}
                    className={`h-full rounded-lg text-[11px] font-bold inline-flex items-center justify-center gap-1 cursor-pointer ${
                      logoAdjust.shape === 'rounded'
                        ? 'bg-white text-blue-700 shadow-2xs'
                        : 'text-slate-600'
                    }`}
                  >
                    <Square className="w-3 h-3 shrink-0" />
                    <span className="truncate">Rounded</span>
                  </button>
                </div>
              </div>

              <div className="min-w-0">
                <div className="text-[10.5px] font-bold text-slate-500 mb-1.5 leading-none">
                  Backdrop
                </div>
                <div className="flex items-center justify-center gap-2.5 h-10 px-2 bg-slate-100 rounded-xl">
                  {(
                    [
                      { id: 'white', label: 'White', swatch: 'bg-white' },
                      { id: 'ivory', label: 'Ivory', swatch: 'bg-[#FFFDF7]' },
                      { id: 'blue', label: 'Soft Blue', swatch: 'bg-blue-50' },
                    ] as const
                  ).map((bg) => (
                    <button
                      key={bg.id}
                      type="button"
                      title={bg.label}
                      aria-label={bg.label}
                      onClick={() => setLogoAdjust((p) => ({ ...p, bgTone: bg.id }))}
                      className={`w-6 h-6 rounded-full border transition-transform cursor-pointer shrink-0 ${
                        bg.swatch
                      } ${
                        logoAdjust.bgTone === bg.id
                          ? 'border-blue-600 ring-2 ring-blue-500/30 scale-110'
                          : 'border-slate-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-stretch gap-2 pt-1">
              <button
                type="button"
                onClick={() => setLogoAdjust(DEFAULT_LOGO_ADJUST)}
                className="h-10 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Center</span>
              </button>
              <button
                type="button"
                disabled={applyingLogo}
                onClick={handleApplyAdjustedLogo}
                className="flex-1 min-w-0 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60 text-white text-xs font-extrabold inline-flex items-center justify-center gap-1.5 shadow-xs shadow-blue-600/20 cursor-pointer whitespace-nowrap"
              >
                <Check className="w-4 h-4 shrink-0" />
                <span>{applyingLogo ? 'Applying...' : 'Apply Logo'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </MandalSubPageShell>
  );
}