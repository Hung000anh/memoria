document.addEventListener('DOMContentLoaded', () => {
  // --- Logic Clipboard ---
  const clipboardList = document.getElementById('clipboardList');
  const clipboardSearchInput = document.getElementById('clipboardSearchInput');
  const clipboardSourceSelect = document.getElementById('clipboardSourceSelect');
  const clearClipboardBtn = document.getElementById('clearClipboardBtn');

  function updateSourceDropdown(history) {
    if (!clipboardSourceSelect) return;
    const currentVal = clipboardSourceSelect.value;
    const sources = [...new Set(history.map(item => item.source))].filter(Boolean);

    clipboardSourceSelect.innerHTML = '<option value="">Tất cả nguồn</option>';
    sources.forEach(src => {
      const opt = document.createElement('option');
      opt.value = src;
      opt.textContent = src;
      clipboardSourceSelect.appendChild(opt);
    });

    if (sources.includes(currentVal)) {
      clipboardSourceSelect.value = currentVal;
    }
  }

  function removeVietnameseAccents(str) {
    if (!str) return '';
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .toLowerCase();
  }

  function loadClipboard() {
    chrome.storage.local.get({ clipboardHistory: [] }, (data) => {
      if (!clipboardList) return;
      const history = data.clipboardHistory;

      updateSourceDropdown(history);

      const searchText = clipboardSearchInput ? removeVietnameseAccents(clipboardSearchInput.value.trim()) : '';
      const sourceFilter = clipboardSourceSelect ? clipboardSourceSelect.value : '';

      clipboardList.innerHTML = '';

      const filtered = history.filter(item => {
        const normalizedItemText = removeVietnameseAccents(item.text);
        const matchText = normalizedItemText.includes(searchText);
        const matchSource = sourceFilter === '' || item.source === sourceFilter;
        return matchText && matchSource;
      });

      if (filtered.length === 0) {
        clipboardList.innerHTML = '<li class="list-item"><div class="list-item-content" style="color: var(--text-muted)">Không có dữ liệu.</div></li>';
      } else {
        filtered.forEach((item) => {
          const originalIndex = history.indexOf(item);
          const li = document.createElement('li');
          li.className = 'list-item';

          let timeHtml = '';
          if (item.timestamp) {
            const date = new Date(item.timestamp);
            if (!isNaN(date.getTime())) {
              const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')} - ${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
              timeHtml = `<span style="display: inline-flex; align-items: center; gap: 4px; margin-right: 12px;"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> ${timeStr}</span>`;
            }
          }

          const innerSource = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg> ${item.source}`;
          const sourceHtml = item.source ? (item.url ? `<a href="${item.url}" target="_blank" style="display: inline-flex; align-items: center; gap: 4px; text-decoration: none; color: var(--primary); font-weight: 500;" title="Mở trang gốc">${innerSource}</a>` : `<span style="display: inline-flex; align-items: center; gap: 4px;">${innerSource}</span>`) : '';

          li.innerHTML = `
            <div class="list-item-content">
              <div style="white-space: pre-wrap; word-break: break-word; font-size: 13px; display: -webkit-box; -webkit-line-clamp: 5; -webkit-box-orient: vertical; overflow: hidden;">${item.text}</div>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 6px; display: flex; align-items: center; flex-wrap: wrap;">
                ${timeHtml}
                ${sourceHtml}
              </div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px; align-items: center;">
              <button class="btn-copy" data-index="${originalIndex}" title="Copy lại"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
              <button class="btn-delete" data-index="${originalIndex}" title="Xóa"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
            </div>
          `;

          if (item.url) {
            li.style.cursor = 'pointer';
            li.title = 'Nhấn vào để mở trang gốc';
            li.addEventListener('click', (e) => {
              if (window.getSelection().toString().length > 0) return; // Đang bôi đen chữ thì không mở link
              if (e.target.closest('button') || e.target.closest('a')) return; // Bấm vào nút thì bỏ qua
              window.open(item.url, '_blank');
            });

            // Hover effect for the whole block
            li.addEventListener('mouseenter', () => li.style.borderColor = 'var(--primary)');
            li.addEventListener('mouseleave', () => li.style.borderColor = 'var(--border-color)');
          }

          clipboardList.appendChild(li);
        });

        clipboardList.querySelectorAll('.btn-delete').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const idx = parseInt(e.currentTarget.getAttribute('data-index'));
            deleteClipboardItem(idx);
          });
        });

        clipboardList.querySelectorAll('.btn-copy').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const idx = parseInt(e.currentTarget.getAttribute('data-index'));
            chrome.storage.local.get({ clipboardHistory: [] }, (storageData) => {
              const text = storageData.clipboardHistory[idx].text;
              navigator.clipboard.writeText(text).then(() => {
                const originalText = e.currentTarget.innerHTML;
                e.currentTarget.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
                setTimeout(() => { e.currentTarget.innerHTML = originalText; }, 1000);
              });
            });
          });
        });
      }
    });
  }

  function deleteClipboardItem(index) {
    chrome.storage.local.get({ clipboardHistory: [] }, (data) => {
      const history = data.clipboardHistory;
      history.splice(index, 1);
      chrome.storage.local.set({ clipboardHistory: history }, loadClipboard);
    });
  }

  if (clipboardSearchInput) clipboardSearchInput.addEventListener('input', loadClipboard);
  if (clipboardSourceSelect) clipboardSourceSelect.addEventListener('change', loadClipboard);
  if (clearClipboardBtn) {
    clearClipboardBtn.addEventListener('click', () => {
      if (confirm('Bạn có chắc chắn muốn xóa tất cả lịch sử clipboard không?')) {
        chrome.storage.local.set({ clipboardHistory: [] }, loadClipboard);
      }
    });
  }

  // Lắng nghe sự thay đổi từ storage (khi background script thêm clipboard mới)
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.clipboardHistory) {
      loadClipboard();
    }
  });

  // Initialize
  loadClipboard();
});
