import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Language, LedgerEntry, Mandal, resolveMandalLogoUrl } from '../types';
import { storage } from './firebase';
import {
  buildWhatsAppReceiptMessage,
  buildWhatsAppUrl,
  formatINR,
  formatReceiptDate,
  numberToIndianWords,
  openWhatsAppShareUrl,
} from './i18n';
import {
  drawMinimalReceiptScene,
  measureMinimalReceiptLayout,
  MinimalReceiptDrawPayload,
} from './receiptRenderer';
import type { ReceiptWorkerRequest, ReceiptWorkerResponse } from './receiptWorker';

export interface ReceiptJpegUploadResult {
  dataUrl: string;
  receiptImageUrl?: string;
  storagePath?: string;
  uploadedToStorage: boolean;
  errorMessage?: string;
}

export type ReceiptPngUploadResult = ReceiptJpegUploadResult;

export interface RenderedReceiptResult {
  blob: Blob;
  dataUrl: string;
}

const imageCache = new Map<string, HTMLImageElement | null>();
const renderedReceiptCache = new Map<string, Promise<RenderedReceiptResult>>();
const MAX_RENDER_CACHE_ITEMS = 24;

let receiptWorker: Worker | null = null;
let workerDisabled = false;
let workerJobSeq = 0;
const pendingWorkerJobs = new Map<
  number,
  { resolve: (blob: Blob) => void; reject: (err: Error) => void }
>();

function getReceiptWorker(): Worker | null {
  if (
    workerDisabled ||
    typeof Worker === 'undefined' ||
    typeof OffscreenCanvas === 'undefined' ||
    typeof createImageBitmap === 'undefined'
  ) {
    return null;
  }
  if (receiptWorker) return receiptWorker;

  try {
    const worker = new Worker(new URL('./receiptWorker.ts', import.meta.url), {
      type: 'module',
    });
    worker.onmessage = (ev: MessageEvent<ReceiptWorkerResponse>) => {
      const { jobId, ok, blob, error } = ev.data;
      const pending = pendingWorkerJobs.get(jobId);
      if (!pending) return;
      pendingWorkerJobs.delete(jobId);
      if (ok && blob) {
        pending.resolve(blob);
      } else {
        pending.reject(new Error(error || 'Offscreen worker failed'));
      }
    };
    worker.onerror = () => {
      workerDisabled = true;
      for (const [, pending] of pendingWorkerJobs) {
        pending.reject(new Error('Receipt worker crashed'));
      }
      pendingWorkerJobs.clear();
      try {
        worker.terminate();
      } catch {
        // Ignore termination failure
      }
      receiptWorker = null;
    };
    receiptWorker = worker;
    return receiptWorker;
  } catch {
    workerDisabled = true;
    return null;
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label = 'Operation timed out'): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(label)), timeoutMs);
    promise
      .then((res) => {
        window.clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        window.clearTimeout(timer);
        reject(err);
      });
  });
}

async function loadImageFast(src?: string, timeoutMs = 1200): Promise<HTMLImageElement | null> {
  if (!src || typeof Image === 'undefined') return null;
  if (imageCache.has(src)) {
    return imageCache.get(src) ?? null;
  }

  const attempt = new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    if (!src.startsWith('data:') && !src.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }
    let settled = false;
    const finish = (result: HTMLImageElement | null) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    const timer = window.setTimeout(() => finish(null), timeoutMs);
    img.onload = () => {
      window.clearTimeout(timer);
      finish(img);
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      finish(null);
    };
    img.src = src;
  });

  const loaded = await attempt;
  if (loaded) {
    imageCache.set(src, loaded);
  }
  return loaded;
}

/**
 * Pre-warms the OffscreenCanvas worker and decodes the Mandal logo & signature
 * in the background so receipt generation feels instantaneous on Save.
 */
export function prewarmReceiptAssets(mandal: Mandal | null | undefined): void {
  if (!mandal || typeof window === 'undefined') return;
  const logoSrc = resolveMandalLogoUrl(mandal.logoUrl);
  void loadImageFast(logoSrc, 2000);
  if (mandal.signatureUrl) {
    void loadImageFast(mandal.signatureUrl, 2000);
  }
  getReceiptWorker();
}

