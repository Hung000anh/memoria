// background/services/timeTracker.js

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

// Khởi chạy alarm khi cài đặt
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("screenTimeTracker", { periodInMinutes: 1 });
});

// Lắng nghe alarm cho screenTimeTracker
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "screenTimeTracker") {
    flushTime();
  }
});
