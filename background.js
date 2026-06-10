// Background script cho Memoria
try {
  importScripts('ui/utils.js', 'ui/gemini.js');
} catch (e) {
  console.error("Failed to load Gemini scripts in background:", e);
}
console.log("Memoria background script loaded.");

// Mở side panel khi click vào icon extension
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// Lắng nghe các event từ content script hoặc popup/sidepanel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "save_clipboard") {
    // Lưu trữ clipboard history
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

  // Xử lý tạo/xóa Alarm cho Lịch trình
  if (request.action === "create_alarm") {
    const sch = request.schedule;
    if (sch.time && sch.date) {
      const [hours, minutes] = sch.time.split(':');
      const [y, m, d] = sch.date.split('-');
      let alarmTime = new Date(y, parseInt(m) - 1, d, parseInt(hours), parseInt(minutes), 0, 0);
      
      let alarmConfig = { when: alarmTime.getTime() };
      if (sch.recurrence === 'daily') alarmConfig.periodInMinutes = 24 * 60;
      if (sch.recurrence === 'weekly') alarmConfig.periodInMinutes = 7 * 24 * 60;
      
      // Nếu sự kiện trong quá khứ và không lặp lại thì bỏ qua
      if (alarmConfig.when <= Date.now() && sch.recurrence === 'none') return;
      
      // Nếu là sự kiện lặp lại nhưng ngày gốc trong quá khứ, đẩy target lên tương lai
      if (alarmConfig.when <= Date.now() && alarmConfig.periodInMinutes) {
        while (alarmConfig.when <= Date.now()) {
          alarmConfig.when += alarmConfig.periodInMinutes * 60000;
        }
      }
      
      chrome.alarms.create(`schedule_${sch.id}`, alarmConfig);
      chrome.storage.local.get({ alarmsData: {} }, (data) => {
        data.alarmsData[`schedule_${sch.id}`] = sch.title || sch.text || 'Sự kiện';
        chrome.storage.local.set({ alarmsData: data.alarmsData });
      });
    }
  }

  if (request.action === "delete_alarm") {
    chrome.alarms.clear(`schedule_${request.id}`);
  }

  // --- Nhắc nhở (Reminders) ---
  if (request.action === "create_custom_reminder") {
    const rem = request.reminder;
    const alarmConfig = { delayInMinutes: rem.minutes };
    if (rem.isRepeating) {
      alarmConfig.periodInMinutes = rem.minutes;
    }
    
    chrome.alarms.create(`custom_rem_${rem.id}`, alarmConfig);
    chrome.storage.local.get({ alarmsData: {} }, (data) => {
      data.alarmsData[`custom_rem_${rem.id}`] = {
        text: rem.text,
        isRepeating: rem.isRepeating
      };
      chrome.storage.local.set({ alarmsData: data.alarmsData });
    });
  }

  if (request.action === "delete_custom_reminder") {
    chrome.alarms.clear(`custom_rem_${request.id}`);
  }
});

// Biểu tượng Notification
const DEFAULT_ICON = "icons/icon128.png";

// Lắng nghe sự kiện alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name.startsWith('schedule_')) {
    chrome.storage.local.get({ alarmsData: {} }, (data) => {
      const text = data.alarmsData[alarm.name] || 'Đến giờ cho sự kiện của bạn!';
      
      chrome.notifications.create({
        type: 'basic',
        iconUrl: DEFAULT_ICON, 
        title: 'Lịch trình Memoria ✨',
        message: text,
        priority: 2
      });

      chrome.alarms.get(alarm.name, (al) => {
        if (!al || !al.periodInMinutes) {
          delete data.alarmsData[alarm.name];
          chrome.storage.local.set({ alarmsData: data.alarmsData });
        }
      });
    });
  }

  if (alarm.name === 'proactive_ai') {
    handleProactiveAI();
  }

  if (alarm.name.startsWith('custom_rem_')) {
    chrome.storage.local.get({ alarmsData: {} }, (data) => {
      const remData = data.alarmsData[alarm.name];
      const text = typeof remData === 'string' ? remData : (remData ? remData.text : 'Hết giờ!');
      const isRepeating = typeof remData === 'object' && remData ? remData.isRepeating : false;
      
      chrome.tabs.query({ active: true }, (tabs) => {
        let successCount = 0;
        let processedCount = 0;

        if (tabs.length === 0) {
          showNotification(text);
        } else {
          tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, { action: "show_overlay", text: text }, (response) => {
              processedCount++;
              if (!chrome.runtime.lastError && response && response.status === "ok") {
                successCount++;
              }
              if (processedCount === tabs.length && successCount === 0) {
                showNotification(text);
              }
            });
          });
        }
      });

      if (!isRepeating) {
        delete data.alarmsData[alarm.name];
        chrome.storage.local.set({ alarmsData: data.alarmsData });
      }
    });
  }
  
  function showNotification(text) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: DEFAULT_ICON,
      title: 'Nhắc nhở Memoria ✨',
      message: text,
      priority: 2
    });
  }
  
  // Xử lý auto flush time
  if (alarm.name === "screenTimeTracker") {
    flushTime();
  }
});