function blobToDataUrlAsync(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    if (typeof FileReader === 'undefined') {
      reject(new Error('FileReader unavailable'));
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to encode blob to data URL'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('FileReader error'));
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl: string, mimeType: string): Blob {
  const [, base64Part = ''] = dataUrl.split(',');
  const binary = window.atob(base64Part);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

export function dataUrlToJpegBlob(dataUrl: string): Blob {
  return dataUrlToBlob(dataUrl, 'image/jpeg');
}

export function dataUrlToPngBlob(dataUrl: string): Blob {
  return dataUrlToBlob(dataUrl, 'image/png');
}

function buildMinimalPayload(params: {
  mandal: Mandal;
  utsavName: string;
  entry: LedgerEntry;
  isTemplate: boolean;
  signatoryName?: string;
}): MinimalReceiptDrawPayload {
  const { mandal, utsavName, entry, isTemplate } = params;
  const isGoods = !isTemplate && entry.type === 'goods';
  const receiptNo = isTemplate
    ? `#${mandal.receiptPrefix || 'MB-1'}-____`
    : `#${entry.receiptNumber || `${mandal.receiptPrefix || 'MB-1'}-0001`}`;
  const subText =
    [mandal.address, mandal.estYear ? `Est. ${mandal.estYear}` : ''].filter(Boolean).join(' · ') ||
    utsavName;
  const estPart =
    entry.estimatedValue && entry.estimatedValue > 0 ? `Est. ${formatINR(entry.estimatedValue)} · ` : '';

  return {
    mandalName: mandal.name || 'Mandal',
    localName: mandal.localName,
    subText,
    utsavName,
    receiptNo,
    isTemplate,
    isGoods,
    isVoided: Boolean(!isTemplate && entry.isVoided),
    amountFormatted: `₹${new Intl.NumberFormat('en-IN').format(entry.amount)}`,
    statusLabel: `Paid via ${entry.paymentMode} · ${formatReceiptDate(entry.entryDate)}`,
    utrLine: !isTemplate && !isGoods && entry.upiTransactionId ? `UTR / Ref: ${entry.upiTransactionId}` : undefined,
    wordsText: !isTemplate && !isGoods ? `In words: ${numberToIndianWords(entry.amount)}` : undefined,
    goodsLabel: isGoods
      ? `${entry.goodsDescription || 'Vastu Daan'}${entry.quantity ? ` (${entry.quantity})` : ''}`
      : undefined,
    goodsSubLabel: isGoods ? `${estPart}${formatReceiptDate(entry.entryDate)}` : undefined,
    donorName: isTemplate ? '' : entry.titleOrDonorName || 'Donor',
    flatOrAddress: isTemplate ? '' : entry.flatOrAddress || '—',
    category: isTemplate ? '' : entry.head || 'Vargani / Chanda',
    createdByName: entry.createdByName || 'Treasurer',
    signatoryName:
      params.signatoryName || (isTemplate ? 'Authorized Signatory' : entry.createdByName || 'Authorized Signatory'),
  };
}

async function toTransferableBitmap(img: HTMLImageElement | null): Promise<ImageBitmap | null> {
  if (!img || typeof createImageBitmap !== 'undefined' === false) return null;
  try {
    return await createImageBitmap(img);
  } catch {
    return null;
  }
}

async function renderViaOffscreenWorker(
  payload: MinimalReceiptDrawPayload,
  format: 'jpeg' | 'png',
  logoImg: HTMLImageElement | null,
  sigImg: HTMLImageElement | null
): Promise<Blob> {
  const worker = getReceiptWorker();
  if (!worker) {
    throw new Error('Offscreen worker unavailable');
  }

  const [logoBitmap, sigBitmap] = await Promise.all([
    toTransferableBitmap(logoImg),
    toTransferableBitmap(sigImg),
  ]);

  const transferables: Transferable[] = [];
  if (logoBitmap) transferables.push(logoBitmap);
  if (sigBitmap) transferables.push(sigBitmap);

  const jobId = ++workerJobSeq;
  return new Promise<Blob>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      pendingWorkerJobs.delete(jobId);
      reject(new Error('Offscreen worker timed out'));
    }, 3500);

    pendingWorkerJobs.set(jobId, {
      resolve: (blob) => {
        window.clearTimeout(timer);
        resolve(blob);
      },
      reject: (err) => {
        window.clearTimeout(timer);
        reject(err);
      },
    });

    const msg: ReceiptWorkerRequest = {
      jobId,
      format,
      payload,
      logoBitmap,
      sigBitmap,
    };
    worker.postMessage(msg, transferables);
  });
}

