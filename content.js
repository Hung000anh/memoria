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
});

// Lắng nghe sự kiện từ background để hiển thị Popup (Overlay)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "show_overlay") {
    const overlayId = "dauxanh-reminder-overlay";
    if (document.getElementById(overlayId)) return;

    const overlay = document.createElement("div");
    overlay.id = overlayId;
    overlay.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background-color: rgba(0,0,0,0.6) !important;
      z-index: 2147483647 !important;
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif !important;
    `;

    const box = document.createElement("div");
    box.style.cssText = `
      background-color: white !important;
      padding: 30px 40px !important;
      border-radius: 16px !important;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3) !important;
      text-align: center !important;
      max-width: 450px !important;
      width: 90% !important;
      animation: dauxanhFadeIn 0.3s ease-out !important;
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes dauxanhFadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);

    const title = document.createElement("h2");
    title.textContent = "✨ Memoria nhắc nhở";
    title.style.cssText = `
      margin: 0 0 15px 0 !important;
      color: #10b981 !important;
      font-size: 24px !important;
      font-weight: 700 !important;
    `;

    const msg = document.createElement("p");
    msg.textContent = request.text;
    msg.style.cssText = `
      font-size: 20px !important;
      margin: 0 0 25px 0 !important;
      color: #333 !important;
      line-height: 1.5 !important;
    `;

    const btn = document.createElement("button");
    btn.textContent = "Đã hiểu";
    btn.style.cssText = `
      background-color: #10b981 !important;
      color: white !important;
      border: none !important;
      padding: 12px 24px !important;
      border-radius: 8px !important;
      font-size: 16px !important;
      font-weight: 600 !important;
      cursor: pointer !important;
      transition: background-color 0.2s !important;
    `;

    btn.onmouseover = () => btn.style.backgroundColor = "#059669";
    btn.onmouseout = () => btn.style.backgroundColor = "#10b981";

    btn.onclick = () => {
      if(document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }
    };

    box.appendChild(title);
    box.appendChild(msg);
    box.appendChild(btn);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    // Phát âm thanh thông báo nhẹ nhàng
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        
        function playNote(freq, startTime, duration) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.type = 'sine'; 
          osc.frequency.value = freq;
          
          gain.gain.setValueAtTime(0, startTime);
          gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration - 0.05);
          gain.gain.setValueAtTime(0, startTime + duration);
          
          osc.start(startTime);
          osc.stop(startTime + duration);
        }
        
        const now = ctx.currentTime;
        playNote(1046.50, now, 0.4);       // C6
        playNote(1318.51, now + 0.15, 0.6); // E6
      }
    } catch(e) {
      console.log("Memoria audio play blocked", e);
    }

    sendResponse({ status: "ok" });
  }
});
