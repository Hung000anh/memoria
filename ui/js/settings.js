document.addEventListener('DOMContentLoaded', () => {
  const newKeyInput = document.getElementById('newKeyInput');
  const addKeyBtn = document.getElementById('addKeyBtn');
  const keyList = document.getElementById('keyList');

  // Load danh sách key từ storage
  function loadKeys() {
    chrome.storage.local.get({ geminiKeys: [] }, (data) => {
      let keysModified = false;
      let keys = data.geminiKeys.map(k => {
        if (k.key && k.key.startsWith('AIza')) {
          k.key = window.utils.xorHexEncrypt(k.key, 'memoria_secret_salt_2024');
          keysModified = true;
        }
        return k;
      });

      if (keysModified) {
        chrome.storage.local.set({ geminiKeys: keys }, () => renderKeys(keys));
      } else {
        renderKeys(keys);
      }
    });
  }

  // Render danh sách key ra UI
  function renderKeys(keys) {
    keyList.innerHTML = '';
    if (keys.length === 0) {
      keyList.innerHTML = '<li class="key-item"><span style="color:#6b7280; font-size:14px;">Chưa có key nào. Vui lòng thêm ít nhất 1 key.</span></li>';
      return;
    }

    keys.forEach((keyObj, index) => {
      const li = document.createElement('li');
      li.className = 'key-item';

      const statusClass = keyObj.status === 'DEAD' ? 'status-dead' : 'status-active';
      const statusText = keyObj.status === 'DEAD' ? 'Bị khóa/Lỗi (DEAD)' : 'Hoạt động (ACTIVE)';

      // Mask key cho bảo mật
      let rawKey = keyObj.key;
      if (!rawKey.startsWith('AIza')) {
        rawKey = window.utils.xorHexDecrypt(rawKey, 'memoria_secret_salt_2024') || rawKey;
      }
      const maskedKey = rawKey.substring(0, 15) + '...';

      li.innerHTML = `
        <div class="key-info">
          <span class="key-string">${maskedKey}</span>
          <span class="key-status ${statusClass}">${statusText}</span>
        </div>
        <button class="btn-delete" data-index="${index}">Xóa</button>
      `;
      keyList.appendChild(li);
    });

    // Thêm event listener cho các nút xóa
    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.getAttribute('data-index'));
        deleteKey(index);
      });
    });
  }

  // Thêm key mới
  addKeyBtn.addEventListener('click', () => {
    const keyVal = newKeyInput.value.trim();
    if (!keyVal) return;

    chrome.storage.local.get({ geminiKeys: [] }, (data) => {
      let keys = data.geminiKeys;
      // Kiểm tra trùng lặp (giải mã để so sánh)
      if (keys.find(k => {
        let raw = k.key;
        if (!raw.startsWith('AIza')) raw = window.utils.xorHexDecrypt(raw, 'memoria_secret_salt_2024') || raw;
        return raw === keyVal;
      })) {
        alert("Key này đã tồn tại trong danh sách!");
        return;
      }

      keys.push({
        key: window.utils.xorHexEncrypt(keyVal, 'memoria_secret_salt_2024'),
        status: 'ACTIVE'
      });

      chrome.storage.local.set({ geminiKeys: keys }, () => {
        newKeyInput.value = '';
        loadKeys();
      });
    });
  });

  // Xóa key
  function deleteKey(index) {
    if (!confirm("Bạn có chắc muốn xóa Key này không?")) return;
    chrome.storage.local.get({ geminiKeys: [] }, (data) => {
      let keys = data.geminiKeys;
      keys.splice(index, 1);
      chrome.storage.local.set({ geminiKeys: keys }, () => {
        loadKeys();
      });
    });
  }

  // Khởi chạy
  loadKeys();

  // --- Logic Cài đặt AI Chủ động ---
  const aiEnabled = document.getElementById('aiEnabled');
  const aiPeriod = document.getElementById('aiPeriod');
  const aiSleepStart = document.getElementById('aiSleepStart');
  const aiSleepEnd = document.getElementById('aiSleepEnd');
  const saveAiSettingsBtn = document.getElementById('saveAiSettingsBtn');
  const testAiBtn = document.getElementById('testAiBtn');
  const aiSaveMsg = document.getElementById('aiSaveMsg');

  function loadAiSettings() {
    chrome.storage.local.get({ aiSettings: { enabled: true, period: 60, sleepStart: 23, sleepEnd: 6 } }, (data) => {
      const s = data.aiSettings;
      if (aiEnabled) aiEnabled.checked = s.enabled;
      if (aiPeriod) aiPeriod.value = s.period;
      if (aiSleepStart) aiSleepStart.value = s.sleepStart;
      if (aiSleepEnd) aiSleepEnd.value = s.sleepEnd;
    });
  }

  if (saveAiSettingsBtn) {
    saveAiSettingsBtn.addEventListener('click', () => {
      const s = {
        enabled: aiEnabled.checked,
        period: parseInt(aiPeriod.value) || 60,
        sleepStart: parseInt(aiSleepStart.value) || 0,
        sleepEnd: parseInt(aiSleepEnd.value) || 0
      };
      chrome.storage.local.set({ aiSettings: s }, () => {
        // Cập nhật lại chu kỳ báo thức nếu bật
        if (s.enabled) {
          chrome.alarms.create("proactive_ai", { periodInMinutes: s.period });
        } else {
          chrome.alarms.clear("proactive_ai");
        }

        aiSaveMsg.style.display = 'block';
        setTimeout(() => aiSaveMsg.style.display = 'none', 3000);
      });
    });
  }

  if (testAiBtn) {
    testAiBtn.addEventListener('click', () => {
      testAiBtn.innerText = "Đang chạy...";
      testAiBtn.disabled = true;
      chrome.runtime.sendMessage({ action: "force_proactive_ai" }, (res) => {
        setTimeout(() => {
          testAiBtn.innerText = "Test thử ngay";
          testAiBtn.disabled = false;
        }, 1500);
      });
    });
  }

  loadAiSettings();

  // --- Logic Cài đặt Dịch thuật ---
  const translateTargetLang = document.getElementById('translateTargetLang');
  const saveTranslateSettingsBtn = document.getElementById('saveTranslateSettingsBtn');
  const translateSaveMsg = document.getElementById('translateSaveMsg');

  // --- Logic Cài đặt Bẻ khóa Sao chép ---
  const allowCopyEnabled = document.getElementById('allowCopyEnabled');
  const allowCopyExclude = document.getElementById('allowCopyExclude');
  const saveCopySettingsBtn = document.getElementById('saveCopySettingsBtn');
  const copySaveMsg = document.getElementById('copySaveMsg');

  function loadTranslateSettings() {
    chrome.storage.local.get({ translateTargetLang: 'vi', allowCopy: false, allowCopyExcludeDomains: [] }, (data) => {
      if (translateTargetLang) translateTargetLang.value = data.translateTargetLang;
      if (allowCopyEnabled) allowCopyEnabled.checked = data.allowCopy;
      if (allowCopyExclude) {
        allowCopyExclude.value = data.allowCopyExcludeDomains.join('\n');
      }
    });
  }

  if (saveTranslateSettingsBtn) {
    saveTranslateSettingsBtn.addEventListener('click', () => {
      const lang = translateTargetLang.value;
      chrome.storage.local.set({ translateTargetLang: lang }, () => {
        translateSaveMsg.style.display = 'block';
        setTimeout(() => translateSaveMsg.style.display = 'none', 3000);
      });
    });
  }

  if (saveCopySettingsBtn) {
    saveCopySettingsBtn.addEventListener('click', () => {
      const copyVal = allowCopyEnabled ? allowCopyEnabled.checked : false;
      const excludeDomains = allowCopyExclude
        ? allowCopyExclude.value.split('\n')
          .map(d => {
            let cleaned = d.trim().toLowerCase();
            if (!cleaned) return '';
            // Thêm tiền tố http nếu người dùng nhập dạng url hoặc domain để new URL hoạt động
            if (!/^https?:\/\//i.test(cleaned)) {
              cleaned = 'http://' + cleaned;
            }
            try {
              // Trích xuất hostname
              return new URL(cleaned).hostname;
            } catch (e) {
              return d.trim().toLowerCase();
            }
          })
          .filter(Boolean)
        : [];

      chrome.storage.local.set({
        allowCopy: copyVal,
        allowCopyExcludeDomains: excludeDomains
      }, () => {
        if (allowCopyExclude) {
          allowCopyExclude.value = excludeDomains.join('\n');
        }
        copySaveMsg.style.display = 'block';
        setTimeout(() => copySaveMsg.style.display = 'none', 3000);
      });
    });
  }

  // --- Custom Navigator Settings ---
  const navOrderList = document.getElementById('navOrderList');
  const saveNavSettingsBtn = document.getElementById('saveNavSettingsBtn');
  const navSaveMsg = document.getElementById('navSaveMsg');

  const defaultTabs = [
    { id: "dashboard", name: "Tổng quan" },
    { id: "chat", name: "AI Chat" },
    { id: "translate-side-view", name: "Dịch thuật" },
    { id: "clipboard-view", name: "Clipboard" },
    { id: "tasks-view", name: "Công việc" },
    { id: "notes-view", name: "Ghi chú" },
    { id: "schedule-view", name: "Sự kiện" },
    { id: "reminders-view", name: "Hẹn giờ" },
    { id: "weather-view", name: "Thời tiết" },
    { id: "stats-view", name: "Thống kê" },
    { id: "converter-view", name: "Chuyển đổi" },
  ];

  let navSettings = [];

  function loadNavSettings() {
    chrome.storage.local.get({ navigatorSettings: null }, (data) => {
      if (data.navigatorSettings) {
        navSettings = data.navigatorSettings;
        // Bổ sung tab mới nếu thiếu
        defaultTabs.forEach(defTab => {
          if (!navSettings.find(t => t.id === defTab.id)) {
            navSettings.push({ id: defTab.id, name: defTab.name, visible: true });
          }
        });
      } else {
        navSettings = defaultTabs.map(t => ({ id: t.id, name: t.name, visible: true }));
      }
      renderNavSettings();
    });
  }

  let draggedIdx = null;

  function renderNavSettings() {
    if (!navOrderList) return;
    navOrderList.innerHTML = '';

    navSettings.forEach((item, index) => {
      const li = document.createElement('li');
      li.draggable = true;
      li.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 8px; font-size: 14px; color: var(--text-color); cursor: grab; transition: background-color 0.2s;';

      li.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; pointer-events: none; width: 100%;">
          <span style="color: var(--text-muted); font-size: 16px; margin-right: 4px; user-select: none;">☰</span>
          <input type="checkbox" id="chk-${item.id}" ${item.visible ? 'checked' : ''} style="width: auto; cursor: pointer; pointer-events: auto; margin: 0;">
          <label for="chk-${item.id}" style="cursor: pointer; font-weight: 500; margin: 0; user-select: none; pointer-events: auto;">${item.name}</label>
        </div>
      `;
      navOrderList.appendChild(li);

      const chk = li.querySelector(`#chk-${item.id}`);
      chk.addEventListener('change', (e) => {
        item.visible = e.target.checked;
      });

      // Drag and Drop Events
      li.addEventListener('dragstart', (e) => {
        draggedIdx = index;
        li.style.opacity = '0.5';
        e.dataTransfer.effectAllowed = 'move';
      });

      li.addEventListener('dragend', () => {
        draggedIdx = null;
        li.style.opacity = '1';
        navOrderList.querySelectorAll('li').forEach(item => {
          item.style.borderTop = '';
          item.style.borderBottom = '';
        });
      });

      li.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        const rect = li.getBoundingClientRect();
        const next = (e.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;

        navOrderList.querySelectorAll('li').forEach(item => {
          item.style.borderTop = '';
          item.style.borderBottom = '';
        });

        if (next) {
          li.style.borderBottom = '2px solid var(--primary)';
        } else {
          li.style.borderTop = '2px solid var(--primary)';
        }
      });

      li.addEventListener('drop', (e) => {
        e.preventDefault();
        const rect = li.getBoundingClientRect();
        const next = (e.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;

        let targetIdx = index;
        if (draggedIdx !== null && draggedIdx !== targetIdx) {
          const [draggedItem] = navSettings.splice(draggedIdx, 1);
          if (draggedIdx < targetIdx) {
            navSettings.splice(next ? targetIdx : targetIdx - 1, 0, draggedItem);
          } else {
            navSettings.splice(next ? targetIdx + 1 : targetIdx, 0, draggedItem);
          }
          renderNavSettings();
        }
      });
    });
  }

  if (saveNavSettingsBtn) {
    saveNavSettingsBtn.addEventListener('click', () => {
      chrome.storage.local.set({ navigatorSettings: navSettings }, () => {
        navSaveMsg.style.display = 'block';
        setTimeout(() => navSaveMsg.style.display = 'none', 3000);
      });
    });
  }

  loadTranslateSettings();
  loadNavSettings();
});