async function renderOnMainCanvasFallback(
  payload: MinimalReceiptDrawPayload,
  format: 'jpeg' | 'png',
  logoImg: HTMLImageElement | null,
  sigImg: HTMLImageElement | null
): Promise<RenderedReceiptResult> {
  const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
  const quality = format === 'jpeg' ? 0.93 : undefined;

  if (typeof OffscreenCanvas !== 'undefined') {
    const measureCanvas = new OffscreenCanvas(1, 1);
    const mctx = measureCanvas.getContext('2d');
    if (mctx) {
      const dims = measureMinimalReceiptLayout(mctx, payload);
      const canvas = new OffscreenCanvas(dims.width * dims.scale, dims.height * dims.scale);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        drawMinimalReceiptScene(ctx, dims, payload, logoImg, sigImg);
        const blob = await canvas.convertToBlob({ type: mimeType, quality });
        const dataUrl = await blobToDataUrlAsync(blob);
        return { blob, dataUrl };
      }
    }
  }

  const measureCanvas = document.createElement('canvas');
  const mctx = measureCanvas.getContext('2d');
  if (!mctx) {
    throw new Error('Canvas 2D context unavailable.');
  }
  const dims = measureMinimalReceiptLayout(mctx, payload);

  const canvas = document.createElement('canvas');
  canvas.width = dims.width * dims.scale;
  canvas.height = dims.height * dims.scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable.');
  }

  drawMinimalReceiptScene(ctx, dims, payload, logoImg, sigImg);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) {
          resolve(b);
        } else {
          try {
            const fallbackUrl = canvas.toDataURL(mimeType, quality);
            resolve(dataUrlToBlob(fallbackUrl, mimeType));
          } catch (err) {
            reject(err instanceof Error ? err : new Error('Canvas export failed'));
          }
        }
      },
      mimeType,
      quality
    );
  });

  const dataUrl = await blobToDataUrlAsync(blob);
  return { blob, dataUrl };
}

function buildRenderCacheKey(params: {
  mandal: Mandal;
  utsavName: string;
  entry: LedgerEntry;
  format: 'jpeg' | 'png';
  isTemplate: boolean;
  signatoryName?: string;
}): string {
  return [
    params.mandal.id,
    params.mandal.name,
    params.mandal.logoUrl || '',
    params.mandal.signatureUrl || '',
    params.entry.id,
    params.entry.receiptNumber || '',
    params.entry.amount,
    params.entry.titleOrDonorName,
    params.entry.flatOrAddress || '',
    params.entry.paymentMode,
    params.entry.isVoided ? '1' : '0',
    params.utsavName,
    params.format,
    params.isTemplate ? 'T' : 'R',
    params.signatoryName || '',
  ].join('|');
}

/**
 * OffscreenCanvas Web Worker Minimal Receipt renderer (non-blocking UI).
 * Deduplicates concurrent/repeat renders via an in-memory LRU cache.
 */
