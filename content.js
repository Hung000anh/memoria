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
      box-sizing: border-box !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
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
      box-sizing: border-box !important;
      display: block !important;
      line-height: 1.2 !important;
      margin: 0 0 15px 0 !important;
      padding: 0 !important;
      color: #10b981 !important;
      font-size: 24px !important;
      font-weight: 700 !important;
    `;

    const msg = document.createElement("p");
    msg.textContent = request.text;
    msg.style.cssText = `
      box-sizing: border-box !important;
      display: block !important;
      word-wrap: break-word !important;
      padding: 0 !important;
      font-size: 20px !important;
      margin: 0 0 25px 0 !important;
      color: #333 !important;
      line-height: 1.5 !important;
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
      padding: 12px 24px !important;
      margin: 0 !important;
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

// --- Tính năng Dịch thuật bôi đen ---
let dauxanhSelectedText = "";
let translateIconContainer = null;
let translatePopup = null;
let dauxanhIsDarkMode = false;

chrome.storage.local.get({ isDarkMode: false }, data => dauxanhIsDarkMode = data.isDarkMode);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.isDarkMode) {
    dauxanhIsDarkMode = changes.isDarkMode.newValue;
  }
});

function removeTranslateUI() {
  if (translateIconContainer && document.body.contains(translateIconContainer)) {
    document.body.removeChild(translateIconContainer);
  }
  if (translatePopup && document.body.contains(translatePopup)) {
    document.body.removeChild(translatePopup);
  }
  translateIconContainer = null;
  translatePopup = null;
}

document.addEventListener("selectionchange", () => {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.toString().trim() === "") {
    if (!translatePopup) removeTranslateUI();
  }
});

document.addEventListener("mouseup", (e) => {
  if (translatePopup && translatePopup.contains(e.target)) return;
  if (translateIconContainer && translateIconContainer.contains(e.target)) return;

  const selection = window.getSelection();
  const text = selection.toString().trim();
  
  if (text.length > 0) {
    dauxanhSelectedText = text;
    if (translateIconContainer) removeTranslateUI();
    
    translateIconContainer = document.createElement("div");
    translateIconContainer.id = "dauxanh-translate-icon-btn";
    translateIconContainer.style.cssText = `
      position: absolute;
      background: white;
      border-radius: 50%;
      width: 28px;
      height: 28px;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      z-index: 2147483647;
      animation: dauxanhPop 0.2s ease-out;
      border: 1px solid #e5e7eb;
    `;
    
    const iconImg = document.createElement("img");
    try {
      iconImg.src = chrome.runtime.getURL("icons/icon48.png");
    } catch (e) {
      console.warn("Memoria: Vui lòng tải lại trang (F5) để sử dụng tính năng sau khi cập nhật Extension.");
      return;
    }
    iconImg.style.cssText = "width: 18px; height: 18px; border-radius: 50%; object-fit: contain; margin: 0; padding: 0; display: block;";
    translateIconContainer.appendChild(iconImg);
    
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    translateIconContainer.style.top = (e.pageY + 12) + 'px';
    translateIconContainer.style.left = (e.pageX + 8) + 'px';
    
    translateIconContainer.onclick = async (ev) => {
      ev.stopPropagation();
      ev.preventDefault();
      showTranslatePopup(rect, e.pageX, e.pageY);
    };
    
    document.body.appendChild(translateIconContainer);
  } else {
    removeTranslateUI();
  }
});

