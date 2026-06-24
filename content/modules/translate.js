// --- Tính năng Dịch thuật bôi đen ---
let dauxanhSelectedText = "";
let translateIconContainer = null;
let translatePopup = null;
let dauxanhIsDarkMode = false;
let dauxanhResizeObserver = null;

chrome.storage.local.get({ isDarkMode: false }, data => dauxanhIsDarkMode = data.isDarkMode);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.isDarkMode) {
    dauxanhIsDarkMode = changes.isDarkMode.newValue;
  }
});

function removeTranslateUI() {
  if (dauxanhResizeObserver) {
    dauxanhResizeObserver.disconnect();
    dauxanhResizeObserver = null;
  }
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
    min-height: 100px !important;
    max-width: 90vw !important;
    max-height: 400px !important;
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
      @keyframes dauxanhPop {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }
      #dauxanh-translate-content::-webkit-scrollbar { display: none !important; }
      .dauxanh-translation-grid {
        display: flex !important;
        flex-direction: row !important;
        gap: 16px !important;
      }
      .dauxanh-stacked .dauxanh-translation-grid {
        flex-direction: column !important;
      }
      .dauxanh-original, .dauxanh-translated {
        flex: 1 !important;
        word-break: break-word !important;
      }
      .dauxanh-translated {
        border-left: 1px dashed var(--dauxanh-border-dashed) !important;
        padding-left: 16px !important;
      }
      .dauxanh-stacked .dauxanh-translated {
        border-left: none !important;
        padding-left: 0 !important;
        border-top: 1px dashed var(--dauxanh-border-dashed) !important;
        padding-top: 12px !important;
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

  // Custom resize handles
  const createResizer = (cursor, type) => {
    const r = document.createElement("div");
    let css = `position: absolute; cursor: ${cursor}; z-index: 10;`;
    if (type === 'right') css += 'right: -4px; top: 0; width: 8px; height: 100%;';
    if (type === 'bottom') css += 'left: 0; bottom: -4px; width: 100%; height: 8px;';
    if (type === 'corner') {
      css += 'right: 0; bottom: 0; width: 24px; height: 24px; z-index: 11; display: flex; align-items: flex-end; justify-content: flex-end; padding: 4px;';
      r.innerHTML = '<svg viewBox="0 0 10 10" style="width: 12px; height: 12px; fill: #9ca3af; opacity: 1;"><polygon points="10,0 10,10 0,10" /></svg>';
    }
    r.style.cssText = css;
    translatePopup.appendChild(r);

    r.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startY = e.clientY;
      const startW = translatePopup.offsetWidth;
      const startH = translatePopup.offsetHeight;

      // Unlock max-height so user can resize larger than default
      translatePopup.style.setProperty("max-height", "90vh", "important");
      translatePopup.style.setProperty("max-width", "90vw", "important");

      const onMouseMove = (moveEvent) => {
        if (type === 'right' || type === 'corner') {
          translatePopup.style.setProperty("width", (startW + moveEvent.clientX - startX) + "px", "important");
        }
        if (type === 'bottom' || type === 'corner') {
          translatePopup.style.setProperty("height", (startH + moveEvent.clientY - startY) + "px", "important");
        }
      };

      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });
  };

  createResizer('e-resize', 'right');
  createResizer('s-resize', 'bottom');
  createResizer('se-resize', 'corner');

  let topPos = mouseY + 25;
  if (topPos + 250 > window.scrollY + window.innerHeight) {
    topPos = mouseY - 260; 
  }
  translatePopup.style.top = topPos + 'px';
  translatePopup.style.left = Math.max(10, mouseX - 160) + 'px';
  
  document.body.appendChild(translatePopup);

  dauxanhResizeObserver = new ResizeObserver(entries => {
    for (let entry of entries) {
      if (entry.contentRect.width < 400) {
        translatePopup.classList.add('dauxanh-stacked');
      } else {
        translatePopup.classList.remove('dauxanh-stacked');
      }
    }
  });
  dauxanhResizeObserver.observe(translatePopup);

  chrome.runtime.sendMessage({ action: "translate_text", text: dauxanhSelectedText }, (response) => {
    if (response && response.success) {
      const translatedTxtColor = dauxanhIsDarkMode ? "#f9fafb" : "#111827";
      const borderDashed = dauxanhIsDarkMode ? "#4b5563" : "#e5e7eb";
      translatePopup.style.setProperty('--dauxanh-border-dashed', borderDashed);
      contentArea.innerHTML = `
        <div class="dauxanh-translation-grid">
          <div class="dauxanh-original">
            <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; margin-bottom: 8px; opacity: 0.6; color: ${originalTxtColor};">Bản gốc</div>
            <div style="color: ${originalTxtColor}; white-space: pre-wrap;">${dauxanhSelectedText}</div>
          </div>
          <div class="dauxanh-translated">
            <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; margin-bottom: 8px; opacity: 0.6; color: ${translatedTxtColor};">Bản dịch</div>
            <div style="color: ${translatedTxtColor}; white-space: pre-wrap;">${response.translatedText}</div>
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
            text: `**Nguồn:** [Trang gốc](${window.location.href})\n\n**Bản gốc:**\n${dauxanhSelectedText}\n\n**Bản dịch:**\n${response.translatedText}`,
            content: `**Nguồn:** [Trang gốc](${window.location.href})\n\n**Bản gốc:**\n${dauxanhSelectedText}\n\n**Bản dịch:**\n${response.translatedText}`,
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
