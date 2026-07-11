// content/modules/ocr-translate.js
// Tính năng OCR Dịch thuật: Alt+Shift+S → kéo vùng chọn → gửi background → popup kết quả
// Tesseract WASM chạy trong Offscreen Document (không còn ở đây nữa)

(function () {
  'use strict';

  // ─── STATE ───────────────────────────────────────────────────────────────
  let ocrState = 'IDLE'; // IDLE | SELECTING | PROCESSING
  let ocrOverlay = null;
  let ocrSelectionBox = null;
  let ocrStartX = 0;
  let ocrStartY = 0;
  let isDarkMode = false;
  let ocrEnabled = true;

  // ─── LOAD SETTINGS ───────────────────────────────────────────────────────
  chrome.storage.local.get({ isDarkMode: false, ocrEnabled: true }, (data) => {
    isDarkMode = data.isDarkMode;
    ocrEnabled = data.ocrEnabled;
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.isDarkMode) isDarkMode = changes.isDarkMode.newValue;
    if (changes.ocrEnabled)  ocrEnabled = changes.ocrEnabled.newValue;
  });

  // ─── INJECT STYLES ───────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('dauxanh-ocr-styles')) return;
    const style = document.createElement('style');
    style.id = 'dauxanh-ocr-styles';
    style.textContent = `
      @keyframes dauxanhOcrPop {
        from { opacity: 0; transform: scale(0.94) translateY(-6px); }
        to   { opacity: 1; transform: scale(1)    translateY(0);    }
      }
      @keyframes dauxanhOcrSpin {
        to { transform: rotate(360deg); }
      }
      #dauxanh-ocr-overlay {
        position: fixed !important; inset: 0 !important;
        background: rgba(0, 0, 0, 0.38) !important;
        z-index: 2147483644 !important;
        cursor: crosshair !important;
        user-select: none !important; -webkit-user-select: none !important;
      }
      #dauxanh-ocr-hint {
        position: absolute !important;
        top: 18px !important; left: 50% !important;
        transform: translateX(-50%) !important;
        background: rgba(16, 185, 129, 0.92) !important;
        color: #fff !important; padding: 8px 18px !important;
        border-radius: 20px !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
        font-size: 13px !important; font-weight: 500 !important;
        white-space: nowrap !important; pointer-events: none !important;
        box-shadow: 0 4px 16px rgba(0,0,0,0.15) !important;
      }
      #dauxanh-ocr-selection {
        position: fixed !important;
        border: 2px solid #10b981 !important;
        background: rgba(16, 185, 129, 0.1) !important;
        z-index: 2147483645 !important;
        pointer-events: none !important; display: none !important;
        border-radius: 2px !important;
      }
      #dauxanh-ocr-popup {
        position: fixed !important; z-index: 2147483647 !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif !important;
        border-radius: 12px !important;
        width: 360px !important; max-width: calc(100vw - 24px) !important;
        animation: dauxanhOcrPop 0.2s ease-out !important;
        box-sizing: border-box !important;
      }
      #dauxanh-ocr-popup .ocr-spinner {
        width: 18px !important; height: 18px !important;
        border: 2.5px solid #10b981 !important; border-top-color: transparent !important;
        border-radius: 50% !important;
        animation: dauxanhOcrSpin 0.75s linear infinite !important;
        flex-shrink: 0 !important;
      }
    `;
    document.head.appendChild(style);
  }

  // ─── HOTKEY ──────────────────────────────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    if (e.altKey && e.shiftKey && (e.key === 'S' || e.key === 's') && ocrState === 'IDLE') {
      if (!ocrEnabled) return;
      e.preventDefault();
      e.stopPropagation();
      injectStyles();
      startOcrMode();
      return;
    }
    if (e.key === 'Escape' && ocrState === 'SELECTING') {
      cancelOcrMode();
    }
  });

  // ─── OCR MODE ────────────────────────────────────────────────────────────
  function startOcrMode() {
    ocrState = 'SELECTING';

    ocrOverlay = document.createElement('div');
    ocrOverlay.id = 'dauxanh-ocr-overlay';
    ocrOverlay.innerHTML = '<div id="dauxanh-ocr-hint">✦ Kéo chuột để chọn vùng cần dịch &nbsp;·&nbsp; ESC để hủy</div>';
    document.body.appendChild(ocrOverlay);

    ocrSelectionBox = document.createElement('div');
    ocrSelectionBox.id = 'dauxanh-ocr-selection';
    document.body.appendChild(ocrSelectionBox);

    ocrOverlay.addEventListener('mousedown', onMouseDown);
  }

  function cancelOcrMode() {
    removeOverlay();
    ocrState = 'IDLE';
  }

  function removeOverlay() {
    if (ocrOverlay)      { ocrOverlay.remove();      ocrOverlay = null; }
    if (ocrSelectionBox) { ocrSelectionBox.remove();  ocrSelectionBox = null; }
  }

  // ─── MOUSE EVENTS ────────────────────────────────────────────────────────
  function onMouseDown(e) {
    e.preventDefault();
    ocrStartX = e.clientX;
    ocrStartY = e.clientY;

    ocrSelectionBox.style.setProperty('display', 'block', 'important');
    ocrSelectionBox.style.setProperty('left',   ocrStartX + 'px', 'important');
    ocrSelectionBox.style.setProperty('top',    ocrStartY + 'px', 'important');
    ocrSelectionBox.style.setProperty('width',  '0', 'important');
    ocrSelectionBox.style.setProperty('height', '0', 'important');

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp, { once: true });
  }

  function onMouseMove(e) {
    const x = Math.min(e.clientX, ocrStartX);
    const y = Math.min(e.clientY, ocrStartY);
    const w = Math.abs(e.clientX - ocrStartX);
    const h = Math.abs(e.clientY - ocrStartY);
    ocrSelectionBox.style.setProperty('left',   x + 'px', 'important');
    ocrSelectionBox.style.setProperty('top',    y + 'px', 'important');
    ocrSelectionBox.style.setProperty('width',  w + 'px', 'important');
    ocrSelectionBox.style.setProperty('height', h + 'px', 'important');
  }

  async function onMouseUp(e) {
    document.removeEventListener('mousemove', onMouseMove);

    const x = Math.min(e.clientX, ocrStartX);
    const y = Math.min(e.clientY, ocrStartY);
    const w = Math.abs(e.clientX - ocrStartX);
    const h = Math.abs(e.clientY - ocrStartY);

    if (w < 12 || h < 12) { cancelOcrMode(); return; }

    removeOverlay();
    ocrState = 'PROCESSING';
    await processOcr({ left: x, top: y, width: w, height: h });
    ocrState = 'IDLE';
  }

  // ─── XỬ LÝ OCR + DỊCH ───────────────────────────────────────────────────
  async function processOcr(rect) {
    const popup = createLoadingPopup(rect);

    try {
      // Bước 1 + 2 + 3: Capture + Crop + OCR (xử lý ở background + offscreen)
      updateStatus(popup, 'Đang nhận dạng chữ...');
      const dpr = window.devicePixelRatio || 1;

      const ocrRes = await sendMsg({
        action: 'ocr_pipeline',
        rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        dpr
      });

      if (!ocrRes || !ocrRes.success) {
        throw new Error(ocrRes?.error || 'OCR thất bại. Xem Console để biết thêm.');
      }

      const ocrText = ocrRes.ocrText;
      if (!ocrText || !ocrText.trim()) {
        throw new Error('Không tìm thấy văn bản trong vùng chọn. Thử chọn vùng khác.');
      }

      // Bước 4: Dịch (tái dụng translate service có sẵn)
      updateStatus(popup, 'Đang dịch...');
      const translateRes = await sendMsg({ action: 'translate_text', text: ocrText });
      if (!translateRes || !translateRes.success) {
        throw new Error(translateRes?.error || 'Lỗi dịch thuật. Kiểm tra kết nối mạng.');
      }

      popup.remove();
      showResultPopup(rect, ocrText, translateRes.translatedText);

    } catch (err) {
      if (popup && popup.isConnected) popup.remove();
      const msg = err instanceof Error ? err.message
               : typeof err === 'string' ? err
               : String(err);
      console.error('[OCR-Translate] Lỗi:', err);
      showErrorPopup(rect, msg || 'Lỗi không xác định.');
    }
  }

  // ─── HELPERS ─────────────────────────────────────────────────────────────
  function sendMsg(msg) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(msg, (res) => {
          if (chrome.runtime.lastError) { resolve(null); }
          else { resolve(res); }
        });
      } catch (e) { resolve(null); }
    });
  }

  // ─── POPUP HELPERS ───────────────────────────────────────────────────────
  function getColors() {
    return isDarkMode
      ? { bg: '#1f2937', text: '#f3f4f6', muted: '#9ca3af', border: '#374151', divider: '#374151' }
      : { bg: '#ffffff', text: '#111827', muted: '#6b7280', border: '#e5e7eb', divider: '#f3f4f6' };
  }

  function calcPosition(rect) {
    const popupH = 170, popupW = 360, margin = 12;
    let top  = rect.top + rect.height + margin;
    if (top + popupH > window.innerHeight - 10) top = rect.top - popupH - margin;
    if (top < 10) top = 10;
    let left = rect.left + rect.width / 2 - popupW / 2;
    if (left + popupW > window.innerWidth  - 10) left = window.innerWidth - popupW - 10;
    if (left < 10) left = 10;
    return { top, left };
  }

  function createBasePopup(rect) {
    const c = getColors();
    const pos = calcPosition(rect);
    const popup = document.createElement('div');
    popup.id = 'dauxanh-ocr-popup';
    popup.style.cssText = `
      top: ${pos.top}px !important; left: ${pos.left}px !important;
      background: ${c.bg} !important; color: ${c.text} !important;
      border: 1px solid ${c.border} !important;
      padding: 14px 16px !important;
      box-shadow: 0 8px 32px rgba(0,0,0,0.18) !important;
    `;
    document.body.appendChild(popup);
    return popup;
  }

  function createLoadingPopup(rect) {
    const c = getColors();
    const popup = createBasePopup(rect);
    popup.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;">
        <div class="ocr-spinner"></div>
        <span id="dauxanh-ocr-status" style="font-size:13px;color:${c.muted};">Đang khởi động OCR...</span>
      </div>
    `;
    return popup;
  }

  function updateStatus(popup, text) {
    const el = popup.querySelector('#dauxanh-ocr-status');
    if (el) el.textContent = text;
  }

  function showResultPopup(rect, ocrText, translatedText) {
    const c = getColors();
    const popup = createBasePopup(rect);

    const safe = (s) => s
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    popup.innerHTML = `
      <div id="dauxanh-ocr-header"
           style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;cursor:grab;">
        <span style="font-weight:600;color:#10b981;font-size:13px;display:flex;align-items:center;gap:5px;">
          <img src="${chrome.runtime.getURL('icons/icon48.png')}"
               style="width:14px;height:14px;border-radius:50%;object-fit:contain;display:block;">
          OCR Dịch thuật
        </span>
        <button id="dauxanh-ocr-close-btn"
                style="background:none;border:none;font-size:18px;line-height:1;cursor:pointer;color:#9ca3af;padding:2px 4px;">
          &times;
        </button>
      </div>

      <!-- Phần Bản Dịch -->
      <div style="margin-bottom: 12px;">
        <div style="font-size: 14px; line-height: 1.6; color: ${c.text}; white-space: pre-wrap; word-break: break-word; max-height: 150px; overflow-y: auto;">${safe(translatedText)}</div>
      </div>

      <div style="border-top:1px solid ${c.divider};padding-top:10px;margin-top:10px;display:flex;justify-content:flex-end;">
        <button id="dauxanh-ocr-save-btn"
                style="background:#10b981;color:#fff;border:none;padding:6px 14px;border-radius:7px;
                       font-size:13px;font-weight:500;cursor:pointer;display:flex;align-items:center;gap:5px;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          Lưu Ghi chú
        </button>
      </div>
    `;

    popup.querySelector('#dauxanh-ocr-close-btn')
         .addEventListener('click', () => popup.remove());

    const saveBtn = popup.querySelector('#dauxanh-ocr-save-btn');
    saveBtn.addEventListener('mouseover', () => saveBtn.style.background = '#059669');
    saveBtn.addEventListener('mouseout',  () => saveBtn.style.background = '#10b981');
    saveBtn.addEventListener('click', () => {
      saveBtn.textContent = 'Đang lưu...';
      saveBtn.disabled = true;
      const noteText = `**Nguồn:** [${window.location.hostname}](${window.location.href})\n\n**Bản gốc (OCR):**\n${ocrText}\n\n**Bản dịch:**\n${translatedText}`;
      chrome.storage.local.get({ notes: [] }, (data) => {
        data.notes.unshift({
          id: Date.now(),
          title: 'OCR từ ' + window.location.hostname,
          text: noteText, content: noteText,
          color: '#bbf7d0',
          date: new Date().toISOString()
        });
        chrome.storage.local.set({ notes: data.notes }, () => {
          saveBtn.innerHTML = '✓ Đã lưu!';
          saveBtn.style.background = '#059669';
          setTimeout(() => popup.remove(), 1500);
        });
      });
    });

    makeDraggable(popup, popup.querySelector('#dauxanh-ocr-header'));

    setTimeout(() => {
      const onOut = (e) => {
        if (!popup.contains(e.target)) { popup.remove(); document.removeEventListener('mousedown', onOut); }
      };
      document.addEventListener('mousedown', onOut);
    }, 300);
  }

  function showErrorPopup(rect, message) {
    const c = getColors();
    const popup = createBasePopup(rect);
    popup.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
        <div>
          <div style="font-weight:600;color:#ef4444;font-size:13px;margin-bottom:5px;">⚠ Lỗi OCR</div>
          <div style="font-size:13px;color:${c.muted};line-height:1.5;">${message}</div>
        </div>
        <button onclick="this.closest('#dauxanh-ocr-popup').remove()"
                style="background:none;border:none;font-size:18px;cursor:pointer;color:#9ca3af;flex-shrink:0;padding:0;line-height:1;">
          &times;
        </button>
      </div>
    `;
    setTimeout(() => { if (popup.isConnected) popup.remove(); }, 8000);
  }

  // ─── DRAG ────────────────────────────────────────────────────────────────
  function makeDraggable(popup, handle) {
    if (!handle) return;
    handle.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
      e.preventDefault();
      const r  = popup.getBoundingClientRect();
      const ox = e.clientX - r.left;
      const oy = e.clientY - r.top;
      handle.style.cursor = 'grabbing';
      const onMove = (me) => {
        popup.style.setProperty('left', (me.clientX - ox) + 'px', 'important');
        popup.style.setProperty('top',  (me.clientY - oy) + 'px', 'important');
      };
      const onUp = () => {
        handle.style.cursor = 'grab';
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

})();
