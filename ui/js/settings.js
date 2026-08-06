document.addEventListener('DOMContentLoaded', () => {
  const newKeyInput = document.getElementById('newKeyInput');
  const addKeyBtn = document.getElementById('addKeyBtn');
  const keyList = document.getElementById('keyList');

  const t = (key) => window.i18n ? window.i18n.t(key) : key;

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
      keyList.innerHTML = `<li class="key-item"><span style="color:#6b7280; font-size:14px;">${t('stg_keys_no_key')}</span></li>`;
      return;
    }

    keys.forEach((keyObj, index) => {
      const li = document.createElement('li');
      li.className = 'key-item';

      const statusClass = keyObj.status === 'DEAD' ? 'status-dead' : 'status-active';
      const statusText = keyObj.status === 'DEAD' ? t('stg_keys_status_dead') : t('stg_keys_status_active');

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
        <button class="btn-delete" data-index="${index}">${t('btn_delete')}</button>
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
        alert(t('stg_keys_exists'));
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
    if (!confirm(t('stg_keys_confirm_delete'))) return;
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

  // --- Logic Cài đặt Dịch thuật ---
  const translateTargetLang = document.getElementById('translateTargetLang');
  const translateSecondaryTargetLang = document.getElementById('translateSecondaryTargetLang');
  const saveTranslateSettingsBtn = document.getElementById('saveTranslateSettingsBtn');
  const translateSaveMsg = document.getElementById('translateSaveMsg');

  // --- Logic Cài đặt Quyền riêng tư & Clipboard ---
  const enableClipboardHistory = document.getElementById('enableClipboardHistory');
  const includeClipboardInAIChat = document.getElementById('includeClipboardInAIChat');
  const savePrivacySettingsBtn = document.getElementById('savePrivacySettingsBtn');
  const privacySaveMsg = document.getElementById('privacySaveMsg');

  // --- Logic Cài đặt Bẻ khóa Sao chép ---
  const allowCopyEnabled = document.getElementById('allowCopyEnabled');
  const allowCopyExclude = document.getElementById('allowCopyExclude');
  const saveCopySettingsBtn = document.getElementById('saveCopySettingsBtn');
  const copySaveMsg = document.getElementById('copySaveMsg');

  function loadTranslateSettings() {
    chrome.storage.local.get({
      translateTargetLang: 'vi',
      translateSecondaryTargetLang: 'en',
      allowCopy: false,
      allowCopyExcludeDomains: [],
      enableClipboardHistory: true,
      includeClipboardInAIChat: true
    }, (data) => {
      if (translateTargetLang) translateTargetLang.value = data.translateTargetLang;
      if (translateSecondaryTargetLang) translateSecondaryTargetLang.value = data.translateSecondaryTargetLang;
      if (allowCopyEnabled) allowCopyEnabled.checked = data.allowCopy;
      if (allowCopyExclude) {
        allowCopyExclude.value = data.allowCopyExcludeDomains.join('\n');
      }
      if (enableClipboardHistory) enableClipboardHistory.checked = data.enableClipboardHistory;
      if (includeClipboardInAIChat) includeClipboardInAIChat.checked = data.includeClipboardInAIChat;
    });
  }

  if (savePrivacySettingsBtn) {
    savePrivacySettingsBtn.addEventListener('click', () => {
      const clipVal = enableClipboardHistory ? enableClipboardHistory.checked : true;
      const aiClipVal = includeClipboardInAIChat ? includeClipboardInAIChat.checked : true;
      chrome.storage.local.set({ enableClipboardHistory: clipVal, includeClipboardInAIChat: aiClipVal }, () => {
        privacySaveMsg.style.display = 'block';
        setTimeout(() => privacySaveMsg.style.display = 'none', 3000);
      });
    });
  }

  if (saveTranslateSettingsBtn) {
    saveTranslateSettingsBtn.addEventListener('click', () => {
      const lang = translateTargetLang.value;
      const secLang = translateSecondaryTargetLang ? translateSecondaryTargetLang.value : 'en';
      chrome.storage.local.set({ translateTargetLang: lang, translateSecondaryTargetLang: secLang }, () => {
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
            if (!/^https?:\/\//i.test(cleaned)) {
              cleaned = 'http://' + cleaned;
            }
            try {
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

  function getDefaultTabs() {
    return [
      { id: "chat", name: t('nav_chat') },
      { id: "translate-side-view", name: t('nav_translate') },
      { id: "clipboard-view", name: t('nav_clipboard') },
      { id: "notes-view", name: t('nav_notes') },
      { id: "reminders-view", name: t('nav_reminders') },
      { id: "weather-view", name: t('nav_weather') }
    ];
  }

  let navSettings = [];

  function loadNavSettings() {
    const defaultTabs = getDefaultTabs();
    chrome.storage.local.get({ navigatorSettings: null }, (data) => {
      if (data.navigatorSettings) {
        navSettings = data.navigatorSettings.filter(t => defaultTabs.some(def => def.id === t.id));
        defaultTabs.forEach(defTab => {
          const existing = navSettings.find(t => t.id === defTab.id);
          if (existing) {
            existing.name = defTab.name;
          } else {
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

  // Lắng nghe thay đổi ngôn ngữ hoặc thay đổi cấu hình dịch thuật để re-render dynamic strings & select values
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      if (changes.appLanguage) {
        loadKeys();
        loadNavSettings();
      }
      if (changes.translateTargetLang || changes.translateSecondaryTargetLang) {
        loadTranslateSettings();
      }
    }
  });

  // --- Logic Mở trang Shortcuts của Chrome ---
  const openShortcutsBtn = document.getElementById('openShortcutsBtn');
  if (openShortcutsBtn) {
    openShortcutsBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
    });
  }
});
