document.addEventListener('DOMContentLoaded', () => {
  const tslInput = document.getElementById('tslInput');
  const tslTranslateBtn = document.getElementById('tslTranslateBtn');
  const tslResult = document.getElementById('tslResult');
  const tslCopyBtn = document.getElementById('tslCopyBtn');
  const tslHistoryList = document.getElementById('tslHistoryList');
  const clearTslHistoryBtn = document.getElementById('clearTslHistoryBtn');

  const viewTranslateHistoryModal = document.getElementById('viewTranslateHistoryModal');
  const tslHistoryOriginal = document.getElementById('tslHistoryOriginal');
  const tslHistoryTranslated = document.getElementById('tslHistoryTranslated');
  const closeViewTslHistoryBtn = document.getElementById('closeViewTslHistoryBtn');

  if (!tslInput || !tslTranslateBtn || !tslResult) return;

  // Render danh sách lịch sử dịch
  const renderHistory = () => {
    chrome.storage.local.get({ translateHistory: [] }, (data) => {
      const history = data.translateHistory;
      if (!tslHistoryList) return;

      if (history.length === 0) {
        const emptyText = window.i18n ? window.i18n.t('tsl_history_empty') : 'Chưa có lịch sử dịch';
        tslHistoryList.innerHTML = `<li style="color: var(--text-muted); font-style: italic; font-size: 13px; text-align: center; padding: 12px 0;">${emptyText}</li>`;
        if (clearTslHistoryBtn) clearTslHistoryBtn.style.display = 'none';
        return;
      }

      if (clearTslHistoryBtn) clearTslHistoryBtn.style.display = 'block';
      tslHistoryList.innerHTML = '';

      history.forEach((item, index) => {
        const li = document.createElement('li');
        li.className = 'list-item';
        li.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; border: 1px solid var(--border-color); border-radius: 6px; margin-bottom: 6px; background: var(--card-bg); cursor: pointer; transition: background 0.2s;';
        li.addEventListener('mouseover', () => li.style.background = 'var(--border-color)');
        li.addEventListener('mouseout', () => li.style.background = 'var(--card-bg)');

        // Thân mục lịch sử: chứa text rút gọn
        const contentDiv = document.createElement('div');
        contentDiv.style.cssText = 'flex: 1; min-width: 0; padding-right: 8px; display: flex; flex-direction: column; gap: 2px;';

        const origText = item.original.length > 35 ? item.original.substring(0, 32) + '...' : item.original;
        const transText = item.translated.length > 35 ? item.translated.substring(0, 32) + '...' : item.translated;

        contentDiv.innerHTML = `
          <div style="font-size: 13px; font-weight: 500; color: var(--text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(origText)}</div>
          <div style="font-size: 12px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(transText)}</div>
        `;

        // Click để xem modal song song
        contentDiv.addEventListener('click', (e) => {
          e.stopPropagation();
          showHistoryModal(item);
        });

        // Nút xóa mục lịch sử lẻ
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-delete';
        deleteBtn.style.padding = '4px';
        deleteBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
        deleteBtn.title = window.i18n ? window.i18n.t('btn_delete') : 'Xóa';
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteHistoryItem(index);
        });

        li.appendChild(contentDiv);
        li.appendChild(deleteBtn);
        tslHistoryList.appendChild(li);
      });
    });
  };

  // Helper escape HTML bảo mật
  const escapeHtml = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  // Lưu bản dịch mới vào lịch sử
  const saveToHistory = (original, translated) => {
    chrome.storage.local.get({ translateHistory: [] }, (data) => {
      const history = data.translateHistory;
      // Tránh trùng lặp nội dung giống hệt ở đầu danh sách
      if (history.length > 0 && history[0].original === original && history[0].translated === translated) {
        return;
      }
      history.unshift({ original, translated, timestamp: Date.now() });
      // Giới hạn tối đa 50 bản dịch trong lịch sử
      if (history.length > 50) history.pop();
      chrome.storage.local.set({ translateHistory: history }, () => {
        renderHistory();
      });
    });
  };

  // Xóa mục lịch sử lẻ
  const deleteHistoryItem = (index) => {
    chrome.storage.local.get({ translateHistory: [] }, (data) => {
      const history = data.translateHistory;
      history.splice(index, 1);
      chrome.storage.local.set({ translateHistory: history }, () => {
        renderHistory();
      });
    });
  };

  // Hiển thị modal so sánh song song
  const showHistoryModal = (item) => {
    if (!viewTranslateHistoryModal || !tslHistoryOriginal || !tslHistoryTranslated) return;
    tslHistoryOriginal.textContent = item.original;
    tslHistoryTranslated.textContent = item.translated;
    viewTranslateHistoryModal.style.display = 'flex';
  };

  // Đóng modal song song
  if (closeViewTslHistoryBtn && viewTranslateHistoryModal) {
    closeViewTslHistoryBtn.addEventListener('click', () => {
      viewTranslateHistoryModal.style.display = 'none';
    });

    viewTranslateHistoryModal.addEventListener('click', (e) => {
      if (e.target === viewTranslateHistoryModal) {
        viewTranslateHistoryModal.style.display = 'none';
      }
    });
  }

  // Xóa toàn bộ lịch sử dịch
  if (clearTslHistoryBtn) {
    clearTslHistoryBtn.addEventListener('click', () => {
      const confirmText = window.i18n ? window.i18n.t('tsl_history_confirm_clear') : 'Xóa toàn bộ lịch sử dịch thuật?';
      if (confirm(confirmText)) {
        chrome.storage.local.set({ translateHistory: [] }, () => {
          renderHistory();
        });
      }
    });
  }

  const handleTranslate = () => {
    const text = tslInput.value.trim();
    if (!text) {
      tslResult.textContent = '';
      tslCopyBtn.style.display = 'none';
      return;
    }

    tslTranslateBtn.disabled = true;
    tslTranslateBtn.textContent = 'Đang dịch...';
    tslResult.innerHTML = '<span style="color: var(--text-muted); font-style: italic;">Đang lấy bản dịch...</span>';
    tslCopyBtn.style.display = 'none';

    // Gửi message qua background service đã có sẵn
    chrome.runtime.sendMessage({ action: "translate_text", text: text }, (response) => {
      tslTranslateBtn.disabled = false;
      tslTranslateBtn.textContent = 'Dịch';

      if (response && response.success) {
        tslResult.textContent = response.translatedText;
        tslCopyBtn.style.display = 'block';
        saveToHistory(text, response.translatedText);
      } else {
        tslResult.innerHTML = `<span style="color: #ef4444;">Lỗi: ${response ? response.error : 'Không phản hồi'}</span>`;
      }
    });
  };

  tslTranslateBtn.addEventListener('click', handleTranslate);

  // Hỗ trợ phím tắt Ctrl + Enter để dịch nhanh
  tslInput.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleTranslate();
    }
  });

  // Chức năng copy kết quả
  if (tslCopyBtn) {
    tslCopyBtn.addEventListener('click', async () => {
      const textToCopy = tslResult.textContent;
      if (textToCopy) {
        try {
          await navigator.clipboard.writeText(textToCopy);
          const originalIcon = tslCopyBtn.innerHTML;
          tslCopyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
          setTimeout(() => {
             tslCopyBtn.innerHTML = originalIcon;
          }, 2000);
        } catch (err) {
          console.error('Failed to copy', err);
        }
      }
    });
  }

  // Khởi chạy render danh sách lịch sử khi tải trang
  renderHistory();

  // Lắng nghe thay đổi ngôn ngữ để cập nhật UI lịch sử dịch
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.appLanguage) {
      renderHistory();
    }
  });
});
