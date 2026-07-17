// Lắng nghe trạng thái Dark Mode
let dauxanhReminderIsDarkMode = false;
chrome.storage.local.get({ isDarkMode: false }, (data) => {
  dauxanhReminderIsDarkMode = data.isDarkMode;
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.isDarkMode) {
    dauxanhReminderIsDarkMode = changes.isDarkMode.newValue;
  }
});

let dauxanhReminderAudioContext = null;
let dauxanhReminderAudioGestureBound = false;
let dauxanhReminderAudioPlaybackPending = false;

function dauxanhCreateReminderAudioContext() {
  if (dauxanhReminderAudioContext) {
    return dauxanhReminderAudioContext;
  }

  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) {
    return null;
  }

  dauxanhReminderAudioContext = new AudioContextCtor();
  return dauxanhReminderAudioContext;
}

function dauxanhPlayReminderBeepSequence(ctx) {
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
  playNote(1046.50, now, 0.4);
  playNote(1318.51, now + 0.15, 0.6);
}

function dauxanhQueueReminderAudioPlayback() {
  const ctx = dauxanhCreateReminderAudioContext();
  if (!ctx) {
    return;
  }

  if (ctx.state === 'running') {
    dauxanhReminderAudioPlaybackPending = false;
    dauxanhPlayReminderBeepSequence(ctx);
    return;
  }

  dauxanhReminderAudioPlaybackPending = true;

  if (!dauxanhReminderAudioGestureBound) {
    dauxanhReminderAudioGestureBound = true;

    const removeGestureListeners = () => {
      document.removeEventListener('pointerdown', resumeAndPlay, { capture: true });
      document.removeEventListener('keydown', resumeAndPlay, { capture: true });
      document.removeEventListener('click', resumeAndPlay, { capture: true });
      document.removeEventListener('touchstart', resumeAndPlay, { capture: true });
    };

    const resumeAndPlay = async () => {
      removeGestureListeners();

      const audioCtx = dauxanhCreateReminderAudioContext();
      if (!audioCtx) {
        return;
      }

      try {
        if (audioCtx.state === 'suspended') {
          await audioCtx.resume();
        }
      } catch (e) {
        console.log('Memoria audio resume blocked', e);
        return;
      }

      if (dauxanhReminderAudioPlaybackPending && audioCtx.state === 'running') {
        dauxanhReminderAudioPlaybackPending = false;
        dauxanhPlayReminderBeepSequence(audioCtx);
      }
    };

    document.addEventListener('pointerdown', resumeAndPlay, { capture: true, once: true });
    document.addEventListener('keydown', resumeAndPlay, { capture: true, once: true });
    document.addEventListener('click', resumeAndPlay, { capture: true, once: true });
    document.addEventListener('touchstart', resumeAndPlay, { capture: true, once: true });
  }
}

