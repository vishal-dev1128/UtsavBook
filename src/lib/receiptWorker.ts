import {
  drawMinimalReceiptScene,
  measureMinimalReceiptLayout,
  MinimalReceiptDrawPayload,
} from './receiptRenderer';

export interface ReceiptWorkerRequest {
  jobId: number;
  format: 'png' | 'jpeg';
  payload: MinimalReceiptDrawPayload;
  logoBitmap: ImageBitmap | null;
  sigBitmap: ImageBitmap | null;
}

export interface ReceiptWorkerResponse {
  jobId: number;
  ok: boolean;
  blob?: Blob;
  error?: string;
}

const workerScope = self as unknown as {
  onmessage: ((ev: MessageEvent<ReceiptWorkerRequest>) => void) | null;
  postMessage: (msg: ReceiptWorkerResponse) => void;
};

workerScope.onmessage = async (ev: MessageEvent<ReceiptWorkerRequest>) => {
  const { jobId, format, payload, logoBitmap, sigBitmap } = ev.data;
  try {
    if (typeof OffscreenCanvas === 'undefined') {
      throw new Error('OffscreenCanvas unsupported in worker');
    }

    const measureCanvas = new OffscreenCanvas(1, 1);
    const mctx = measureCanvas.getContext('2d');
    if (!mctx) {
      throw new Error('OffscreenCanvas 2D context unavailable');
    }

    const dims = measureMinimalReceiptLayout(mctx, payload);
    const canvas = new OffscreenCanvas(dims.width * dims.scale, dims.height * dims.scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('OffscreenCanvas 2D context unavailable');
    }

    drawMinimalReceiptScene(ctx, dims, payload, logoBitmap, sigBitmap);

    const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
    const blob = await canvas.convertToBlob({
      type: mimeType,
      quality: format === 'jpeg' ? 0.93 : undefined,
    });

    workerScope.postMessage({ jobId, ok: true, blob });
  } catch (err) {
    workerScope.postMessage({
      jobId,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  } finally {
    try {
      logoBitmap?.close();
    } catch {
      // Ignore already-closed bitmap
    }
    try {
      sigBitmap?.close();
    } catch {
      // Ignore already-closed bitmap
    }
  }
};
