// Background script cho Memoria

try {
  // Nạp cấu trúc core
  importScripts('ui/js/core/utils.js', 'ui/js/core/gemini.js');
} catch (e) {
  console.error("Failed to load Gemini scripts in background:", e);
}

// Nạp các dịch vụ nền đã chia nhỏ
try {
  importScripts(
    'background/services/translate.js',
    'background/services/ocr.js',
    'background/services/alarms.js',
    'background/services/timeTracker.js',
    'background/services/proactiveAI.js'
  );
} catch (e) {
  console.error("Failed to load background services:", e);
}

console.log("Memoria background script loaded.");

// Mở side panel khi click vào icon extension
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// Lắng nghe các event từ content script hoặc popup/sidepanel cho lưu trữ Clipboard
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "save_clipboard") {
    chrome.storage.local.get({ clipboardHistory: [] }, (data) => {
      let history = data.clipboardHistory;
      // Tránh lưu trùng lặp liên tiếp
      if (history.length === 0 || history[0].text !== request.text) {
        history.unshift({
          text: request.text,
          source: request.source || "Không rõ nguồn",
          url: request.url || "",
          timestamp: Date.now()
        });
        // Giới hạn lưu 50 mục gần nhất
        if (history.length > 50) history.pop();
        chrome.storage.local.set({ clipboardHistory: history });
      }
    });
  }
});