// --- SCREEN TIME TRACKING ---
function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function extractDomain(url) {
  try {
    if (!url || url.startsWith('chrome://') || url.startsWith('edge://') || url.startsWith('chrome-extension://')) return null;
    const hostname = new URL(url).hostname;
    const clean = hostname.replace(/^www\./, '');
    if (!clean || clean === 'null') return null;
    return clean;
  } catch (e) {
    return null;
  }
}

function flushTime() {
  chrome.storage.local.get(['trackingState', 'timeStats'], (data) => {
    let state = data.trackingState || { activeDomain: null, activeStartTime: Date.now(), isTracking: true };
    const now = Date.now();

    if (state.activeDomain && state.activeDomain !== 'null' && state.isTracking) {
      const elapsedSecs = Math.floor((now - state.activeStartTime) / 1000);
      if (elapsedSecs > 0 && elapsedSecs < 86400) {
        const today = getTodayString();
        const stats = data.timeStats || {};
        if (!stats[today]) stats[today] = {};
        
        // Dọn dẹp domain 'null' hoặc extension bị lưu nhầm trước đây
        if (stats[today]['null']) delete stats[today]['null'];
        Object.keys(stats[today]).forEach(k => {
           if (k.length === 32 && !k.includes('.')) delete stats[today][k]; // xóa extension ID
        });

        if (!stats[today][state.activeDomain]) stats[today][state.activeDomain] = 0;
        stats[today][state.activeDomain] += elapsedSecs;
        chrome.storage.local.set({ timeStats: stats });
      }
    }
    
    // Reset start time
    state.activeStartTime = now;
    chrome.storage.local.set({ trackingState: state });
  });
}

function handleTabChange(tab) {
  chrome.storage.local.get(['trackingState'], (data) => {
    let state = data.trackingState || { activeDomain: null, activeStartTime: Date.now(), isTracking: true };
    
    // flush current
    const now = Date.now();
    if (state.activeDomain && state.activeDomain !== 'null' && state.isTracking) {
      const elapsedSecs = Math.floor((now - state.activeStartTime) / 1000);
      if (elapsedSecs > 0 && elapsedSecs < 86400) {
        const today = getTodayString();
        chrome.storage.local.get({ timeStats: {} }, (statsData) => {
          const stats = statsData.timeStats || {};
          if (!stats[today]) stats[today] = {};
          
          if (stats[today]['null']) delete stats[today]['null'];
          Object.keys(stats[today]).forEach(k => {
             if (k.length === 32 && !k.includes('.')) delete stats[today][k];
          });

          if (!stats[today][state.activeDomain]) stats[today][state.activeDomain] = 0;
          stats[today][state.activeDomain] += elapsedSecs;
          chrome.storage.local.set({ timeStats: stats });
        });
      }
    }

    state.activeStartTime = now;
    state.activeDomain = (tab && tab.url) ? extractDomain(tab.url) : null;
    chrome.storage.local.set({ trackingState: state });
  });
}

chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (chrome.runtime.lastError) return;
    handleTabChange(tab);
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && tab.active) {
    handleTabChange(tab);
  }
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    chrome.storage.local.get(['trackingState'], (data) => {
       let state = data.trackingState || {};
       flushTime();
       state.isTracking = false;
       chrome.storage.local.set({ trackingState: state });
    });
  } else {
    chrome.tabs.query({ active: true, windowId: windowId }, (tabs) => {
      chrome.storage.local.get(['trackingState'], (data) => {
         let state = data.trackingState || {};
         state.isTracking = true;
         state.activeStartTime = Date.now();
         chrome.storage.local.set({ trackingState: state }, () => {
             if (tabs && tabs.length > 0) handleTabChange(tabs[0]);
         });
      });
    });
  }
});

chrome.idle.setDetectionInterval(120);
chrome.idle.onStateChanged.addListener((newState) => {
  chrome.storage.local.get(['trackingState'], (data) => {
    let state = data.trackingState || {};
    if (newState === 'idle' || newState === 'locked') {
      flushTime();
      state.isTracking = false;
      chrome.storage.local.set({ trackingState: state });
    } else if (newState === 'active') {
      state.isTracking = true;
      state.activeStartTime = Date.now();
      chrome.storage.local.set({ trackingState: state }, () => {
         chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
            if (tabs && tabs.length > 0) handleTabChange(tabs[0]);
         });
      });
    }
  });
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("screenTimeTracker", { periodInMinutes: 1 });
  chrome.storage.local.get({ aiSettings: { enabled: true, period: 60 } }, (data) => {
     if (data.aiSettings.enabled) {
        chrome.alarms.create("proactive_ai", { periodInMinutes: data.aiSettings.period });
     }
  });
});