// Lắng nghe sự kiện từ background để hiển thị Popup nhắc nhở ở góc phải
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "show_overlay") {
    const overlayId = "dauxanh-reminder-overlay";
    const existingOverlay = document.getElementById(overlayId);
    if (existingOverlay) {
      existingOverlay.remove();
    }

    const bg = dauxanhReminderIsDarkMode ? "#1f2937" : "white";
    const border = dauxanhReminderIsDarkMode ? "1px solid #374151" : "1px solid #e5e7eb";
    const textColor = dauxanhReminderIsDarkMode ? "#f3f4f6" : "#374151";

    const overlay = document.createElement("div");
    overlay.id = overlayId;
    overlay.style.cssText = `
      position: fixed !important;
      bottom: 24px !important;
      right: 24px !important;
      width: 320px !important;
      background-color: ${bg} !important;
      border-radius: 12px !important;
      box-shadow: 0 10px 25px rgba(0,0,0,0.15) !important;
      border: ${border} !important;
      z-index: 2147483647 !important;
      display: flex !important;
      flex-direction: column !important;
      padding: 20px !important;
      padding-bottom: 24px !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif !important;
      box-sizing: border-box !important;
      overflow: hidden !important;
      animation: dauxanhSlideIn 0.3s ease-out !important;
    `;

    let styleEl = document.getElementById("dauxanh-reminder-style");
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = "dauxanh-reminder-style";
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `
      @keyframes dauxanhSlideIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes dauxanhSlideOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(20px); }
      }
      @keyframes dauxanhProgressShrink {
        from { width: 100%; }
        to { width: 0%; }
      }
    `;

    const title = document.createElement("h2");
    title.textContent = "✨ Memoria nhắc nhở";
    title.style.cssText = `
      box-sizing: border-box !important;
      display: block !important;
      line-height: 1.2 !important;
      margin: 0 0 10px 0 !important;
      padding: 0 !important;
      color: #10b981 !important;
      font-size: 18px !important;
      font-weight: 700 !important;
      text-align: left !important;
    `;

    const msg = document.createElement("p");
    msg.textContent = request.text;
    msg.style.cssText = `
      box-sizing: border-box !important;
      display: block !important;
      word-wrap: break-word !important;
      padding: 0 !important;
      font-size: 14px !important;
      margin: 0 0 15px 0 !important;
      color: ${textColor} !important;
      line-height: 1.5 !important;
      text-align: left !important;
    `;

    const btn = document.createElement("button");
    btn.textContent = "Đã hiểu";
    btn.style.cssText = `
      box-sizing: border-box !important;
      display: inline-block !important;
      height: auto !important;
      line-height: 1.5 !important;
      background-color: #10b981 !important;
      color: white !important;
      border: none !important;
      padding: 8px 16px !important;
      margin: 0 !important;
      border-radius: 6px !important;
      font-size: 13px !important;
      font-weight: 600 !important;
      cursor: pointer !important;
      transition: background-color 0.2s !important;
      align-self: flex-end !important;
    `;

    btn.onmouseover = () => btn.style.backgroundColor = "#059669";
    btn.onmouseout = () => btn.style.backgroundColor = "#10b981";

    let autoCloseTimeout;

    const closeOverlay = () => {
      if (document.body.contains(overlay)) {
        overlay.style.setProperty("animation", "dauxanhSlideOut 0.25s ease-in", "important");
        setTimeout(() => {
          if (document.body.contains(overlay)) {
            document.body.removeChild(overlay);
          }
        }, 230);
      }
    };

    const startTime = Date.now();
    const totalDuration = 10000; // 10 giây

    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      let remainingPercent = 100 - (elapsed / totalDuration) * 100;
      if (remainingPercent <= 0) {
        remainingPercent = 0;
        clearInterval(progressInterval);
      }
      progressBar.style.setProperty("width", `${remainingPercent}%`, "important");
    }, 30);

    btn.onclick = () => {
      clearInterval(progressInterval);
      if (autoCloseTimeout) clearTimeout(autoCloseTimeout);
      closeOverlay();
    };

    const progressBar = document.createElement("div");
    progressBar.style.cssText = `
      position: absolute !important;
      bottom: 0 !important;
      left: 0 !important;
      height: 4px !important;
      background-color: #10b981 !important;
      width: 100% !important;
    `;

    overlay.appendChild(title);
    overlay.appendChild(msg);
    overlay.appendChild(btn);
    overlay.appendChild(progressBar);
    document.body.appendChild(overlay);

    // Tự động đóng sau 10 giây
    autoCloseTimeout = setTimeout(() => {
      clearInterval(progressInterval);
      closeOverlay();
    }, 10000);

    // Phát âm thanh thông báo nhẹ nhàng sau khi có tương tác người dùng
    try {
      dauxanhQueueReminderAudioPlayback();
    } catch (e) {
      console.log("Memoria audio play blocked", e);
    }

    sendResponse({ status: "ok" });
  }
});