function showTranslatePopup(rect, mouseX, mouseY) {
  if (translateIconContainer) translateIconContainer.style.display = 'none';
  if (translatePopup) document.body.removeChild(translatePopup);

  const bg = dauxanhIsDarkMode ? "#1f2937" : "white";
  const txtColor = dauxanhIsDarkMode ? "#f3f4f6" : "#333";
  const borderColor = dauxanhIsDarkMode ? "#374151" : "#e5e7eb";

  translatePopup = document.createElement("div");
  translatePopup.id = "dauxanh-translate-popup";
  translatePopup.style.cssText = `
    position: absolute !important;
    background: ${bg} !important;
    border-radius: 12px !important;
    box-shadow: 0 4px 20px rgba(0,0,0,0.25) !important;
    width: 500px !important;
    min-width: 250px !important;
    min-height: 180px !important;
    max-width: 90vw !important;
    max-height: 90vh !important;
    padding: 16px !important;
    box-sizing: border-box !important;
    z-index: 2147483647 !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif !important;
    color: ${txtColor} !important;
    animation: dauxanhPop 0.2s ease-out !important;
    border: 1px solid ${borderColor} !important;
    overflow: hidden !important;
    display: flex !important;
    flex-direction: column !important;
    container-type: inline-size !important;
  `;

  if (!document.getElementById("dauxanh-translate-style")) {
    const st = document.createElement("style");
    st.id = "dauxanh-translate-style";
    st.textContent = `
      #dauxanh-translate-content::-webkit-scrollbar { display: none !important; }
      .dauxanh-translation-grid {
        display: flex;
        flex-direction: row-reverse;
        gap: 16px;
      }
      .dauxanh-original, .dauxanh-translated {
        flex: 1;
        word-break: break-word;
      }
      .dauxanh-original {
        border-left: 1px dashed var(--dauxanh-border-dashed);
        padding-left: 16px;
      }
      @container (max-width: 400px) {
        .dauxanh-translation-grid {
          flex-direction: column;
        }
        .dauxanh-original {
          border-left: none;
          padding-left: 0;
          border-bottom: 1px dashed var(--dauxanh-border-dashed);
          padding-bottom: 12px;
        }
      }
    `;
    document.head.appendChild(st);
  }
  
  const header = document.createElement("div");
  header.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; cursor: grab; flex-shrink: 0;";
  
  const title = document.createElement("div");
  title.innerHTML = `<span style="font-weight: 600; color: #10b981; display:flex; align-items:center; gap:6px; line-height:1;"><img src="${chrome.runtime.getURL('icons/icon48.png')}" style="width:16px;height:16px;border-radius:50%; display:block; margin:0; padding:0; object-fit:contain;"> Dịch thuật</span>`;
  
  const closeBtn = document.createElement("button");
  closeBtn.innerHTML = "&times;";
  closeBtn.style.cssText = "background: none; border: none; font-size: 20px; cursor: pointer; color: #9ca3af; line-height: 1;";
  closeBtn.onclick = removeTranslateUI;
  
  header.appendChild(title);
  header.appendChild(closeBtn);
  translatePopup.appendChild(header);

  header.addEventListener("mousedown", (e) => {
    if (e.target === closeBtn) return;
    header.style.cursor = "grabbing";
    const rect = translatePopup.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    e.preventDefault();

    const onMouseMove = (moveEvent) => {
      translatePopup.style.left = (moveEvent.clientX + window.scrollX - offsetX) + "px";
      translatePopup.style.top = (moveEvent.clientY + window.scrollY - offsetY) + "px";
    };

    const onMouseUp = () => {
      header.style.cursor = "grab";
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });

  const originalTxtColor = dauxanhIsDarkMode ? "#9ca3af" : "#6b7280";
  
  const contentArea = document.createElement("div");
  contentArea.id = "dauxanh-translate-content";
  contentArea.style.cssText = "font-size: 14px; flex: 1; overflow-y: auto; scrollbar-width: none; -ms-overflow-style: none; line-height: 1.5; margin-bottom: 12px; min-height: 0;";
  contentArea.innerHTML = `<div style="color: ${originalTxtColor}; font-style: italic; text-align: center; display: flex; align-items: center; justify-content: center; height: 100%;">Đang dịch...</div>`;
  translatePopup.appendChild(contentArea);
  
  const dividerColor = dauxanhIsDarkMode ? "#374151" : "#f3f4f6";
  const footer = document.createElement("div");
  footer.style.cssText = `display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid ${dividerColor}; padding-top: 12px; flex-shrink: 0;`;
  
  const saveBtn = document.createElement("button");
  saveBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px; vertical-align: middle;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> Lưu Ghi chú';
  saveBtn.style.cssText = "background: #10b981; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer; display: none; align-items: center;";
  saveBtn.onmouseover = () => saveBtn.style.background = "#059669";
  saveBtn.onmouseout = () => saveBtn.style.background = "#10b981";
  
  footer.appendChild(saveBtn);
  translatePopup.appendChild(footer);

  // Custom resize handle
  const resizer = document.createElement("div");
  resizer.style.cssText = "position: absolute; right: 0; bottom: 0; width: 30px; height: 30px; cursor: se-resize; z-index: 10; display: flex; align-items: flex-end; justify-content: flex-end; padding: 6px;";
  resizer.innerHTML = '<svg viewBox="0 0 10 10" style="width: 14px; height: 14px; fill: #9ca3af; opacity: 1;"><polygon points="10,0 10,10 0,10" /></svg>';
  translatePopup.appendChild(resizer);

  resizer.addEventListener("mousedown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = translatePopup.offsetWidth;
    const startH = translatePopup.offsetHeight;

    const onMouseMove = (moveEvent) => {
      const newWidth = startW + moveEvent.clientX - startX;
      const newHeight = startH + moveEvent.clientY - startY;
      translatePopup.style.setProperty("width", newWidth + "px", "important");
      translatePopup.style.setProperty("height", newHeight + "px", "important");
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });

  let topPos = mouseY + 25;
  if (topPos + 250 > window.scrollY + window.innerHeight) {
    topPos = mouseY - 260; 
  }
  translatePopup.style.top = topPos + 'px';
  translatePopup.style.left = Math.max(10, mouseX - 160) + 'px';
  
  document.body.appendChild(translatePopup);

  chrome.runtime.sendMessage({ action: "translate_text", text: dauxanhSelectedText }, (response) => {
    if (response && response.success) {
      const translatedTxtColor = dauxanhIsDarkMode ? "#f9fafb" : "#111827";
      const borderDashed = dauxanhIsDarkMode ? "#4b5563" : "#e5e7eb";
      translatePopup.style.setProperty('--dauxanh-border-dashed', borderDashed);
      contentArea.innerHTML = `
        <div class="dauxanh-translation-grid">
          <div class="dauxanh-original">
            <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; margin-bottom: 8px; opacity: 0.6; color: ${originalTxtColor};">Bản gốc</div>
            <div style="color: ${originalTxtColor};">${dauxanhSelectedText}</div>
          </div>
          <div class="dauxanh-translated">
            <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; margin-bottom: 8px; opacity: 0.6; color: ${translatedTxtColor};">Bản dịch</div>
            <div style="color: ${translatedTxtColor};">${response.translatedText}</div>
          </div>
        </div>
      `;
      saveBtn.style.display = "inline-flex";
      saveBtn.onclick = () => {
        saveBtn.innerText = "Đang lưu...";
        chrome.storage.local.get({ notes: [] }, (data) => {
          const notes = data.notes;
          notes.unshift({
            id: Date.now(),
            title: 'Bản dịch từ ' + window.location.hostname,
            text: `**Bản gốc:**\n${dauxanhSelectedText}\n\n**Bản dịch:**\n${response.translatedText}`,
            content: `**Bản gốc:**\n${dauxanhSelectedText}\n\n**Bản dịch:**\n${response.translatedText}`,
            color: '#bbf7d0',
            date: new Date().toISOString()
          });
          chrome.storage.local.set({ notes }, () => {
            saveBtn.innerHTML = "Đã lưu!";
            saveBtn.style.background = "#059669";
            setTimeout(() => {
              removeTranslateUI();
            }, 1500);
          });
        });
      };
    } else {
      contentArea.innerHTML = `<div style="color: #ef4444;">Lỗi dịch thuật: ${response ? response.error : 'Không phản hồi'}</div>`;
    }
  });
}

if (!document.getElementById('dauxanh-translate-style')) {
  const style = document.createElement('style');
  style.id = 'dauxanh-translate-style';
  style.textContent = `
    @keyframes dauxanhPop {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
  `;
  document.head.appendChild(style);
}
