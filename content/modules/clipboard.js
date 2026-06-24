// Content script lắng nghe sự kiện copy
document.addEventListener("copy", () => {
  // Lấy text vừa bôi đen
  let copiedText = window.getSelection().toString();
  
  // Nếu không lấy được, kiểm tra xem người dùng có đang copy từ ô input/textarea không
  if (!copiedText && document.activeElement) {
    const el = document.activeElement;
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      try {
        copiedText = el.value.substring(el.selectionStart, el.selectionEnd);
      } catch (e) {}
    }
  }

  if (copiedText && copiedText.trim().length > 0) {
    chrome.runtime.sendMessage({
      action: "save_clipboard",
      text: copiedText.trim(),
      source: window.location.hostname || "Không rõ nguồn",
      url: window.location.href || ""
    });
  }
}, true);