async function handleProactiveAI() {
  const currentHour = new Date().getHours();

  chrome.storage.local.get({
    aiSettings: { enabled: true, period: 60, sleepStart: 23, sleepEnd: 6 },
    geminiKeys: [],
    weatherCache: null,
    schedules: [],
    customReminders: [],
    chatHistoryData: [],
    clipboardHistory: [],
    timeStats: {},
    notes: []
  }, async (data) => {
    const s = data.aiSettings;
    if (!s.enabled) return;
    
    // Kiểm tra giờ ngủ đông
    let isSleeping = false;
    if (s.sleepStart > s.sleepEnd) {
      // ví dụ: ngủ từ 23h đến 6h
      if (currentHour >= s.sleepStart || currentHour < s.sleepEnd) isSleeping = true;
    } else if (s.sleepStart < s.sleepEnd) {
      // ví dụ: ngủ từ 1h đến 5h
      if (currentHour >= s.sleepStart && currentHour < s.sleepEnd) isSleeping = true;
    } else {
      // bằng nhau -> ngủ 1 tiếng
      if (currentHour === s.sleepStart) isSleeping = true;
    }
    
    if (isSleeping) return;

    if (!data.geminiKeys || data.geminiKeys.length === 0) return; // Không có key

    // Lọc sự kiện/lời nhắc sắp tới
    const now = new Date();
    const todayStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
    
    const upcomingSchedules = data.schedules.filter(s => s.date === todayStr);
    
    let weatherInfo = "Không có dữ liệu";
    if (data.weatherCache && data.weatherCache.data && data.weatherCache.data.current_weather) {
      weatherInfo = `Nhiệt độ ${data.weatherCache.data.current_weather.temperature}°C, mã thời tiết ${data.weatherCache.data.current_weather.weathercode} tại ${data.weatherCache.cityName}`;
    }

    const clipText = data.clipboardHistory.slice(0, 3).map(c => c.text).join(' | ');
    const notesText = data.notes.map(n => n.title).join(', ');
    
    let statsText = 'Chưa có';
    const todayStats = data.timeStats[todayStr];
    if (todayStats) {
       let topDomains = Object.entries(todayStats).sort((a, b) => b[1] - a[1]).slice(0, 3);
       statsText = topDomains.map(([dom, secs]) => {
          let m = Math.floor(secs / 60);
          return m > 0 ? `${dom} (${m} phút)` : '';
       }).filter(x => x).join(', ');
    }

    const recentHistory = data.chatHistoryData.slice(-4).map(m => `${m.role === 'ai' || m.role === 'model' ? 'Bạn(AI)' : 'Người dùng'}: ${m.text || '...'}`).join('\n');

    const randomTopics = [
      "một câu nói truyền cảm hứng ngẫu nhiên",
      "một mẹo vặt cuộc sống thú vị",
      "một sự thật bất ngờ về vũ trụ hoặc động vật",
      "một câu hỏi vui để giải trí",
      "một lời nhắc nhở uống nước hoặc đứng lên vận động",
      "một lời khen ngợi hoặc động viên chân thành",
      "một ý tưởng hay để thư giãn sau giờ làm"
    ];
    const randomTopic = randomTopics[Math.floor(Math.random() * randomTopics.length)];

    const systemInstruction = `Bạn là trợ lý ảo Memoria. Hãy chủ động gửi 1 tin nhắn thân thiện (DƯỚI 50 TỪ) cho người dùng.
Đây là ngữ cảnh của người dùng:
- Thời gian: ${now.toLocaleString()}
- Thời tiết: ${weatherInfo}
- Sự kiện hôm nay: ${upcomingSchedules.length} sự kiện (${upcomingSchedules.map(s => s.title).join(', ')})
- Web dùng nhiều hôm nay: ${statsText}
- Vừa copy gần đây: ${clipText || 'Không'}
- Các ghi chú: ${notesText || 'Không'}
- Lịch sử trò chuyện gần nhất: 
${recentHistory}

QUAN TRỌNG TỐI THƯỢNG: 
1. Đọc kỹ "Lịch sử trò chuyện gần nhất" ở trên. Bạn TUYỆT ĐỐI KHÔNG ĐƯỢC lặp lại bất kỳ nội dung, chủ đề, lời khuyên hay từ khóa nào (như Kanban, Breach, Youtube, Thời tiết...) mà bạn vừa nói ở các tin nhắn trước. Nếu lặp lại, người dùng sẽ rất khó chịu.
2. Nếu ngữ cảnh (clipboard, web, thời tiết) không có gì mới mẻ hoặc bạn đã nói về chúng rồi, HÃY BỎ QUA NGỮ CẢNH VÀ NÓI VỀ: ${randomTopic}.
3. Trả lời tự nhiên như một người bạn, KHÔNG chứa chữ "Memoria:". Ngắn gọn dưới 50 từ.`;

    const gemini = new GeminiService();
    try {
      const response = await gemini.chat([{role: 'user', parts: [{text: "Hãy chủ động nhắn 1 tin cho tôi dựa vào ngữ cảnh hiện tại."}]}], systemInstruction);
      if (response && response.text && response.text.trim().length > 0) {
        const msg = response.text.trim();
        
        // Lưu vào lịch sử chat
        const history = data.chatHistoryData || [];
        history.push({ role: 'ai', text: msg, timestamp: Date.now() });
        chrome.storage.local.set({ chatHistoryData: history }, () => {
           // Báo hiệu badge
           chrome.action.setBadgeText({ text: '1' });
           chrome.action.setBadgeBackgroundColor({ color: '#10b981' }); // Màu xanh của app
           
           // Nảy notification
           chrome.notifications.create({
              type: 'basic',
              iconUrl: "icons/icon128.png", 
              title: 'Memoria AI',
              message: msg,
              priority: 1
           });
           
           // Báo cho UI (nếu đang mở panel chat) cập nhật
           chrome.runtime.sendMessage({ action: "new_ai_proactive_msg" }).catch(() => {});
        });
      }
    } catch (err) {
      console.error("Proactive AI Error:", err);
    }
  });
}

// Bật alarm cho ai nếu chưa có
chrome.alarms.get("proactive_ai", (al) => {
  if (!al) {
    chrome.storage.local.get({ aiSettings: { enabled: true, period: 60 } }, (data) => {
       if (data.aiSettings.enabled) {
          chrome.alarms.create("proactive_ai", { periodInMinutes: data.aiSettings.period });
       }
    });
  }
});

// Lắng nghe lệnh test thủ công
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "force_proactive_ai") {
    handleProactiveAI();
    sendResponse({status: "started"});
  }
});