export async function renderMinimalReceiptToImage(params: {
  mandal: Mandal;
  utsavName: string;
  entry: LedgerEntry;
  format: 'jpeg' | 'png';
  isTemplate?: boolean;
  signatoryName?: string;
}): Promise<RenderedReceiptResult> {
  if (typeof document === 'undefined') {
    throw new Error('Receipt rendering requires a browser environment.');
  }

  const isTemplate = Boolean(params.isTemplate);
  const cacheKey = buildRenderCacheKey({ ...params, isTemplate });
  const existing = renderedReceiptCache.get(cacheKey);
  if (existing) {
    return existing;
  }

  const task = (async (): Promise<RenderedReceiptResult> => {
    const logoSrc = resolveMandalLogoUrl(params.mandal.logoUrl);
    const [logoImg, sigImg] = await Promise.all([
      loadImageFast(logoSrc),
      params.mandal.signatureUrl ? loadImageFast(params.mandal.signatureUrl) : Promise.resolve(null),
    ]);

    const payload = buildMinimalPayload({
      mandal: params.mandal,
      utsavName: params.utsavName,
      entry: params.entry,
      isTemplate,
      signatoryName: params.signatoryName,
    });

    try {
      const blob = await renderViaOffscreenWorker(payload, params.format, logoImg, sigImg);
      const dataUrl = await blobToDataUrlAsync(blob);
      return { blob, dataUrl };
    } catch {
      return renderOnMainCanvasFallback(payload, params.format, logoImg, sigImg);
    }
  })();

  if (renderedReceiptCache.size >= MAX_RENDER_CACHE_ITEMS) {
    const oldestKey = renderedReceiptCache.keys().next().value;
    if (oldestKey) renderedReceiptCache.delete(oldestKey);
  }
  renderedReceiptCache.set(cacheKey, task);

  try {
    return await task;
  } catch (err) {
    renderedReceiptCache.delete(cacheKey);
    throw err;
  }
}

/**
 * Generates a Minimal Receipt PNG via OffscreenCanvas Worker, uploads it to
 * Firebase Storage at `receipts/${receiptNo}.png` with a strict timeout,
 * and returns its public download URL.
 */
export async function generateAndUploadReceiptPng(params: {
  mandal: Mandal;
  utsavName: string;
  entry: LedgerEntry;
  receiptNoOverride?: string;
  uploadTimeoutMs?: number;
}): Promise<ReceiptPngUploadResult> {
  const { blob, dataUrl } = await renderMinimalReceiptToImage({
    mandal: params.mandal,
    utsavName: params.utsavName,
    entry: params.entry,
    format: 'png',
  });

  const rawReceiptNo =
    params.receiptNoOverride ||
    params.entry.receiptNumber ||
    `MB-1-${Math.floor(1000 + Math.random() * 9000)}`;
  const safeReceiptNo = rawReceiptNo.replace(/[^a-zA-Z0-9_-]/g, '_');
  const storagePath = `receipts/${safeReceiptNo}.png`;

  try {
    const storageRef = ref(storage, storagePath);
    const timeoutMs = params.uploadTimeoutMs ?? 4000;
    const receiptImageUrl = await withTimeout(
      (async () => {
        await uploadBytes(storageRef, blob, {
          contentType: 'image/png',
          cacheControl: 'public, max-age=31536000',
          customMetadata: {
            mandalId: params.mandal.id,
            utsavId: params.entry.utsavId,
            receiptNumber: rawReceiptNo,
            publicReceiptId: params.entry.publicReceiptId || '',
          },
        });
        return getDownloadURL(storageRef);
      })(),
      timeoutMs,
      'Receipt upload timed out'
    );
    return {
      dataUrl,
      receiptImageUrl,
      storagePath,
      uploadedToStorage: true,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`Firebase Storage PNG upload skipped/failed for ${storagePath}:`, message);
    return {
      dataUrl,
      receiptImageUrl: undefined,
      storagePath,
      uploadedToStorage: false,
      errorMessage: message,
    };
  }
}

/**
 * Generates a Minimal Receipt JPEG via OffscreenCanvas Worker, uploads it to
 * Firebase Storage with a strict timeout, and returns its public download URL.
 */
