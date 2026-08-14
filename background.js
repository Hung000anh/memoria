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
    'background/services/alarms.js'
  );
} catch (e) {
  console.error("Failed to load background services:", e);
}

console.log("Memoria background script loaded.");

const FULL_PAGE_TRANSLATE_MENU_ID = 'memoria-translate-full-page';

function registerTranslationContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: FULL_PAGE_TRANSLATE_MENU_ID,
      title: 'Dịch toàn bộ trang web',
      contexts: ['page']
    }, () => {
      if (chrome.runtime.lastError) {
        console.warn('[Memoria] Không thể tạo context menu:', chrome.runtime.lastError.message);
      }
    });
  });
}

chrome.runtime.onInstalled.addListener(registerTranslationContextMenu);
chrome.runtime.onStartup.addListener(registerTranslationContextMenu);
registerTranslationContextMenu();

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== FULL_PAGE_TRANSLATE_MENU_ID || !tab?.id) return;
  chrome.tabs.sendMessage(tab.id, { action: 'toggle_full_page_translation' }).catch(() => {
    console.warn('[Memoria] Trang hiện tại không hỗ trợ dịch toàn trang.');
  });
});

// Search Google in inactive temporary tabs, then return a small, bounded
// snapshot of the most relevant pages to the chat panel.
function waitForTabComplete(tabId, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    let finished = false;
    const cleanup = () => {
      chrome.tabs.onUpdated.removeListener(listener);
      clearTimeout(timer);
    };
    const done = (value, error = null) => {
      if (finished) return;
      finished = true;
      cleanup();
      error ? reject(error) : resolve(value);
    };
    const listener = (updatedTabId, changeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === 'complete') done(true);
    };
    const timer = setTimeout(() => done(false, new Error('Trang web phản hồi quá lâu.')), timeoutMs);
    chrome.tabs.onUpdated.addListener(listener);
    chrome.tabs.get(tabId, tab => {
      if (chrome.runtime.lastError) return done(false, new Error(chrome.runtime.lastError.message));
      if (tab.status === 'complete') done(true);
    });
  });
}

function executeInTab(tabId, func, args = []) {
  return chrome.scripting.executeScript({ target: { tabId }, func, args })
    .then(results => results && results[0] ? results[0].result : null);
}

async function scrapeGoogleResults(query) {
  const searchTab = await chrome.tabs.create({
    url: `https://www.google.com/search?hl=vi&num=5&q=${encodeURIComponent(query)}`,
    active: false
  });
  try {
    await waitForTabComplete(searchTab.id);
    return await executeInTab(searchTab.id, () => {
      const links = [];
      const seen = new Set();
      document.querySelectorAll('a[href]').forEach(anchor => {
        let href = anchor.href;
        try {
          const parsed = new URL(href);
          if (parsed.hostname === 'www.google.com' && parsed.pathname === '/url') {
            href = parsed.searchParams.get('q') || parsed.searchParams.get('url') || href;
          }
        } catch (_) {}
        if (!/^https?:\/\//i.test(href)) return;
        try {
          const host = new URL(href).hostname;
          if (host.endsWith('google.com') || host.endsWith('googleusercontent.com')) return;
        } catch (_) { return; }
        const title = (anchor.innerText || anchor.textContent || '').trim();
        if (!title || seen.has(href)) return;
        seen.add(href);
        links.push({ title: title.slice(0, 300), url: href });
      });
      return links.slice(0, 5);
    });
  } finally {
    chrome.tabs.remove(searchTab.id).catch(() => {});
  }
}

async function scrapePage(page) {
  const tab = await chrome.tabs.create({ url: page.url, active: false });
  try {
    await waitForTabComplete(tab.id);
    const content = await executeInTab(tab.id, () => ({
      title: document.title,
      text: (document.body?.innerText || '').replace(/\s+/g, ' ').trim()
    }));
    return {
      title: content?.title || page.title,
      url: page.url,
      text: (content?.text || '').slice(0, 12000)
    };
  } catch (error) {
    return { title: page.title, url: page.url, error: error.message };
  } finally {
    chrome.tabs.remove(tab.id).catch(() => {});
  }
}

async function searchGoogleAndReadPages(query) {
  const results = await scrapeGoogleResults(query);
  const pages = [];
  for (const result of results.slice(0, 5)) {
    pages.push(await scrapePage(result));
  }
  return { query, results: pages };
}

  // Lắng nghe lệnh phím tắt kích hoạt
  chrome.commands.onCommand.addListener((command) => {
    if (command === "trigger_ocr") {
      // Gửi tin nhắn đến tab hiện tại để kích hoạt OCR
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { action: "trigger_ocr_shortcut" }).catch(() => {});
        }
      });
      return;
    }

    if (command === "open_settings_tab") {
      chrome.runtime.openOptionsPage();
      return;
    }

    const tabMap = {
      "open_chat_tab": "chat",
      "open_translate_tab": "translate-side-view",
      "open_notes_tab": "notes-view",
      "open_timer_tab": "reminders-view",
      "open_weather_tab": "weather-view"
    };

    if (tabMap[command]) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.sidePanel.open({ windowId: tabs[0].windowId }).catch(err => console.error(err));
          // Đặt cờ tự động chuyển tab khi Sidepanel mở
          chrome.storage.local.set({ autoOpenTab: tabMap[command] });
        }
      });
    }
  });

// Mở side panel khi click vào icon extension
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// Lắng nghe các event từ content script hoặc popup/sidepanel cho lưu trữ Clipboard
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "search_google_and_read") {
    searchGoogleAndReadPages(String(request.query || '').trim())
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === "read_web_page") {
    const url = String(request.url || '').trim();
    if (!/^https?:\/\//i.test(url)) {
      sendResponse({ error: 'URL không hợp lệ.' });
      return false;
    }
    scrapePage({ url, title: url })
      .then(page => sendResponse(page))
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === "save_clipboard") {
    chrome.storage.local.get({ clipboardHistory: [], enableClipboardHistory: true }, (data) => {
      if (!data.enableClipboardHistory) return;
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
