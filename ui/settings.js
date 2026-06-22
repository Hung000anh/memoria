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
  const allowCopyEnabled = document.getElementById('allowCopyEnabled');
  const saveTranslateSettingsBtn = document.getElementById('saveTranslateSettingsBtn');
  const translateSaveMsg = document.getElementById('translateSaveMsg');

  function loadTranslateSettings() {
    chrome.storage.local.get({ translateTargetLang: 'vi', allowCopy: false }, (data) => {
      if (translateTargetLang) translateTargetLang.value = data.translateTargetLang;
      if (allowCopyEnabled) allowCopyEnabled.checked = data.allowCopy;
    });
  }

  if (saveTranslateSettingsBtn) {
    saveTranslateSettingsBtn.addEventListener('click', () => {
      const lang = translateTargetLang.value;
      const copyVal = allowCopyEnabled ? allowCopyEnabled.checked : false;
      chrome.storage.local.set({ translateTargetLang: lang, allowCopy: copyVal }, () => {
        translateSaveMsg.style.display = 'block';
        setTimeout(() => translateSaveMsg.style.display = 'none', 3000);
      });
    });
  }

  loadTranslateSettings();
});