export async function generateAndUploadReceiptJpeg(params: {
  mandal: Mandal;
  utsavName: string;
  entry: LedgerEntry;
  uploadTimeoutMs?: number;
}): Promise<ReceiptJpegUploadResult> {
  const { blob, dataUrl } = await renderMinimalReceiptToImage({
    mandal: params.mandal,
    utsavName: params.utsavName,
    entry: params.entry,
    format: 'jpeg',
  });

  const safeMandalId = params.mandal.id.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeUtsavId = (params.entry.utsavId || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeEntryId = params.entry.id.replace(/[^a-zA-Z0-9_-]/g, '_');
  const storagePath = `receipts/${safeMandalId}/${safeUtsavId}/${safeEntryId}.jpg`;

  try {
    const storageRef = ref(storage, storagePath);
    const timeoutMs = params.uploadTimeoutMs ?? 4000;
    const receiptImageUrl = await withTimeout(
      (async () => {
        await uploadBytes(storageRef, blob, {
          contentType: 'image/jpeg',
          cacheControl: 'public, max-age=31536000',
          customMetadata: {
            mandalId: params.mandal.id,
            utsavId: params.entry.utsavId,
            receiptNumber: params.entry.receiptNumber || '',
            publicReceiptId: params.entry.publicReceiptId || '',
          },
        });
        return getDownloadURL(storageRef);
      })(),
      timeoutMs,
      'Receipt upload timed out'
    );
    return {
      dataUrl,
      receiptImageUrl,
      storagePath,
      uploadedToStorage: true,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`Firebase Storage upload skipped/failed for ${storagePath}:`, message);
    return {
      dataUrl,
      receiptImageUrl: undefined,
      storagePath,
      uploadedToStorage: false,
      errorMessage: message,
    };
  }
}

export function buildAutomatedWhatsAppDispatchPayload(params: {
  mandal: Mandal;
  utsavName: string;
  entry: LedgerEntry;
  receiptImageUrl?: string;
  phoneOverride?: string;
  language?: 'en' | 'mr' | 'hi';
}) {
  const publicId = params.entry.publicReceiptId || params.entry.id;
  const verifyUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/verify/${publicId}`
      : `/verify/${publicId}`;
  const publicLedgerUrl =
    typeof window !== 'undefined' && params.mandal.joinCode
      ? `${window.location.origin}/m/${params.mandal.joinCode}`
      : undefined;
  const receiptNumber =
    params.entry.receiptNumber || `${params.mandal.receiptPrefix}-0001`;
  const effectiveImageUrl = params.receiptImageUrl ?? params.entry.receiptImageUrl;

  const whatsappMessage = buildWhatsAppReceiptMessage({
    donorName: params.entry.titleOrDonorName,
    mandalName: params.mandal.name,
    utsavName: params.utsavName,
    amount: params.entry.amount,
    receiptNumber,
    verifyUrl,
    receiptImageUrl: effectiveImageUrl,
    flatOrAddress: params.entry.flatOrAddress,
    language: params.language,
    paymentMode: params.entry.paymentMode,
    upiTransactionId: params.entry.upiTransactionId,
    type: params.entry.type,
    goodsDescription: params.entry.goodsDescription,
    quantity: params.entry.quantity,
    estimatedValue: params.entry.estimatedValue,
    publicLedgerUrl,
  });

  const whatsappUrl = buildWhatsAppUrl(
    params.phoneOverride ?? params.entry.donorPhone,
    whatsappMessage
  );

  return {
    verifyUrl,
    receiptNumber,
    receiptImageUrl: effectiveImageUrl,
    whatsappMessage,
    whatsappUrl,
  };
}

export interface WhatsAppImageShareResult {
  status: 'shared_with_image' | 'downloaded_and_opened_wa' | 'needs_tap' | 'cancelled';
  dataUrl: string;
  whatsappUrl: string;
  attachedCaption: string;
}

/**
 * Generates the Minimal Receipt PNG image off-thread and attaches it directly
 * with the warm Thank You caption using the native share sheet (`navigator.share({ files })`),
 * falling back cleanly on desktop browsers without file-share support.
 */
export async function shareReceiptWithImageOnWhatsApp(params: {
  mandal: Mandal;
  utsavName: string;
  entry: LedgerEntry;
  language?: Language;
  phoneOverride?: string;
  receiptImageUrlOverride?: string;
  allowFallbackUrlOnGestureError?: boolean;
}): Promise<WhatsAppImageShareResult> {
  const { blob, dataUrl } = await renderMinimalReceiptToImage({
    mandal: params.mandal,
    utsavName: params.utsavName,
    entry: params.entry,
    format: 'png',
    signatoryName: params.entry.createdByName || 'Authorized Signatory',
  });

  const publicId = params.entry.publicReceiptId || params.entry.id;
  const verifyUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/verify/${publicId}`
      : `/verify/${publicId}`;
  const publicLedgerUrl =
    typeof window !== 'undefined' && params.mandal.joinCode
      ? `${window.location.origin}/m/${params.mandal.joinCode}`
      : undefined;
  const receiptNumber =
    params.entry.receiptNumber || `${params.mandal.receiptPrefix || 'MB-1'}-0001`;
  const effectiveImageUrl = params.receiptImageUrlOverride ?? params.entry.receiptImageUrl;

  const sharedMsgParams = {
    donorName: params.entry.titleOrDonorName,
    mandalName: params.mandal.name,
    utsavName: params.utsavName,
    amount: params.entry.amount,
    receiptNumber,
    verifyUrl,
    receiptImageUrl: effectiveImageUrl,
    flatOrAddress: params.entry.flatOrAddress,
    language: params.language,
    paymentMode: params.entry.paymentMode,
    upiTransactionId: params.entry.upiTransactionId,
    type: params.entry.type,
    goodsDescription: params.entry.goodsDescription,
    quantity: params.entry.quantity,
    estimatedValue: params.entry.estimatedValue,
    publicLedgerUrl,
  };

  const attachedCaption = buildWhatsAppReceiptMessage({
    ...sharedMsgParams,
    forAttachedImage: true,
  });
  const fallbackMessage = buildWhatsAppReceiptMessage({
    ...sharedMsgParams,
    forAttachedImage: false,
  });
  const whatsappUrl = buildWhatsAppUrl(
    params.phoneOverride ?? params.entry.donorPhone,
    fallbackMessage
  );

  const safeSlug =
    params.entry.titleOrDonorName.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'receipt';
  const filename = `${receiptNumber}-${safeSlug}.png`;
  const pngFile = new File([blob], filename, { type: 'image/png' });

  const supportsFileShare =
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [pngFile] });

  if (supportsFileShare) {
    try {
      await navigator.share({
        title: `${params.mandal.name} · Receipt #${receiptNumber}`,
        text: attachedCaption,
        files: [pngFile],
      });
      return {
        status: 'shared_with_image',
        dataUrl,
        whatsappUrl,
        attachedCaption,
      };
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return {
          status: 'cancelled',
          dataUrl,
          whatsappUrl,
          attachedCaption,
        };
      }
      if (
        params.allowFallbackUrlOnGestureError === false ||
        (err instanceof Error && err.name === 'NotAllowedError')
      ) {
        return {
          status: 'needs_tap',
          dataUrl,
          whatsappUrl,
          attachedCaption,
        };
      }
    }
  }

  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();

  await copyReceiptPngToClipboard(blob, attachedCaption);
  openWhatsAppShareUrl(whatsappUrl);

  return {
    status: 'downloaded_and_opened_wa',
    dataUrl,
    whatsappUrl,
    attachedCaption,
  };
}

async function copyReceiptPngToClipboard(blob: Blob, fallbackText: string): Promise<boolean> {
  if (typeof navigator === 'undefined') return false;
  try {
    if (
      typeof ClipboardItem !== 'undefined' &&
      typeof navigator.clipboard?.write === 'function'
    ) {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      return true;
    }
  } catch {
    // Some browsers disallow binary image clipboard writes; fall back to copying text
  }
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(fallbackText);
    }
  } catch {
    // Ignore clipboard permission errors
  }
  return false;
}
