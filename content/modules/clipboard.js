// Content script lắng nghe sự kiện copy
document.addEventListener("copy", () => {
  // Lấy ô đang được focus
  const activeEl = document.activeElement;

  // Bỏ qua nếu đang copy trong ô input/textarea mật khẩu
  if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
    if (activeEl.type === 'password' || activeEl.getAttribute('autocomplete') === 'current-password') {
      return;
    }
  }

  // Lấy text vừa bôi đen
  let copiedText = window.getSelection().toString();

  // Nếu không lấy được, kiểm tra xem người dùng có đang copy từ ô input/textarea thông thường không
  if (!copiedText && activeEl) {
    if (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') {
      try {
        copiedText = activeEl.value.substring(activeEl.selectionStart, activeEl.selectionEnd);
      } catch (e) {}
    }
  }

  if (copiedText && copiedText.trim().length > 0) {
    const text = copiedText.trim();

    // Lọc loại bỏ dữ liệu nhạy cảm (Thẻ tín dụng / JWT token)
    const isCreditCard = /\b(?:\d[ -]*?){13,16}\b/.test(text);
    const isJwt = /^eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/.test(text);

    if (isCreditCard || isJwt) {
      return;
    }

    try {
      if (chrome.runtime?.id) {
        chrome.runtime.sendMessage({
          action: "save_clipboard",
          text: text,
          source: window.location.hostname || "Không rõ nguồn",
          url: window.location.href || ""
        });
      }
    } catch (e) {
      // Bỏ qua lỗi context invalidated khi extension vừa được reload
    }
  }
}, true);
