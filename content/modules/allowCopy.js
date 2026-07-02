// --- Tính năng Bẻ khóa bôi đen & Sao chép (Simple Allow Copy) ---
let dauxanhAllowCopyActive = false;

function dauxanhAllowCopyEventHandler(e) {
  e.stopPropagation();
}

function enableDauxanhAllowCopy() {
  if (dauxanhAllowCopyActive) return;
  dauxanhAllowCopyActive = true;
  
  // Đánh dấu thuộc tính trạng thái kích hoạt trên DOM để Main World Script nhận biết
  document.documentElement.setAttribute('dauxanh-allow-copy-active', 'true');

  // Bơm style ép bôi đen
  if (!document.getElementById("dauxanh-allow-copy-style")) {
    const style = document.createElement("style");
    style.id = "dauxanh-allow-copy-style";
    style.textContent = `
      * {
        user-select: text !important;
        -webkit-user-select: text !important;
        -ms-user-select: text !important;
        -moz-user-select: text !important;
      }
    `;
    document.documentElement.appendChild(style);
  }

  // Đăng ký bắt sự kiện ở capture phase để chặn web can thiệp
  document.addEventListener("copy", dauxanhAllowCopyEventHandler, true);
  document.addEventListener("cut", dauxanhAllowCopyEventHandler, true);
  document.addEventListener("contextmenu", dauxanhAllowCopyEventHandler, true);
  document.addEventListener("selectstart", dauxanhAllowCopyEventHandler, true);
  document.addEventListener("dragstart", dauxanhAllowCopyEventHandler, true);
}

function disableDauxanhAllowCopy() {
  if (!dauxanhAllowCopyActive) return;
  dauxanhAllowCopyActive = false;

  // Đặt lại thuộc tính trạng thái kích hoạt trên DOM
  document.documentElement.setAttribute('dauxanh-allow-copy-active', 'false');

  const style = document.getElementById("dauxanh-allow-copy-style");
  if (style) style.remove();

  document.removeEventListener("copy", dauxanhAllowCopyEventHandler, true);
  document.removeEventListener("cut", dauxanhAllowCopyEventHandler, true);
  document.removeEventListener("contextmenu", dauxanhAllowCopyEventHandler, true);
  document.removeEventListener("selectstart", dauxanhAllowCopyEventHandler, true);
  document.removeEventListener("dragstart", dauxanhAllowCopyEventHandler, true);
}

function evaluateDauxanhAllowCopy() {
  chrome.storage.local.get({ allowCopy: false, allowCopyExcludeDomains: [] }, (data) => {
    const currentHost = window.location.hostname;
    const isExcluded = data.allowCopyExcludeDomains.some(domain => {
      let cleanDomain = domain.trim().toLowerCase();
      if (!cleanDomain) return false;
      // Bỏ protocol nếu có (https://, http://)
      cleanDomain = cleanDomain.replace(/^https?:\/\//, '');
      // Bỏ phần path phía sau nếu có (ví dụ: domain/abc/xyz -> domain)
      cleanDomain = cleanDomain.split('/')[0];
      
      return currentHost === cleanDomain || currentHost.endsWith('.' + cleanDomain);
    });

    if (data.allowCopy && !isExcluded) {
      enableDauxanhAllowCopy();
    } else {
      disableDauxanhAllowCopy();
    }
  });
}

// Khởi chạy tính năng
evaluateDauxanhAllowCopy();

// Lắng nghe sự thay đổi cấu hình
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && (changes.allowCopy || changes.allowCopyExcludeDomains)) {
    evaluateDauxanhAllowCopy();
  }
});
