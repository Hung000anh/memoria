document.addEventListener('DOMContentLoaded', () => {
  const tslInput = document.getElementById('tslInput');
  const tslTranslateBtn = document.getElementById('tslTranslateBtn');
  const tslResult = document.getElementById('tslResult');
  const tslCopyBtn = document.getElementById('tslCopyBtn');

  if (!tslInput || !tslTranslateBtn || !tslResult) return;

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
});
