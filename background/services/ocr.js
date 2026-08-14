// background/services/ocr.js
// Điều phối pipeline OCR: capture tab → offscreen document (PaddleOCR) → trả kết quả

'use strict';

const OCR_OFFSCREEN_URL = chrome.runtime.getURL('offscreen/ocr.html');

function captureVisibleTab(windowId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.captureVisibleTab(windowId ?? null, { format: 'png' }, (url) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message || 'captureVisibleTab thất bại'));
      } else if (!url) {
        reject(new Error('captureVisibleTab trả về rỗng'));
      } else {
        resolve(url);
      }
    });
  });
}

// Đảm bảo offscreen document đang chạy
async function ensureOffscreenDocument() {
  // Kiểm tra xem đã có offscreen doc chưa
  let contexts = [];
  try {
    contexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [OCR_OFFSCREEN_URL]
    });
  } catch (_) {
    // getContexts không available trên Chrome cũ — bỏ qua, createDocument sẽ throw nếu đã tồn tại
  }

  if (contexts && contexts.length > 0) {
    return; // Đã có, không cần tạo thêm
  }

  try {
    await chrome.offscreen.createDocument({
      url: OCR_OFFSCREEN_URL,
      reasons: ['WORKERS'],
      justification: 'Chạy PaddleOCR PP-OCRv6 WASM để nhận dạng chữ trong ảnh'
    });
    console.log('[OCR-BG] Offscreen document đã tạo thành công.');
  } catch (e) {
    // Nếu lỗi "Only a single offscreen document" → đã tồn tại, tiếp tục bình thường
    if (e.message && e.message.includes('Only a single')) {
      console.log('[OCR-BG] Offscreen document đã tồn tại.');
      return;
    }
    throw e;
  }
}

// Lắng nghe message từ content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Pipeline đầy đủ: capture + OCR qua offscreen
  if (request.action === 'ocr_pipeline') {
    (async () => {
      try {
        // 1. Chụp tab
        console.log('[OCR-BG] Chụp tab...');
        const dataUrl = await captureVisibleTab(sender.tab?.windowId);
        console.log('[OCR-BG] Chụp xong, dataUrl length:', dataUrl.length);

        // 2. Đảm bảo offscreen document đang chạy
        await ensureOffscreenDocument();

        // 3. Gửi ảnh đến offscreen để crop + OCR.
        // PP-OCRv6-tiny tự nhận diện ngôn ngữ bằng model đa ngôn ngữ thống nhất.
        const ocrRes = await chrome.runtime.sendMessage({
          target: 'offscreen-ocr',
          action: 'do_ocr',
          dataUrl,
          rect: request.rect,
          dpr: request.dpr || 1
        });

        console.log('[OCR-BG] Offscreen trả về:', ocrRes?.success ? 'OK text=' + ocrRes.ocrText?.substring(0, 30) : 'FAIL: ' + ocrRes?.error);
        sendResponse(ocrRes || { success: false, error: 'Offscreen không phản hồi' });

      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error('[OCR-BG] Lỗi pipeline:', msg);
        sendResponse({ success: false, error: msg });
      }
    })();
    return true; // Giữ kết nối async
  }

  if (request.action === 'ocr_images_batch') {
    (async () => {
      try {
        const images = Array.isArray(request.images) ? request.images.slice(0, 50) : [];
        if (!images.length) {
          sendResponse({ success: true, images: [] });
          return;
        }

        const hasDirectImages = images.every(image => typeof image?.dataUrl === 'string' && image.dataUrl.startsWith('data:'));
        const dataUrl = hasDirectImages ? '' : await captureVisibleTab(sender.tab?.windowId);
        await ensureOffscreenDocument();
        const ocrImages = images.map(image => ({
          dataUrl: image.dataUrl || dataUrl,
          rect: image.rect,
          dpr: image.dataUrl ? 1 : (request.dpr || 1),
          includePreview: !image.dataUrl
        }));
        let batchResponse;
        try {
          batchResponse = await chrome.runtime.sendMessage({
            target: 'offscreen-ocr',
            action: 'do_ocr_batch',
            batch: true,
            images: ocrImages,
            dpr: request.dpr || 1
          });
        } catch (error) {
          batchResponse = { success: false, error: error.message || String(error), results: [] };
        }

        const results = images.map((image, index) => {
          const result = batchResponse?.results?.[index];
          return {
            index,
            success: Boolean(batchResponse?.success && result),
            error: batchResponse?.error || '',
            items: result?.items || [],
            previewDataUrl: result?.previewDataUrl || '',
            cropScale: result?.cropScale || 3
          };
        });

        sendResponse({ success: true, images: results });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('[OCR-BG] Lỗi OCR ảnh hàng loạt:', msg);
        sendResponse({ success: false, error: msg });
      }
    })();
    return true;
  }
});
