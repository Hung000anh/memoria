// offscreen/ocr.js
// Chạy trong Offscreen Document — extension origin thuần túy, WASM hoạt động bình thường

'use strict';

let tesseractWorker = null;

// Khởi tạo Tesseract worker (lazy, chỉ một lần)
async function getWorker() {
  if (tesseractWorker) return tesseractWorker;

  const base = chrome.runtime.getURL('lib/tesseract');
  console.log('[OCR-Offscreen] Khởi tạo Tesseract worker (v5), base:', base);

  // Tesseract v5: createWorker(langs, oem, options)
  tesseractWorker = await Tesseract.createWorker('eng', 1, {
    workerPath: base + '/worker.min.js',
    langPath: base,
    corePath: base + '/tesseract-core.wasm.js',
    workerBlobURL: false,
    gzip: false,
    cacheMethod: 'none',
    logger: (m) => {
      if (m.status && m.status !== 'recognizing text') {
        console.log('[OCR-Offscreen]', m.status, m.progress != null ? Math.round(m.progress * 100) + '%' : '');
      }
    }
  });

  console.log('[OCR-Offscreen] Worker sẵn sàng!');
  return tesseractWorker;
}

// Crop ảnh theo vùng chọn và phóng đại lên 3 lần để Tesseract nhận dạng chính xác hơn
function cropImage(dataUrl, rect, dpr) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = 3; // Phóng đại 3x
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(rect.width  * dpr * scale);
      canvas.height = Math.round(rect.height * dpr * scale);
      const ctx = canvas.getContext('2d');
      
      // Bật khử răng cưa chất lượng cao để ảnh phóng to không bị vỡ hạt
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

// Nhận message từ background service worker
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Chỉ xử lý message gửi đúng cho offscreen này
  if (request.target !== 'offscreen-ocr' || request.action !== 'do_ocr') return false;

  (async () => {
    try {
      console.log('[OCR-Offscreen] Nhận yêu cầu OCR, rect:', request.rect, 'dpr:', request.dpr);

      // Crop ảnh
      const croppedUrl = await cropImage(request.dataUrl, request.rect, request.dpr || 1);
      console.log('[OCR-Offscreen] Crop xong, bắt đầu OCR...');

      // Nhận dạng chữ
      const worker = await getWorker();
      const { data: { text } } = await worker.recognize(croppedUrl);
      const ocrText = text
        .replace(/[\r\n]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      console.log('[OCR-Offscreen] OCR xong:', ocrText.substring(0, 80));
      sendResponse({ success: true, ocrText });

    } catch (e) {
      // Nếu worker hỏng, reset để lần sau thử lại
      tesseractWorker = null;
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[OCR-Offscreen] Lỗi:', msg, e);
      sendResponse({ success: false, error: msg });
    }
  })();

  return true; // Giữ kết nối async
});

console.log('[OCR-Offscreen] Offscreen document sẵn sàng, chờ yêu cầu OCR.');
