// PaddleOCR runtime for the MV3 sandbox page.
// This file intentionally has no chrome.* API access; communication is via postMessage.

'use strict';

let paddleOcr = null;
let paddleOcrPromise = null;
let paddleSdkPromise = null;

function resetPaddleOcr() {
  const instance = paddleOcr;
  paddleOcr = null;
  paddleOcrPromise = null;
  paddleSdkPromise = null;
  if (instance && typeof instance.dispose === 'function') {
    Promise.resolve(instance.dispose()).catch(() => {});
  }
}

async function getPaddleOcr(modelUrls) {
  if (paddleOcr) return paddleOcr;
  if (paddleOcrPromise) return paddleOcrPromise;

  if (!paddleSdkPromise) paddleSdkPromise = import('./paddleocr.bundle.js');
  const paddleSdk = await paddleSdkPromise;
  if (!paddleSdk.PaddleOCR || typeof paddleSdk.PaddleOCR.create !== 'function') {
    throw new Error('PaddleOCR bundle không export đúng SDK');
  }

  paddleOcrPromise = paddleSdk.PaddleOCR.create({
    textDetectionModelName: 'PP-OCRv6_tiny_det',
    textDetectionModelAsset: { url: modelUrls.det },
    textRecognitionModelName: 'PP-OCRv6_tiny_rec',
    textRecognitionModelAsset: { url: modelUrls.rec },
    // Giữ request batch ở phía extension, nhưng inference từng ảnh để tránh
    // dồn nhiều tensor lớn vào bộ nhớ WASM của trình duyệt.
    pipelineBatchSize: 1,
    textDetectionBatchSize: 1,
    textRecognitionBatchSize: 1,
    ortOptions: {
      backend: 'wasm',
      wasmPaths: modelUrls.wasm,
      numThreads: 1,
      simd: true,
      proxy: false
    }
  });

  try {
    paddleOcr = await paddleOcrPromise;
    console.log('[OCR-Sandbox] PaddleOCR PP-OCRv6-tiny sẵn sàng.');
    return paddleOcr;
  } catch (error) {
    paddleOcrPromise = null;
    throw error;
  }
}

function cropImage(dataUrl, rect, dpr, scale = 3) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(rect.width * dpr * scale));
      canvas.height = Math.max(1, Math.round(rect.height * dpr * scale));
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(
        img,
        Math.round(rect.left * dpr), Math.round(rect.top * dpr),
        Math.round(rect.width * dpr), Math.round(rect.height * dpr),
        0, 0, canvas.width, canvas.height
      );
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Không load được ảnh chụp màn hình'));
    img.src = dataUrl;
  });
}

function normalizeOcrItems(result) {
  const items = (result?.items || [])
    .map((item) => ({
      text: item?.text || '',
      score: Number(item?.score || 0),
      poly: Array.isArray(item?.poly) ? item.poly : []
    }))
    .filter((item) => item.text && item.poly.length >= 4);
  return {
    items,
    ocrText: items
      .map((item) => item.text)
      .join(' ')
      .replace(/[\r\n]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  };
}

async function recognize(request) {
  const dpr = request.dpr || 1;
  const croppedUrl = await cropImage(request.dataUrl, request.rect, dpr, 3);
  const ocr = await getPaddleOcr(request.modelUrls);
  const response = await fetch(croppedUrl);
  if (!response.ok) throw new Error(`Không đọc được ảnh đã crop (${response.status})`);
  const [result] = await ocr.predict(await response.blob());
  const { items, ocrText } = normalizeOcrItems(result);
  const previewDataUrl = request.includePreview === false
    ? ''
    : await cropImage(request.dataUrl, request.rect, dpr, 1);
  return { ocrText, items, previewDataUrl, cropScale: 3 };
}

async function recognizeBatch(request) {
  const images = Array.isArray(request.images) ? request.images : [];
  const dpr = request.dpr || 1;
  const croppedUrls = await Promise.all(images.map(image => cropImage(image.dataUrl, image.rect, image.dpr || dpr, 3)));
  const ocr = await getPaddleOcr(request.modelUrls);
  const responses = await Promise.all(croppedUrls.map(url => fetch(url)));
  if (responses.some(response => !response.ok)) throw new Error('Không đọc được một ảnh trong nhóm OCR.');
  const results = await ocr.predict(await Promise.all(responses.map(response => response.blob())));

  return Promise.all(images.map(async (image, index) => {
    const { items, ocrText } = normalizeOcrItems(results[index]);
    const previewDataUrl = image.includePreview === false
      ? ''
      : await cropImage(image.dataUrl, image.rect, image.dpr || dpr, 1);
    return { ocrText, items, previewDataUrl, cropScale: 3 };
  }));
}

async function recognizeBatchSafe(request) {
  const images = Array.isArray(request.images) ? request.images : [];
  const dpr = request.dpr || 1;
  const results = [];

  // The extension may send ten images in one request, but WASM inference is
  // intentionally serialized so the browser does not retain ten large input
  // tensors at once.
  for (const image of images) {
    const imageDpr = image.dpr || dpr;
    let cropScale = 3;
    let result = null;
    let lastError = null;

    for (let attempt = 0; attempt < 2 && !result; attempt += 1) {
      try {
        const croppedUrl = await cropImage(image.dataUrl, image.rect, imageDpr, cropScale);
        const ocr = await getPaddleOcr(request.modelUrls);
        const response = await fetch(croppedUrl);
        if (!response.ok) throw new Error(`OCR crop failed (${response.status})`);
        const [prediction] = await ocr.predict(await response.blob());
        const normalized = normalizeOcrItems(prediction);
        const previewDataUrl = image.includePreview === false
          ? ''
          : await cropImage(image.dataUrl, image.rect, imageDpr, 1);
        result = { ...normalized, previewDataUrl, cropScale };
      } catch (error) {
        lastError = error;
        const errorText = error instanceof Error ? error.message : String(error);
        if (attempt === 0 && /bad_alloc|OrtRun|out of memory|memory/i.test(errorText)) {
          resetPaddleOcr();
          cropScale = 2;
          continue;
        }
      }
    }

    if (result) results.push(result);
    else {
      const errorText = lastError instanceof Error ? lastError.message : String(lastError || 'OCR failed');
      console.warn('[OCR-Sandbox] Skipping image after inference error:', errorText);
      results.push({ ocrText: '', items: [], previewDataUrl: '', cropScale, error: errorText });
    }
  }
  return results;
}

function reply(source, id, payload) {
  source.postMessage({
    target: 'offscreen-ocr-sandbox',
    type: 'result',
    id,
    ...payload
  }, '*');
}

window.addEventListener('message', (event) => {
  const message = event.data || {};
  if (message.target !== 'offscreen-ocr-sandbox') return;
  if (message.type === 'ping') {
    event.source?.postMessage({ target: 'offscreen-ocr-sandbox', type: 'ready' }, '*');
    return;
  }
  if (message.type !== 'recognize' || !message.id) return;

  (async () => {
    try {
      const result = message.batch ? await recognizeBatchSafe(message) : await recognize(message);
      reply(event.source, message.id, { success: true, results: message.batch ? result : undefined, ...(message.batch ? {} : result) });
    } catch (error) {
      resetPaddleOcr();
      const errorText = error instanceof Error ? error.message : String(error);
      console.error('[OCR-Sandbox] Lỗi:', errorText, error);
      reply(event.source, message.id, { success: false, error: errorText });
    }
  })();
});

window.parent.postMessage({ target: 'offscreen-ocr-sandbox', type: 'ready' }, '*');
