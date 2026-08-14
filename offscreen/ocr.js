// offscreen/ocr.js
// Extension-side bridge: the PaddleOCR runtime runs in the sandboxed iframe
// because OpenCV.js uses new Function(), which MV3 extension pages reject.

'use strict';

const SANDBOX_FRAME_ID = 'paddleocr-sandbox';
const MODEL_DIR = 'lib/paddleocr/models';
const WASM_DIR = 'lib/paddleocr/wasm';
const DET_MODEL = 'PP-OCRv6_tiny_det.tar';
const REC_MODEL = 'PP-OCRv6_tiny_rec.tar';

let sandboxFrame = null;
let sandboxReady = null;
let sandboxIsReady = false;
let nextRequestId = 0;
const pendingRequests = new Map();

function rejectPendingRequests(message) {
  for (const { reject, timeoutId } of pendingRequests.values()) {
    clearTimeout(timeoutId);
    reject(new Error(message));
  }
  pendingRequests.clear();
}

function postSandboxPing() {
  sandboxFrame?.contentWindow?.postMessage({
    target: 'offscreen-ocr-sandbox',
    type: 'ping'
  }, '*');
}

function ensureSandbox() {
  if (sandboxReady) return sandboxReady;

  sandboxFrame = document.getElementById(SANDBOX_FRAME_ID);
  if (!sandboxFrame) {
    return Promise.reject(new Error('Không tìm thấy PaddleOCR sandbox iframe'));
  }

  sandboxReady = new Promise((resolve, reject) => {
    sandboxFrame.addEventListener('load', postSandboxPing, { once: true });
    sandboxFrame.addEventListener('error', () => {
      rejectPendingRequests('Không thể nạp PaddleOCR sandbox');
      reject(new Error('Không thể nạp PaddleOCR sandbox'));
    }, { once: true });
    postSandboxPing();

    // A broken sandbox must be retryable on the next OCR request.
    setTimeout(() => {
      if (sandboxIsReady) return;
      reject(new Error('PaddleOCR sandbox khởi động quá thời gian'));
      sandboxReady = null;
    }, 15000);

    window.addEventListener('message', (event) => {
      if (event.source !== sandboxFrame.contentWindow) return;
      const message = event.data || {};
      if (message.target !== 'offscreen-ocr-sandbox') return;

      if (message.type === 'ready') {
        sandboxIsReady = true;
        resolve();
        return;
      }

      if (message.type !== 'result' || !pendingRequests.has(message.id)) return;
      const pending = pendingRequests.get(message.id);
      pendingRequests.delete(message.id);
      clearTimeout(pending.timeoutId);
      if (message.success) pending.resolve(message);
      else pending.reject(new Error(message.error || 'PaddleOCR inference thất bại'));
    });
  }).catch((error) => {
    sandboxIsReady = false;
    sandboxReady = null;
    rejectPendingRequests(error.message);
    throw error;
  });

  return sandboxReady;
}

async function recognizeInSandbox(request) {
  await ensureSandbox();
  const id = `ocr-${Date.now()}-${nextRequestId++}`;
  const message = {
    target: 'offscreen-ocr-sandbox',
    type: 'recognize',
    id,
    dataUrl: request.dataUrl,
    rect: request.rect,
    dpr: request.dpr || 1,
    includePreview: request.includePreview !== false,
    batch: request.batch === true,
    images: request.images,
    modelUrls: {
      det: `${chrome.runtime.getURL(MODEL_DIR)}/${DET_MODEL}`,
      rec: `${chrome.runtime.getURL(MODEL_DIR)}/${REC_MODEL}`,
      wasm: `${chrome.runtime.getURL(WASM_DIR)}/`
    }
  };

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      pendingRequests.delete(id);
      reject(new Error('PaddleOCR inference quá thời gian'));
    }, 120000);
    pendingRequests.set(id, { resolve, reject, timeoutId });
    sandboxFrame.contentWindow.postMessage(message, '*');
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.target !== 'offscreen-ocr' || !['do_ocr', 'do_ocr_batch'].includes(request.action)) return false;

  (async () => {
    try {
      console.log('[OCR-Offscreen] Gửi yêu cầu PaddleOCR sandbox, rect:', request.rect, 'dpr:', request.dpr);
      const result = await recognizeInSandbox(request);
      console.log('[OCR-Offscreen] OCR xong:', (result.ocrText || '').substring(0, 80));
      sendResponse({
        success: true,
        ocrText: result.ocrText || '',
        items: Array.isArray(result.items) ? result.items : [],
        previewDataUrl: request.includePreview === false ? '' : (result.previewDataUrl || ''),
        cropScale: result.cropScale || 3,
        results: Array.isArray(result.results) ? result.results : undefined
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('[OCR-Offscreen] Lỗi:', msg, error);
      sendResponse({ success: false, error: msg });
    }
  })();

  return true;
});

console.log('[OCR-Offscreen] Offscreen document sẵn sàng, PaddleOCR sandbox đang chờ.');
