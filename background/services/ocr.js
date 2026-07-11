// background/services/ocr.js
// Điều phối pipeline OCR: capture tab → offscreen document (Tesseract) → trả kết quả

'use strict';

const OCR_OFFSCREEN_URL = chrome.runtime.getURL('offscreen/ocr.html');

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
      justification: 'Chạy Tesseract.js WASM để nhận dạng chữ trong ảnh'
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
        const dataUrl = await new Promise((resolve, reject) => {
          chrome.tabs.captureVisibleTab(null, { format: 'png' }, (url) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message || 'captureVisibleTab thất bại'));
            } else if (!url) {
              reject(new Error('captureVisibleTab trả về rỗng'));
            } else {
              resolve(url);
            }
          });
        });
        console.log('[OCR-BG] Chụp xong, dataUrl length:', dataUrl.length);

        // 2. Đảm bảo offscreen document đang chạy
        await ensureOffscreenDocument();

        // 3. Gửi ảnh đến offscreen để crop + OCR
        console.log('[OCR-BG] Gửi ảnh đến offscreen OCR...');
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
});
